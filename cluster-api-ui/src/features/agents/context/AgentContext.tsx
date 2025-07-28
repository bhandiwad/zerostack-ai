import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { agentService, CapabilityInfo, CapabilityActionResponse } from '../services/AgentService';
import { v4 as uuidv4 } from 'uuid';
import { 
  Agent, 
  AgentContextType, 
  AgentMessage, 
  AgentStatus,
  AgentCapability,
  ActionSchema, 
  ParameterSchema 
} from '../types';

// Define Conversation interface locally since it's not exported from types
export interface Conversation {
  id: string;
  title: string;
  messages: AgentMessage[];
  createdAt: Date;
  updatedAt: Date;
  context?: Record<string, any>;
}

// Extend the AgentContextType to include agent management functions
type ExtendedAgentContextType = AgentContextType & {
  createAgent: (agentData: Omit<Agent, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => Promise<Agent>;
  updateAgent: (id: string, agentData: Partial<Agent>) => Promise<boolean>;
  deleteAgent: (id: string) => Promise<boolean>;
  loading: boolean;
  error: string | null;
};

// Create the context with a default value
const AgentContext = createContext<ExtendedAgentContextType | undefined>(undefined);

// Default agent status when agent data is not available
const DEFAULT_AGENT_STATUS: AgentStatus = {
  isActive: false,
  health: 'unhealthy',
  lastPing: new Date()
};

// Default agent capabilities for new agents
const DEFAULT_AGENT_CAPABILITIES: AgentCapability[] = [
  {
    name: 'monitoring',
    description: 'Monitor cluster health and resources',
    config: {
      enabled: true,
      type: 'monitoring',
      version: '1.0.0',
      metadata: {
        icon: 'monitor_heart',
        color: '#4caf50'
      }
    }
  },
  {
    name: 'automation',
    description: 'Automate cluster operations',
    config: {
      enabled: true,
      type: 'automation',
      version: '1.0.0',
      metadata: {
        icon: 'auto_awesome',
        color: '#2196f3'
      }
    }
  }
];

export const AgentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize with empty state
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Conversation state
  const [conversations, setConversations] = useState<Record<string, Conversation>>({});
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  
  // Message state
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  
  // Agent status and capabilities state
  const [agentStatus, setAgentStatus] = useState<Record<string, AgentStatus>>({});
  const [availableCapabilities, setAvailableCapabilities] = useState<CapabilityInfo[]>([]);
  const [agentCapabilities, setAgentCapabilities] = useState<Record<string, AgentCapability[]>>({});
  const [loadingCapabilities, setLoadingCapabilities] = useState<boolean>(false);

  // Load agents from the API
  const loadAgents = useCallback(async (): Promise<Agent[]> => {
    try {
      setLoading(true);
      setError(null);
      
      const loadedAgents = await agentService.getAllAgents();
      setAgents(loadedAgents);
      
      // Update agent statuses
      const statuses: Record<string, AgentStatus> = {};
      loadedAgents.forEach(agent => {
        statuses[agent.id] = agent.status || DEFAULT_AGENT_STATUS;
      });
      setAgentStatus(statuses);
      
      // Set the first agent as selected if none is selected
      if (loadedAgents.length > 0 && !selectedAgentId) {
        setSelectedAgentId(loadedAgents[0].id);
      }
      
      return loadedAgents;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load agents';
      setError(message);
      console.error('Error loading agents:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [selectedAgentId]);

  // Load available capabilities
  const loadAvailableCapabilities = useCallback(async () => {
    try {
      setLoadingCapabilities(true);
      const capabilities = await agentService.getAvailableCapabilities();
      setAvailableCapabilities(capabilities);
    } catch (err) {
      console.error('Failed to load available capabilities:', err);
      setError('Failed to load capabilities');
    } finally {
      setLoadingCapabilities(false);
    }
  }, []);

  // Load capabilities for a specific agent
  const loadAgentCapabilities = useCallback(async (agentId: string) => {
    try {
      setLoadingCapabilities(true);
      const capabilities = await agentService.getAgentCapabilities(agentId);
      
      setAgentCapabilities(prev => ({
        ...prev,
        [agentId]: capabilities.map(cap => ({
          id: cap.name,
          name: cap.name,
          description: cap.description,
          parameters: {}
        }))
      }));
    } catch (err) {
      console.error(`Failed to load capabilities for agent ${agentId}:`, err);
      setError('Failed to load agent capabilities');
    } finally {
      setLoadingCapabilities(false);
    }
  }, []);

  // Load initial data
  useEffect(() => {
    let mounted = true;
    
    const loadInitialData = async () => {
      try {
        await Promise.all([
          loadAvailableCapabilities(),
          loadAgents()
        ]);
      } catch (err) {
        console.error('Failed to load initial data:', err);
      }
    };
    
    if (mounted) {
      loadInitialData();
    }
    
    return () => {
      mounted = false;
    };
  }, [loadAvailableCapabilities, loadAgents]);
  
  // Poll agent status and capabilities periodically
  useEffect(() => {
    if (agents.length === 0) return;
    
    const interval = setInterval(async () => {
      try {
        const [updatedAgents] = await Promise.all([
          agentService.getAllAgents(),
          loadAvailableCapabilities() // Refresh available capabilities
        ]);
        
        const statuses: Record<string, AgentStatus> = {}
        
        updatedAgents.forEach(agent => {
          statuses[agent.id] = agent.status || DEFAULT_AGENT_STATUS;
          // Refresh capabilities for each agent
          loadAgentCapabilities(agent.id).catch(console.error);
        });
        
        setAgentStatus(prev => ({
          ...prev,
          ...statuses
        }));
      } catch (err) {
        console.error('Error in polling interval:', err);
      }
    }, 30000); // Poll every 30 seconds
    
    return () => clearInterval(interval);
  }, [agents, loadAgentCapabilities, loadAvailableCapabilities]);

  // Load messages when conversation changes
  useEffect(() => {
    if (!currentConversation) return;
    
    const loadMessages = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // TODO: Implement message loading from the API
        // const conversationMessages = await agentService.getConversationMessages(currentConversation.id);
        // setMessages(conversationMessages);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load messages';
        setError(message);
        console.error('Error loading messages:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadMessages();
  }, [currentConversation]);
  
  // Update agent status when selected agent changes
  const updateAgentStatus = useCallback((agentId: string, status: Partial<AgentStatus>) => {
    setAgentStatus(prev => ({
      ...prev,
      [agentId]: {
        ...DEFAULT_AGENT_STATUS,
        ...prev[agentId],
        ...status
      }
    }));
  }, []);
  
  // Get agent status
  const getAgentStatus = useCallback((agentId: string): AgentStatus => {
    return agentStatus[agentId] || DEFAULT_AGENT_STATUS;
  }, [agentStatus]);
  
  // Get current agent status
  const currentAgentStatus = useMemo(() => {
    return selectedAgentId ? getAgentStatus(selectedAgentId) : DEFAULT_AGENT_STATUS;
  }, [selectedAgentId, getAgentStatus]);

  // Create a new conversation
  const createConversation = useCallback(async (agentId: string, title: string = 'New Conversation'): Promise<Conversation> => {
    try {
      if (!agentId) throw new Error('Agent ID is required');
      
      const conversation = await agentService.createConversation(title, agentId);
      setConversations(prev => ({
        ...prev,
        [conversation.id]: conversation
      }));
      
      setCurrentConversation(conversation);
      return conversation;
    } catch (err) {
      console.error('Error creating conversation:', err);
      throw err;
    }
  }, []);

  // Select an existing conversation
  const selectConversation = useCallback(async (conversationId: string) => {
    try {
      const conversation = await agentService.getConversation(conversationId);
      if (conversation) {
        setCurrentConversation(conversation);
      }
    } catch (err) {
      console.error('Error selecting conversation:', err);
      throw err;
    }
  }, []);

  // Get all conversations for an agent
  const getAgentConversations = useCallback(async (agentId: string): Promise<Record<string, Conversation>> => {
    try {
      const agentConversations = await agentService.getAgentConversations(agentId);
      
      // Convert array to record
      const conversationsRecord = agentConversations.reduce((acc, conversation) => {
        acc[conversation.id] = conversation;
        return acc;
      }, {} as Record<string, Conversation>);
      
      setConversations(prev => ({
        ...prev,
        ...conversationsRecord
      }));
      
      return conversationsRecord;
    } catch (err) {
      console.error('Error loading conversations:', err);
      return {}; // Return empty object instead of array to match return type
    }
  }, []);

  // Refresh all data
  const refreshAll = useCallback(async (): Promise<void> => {
    try {
      const loadedAgents = await loadAgents();
      
      if (loadedAgents && loadedAgents.length > 0) {
        // If we have a selected agent, refresh their conversations
        const agentToUse = selectedAgentId || loadedAgents[0].id;
        if (agentToUse) {
          await getAgentConversations(agentToUse);
        }
      }
    } catch (err) {
      console.error('Error refreshing data:', err);
      // Error is already handled in loadAgents
    }
  }, [selectedAgentId, currentConversation]);

  // Send a message in the current conversation
  const sendMessage = useCallback(async (content: string, conversationId?: string): Promise<void> => {
    if (!selectedAgentId) {
      throw new Error('No agent selected');
    }
    
    try {
      // If no conversation ID is provided, create a new one
      let convId = conversationId || currentConversation?.id;
      
      // Add user message to UI immediately for better UX
      const userMessage: AgentMessage = {
        id: `temp-${Date.now()}`,
        content,
        sender: 'user',
        timestamp: new Date(),
        conversationId: convId || 'temp',
      };
      
      setMessages(prev => [...prev, userMessage]);
      
      // Send the message to the agent
      const response = await agentService.sendMessage(selectedAgentId, content, convId);
      
      // Update the messages with the actual response
      setMessages(prev => [
        ...prev.filter(m => m.id !== userMessage.id), // Remove temp message
        {
          ...userMessage,
          id: `msg-${Date.now()}-user`,
        },
        response,
      ]);
      
      // If this was a new conversation, update the current conversation
      if (!convId && response.conversationId) {
        const conversation = await agentService.getConversation(response.conversationId);
        if (conversation) {
          setCurrentConversation(conversation);
          setConversations(prev => ({
            ...prev,
            [conversation.id]: conversation
          }));
        }
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
      throw err;
    }
  }, [selectedAgentId, currentConversation]);

  // Execute an agent action or capability action
  const executeAction = useCallback(async (agentId: string, action: string, params: any = {}) => {
    try {
      // If this is a capability action (format: 'capability.action')
      if (action.includes('.')) {
        const [capability, actionName] = action.split('.');
        
        // Get capability details to validate the action
        const capabilityDetails = await agentService.getCapabilityDetails(agentId, capability);
        if (!capabilityDetails) {
          throw new Error(`Capability '${capability}' not found`);
        }
        
        // Check if the action is valid for this capability
        if (!capabilityDetails.actions.includes(actionName)) {
          throw new Error(`Action '${actionName}' not found in capability '${capability}'`);
        }
      }
      
      // Execute the action
      const result = await agentService.executeAction(agentId, action, params);
      
      // If this was a capability action, refresh the agent's capabilities
      if (action.includes('.')) {
        loadAgentCapabilities(agentId).catch(console.error);
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute action';
      console.error('Error executing action:', errorMessage, err);
      setError(errorMessage);
      throw err;
    }
  }, [loadAgentCapabilities]);

  // Get capabilities for the current agent
  const getAgentCapabilities = useCallback((agentId: string): AgentCapability[] => {
    return agentCapabilities[agentId] || [];
  }, [agentCapabilities]);
  
  // Get details for a specific capability
  const getCapabilityDetails = useCallback(async (agentId: string, capabilityName: string) => {
    try {
      return await agentService.getCapabilityDetails(agentId, capabilityName);
    } catch (err) {
      console.error(`Error getting capability details for ${capabilityName}:`, err);
      setError('Failed to get capability details');
      throw err;
    }
  }, []);

  // Agent CRUD operations
  const createAgent = useCallback(async (agentData: Omit<Agent, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => {
    setLoading(true);
    setError(null);
    try {
      // In a real app, this would be an API call
      const newAgent: Agent = {
        ...agentData,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: {
          isActive: true,
          health: 'healthy',
          lastPing: new Date()
        },
        capabilities: [...DEFAULT_AGENT_CAPABILITIES],
        config: {}
      };

      setAgents(prev => [...prev, newAgent]);
      setSelectedAgentId(newAgent.id);
      return newAgent;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create agent';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateAgent = useCallback(async (id: string, agentData: Partial<Agent>) => {
    setLoading(true);
    setError(null);
    try {
      // In a real app, this would be an API call
      setAgents(prev => 
        prev.map(agent => 
          agent.id === id 
            ? { 
                ...agent, 
                ...agentData, 
                updatedAt: new Date().toISOString() 
              } 
            : agent
        )
      );
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update agent';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteAgent = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      // In a real app, this would be an API call
      setAgents(prev => prev.filter(agent => agent.id !== id));
      
      // If the deleted agent was selected, clear the selection
      if (selectedAgentId === id) {
        setSelectedAgentId(null);
      }
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete agent';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [selectedAgentId]);

  // Helper function to get available capabilities
  const getAvailableCapabilities = useCallback((): AgentCapability[] => {
    return [...DEFAULT_AGENT_CAPABILITIES];
  }, []);

  // Helper function to get conversation messages
  const getConversationMessages = useCallback((conversationId: string): AgentMessage[] => {
    // In a real app, this would fetch messages from the API
    return [];
  }, []);

  // Helper function to delete a conversation
  const deleteConversation = useCallback(async (conversationId: string): Promise<void> => {
    // In a real app, this would call the API to delete the conversation
    console.log('Deleting conversation:', conversationId);
  }, []);

  // Refresh agents list
  const refreshAgents = useCallback(async (): Promise<Agent[]> => {
    // In a real app, this would fetch the latest agents from the API
    return [];
  }, []);

  // Refresh agent status
  const refreshAgentStatus = useCallback(async (agentId: string): Promise<AgentStatus> => {
    // In a real app, this would fetch the latest status from the API
    return {
      isActive: true,
      health: 'healthy',
      lastPing: new Date()
    };
  }, []);

  // The value that will be available to consumers
  const value = useMemo(() => ({
    agents,
    selectedAgentId,
    loading,
    error,
    selectAgent: setSelectedAgentId,
    loadAgents,
    getAgentCapabilities,
    getAvailableCapabilities,
    loadAgentCapabilities,
    executeAction,
    getAgentStatus,
    getAgentConversations,
    getConversationMessages,
    sendMessage,
    createConversation,
    deleteConversation,
    refreshAgents,
    refreshAll,
    refreshAgentStatus,
    // Agent management functions
    createAgent,
    updateAgent,
    deleteAgent,
    currentConversation: selectedAgentId && conversations[selectedAgentId]?.[0],
  }), [
    agents,
    selectedAgentId,
    loading,
    error,
    conversations,
    loadAgents,
    getAgentCapabilities,
    getAvailableCapabilities,
    loadAgentCapabilities,
    executeAction,
    getAgentStatus,
    getAgentConversations,
    getConversationMessages,
    sendMessage,
    createConversation,
    deleteConversation,
    refreshAgents,
    refreshAll,
    refreshAgentStatus,
    createAgent,
    updateAgent,
    deleteAgent,
  ]);

  return (
    <AgentContext.Provider value={contextValue}>
      {children}
    </AgentContext.Provider>
  );
};

// Custom hook to use the agent context
export const useAgents = (): ExtendedAgentContextType => {
  const context = useContext(AgentContext);
  if (context === undefined) {
    throw new Error('useAgents must be used within an AgentProvider');
  }
  return context;
};
