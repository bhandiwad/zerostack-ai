import { apiCall } from '../../../App';

export interface AgentActionRequest {
  action: string;
  parameters?: Record<string, any>;
  clusterId?: string;
}

export interface AgentMessageRequest {
  content: string;
  conversationId?: string;
  agentId: string;
  metadata?: Record<string, any>;
}

export interface AgentMessageResponse {
  id: string;
  content: string;
  sender: 'user' | 'agent';
  timestamp: string;
  metadata?: Record<string, any>;
}

export const agentApi = {
  /**
   * Get all available agents
   */
  async getAgents() {
    return apiCall('/agents');
  },

  /**
   * Get a specific agent by ID
   */
  async getAgent(agentId: string) {
    return apiCall(`/agents/${agentId}`);
  },

  /**
   * Execute an agent action
   */
  async executeAction(agentId: string, action: AgentActionRequest) {
    return apiCall(`/agents/${agentId}/actions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(action),
    });
  },

  /**
   * Send a message to an agent
   */
  async sendMessage(message: AgentMessageRequest): Promise<AgentMessageResponse> {
    return apiCall('/agents/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
  },

  /**
   * Get conversation history
   */
  async getConversation(conversationId: string) {
    return apiCall(`/conversations/${conversationId}`);
  },

  /**
   * Get all conversations for the current user
   */
  async getConversations() {
    return apiCall('/conversations');
  },

  /**
   * Get agent status
   */
  async getAgentStatus(agentId: string) {
    return apiCall(`/agents/${agentId}/status`);
  },

  /**
   * Update agent configuration
   */
  async updateAgent(agentId: string, config: any) {
    return apiCall(`/agents/${agentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });
  },

  /**
   * Get agent activity logs
   */
  async getAgentLogs(agentId: string, params?: { limit?: number; offset?: number }) {
    const query = params ? `?${new URLSearchParams(params as any).toString()}` : '';
    return apiCall(`/agents/${agentId}/logs${query}`);
  },

  /**
   * Get available agent actions
   */
  async getAvailableActions(agentId: string) {
    return apiCall(`/agents/${agentId}/available-actions`);
  },
};
