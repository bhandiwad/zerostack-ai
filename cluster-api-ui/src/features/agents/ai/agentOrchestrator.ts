import { AgentType, AIAgentConfig } from '../types/agentTypes';
import { createAIAgent } from './aiAgents';
import { messageBus, MessageType, MessageTopic, AgentMessage } from './agentMessageBus';
import { agentApi, AgentInstance as APIAgentInstance } from '../api/agentApi';
import { v4 as uuidv4 } from 'uuid';

// Helper function to transform API agent instance to our frontend AgentInstance
function transformAPIAgent(apiAgent: APIAgentInstance): AgentInstance {
  const capabilities = Array.isArray(apiAgent.capabilities)
    ? apiAgent.capabilities.map((cap: { name: string }) => cap.name)
    : [];

  const apiConfig = (apiAgent.config || {}) as Record<string, unknown>;

  const transformed: AgentInstance = {
    id: apiAgent.id,
    name: apiAgent.name,
    description: apiAgent.description,
    type: apiAgent.type as AgentType,
    status: apiAgent.status,
    isActive: apiAgent.status === 'active',
    lastActive: apiAgent.last_active ? new Date(apiAgent.last_active) : null,
    capabilities,
    config: {
      type: apiAgent.type as AgentType,
      name: apiAgent.name,
      description: apiAgent.description,
      capabilities,
      config: {
        model: (apiConfig.model as string) || 'default-model',
        temperature: (apiConfig.temperature as number) || 0.7,
        maxTokens: (apiConfig.maxTokens as number) || 1000,
        systemPrompt: (apiConfig.systemPrompt as string) || '',
        ...apiConfig,
      },
      metadata: apiAgent.metadata || {},
      createdAt: apiAgent.created_at,
      updatedAt: apiAgent.updated_at,
    },
    metadata: apiAgent.metadata || {},
    createdAt: apiAgent.created_at,
    updatedAt: apiAgent.updated_at,
  };

  return transformed;
}

