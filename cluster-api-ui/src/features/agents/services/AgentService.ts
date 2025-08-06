import {
  Agent,
  AgentCapability,
  AgentMessage,
  Conversation,
  AgentAction,
  CapabilityInfo,
  JSONValue,
  ApiResponse,
  ParameterSchema
} from '../types';
import { apiCall, ApiCallOptions } from '../../../utils/api';
import { API_BASE_URL } from '../../../config';

type SimplifiedAgentStatus = {
  status: 'online' | 'offline' | 'busy' | 'error';
  message?: string;
};

// Define a type for the raw capability data from the API
interface RawCapability {
  id?: string;
  name: string;
  description?: string;
  config?: Record<string, unknown>;
  enabled?: boolean;
  actions?: (AgentAction | string)[];
}

// API endpoints
const ENDPOINTS = {
  AGENTS: `${API_BASE_URL}/agents`,
  AGENT: (id: string) => `${API_BASE_URL}/agents/${id}`,
  AGENT_STATUS: (id: string) => `${API_BASE_URL}/agents/${id}/status`,
  AGENT_CAPABILITIES: (agentId: string) => `${API_BASE_URL}/agents/${agentId}/capabilities`,
  AGENT_CAPABILITY: (agentId: string, capabilityName: string) =>
    `${API_BASE_URL}/agents/${agentId}/capabilities/${capabilityName}`,
  AGENT_ACTION: (agentId: string, action: string) =>
    `${API_BASE_URL}/agents/${agentId}/actions/${action}`,
  CONVERSATIONS: `${API_BASE_URL}/conversations`,
  CONVERSATION: (id: string) => `${API_BASE_URL}/conversations/${id}`,
  CONVERSATION_MESSAGES: (id: string) => `${API_BASE_URL}/conversations/${id}/messages`,
  MESSAGES: `${API_BASE_URL}/messages`,
  CAPABILITIES: `${API_BASE_URL}/capabilities`
};

class AgentService {
  // Capability Management
  async getAvailableCapabilities(): Promise<CapabilityInfo[]> {
    try {
      const response = await apiCall<CapabilityInfo[]>('/agents/capabilities');
      if (!response.success || !response.data) {
        console.error('API call was not successful:', response.error);
        return [];
      }
      return response.data;
    } catch (error) {
      console.error('Error fetching capabilities:', error);
      throw error;
    }
  }

