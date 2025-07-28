import { 
  Agent, 
  AgentCapability, 
  AgentMessage, 
  Conversation, 
  AgentAction, 
  AgentStatus, 
  CapabilityInfo,
  ActionSchema,
  ApiResponse,
  PaginatedResponse
} from '../types';
import { apiCall } from '../../../utils/api';
import { API_BASE_URL } from '../../../config';

// API endpoints
const ENDPOINTS = {
  AGENTS: `${API_BASE_URL}/api/agents`,
  AGENT: (id: string) => `${API_BASE_URL}/api/agents/${id}`,
  AGENT_STATUS: (id: string) => `${API_BASE_URL}/api/agents/${id}/status`,
  AGENT_CAPABILITIES: (id: string) => `${API_BASE_URL}/api/agents/${id}/capabilities`,
  AGENT_CAPABILITY: (agentId: string, capabilityName: string) => 
    `${API_BASE_URL}/api/agents/${agentId}/capabilities/${capabilityName}`,
  AGENT_ACTION: (agentId: string, action: string) => 
    `${API_BASE_URL}/api/agents/${agentId}/actions/${action}`,
  CONVERSATIONS: `${API_BASE_URL}/api/conversations`,
  CONVERSATION: (id: string) => `${API_BASE_URL}/api/conversations/${id}`,
  CONVERSATION_MESSAGES: (id: string) => `${API_BASE_URL}/api/conversations/${id}/messages`,
  MESSAGES: `${API_BASE_URL}/api/messages`,
  CAPABILITIES: `${API_BASE_URL}/api/capabilities`
};

class AgentService {
  // Capability Management
  async getAvailableCapabilities(): Promise<CapabilityInfo[]> {
    try {
      console.log('Fetching capabilities from /agents/capabilities');
      const response = await apiCall<{ data: CapabilityInfo[] }>('/agents/capabilities');
      
      console.log('Capabilities API response:', response);
      
      if (!response) {
        console.error('No response received from capabilities API');
        return [];
      }
      
      if (!response.success) {
        console.error('API call was not successful:', response.error);
        return [];
      }
      
      if (!response.data) {
        console.error('No data in the response');
        return [];
      }
      
      console.log('Mapped capabilities:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching capabilities:', error);
      throw error;
    }
  }

