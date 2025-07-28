import { AgentType, createAIAgent, AIAgentConfig } from './aiAgents';
import { messageBus, MessageType, MessageTopic, AgentMessage } from './agentMessageBus';
import { v4 as uuidv4 } from 'uuid';

export interface AgentInstance {
  id: string;
  name: string;
  type: AgentType;
  config: AIAgentConfig;
  isActive: boolean;
  lastActive: Date;
  metadata: Record<string, any>;
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
    const baseConfig = createAIAgent(type, customConfig);
    const agentId = `agent_${uuidv4()}`;
    
    const agentInstance: AgentInstance = {
      id: agentId,
      name: customConfig.name || baseConfig.name,
      type,
      config: baseConfig,
      isActive: true,
      lastActive: new Date(),
      metadata: {
        createdAt: new Date().toISOString(),
        ...(customConfig.metadata || {})
      }
    };

    this.agents.set(agentId, agentInstance);
    this.setupAgentMessageHandlers(agentId, agentInstance);
    
    // Notify about the new agent
    await messageBus.publish({
      type: MessageType.EVENT,
      topic: MessageTopic.SYSTEM,
      sender: 'orchestrator',
      payload: {
        event: 'agent_created',
        agentId,
        agentType: type
      }
    });

    return agentInstance;
  }

  public getAgent(agentId: string): AgentInstance | undefined {
    return this.agents.get(agentId);
  }

  public getAllAgents(): AgentInstance[] {
    return Array.from(this.agents.values());
  }

  public getAgentsByType(type: AgentType): AgentInstance[] {
    return this.getAllAgents().filter(agent => agent.type === type);
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

        // Process the message based on its type
        switch (message.type) {
          case MessageType.REQUEST:
            await this.handleAgentRequest(agent, message);
            break;
          case MessageType.DIRECT:
            if (message.recipients?.includes(agentId)) {
              await this.handleDirectMessage(agent, message);
            }
            break;
          // Add more message type handlers as needed
        }
      }
    );

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
    console.log(`Agent ${agent.id} received direct message:`, message);
    
    // Here you would implement the actual message handling logic
    // based on the agent's capabilities and the message content
  }

  private async processAgentCapability(
    agent: AgentInstance,
    capability: string,
    params: any
  ): Promise<any> {
    // Find the requested capability in the agent's configuration
    const capabilityConfig = agent.config.capabilities.find(
      cap => cap.name === capability
    );

    if (!capabilityConfig) {
      throw new Error(`Capability '${capability}' not found in agent ${agent.id}`);
    }

    // Here you would implement the actual capability execution
    // This is a placeholder implementation
    return {
      success: true,
      agentId: agent.id,
      capability,
      result: `Processed ${capability} with params: ${JSON.stringify(params)}`,
      timestamp: new Date().toISOString()
    };
  }

  // Helper method to broadcast a message to all agents of a specific type
  public async broadcastToAgents(
    agentType: AgentType,
    message: Omit<AgentMessage, 'sender' | 'timestamp' | 'id'>
  ): Promise<void> {
    const agents = this.getAgentsByType(agentType);
    
    await Promise.all(
      agents.map(agent => 
        messageBus.publish({
          ...message,
          sender: 'orchestrator',
          recipients: [agent.id]
        })
      )
    );
  }
}

// Export a singleton instance
export const agentOrchestrator = AgentOrchestrator.getInstance();