  async getAgentCapabilities(agentId: string): Promise<CapabilityInfo[]> {
    try {
      const response = await apiCall<CapabilityInfo[]>(ENDPOINTS.AGENT_CAPABILITIES(agentId));
      if (!response.success || !response.data) {
        console.error('API call was not successful:', response.error);
        return [];
      }
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch capabilities for agent ${agentId}:`, error);
      throw error;
    }
  }

  async getCapabilityDetails(agentId: string, capabilityName: string): Promise<CapabilityInfo | null> {
    try {
      const response = await apiCall<CapabilityInfo>(ENDPOINTS.AGENT_CAPABILITY(agentId, capabilityName));
      if (!response.success || !response.data) {
        console.error('Failed to fetch capability details:', response?.error);
        return null;
      }
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch capability ${capabilityName} for agent ${agentId}:`, error);
      throw error;
    }
  }

  async executeCapabilityAction(
    agentId: string,
    capabilityName: string,
    action: string,
    parameters: Record<string, unknown> = {}
  ): Promise<ApiResponse<unknown>> {
    try {
      return await apiCall<unknown>(
        `${ENDPOINTS.AGENT_CAPABILITY(agentId, capabilityName)}/actions/${action}`,
        {
          method: 'POST',
          data: parameters
        }
      );
    } catch (error) {
      console.error(`Error executing capability action ${action} for agent ${agentId}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return { success: false, error: errorMessage };
    }
  }

  // Agent Management
  private mapCapabilities(capabilities: unknown[] = []): AgentCapability[] {
    if (!Array.isArray(capabilities)) {
      return [];
    }
    return capabilities
      .map((cap: unknown): AgentCapability | null => {
        if (typeof cap === 'object' && cap !== null && 'name' in cap) {
          const rawCap = cap as RawCapability;
          return {
            id: rawCap.id || rawCap.name,
            name: rawCap.name,
            description: rawCap.description || '',
            config: rawCap.config || {},
            enabled: rawCap.enabled !== false,
            actions: (Array.isArray(rawCap.actions) ? rawCap.actions : []).map((action: unknown) => {
              if (typeof action === 'object' && action !== null && 'name' in action) {
                return action as AgentAction;
              }
              if (typeof action === 'string') {
                return { id: action, name: action, description: '' } as AgentAction;
              }
              return { id: 'unknown', name: 'unknown', description: '' } as AgentAction;
            })
          };
        }
        if (typeof cap === 'string') {
          return {
            id: cap,
            name: cap,
            description: '',
            config: {},
            enabled: true,
            actions: []
          };
        }
        return null;
      })
      .filter((c): c is AgentCapability => c !== null);
  }

  async getAllAgents(): Promise<Agent[]> {
    try {
      const response = await apiCall<Agent[]>(ENDPOINTS.AGENTS);
      if (!response.success || !response.data) {
        console.error('Failed to fetch agents:', response.error);
        return [];
      }
      return response.data.map(
        (agent): Agent => ({
          ...agent,
          capabilities: this.mapCapabilities(agent.capabilities || []),
          status: agent.status || 'offline',
          createdAt: agent.createdAt || new Date().toISOString(),
          updatedAt: agent.updatedAt || new Date().toISOString()
        })
      );
    } catch (error) {
      console.error('Error fetching agents:', error);
      throw error;
    }
  }

  async getAgentStatus(agentId: string): Promise<SimplifiedAgentStatus> {
    try {
      const response = await apiCall<SimplifiedAgentStatus>(ENDPOINTS.AGENT_STATUS(agentId));
      if (!response.success || !response.data) {
        return { status: 'offline', message: 'Failed to fetch agent status' };
      }
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch status for agent ${agentId}:`, error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      return { status: 'offline', message };
    }
  }

  async createAgent(agentData: Partial<Agent>): Promise<Agent> {
    try {
      const response = await apiCall<Agent>(ENDPOINTS.AGENTS, {
        method: 'POST',
        data: agentData
      });
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to create agent');
      }
      return response.data;
    } catch (error) {
      console.error('Error creating agent:', error);
      throw error;
    }
  }

  async updateAgent(agentId: string, updateData: Partial<Agent>): Promise<Agent> {
    try {
      const response = await apiCall<Agent>(ENDPOINTS.AGENT(agentId), {
        method: 'PATCH',
        data: updateData
      });
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to update agent');
      }
      return response.data;
    } catch (error) {
      console.error(`Error updating agent ${agentId}:`, error);
      throw error;
    }
  }

  async deleteAgent(agentId: string): Promise<void> {
    try {
      const response = await apiCall(ENDPOINTS.AGENT(agentId), { method: 'DELETE' });
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete agent');
      }
    } catch (error) {
      console.error(`Failed to delete agent ${agentId}:`, error);
      throw error;
    }
  }

  // Conversation Management
  async getConversation(conversationId: string): Promise<Conversation | null> {
    try {
      const response = await apiCall<Conversation>(ENDPOINTS.CONVERSATION(conversationId));
      return response.success ? response.data || null : null;
    } catch (error) {
      console.error(`Failed to get conversation ${conversationId}:`, error);
      return null;
    }
  }

  async deleteConversation(conversationId: string): Promise<void> {
    try {
      await apiCall(ENDPOINTS.CONVERSATION(conversationId), { method: 'DELETE' });
    } catch (error) {
      console.error(`Failed to delete conversation ${conversationId}:`, error);
    }
  }

  async getConversationMessages(conversationId: string): Promise<AgentMessage[]> {
    try {
      const response = await apiCall<AgentMessage[]>(ENDPOINTS.CONVERSATION_MESSAGES(conversationId));
      return response.success && response.data ? response.data : [];
    } catch (error) {
      console.error(`Failed to get messages for conversation ${conversationId}:`, error);
      return [];
    }
  }

  async getAgentConversations(agentId: string): Promise<Conversation[]> {
    try {
      const response = await apiCall<Conversation[]>(ENDPOINTS.CONVERSATIONS, {
        params: { agentId }
      });
      return response.success && response.data ? response.data : [];
    } catch (error) {
      console.error(`Failed to fetch conversations for agent ${agentId}:`, error);
      return [];
    }
  }

  async createConversation(agentId: string, title = 'New Conversation'): Promise<Conversation> {
    try {
      const response = await apiCall<Conversation>(ENDPOINTS.CONVERSATIONS, {
        method: 'POST',
        data: { agentId, title, messages: [] }
      });
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to create conversation');
      }
      return response.data;
    } catch (error) {
      console.error('Failed to create conversation:', error);
      throw error;
    }
  }

  async sendMessage(
    conversationId: string,
    content: string,
    sender: 'user' | 'agent' = 'user',
    metadata: Record<string, unknown> = {}
  ): Promise<AgentMessage> {
    try {
      const response = await apiCall<AgentMessage>(ENDPOINTS.CONVERSATION_MESSAGES(conversationId), {
        method: 'POST',
        data: { content, sender, timestamp: new Date().toISOString(), metadata }
      });
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to send message');
      }
      return response.data;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  async addAgentCapability(agentId: string, capabilityName: string): Promise<Agent> {
    const response = await apiCall<Agent>(ENDPOINTS.AGENT_CAPABILITIES(agentId), {
      method: 'POST',
      data: { name: capabilityName }
    });
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to add capability');
    }
    return response.data;
  }

  async removeAgentCapability(agentId: string, capabilityName: string): Promise<Agent> {
    const response = await apiCall<Agent>(ENDPOINTS.AGENT_CAPABILITY(agentId, capabilityName), {
      method: 'DELETE'
    });
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to remove capability');
    }
    return response.data;
  }

    async getAvailableActions(agentId: string): Promise<{ name: string; description: string; parameters: Record<string, ParameterSchema>; capability: string; }[]> {
    try {
      const capabilities = await this.getAgentCapabilities(agentId);
      return capabilities.flatMap((capability: CapabilityInfo) =>
        (capability.actions || []).map((action: AgentAction) => ({
          name: action.name,
          description: action.description || '',
                    parameters: action.parameters || {},
          capability: capability.name || ''
        }))
      );
    } catch (error) {
      console.error(`Failed to get available actions for agent ${agentId}:`, error);
      throw error;
    }
  }



  async getCapabilitySchema(agentId: string, capabilityName: string): Promise<JSONValue> {
    // Stub implementation
    console.log(`Getting schema for capability ${capabilityName} from agent ${agentId}`);
    return Promise.resolve({});
  }

  async getActionSchema(agentId: string, capabilityName: string, actionName: string): Promise<JSONValue> {
    // Stub implementation
    console.log(`Getting schema for action ${actionName} in capability ${capabilityName} from agent ${agentId}`);
    return Promise.resolve({});
  }

  // Agent Actions
  async executeAgentAction(agentId: string, action: string, params: Record<string, JSONValue> = {}): Promise<JSONValue> {
    try {
      const response = await apiCall({
        url: ENDPOINTS.AGENT_ACTION(agentId, action),
        method: 'POST',
        data: params,
        headers: { 'Content-Type': 'application/json' }
      } as ApiCallOptions);

      if (!response.success || typeof response.data === 'undefined') {
        throw new Error(response.error || 'Failed to execute action or no data returned');
      }
      // Simple type guard, can be improved
      if (response.data !== null && (typeof response.data === 'object' || typeof response.data === 'string' || typeof response.data === 'number' || typeof response.data === 'boolean')) {
          return response.data as JSONValue;
      }
      throw new Error('Invalid data format received from API');
    } catch (error) {
      console.error(`Failed to execute ${action} on agent ${agentId}:`, error);
      throw error;
    }
  }
}
// Export a singleton instance
export const agentService = new AgentService();