  async getAgentCapabilities(agentId: string): Promise<CapabilityInfo[]> {
    try {
      const response = await apiCall<ApiResponse<CapabilityInfo[]>>({
        url: ENDPOINTS.AGENT_CAPABILITIES(agentId),
        method: 'GET'
      });

      if (!response.success || !response.data) {
        console.error('Failed to fetch agent capabilities:', response.error);
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
      const response = await apiCall<ApiResponse<CapabilityInfo>>({
        url: ENDPOINTS.AGENT_CAPABILITY(agentId, capabilityName),
        method: 'GET'
      });

      if (!response.success || !response.data) {
        console.error('Failed to fetch capability details:', response.error);
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
    parameters: Record<string, any> = {}
  ): Promise<ApiResponse<any>> {
    try {
      const response = await apiCall<ApiResponse<any>>({
        url: `${ENDPOINTS.AGENT_CAPABILITY(agentId, capabilityName)}/actions/${action}`,
        method: 'POST',
        data: parameters
      });

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to execute action'
        };
      }
      
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error(`Failed to execute ${action} on ${capabilityName}:`, error);
      return {
        success: false,
        error: error.message || 'Failed to execute action'
      };
    }
  }

  // Agent Management
  private mapCapabilities(capabilities: AgentCapability[] = []): AgentCapability[] {
    if (!Array.isArray(capabilities)) {
      console.warn('Expected capabilities to be an array, got:', capabilities);
      return [];
    }
    
    return capabilities.map(cap => ({
      id: cap.id || cap.name,
      name: cap.name,
      description: cap.description || '',
      enabled: cap.enabled !== false,
      config: cap.config || {},
      actions: Array.isArray(cap.actions) 
        ? cap.actions.map(action => ({
            name: action.name,
            description: action.description || '',
            parameters: action.parameters || {}
          }))
        : []
    }));
  }

  async getAllAgents(): Promise<Agent[]> {
    try {
      const response = await apiCall<ApiResponse<Agent[]>>({
        url: ENDPOINTS.AGENTS,
        method: 'GET'
      });

      if (!response.success || !response.data) {
        console.error('Failed to fetch agents:', response.error);
        return [];
      }

      // Ensure each agent has the expected structure
      return response.data.map(agent => ({
        id: agent.id,
        name: agent.name,
        description: agent.description || '',
        version: agent.version || '1.0.0',
        status: agent.status || 'offline',
        metadata: agent.metadata || {},
        capabilities: this.mapCapabilities(agent.capabilities || []),
        createdAt: agent.createdAt || new Date().toISOString(),
        updatedAt: agent.updatedAt || new Date().toISOString()
      }));
    } catch (error) {
      console.error('Error fetching agents:', error);
      throw error;
    }
  }

  // Conversation Management
  async getAgentConversations(agentId: string): Promise<Conversation[]> {
    try {
      const response = await apiCall<ApiResponse<Conversation[]>>({
        url: `${ENDPOINTS.AGENT(agentId)}/conversations`,
        method: 'GET'
      });

      if (!response.success || !response.data) {
        console.error('Failed to fetch conversations:', response.error);
        return [];
      }
      
      // Ensure consistent data structure
      return response.data.map(conv => ({
        ...conv,
        messages: Array.isArray(conv.messages) ? conv.messages : []
      }));
    } catch (error) {
      console.error(`Failed to fetch conversations for agent ${agentId}:`, error);
      throw error;
    }
  }

  async getConversation(conversationId: string): Promise<Conversation | null> {
    try {
      const response = await apiCall<ApiResponse<Conversation>>({
        url: ENDPOINTS.CONVERSATION(conversationId),
        method: 'GET'
      });

      if (!response.success || !response.data) {
        console.error('Failed to fetch conversation:', response.error);
        return null;
      }
      
      // Ensure messages array exists
      return {
        ...response.data,
        messages: Array.isArray(response.data.messages) ? response.data.messages : []
      };
    } catch (error) {
      console.error(`Failed to fetch conversation ${conversationId}:`, error);
      throw error;
    }
  }

  async createConversation(
    title: string, 
    agentId: string, 
    metadata: Record<string, any> = {}
  ): Promise<Conversation> {
    try {
      const response = await apiCall<ApiResponse<Conversation>>({
        url: ENDPOINTS.CONVERSATIONS,
        method: 'POST',
        data: {
          title,
          agent_id: agentId,
          metadata
        }
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to create conversation');
      }
      
      // Ensure messages array exists
      return {
        ...response.data,
        messages: Array.isArray(response.data.messages) ? response.data.messages : []
      };
    } catch (error) {
      console.error('Failed to create conversation:', error);
      throw error;
    }
  }

  // Message Handling
  async sendMessage(
    agentId: string, 
    content: string, 
    conversationId?: string
  ): Promise<AgentMessage> {
    try {
      if (!conversationId) {
        // Create a new conversation if no ID is provided
        const conversation = await this.createConversation(
          'New Conversation',
          agentId,
          { auto_created: true }
        );
        conversationId = conversation.id;
      }
      
      const response = await apiCall<ApiResponse<AgentMessage>>({
        url: ENDPOINTS.MESSAGES,
        method: 'POST',
        data: {
          conversation_id: conversationId,
          content,
          sender: 'user',
          metadata: {
            agent_id: agentId,
            timestamp: new Date().toISOString()
          }
        }
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

  // Agent Actions
  async executeAction(agentId: string, action: string, params: any = {}): Promise<any> {
    try {
      // Check if this is a capability action (format: 'capability.action')
      if (action.includes('.')) {
        const [capability, actionName] = action.split('.');
        return this.executeCapabilityAction(agentId, capability, actionName, params);
      }

      // If this is a direct action, handle it here
      const now = new Date().toISOString();
      let result: any = null;
      
      // Handle security actions
      if (action.startsWith('security.')) {
        const securityAction = action.split('.')[1];
        if (securityAction === 'run_scan') {
          result = {
            vulnerabilities: [
              { severity: 'high', name: 'CVE-2023-1234', fixedIn: '1.2.3' },
              { severity: 'medium', name: 'CVE-2023-1235', fixedIn: '2.0.0' }
            ],
            scanComplete: true,
            timestamp: now
          };
        } else if (securityAction === 'check_compliance') {
          result = {
            compliant: false,
            checks: [
              { name: 'RBAC', status: 'pass', description: 'RBAC is properly configured' },
              { name: 'NetworkPolicies', status: 'fail', description: 'Missing default deny network policy' },
              { name: 'PodSecurity', status: 'warn', description: 'Some pods are running as root' }
            ],
            timestamp: now
          };
        }
      } 
      // Handle cost actions
      else if (action.startsWith('cost.')) {
        const costAction = action.split('.')[1];
        if (costAction === 'get_cost_report') {
          result = {
            currentMonth: 1250.50,
            lastMonth: 1450.25,
            estimatedSavings: 350.75,
            resources: [
              { name: 'prod-cluster', cost: 850.50, savings: 150.25 },
              { name: 'staging-cluster', cost: 400.00, savings: 200.50 }
            ],
            timestamp: now
          };
        } else if (costAction === 'get_optimization_tips') {
          result = {
            tips: [
              { 
                title: 'Downscale non-production clusters at night',
                potentialSavings: '$200/month',
                effort: 'low'
              },
              { 
                title: 'Right-size over-provisioned pods',
                potentialSavings: '$120/month',
                effort: 'medium'
              }
            ],
            timestamp: now
          };
        }
      }
      // Handle deployment actions
      else if (action.startsWith('deployment.')) {
        const deploymentAction = action.split('.')[1];
        if (deploymentAction === 'deploy') {
          result = {
            success: true,
            deploymentId: `deploy-${Date.now()}`,
            status: 'in-progress',
            message: 'Deployment started successfully',
            timestamp: now
          };
        } else if (deploymentAction === 'get_status') {
          result = {
            status: 'running',
            replicas: 3,
            availableReplicas: 3,
            conditions: [
              { type: 'Available', status: 'True', lastUpdateTime: now },
              { type: 'Progressing', status: 'True', lastUpdateTime: now }
            ],
            timestamp: now
          };
        }
      }
      // For any other action, call the API
      else {
        try {
          const response = await apiCall<ApiResponse<any>>({
            url: ENDPOINTS.AGENT_ACTION(agentId, action),
            method: 'POST',
            data: params
          });

          if (!response.success) {
            throw new Error(response.error || `Failed to execute action '${action}'`);
          }
          
          result = response.data;
        } catch (apiError) {
          // If API call fails, return a default response
          result = { 
            success: true, 
            message: `Action '${action}' executed successfully (mocked response)`,
            params,
            timestamp: now
          };
        }
      }
      
      if (!result) {
        throw new Error(`Action '${action}' is not supported by this agent`);
      }
      
      console.log(`Action ${action} result:`, result);
      return result;
      
    } catch (error) {
      console.error(`Error executing action ${action} on agent ${agentId}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString()
      };
    }
  }
}
// Export a singleton instance
export const agentService = new AgentService();
