import { apiCall } from '../../../utils/api';
import { Agent, AgentMessage, JSONValue } from '../types';

export interface AgentActionRequest {
  action: string;
  parameters?: Record<string, JSONValue>;
  clusterId?: string;
}

export interface AgentMessageRequest {
  content: string;
  conversationId?: string;
  agentId: string;
  metadata?: Record<string, unknown>;
}

export interface AgentMessageResponse {
  id: string;
  content: string;
  sender: 'user' | 'agent';
  timestamp: string;
  metadata?: Record<string, unknown>;
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
  async executeAction(agentId: string, action: AgentActionRequest): Promise<AgentMessage> {
    const response = await apiCall<AgentMessage>(`/agents/${agentId}/actions/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      data: JSON.stringify(action),
    });
    if (!response || !response.data) {
      throw new Error('Failed to execute action or no data returned');
    }
    return response.data;
  },

  /**
   * Send a message to an agent
   */
  async sendMessage(message: AgentMessageRequest, conversationId?: string): Promise<AgentMessage> {
    const request = {
      content: message.content,
      conversationId,
      agentId: message.agentId,
    };
    const response = await apiCall<AgentMessage>('/agents/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      data: JSON.stringify(request),
    });
    if (!response || !response.data) {
      throw new Error('Failed to send message or no data returned');
    }
    return response.data;
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
  async updateAgent(agentId: string, config: Partial<Agent>): Promise<Agent> {
    const response = await apiCall<Agent>(`/agents/${agentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      data: config,
    });
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to update agent');
    }
    return response.data;
  },

  /**
   * Get agent activity logs
   */
  async getAgentLogs(agentId: string, params?: { limit?: number; offset?: number }) {
    const queryParams: Record<string, string> = {};
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.offset) queryParams.offset = String(params.offset);
    const query = Object.keys(queryParams).length > 0 ? `?${new URLSearchParams(queryParams).toString()}` : '';
    return apiCall(`/agents/${agentId}/logs${query}`);
  },

  /**
   * Get available agent actions
   */
  async getAvailableActions(agentId: string) {
    return apiCall(`/agents/${agentId}/available-actions`);
  },
};
