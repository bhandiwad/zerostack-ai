import { agentService } from '../services/AgentService';
import { apiCall } from '../../../utils/api';

// Mock the apiCall utility
jest.mock('../../../utils/api', () => ({
  apiCall: jest.fn(),
}));

describe('AgentService', () => {
  const mockApiCall = apiCall as jest.MockedFunction<typeof apiCall>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock localStorage
    Storage.prototype.getItem = jest.fn(() => 'test-token');
    
    // Reset the singleton instance for each test
    Object.defineProperty(agentService, 'data', {
      value: [],
      writable: true,
    });
  });

  describe('getAvailableCapabilities', () => {
    it('should fetch available capabilities', async () => {
      const mockCapabilities = [
        { name: 'monitoring', description: 'Monitoring capability' },
        { name: 'automation', description: 'Automation capability' },
      ];
      
      // Mock the implementation to return the mock data
      mockApiCall.mockImplementation((url) => {
        if (url === '/agents/capabilities') {
          return Promise.resolve({
            success: true,
            data: mockCapabilities,
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      const result = await agentService.getAvailableCapabilities();
      
      // Verify the API was called with the correct URL
      expect(mockApiCall).toHaveBeenCalledWith('/agents/capabilities');
      expect(result).toEqual(mockCapabilities);
    });

    it('should handle API errors', async () => {
      mockApiCall.mockResolvedValueOnce({
        success: false,
        error: 'Failed to fetch capabilities',
      });

      const result = await agentService.getAvailableCapabilities();
      expect(result).toEqual([]);
    });
  });

  describe('getAgentCapabilities', () => {
    it('should fetch capabilities for a specific agent', async () => {
      const agentId = 'agent-123';
      const mockCapabilities = [
        { name: 'monitoring', description: 'Monitoring capability', enabled: true },
      ];
      
      mockApiCall.mockResolvedValueOnce({
        success: true,
        data: mockCapabilities,
      });

      const result = await agentService.getAgentCapabilities(agentId);
      
      // The actual endpoint being called includes the full URL with API base
      expect(mockApiCall).toHaveBeenCalledWith({
        url: expect.stringContaining(`/api/agents/${agentId}/capabilities`),
        method: 'GET',
      });
      expect(result).toEqual(mockCapabilities);
    });
  });

  describe('executeCapabilityAction', () => {
    it('should execute a capability action', async () => {
      const agentId = 'agent-123';
      const capabilityName = 'monitoring';
      const action = 'check_health';
      const params = { interval: 60 };
      const mockResponse = { status: 'healthy' };
      
      mockApiCall.mockResolvedValueOnce({
        success: true,
        data: mockResponse,
      });

      const result = await agentService.executeCapabilityAction(
        agentId,
        capabilityName,
        action,
        params
      );
      
      // The actual endpoint being called includes the full URL with API base
      expect(mockApiCall).toHaveBeenCalledWith({
        url: expect.stringContaining(`/api/agents/${agentId}/capabilities/${capabilityName}/actions/${action}`),
        method: 'POST',
        data: params,
      });
      expect(result).toEqual({
        success: true,
        data: mockResponse,
      });
    });
  });

  describe('getAllAgents', () => {
    it('should fetch all agents', async () => {
      const mockAgents = [
        { 
          id: 'agent-1', 
          name: 'Test Agent', 
          description: 'Test Description',
          status: 'online',
          capabilities: []
        },
      ];
      
      mockApiCall.mockResolvedValueOnce({
        success: true,
        data: mockAgents,
      });

      const result = await agentService.getAllAgents();
      
      // The actual endpoint being called includes the full URL with API base
      expect(mockApiCall).toHaveBeenCalledWith({
        url: expect.stringContaining('/api/agents'),
        method: 'GET',
      });
      expect(result).toEqual(expect.arrayContaining([
        expect.objectContaining({
          id: 'agent-1',
          name: 'Test Agent',
          status: 'online',
        })
      ]));
    });
  });

  describe('sendMessage', () => {
    it('should send a message to an existing conversation', async () => {
      const agentId = 'agent-123';
      const conversationId = 'conv-123';
      const message = 'Hello, agent!';
      const mockResponse = {
        id: 'msg-123',
        content: message,
        sender: 'user',
        conversationId,
        timestamp: new Date().toISOString(),
      };
      
      mockApiCall.mockResolvedValueOnce({
        success: true,
        data: mockResponse,
      });

      const result = await agentService.sendMessage(agentId, message, conversationId);
      
      // The actual endpoint being called includes the full URL with API base
      expect(mockApiCall).toHaveBeenCalledWith({
        url: expect.stringContaining('/api/messages'),
        method: 'POST',
        data: {
          conversation_id: conversationId,
          content: message,
          sender: 'user',
          metadata: expect.objectContaining({
            agent_id: agentId,
            timestamp: expect.any(String),
          }),
        },
      });
      expect(result).toEqual(mockResponse);
    });
  });
});
