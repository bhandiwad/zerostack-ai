import { AgentType } from '../ai/aiAgents';

export interface AgentInstance {
  id: string;
  name: string;
  description: string;
  type: string;
  status: string;
  capabilities: Array<{
    name: string;
    description: string;
    config: Record<string, unknown>;
  }>;
  created_at: string;
  updated_at: string;
  last_active: string | null;
  metadata: Record<string, unknown>;
  config: Record<string, unknown>;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002/api';

export const agentApi = {
  // Get all agents
  async getAgents(): Promise<AgentInstance[]> {
    const response = await fetch(`${API_BASE_URL}/agents`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch agents: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data || [];
  },

  // Get a single agent by ID
  async getAgent(agentId: string): Promise<AgentInstance> {
    const response = await fetch(`${API_BASE_URL}/agents/${agentId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch agent: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  },

  // Create a new agent
  async createAgent(agentData: {
    name: string;
    description: string;
    type: AgentType;
    config?: Record<string, unknown>;
    capabilities?: string[];
  }): Promise<AgentInstance> {
    const response = await fetch(`${API_BASE_URL}/agents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(agentData),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `Failed to create agent: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  },

  // Update an existing agent
  async updateAgent(
    agentId: string,
    updates: Partial<{
      name: string;
      description: string;
      config: Record<string, unknown>;
      capabilities: string[];
      status: string;
    }>
  ): Promise<AgentInstance> {
    const response = await fetch(`${API_BASE_URL}/agents/${agentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `Failed to update agent: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  },

  // Delete an agent
  async deleteAgent(agentId: string): Promise<boolean> {
    const response = await fetch(`${API_BASE_URL}/agents/${agentId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `Failed to delete agent: ${response.statusText}`);
    }

    return true;
  },
};