// Define the shape of our frontend agent instance
export interface AgentInstance {
  id: string;
  name: string;
  description: string;
  type: AgentType;
  status: string;
  isActive: boolean;
  lastActive: Date | null;
  config: AIAgentConfig;
  capabilities: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export class AgentOrchestrator {
  private static instance: AgentOrchestrator;
  private agents: Map<string, AgentInstance>;
  private agentSubscriptions: Map<string, () => void>;

  private constructor() {
    this.agents = new Map();
    this.agentSubscriptions = new Map();
  }

  public static getInstance(): AgentOrchestrator {
    if (!AgentOrchestrator.instance) {
      AgentOrchestrator.instance = new AgentOrchestrator();
    }
    return AgentOrchestrator.instance;
  }

  public async createAgent(
    type: AgentType,
    customConfig: Partial<AIAgentConfig> = {}
  ): Promise<AgentInstance> {
    try {
      const baseConfig = createAIAgent(type, customConfig);
      const now = new Date().toISOString();
      
      // Convert capabilities to string array if needed
      const capabilities = Array.isArray(baseConfig.capabilities) 
        ? baseConfig.capabilities.map((cap: string | { name: string }) => 
            typeof cap === 'string' ? cap : cap.name
          )
        : [];
        
      const agentData = await agentApi.createAgent({
        name: customConfig.name || baseConfig.name,
        description: customConfig.description || baseConfig.description,
        type,
        config: baseConfig.config,
        capabilities
      });
      
      // Create a properly typed agent instance
      const agentInstance: AgentInstance = {
        id: agentData.id,
        name: agentData.name,
        description: agentData.description,
        type: agentData.type as AgentType,
        status: agentData.status || 'active',
        isActive: true,
        lastActive: agentData.last_active ? new Date(agentData.last_active) : null,
        config: {
          ...baseConfig,
          config: {
            ...baseConfig.config,
            ...(agentData.config || {})
          }
        },
        capabilities,
        metadata: agentData.metadata || {},
        createdAt: agentData.created_at || now,
        updatedAt: agentData.updated_at || now
      };

      this.agents.set(agentData.id, agentInstance);
      this.setupAgentMessageHandlers(agentData.id, agentInstance);
      
      await messageBus.publish({
        type: MessageType.EVENT,
        topic: MessageTopic.SYSTEM,
        sender: 'orchestrator',
        payload: {
          event: 'agent_created',
          agentId: agentData.id,
          agentType: type
        }
      });

      return agentInstance;
    } catch (error) {
      console.error('Error creating agent:', error);
      throw error;
    }
  }

  public async getAgent(agentId: string): Promise<AgentInstance | undefined> {
    try {
      const agentData = await agentApi.getAgent(agentId);
      
      // Use the transformAPIAgent helper to ensure consistent transformation
      const agentInstance = transformAPIAgent(agentData);
      
      this.agents.set(agentId, agentInstance);
      return agentInstance;
    } catch (error) {
      console.error(`Error fetching agent ${agentId}:`, error);
      return undefined;
    }
  }

  public async getAllAgents(): Promise<AgentInstance[]> {
    try {
      const agents = await agentApi.getAgents();
      
      // Transform each agent using the transformAPIAgent helper
      const agentInstances = agents.map(agent => transformAPIAgent(agent));
      
      // Update local cache
      agentInstances.forEach(agent => {
        this.agents.set(agent.id, agent);
      });
      
      return agentInstances;
    } catch (error) {
      console.error('Error fetching agents:', error);
      return [];
    }
  }

  public async getAgentsByType(type: AgentType): Promise<AgentInstance[]> {
    const agents = await this.getAllAgents();
    return agents.filter((agent: AgentInstance) => agent.type === type);
  }

  public async updateAgent(
    agentId: string,
    updates: Partial<Omit<AgentInstance, 'id' | 'type'>>
  ): Promise<AgentInstance | null> {
    const agent = this.agents.get(agentId);
    if (!agent) return null;

    const updatedAgent = { ...agent, ...updates };
    this.agents.set(agentId, updatedAgent);

    // Notify about the update
    await messageBus.publish({
      type: MessageType.EVENT,
      topic: MessageTopic.SYSTEM,
      sender: 'orchestrator',
      payload: {
        event: 'agent_updated',
        agentId,
        updates: Object.keys(updates)
      }
    });

    return updatedAgent;
  }

  public async removeAgent(agentId: string): Promise<boolean> {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    // Clean up message handlers
    const unsubscribe = this.agentSubscriptions.get(agentId);
    if (unsubscribe) {
      unsubscribe();
      this.agentSubscriptions.delete(agentId);
    }

    this.agents.delete(agentId);

    // Notify about the removal
    await messageBus.publish({
      type: MessageType.EVENT,
      topic: MessageTopic.SYSTEM,
      sender: 'orchestrator',
      payload: {
        event: 'agent_removed',
        agentId,
        agentType: agent.type
      }
    });

    return true;
  }

  private setupAgentMessageHandlers(agentId: string, agent: AgentInstance): void {
    // Setup message handlers for this agent's capabilities
    const unsubscribe = messageBus.subscribe(
      agent.type,
      async (message: AgentMessage) => {
        if (message.sender === agentId) return; // Don't process own messages
        
        // Update last active time
        this.updateAgent(agentId, { lastActive: new Date() });

        try {
          // Handle the message based on its type
          switch (message.type) {
            case MessageType.REQUEST:
              await this.handleAgentRequest(agent, message);
              break;
            case MessageType.DIRECT:
              if (message.recipients?.includes(agentId)) {
                await this.handleDirectMessage(agent, message);
              }
              break;
            case MessageType.EVENT:
              // Handle events if needed
              break;
            case MessageType.RESPONSE:
              // Handle responses if needed
              break;
            // Add more message type handlers as needed
          }
        } catch (error) {
          console.error(`Error handling message in agent ${agentId}:`, error);
        }
      }
    );

    // Store the unsubscribe function for cleanup
    this.agentSubscriptions.set(agentId, unsubscribe);
  }

  private async handleAgentRequest(agent: AgentInstance, message: AgentMessage): Promise<void> {
    try {
      // Process the request based on the agent's capabilities
      const response = await this.processAgentCapability(agent, message.topic, message.payload);
      
      // Send response back to the requester
      messageBus.respondToRequest(message, response);
    } catch (error) {
      console.error(`Error processing request for agent ${agent.id}:`, error);
      messageBus.respondToRequest(
        message,
        { error: 'Failed to process request' },
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  private async handleDirectMessage(agent: AgentInstance, message: AgentMessage): Promise<void> {
    // Handle direct messages to this agent
    console.log(`Agent ${agent.id} received direct message:`, message.payload as unknown);
    
    // Here you would implement the actual message handling logic
    // based on the agent's capabilities and the message content
  }

  private async processAgentCapability(
    agent: AgentInstance,
    capability: string,
    params: unknown
  ): Promise<unknown> {
    // Check if the agent has the requested capability
    const hasCapability = agent.capabilities.includes(capability);

    if (!hasCapability) {
      throw new Error(`Capability '${capability}' not found in agent ${agent.id}`);
    }

    try {
      // Example capability handling
      if (capability === 'query') {
        // Handle query capability
        return { success: true, result: 'Query executed successfully' };
      } else if (capability === 'execute') {
        // Handle execute capability
        return { success: true, result: 'Command executed successfully' };
      }
      
      // Default response for other capabilities
      return { 
        success: true,
        agentId: agent.id,
        capability,
        result: `Processed ${capability} with params: ${JSON.stringify(params)}`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error processing capability '${capability}':`, error);
      throw error;
    }
  }



  // Helper method to broadcast a message to all agents of a specific type
  public async broadcastToAgents(
    agentType: AgentType,
    message: Omit<AgentMessage, 'sender' | 'timestamp' | 'id'>
  ): Promise<void> {
    const agents = await this.getAgentsByType(agentType);
    
    await Promise.all(
      agents.map((agent) => {
        const agentMessage: AgentMessage = {
          ...message,
          id: uuidv4(),
          sender: 'orchestrator',
          recipients: [agent.id],
          timestamp: Date.now()
        };
        return messageBus.publish(agentMessage);
      })
    );
  }
}

// Export a singleton instance
export const agentOrchestrator = AgentOrchestrator.getInstance();
