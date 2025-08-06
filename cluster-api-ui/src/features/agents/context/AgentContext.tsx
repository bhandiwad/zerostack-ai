import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from 'react';
import { agentService } from '../services/AgentService';
import { v4 as uuidv4 } from 'uuid';
import { notifications } from '@mantine/notifications';
import {
  Agent,
  AgentContextType,
  AgentMessage,
  AgentStatus,
  AgentCapability,
  CapabilityInfo,
  Conversation as AgentConversation
} from '../types';

// This will be the full context type, combining the base and the new functions
export type ExtendedAgentContextType = AgentContextType & {
  // Agent CRUD
  createAgent: (agentData: Omit<Agent, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => Promise<Agent>;
  updateAgent: (id: string, agentData: Partial<Agent>) => Promise<boolean>;
  deleteAgent: (id: string) => Promise<boolean>;

  // Capability Management
  addCapability: (agentId: string, capabilityName: string) => Promise<void>;
  removeCapability: (agentId: string, capabilityName: string) => Promise<void>;
  loadAgentCapabilities: (agentId: string) => Promise<void>;
  loadAvailableCapabilities: () => Promise<void>;
  availableCapabilities: CapabilityInfo[];
  loadingCapabilities: boolean;

  // State and Status
  loading: boolean;
  error: string | null;
  refreshAgents: () => Promise<Agent[]>;
  refreshAll: () => Promise<void>;
  refreshAgentStatus: (agentId: string) => Promise<void>;
};

// Create the context with a default undefined value, which forces a check in the consumer hook.
export const AgentContext = createContext<ExtendedAgentContextType | undefined>(undefined);

// Custom hook for easy and safe context consumption.
export const useAgentContext = () => {
  const context = useContext(AgentContext);
  if (context === undefined) {
    throw new Error('useAgentContext must be used within an AgentProvider');
  }
  return context;
};

const DEFAULT_AGENT_STATUS: AgentStatus = {
  isActive: false,
  health: 'unhealthy',
  lastPing: new Date(),
  message: 'Status not available'
};

// The main provider component
export const AgentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [conversations, setConversations] = useState<Record<string, AgentConversation>>({});
  const [currentConversation, setCurrentConversation] = useState<AgentConversation | null>(null);
  const [agentStatus, setAgentStatus] = useState<Record<string, AgentStatus>>({});
  const [agentCapabilities, setAgentCapabilities] = useState<Record<string, AgentCapability[]>>({});
  const [availableCapabilities, setAvailableCapabilities] = useState<CapabilityInfo[]>([]);
  const [loadingCapabilities, setLoadingCapabilities] = useState(false);

  const selectedAgent = useMemo(() => {
    return agents.find(agent => agent.id === selectedAgentId) || null;
  }, [selectedAgentId, agents]);

  const refreshAgents = useCallback(async () => {
    setLoading(true);
    try {
      const fetchedAgents = await agentService.getAllAgents();
      setAgents(fetchedAgents);
      setError(null);
      return fetchedAgents;
    } catch (err) {
      console.error('Failed to fetch agents:', err);
      setError('Failed to fetch agents');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshAgentStatus = useCallback(async (agentId: string) => {
    try {
      const simplifiedStatus = await agentService.getAgentStatus(agentId);
      const status: AgentStatus = {
        isActive: simplifiedStatus.status === 'online',
        lastPing: new Date(),
        health: simplifiedStatus.status === 'online' ? 'healthy' : simplifiedStatus.status === 'error' ? 'unhealthy' : 'degraded',
        message: simplifiedStatus.message,
      };
      setAgentStatus(prev => ({ ...prev, [agentId]: status }));
    } catch (err) {
      console.error(`Failed to refresh status for agent ${agentId}:`, err);
    }
  }, []);

  const loadAgentCapabilities = useCallback(async (agentId: string) => {
    setLoadingCapabilities(true);
    try {
      const capabilitiesInfo = await agentService.getAgentCapabilities(agentId);
      const capabilities: AgentCapability[] = capabilitiesInfo.map(info => ({
        id: info.name,
        name: info.name,
        description: info.description,
        enabled: true,
      }));
      setAgentCapabilities(prev => ({ ...prev, [agentId]: capabilities }));
      setError(null);
    } catch (err) {
      console.error(`Failed to load capabilities for agent ${agentId}:`, err);
      setError('Failed to load agent capabilities');
    } finally {
      setLoadingCapabilities(false);
    }
  }, []);

  const loadAvailableCapabilities = useCallback(async () => {
    if (loadingCapabilities) return;
    setLoadingCapabilities(true);
    try {
      const capabilities = await agentService.getAvailableCapabilities();
      setAvailableCapabilities(capabilities);
    } catch (err) {
      setError('Failed to load available capabilities');
      console.error(err);
    } finally {
      setLoadingCapabilities(false);
    }
  }, [loadingCapabilities]);

  const selectAgent = useCallback((agentId: string | null) => {
    setSelectedAgentId(agentId);
    if (agentId) {
      loadAgentCapabilities(agentId);
      refreshAgentStatus(agentId);
      setCurrentConversation(null);
    } else {
      setCurrentConversation(null);
    }
    }, [loadAgentCapabilities, refreshAgentStatus]);

  const createAgent = useCallback(async (agentData: Omit<Agent, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => {
    setLoading(true);
    try {
      const newAgent = await agentService.createAgent(agentData);
      setAgents(prev => [...prev, newAgent]);
      setError(null);
      return newAgent;
    } catch (err) {
      console.error('Failed to create agent:', err);
      setError('Failed to create agent');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateAgent = useCallback(async (id: string, agentData: Partial<Agent>) => {
    setLoading(true);
    try {
      const success = await agentService.updateAgent(id, agentData);
      if (success) {
        await refreshAgents();
      }
      setError(null);
      return true;
    } catch (err) {
      console.error(`Failed to update agent ${id}:`, err);
      setError('Failed to update agent');
      return false;
    } finally {
      setLoading(false);
    }
  }, [refreshAgents]);

  const deleteAgent = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const success = await agentService.deleteAgent(id);
      if (success) {
        setAgents(prev => prev.filter(agent => agent.id !== id));
        if (selectedAgentId === id) {
          setSelectedAgentId(null);
        }
      }
      setError(null);
      return true;
    } catch (err) {
      console.error(`Failed to delete agent ${id}:`, err);
      setError('Failed to delete agent');
      return false;
    } finally {
      setLoading(false);
    }
  }, [selectedAgentId]);

  const addCapability = useCallback(async (agentId: string, capabilityName: string) => {
    try {
      setError(null);
      const updatedAgent = await agentService.addAgentCapability(agentId, capabilityName);
      setAgents(prevAgents =>
        prevAgents.map(agent =>
          agent.id === agentId ? { ...agent, capabilities: updatedAgent.capabilities } : agent
        )
      );
      await loadAgentCapabilities(agentId);
    } catch (err) {
      console.error('Failed to add capability:', err);
      const message = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(message);
      throw err;
    }
  }, [loadAgentCapabilities]);

  const removeCapability = useCallback(async (agentId: string, capabilityName: string) => {
    try {
      setError(null);
      const updatedAgent = await agentService.removeAgentCapability(agentId, capabilityName);
      setAgents(prevAgents =>
        prevAgents.map(agent =>
          agent.id === agentId ? { ...agent, capabilities: updatedAgent.capabilities } : agent
        )
      );
      await loadAgentCapabilities(agentId);
    } catch (err) {
      console.error('Failed to remove capability:', err);
      const message = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(message);
      throw err;
    }
  }, [loadAgentCapabilities]);

  const refreshAll = useCallback(async () => {
    const fetchedAgents = await refreshAgents();
    fetchedAgents.forEach(agent => {
      refreshAgentStatus(agent.id);
      loadAgentCapabilities(agent.id);
    });
  }, [refreshAgents, refreshAgentStatus, loadAgentCapabilities]);

  useEffect(() => {
    refreshAgents();
    loadAvailableCapabilities();
  }, []);

  const sendMessage = useCallback(async (agentId: string, content: string, conversationId?: string) => {
    if (!agentId) {
      const err = new Error('No agent selected to send message');
      setError(err.message);
      console.error(err);
      throw err;
    }

    let convId = conversationId || currentConversation?.id;
    if (!convId) {
      const newConv = await agentService.createConversation(agentId, 'New Conversation');
      setConversations(prev => ({ ...prev, [newConv.id]: newConv }));
      convId = newConv.id;
      setCurrentConversation(newConv);
    }

    const userMessage: AgentMessage = {
      id: uuidv4(),
      content,
      sender: 'user',
      timestamp: new Date(),
      conversationId: convId,
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const agentResponse = await agentService.sendMessage(agentId, content, convId);
      setMessages(prev => [...prev, agentResponse]);
    } catch (err) {
      const error = err as Error;
      const errorMessageContent = error.message && error.message.includes('quota exceeded')
        ? error.message
        : 'Error: Could not get a response from the agent.';

      notifications.show({
        title: 'Agent Error',
        message: errorMessageContent,
        color: 'red',
      });

      const errorMessage: AgentMessage = {
        id: uuidv4(),
        content: errorMessageContent,
        sender: 'agent',
        timestamp: new Date(),
        conversationId: convId,
        metadata: { error: true },
      };
      setMessages(prev => [...prev, errorMessage]);
      setError('Failed to send message');
    }
  }, [selectedAgentId, currentConversation]);

  const value = useMemo(() => ({
    // Base properties
    agents,
    selectedAgent,
    messages,
    conversations,
    currentConversation,
    agentStatus: selectedAgentId ? agentStatus[selectedAgentId] : DEFAULT_AGENT_STATUS,
    capabilities: selectedAgentId ? agentCapabilities[selectedAgentId] || [] : [],
    loadingMessages: loading,

    // Base methods
    selectAgent,
    sendMessage,
    selectConversation: (conversationId: string | null) => {
      if (conversationId) {
        const conversation = conversations[conversationId];
        setCurrentConversation(conversation || null);
      } else {
        setCurrentConversation(null);
      }
    },
    
    // Extended properties
    loading,
    error,
    availableCapabilities,
    loadingCapabilities,

    // Extended methods
    createAgent,
    updateAgent,
    deleteAgent,
    addCapability,
    removeCapability,
    refreshAgents,
    refreshAgentStatus,
    refreshAll,
    loadAgentCapabilities,
    loadAvailableCapabilities,

    // Passthrough service methods
    createConversation: agentService.createConversation,
    deleteConversation: async (conversationId: string) => {
      await agentService.deleteConversation(conversationId);
      const newConversations = { ...conversations };
      delete newConversations[conversationId];
      setConversations(newConversations);
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null);
      }
    },
    getAgentStatus: (agentId: string) => agentStatus[agentId] || DEFAULT_AGENT_STATUS,
    getAgentConversations: agentService.getAgentConversations,
    getConversationMessages: agentService.getConversationMessages,
    executeAction: (capabilityName: string, actionName: string, parameters: Record<string, unknown>) => {
      if (!selectedAgentId) throw new Error('No agent selected');
      return agentService.executeAgentAction(selectedAgentId, actionName, parameters);
    },
    getActionSchema: (capabilityName: string, actionName: string) => {
      if (!selectedAgentId) throw new Error('No agent selected');
      return agentService.getActionSchema(selectedAgentId, capabilityName, actionName);
    },
    getCapabilitySchema: agentService.getCapabilitySchema,
    getAvailableActions: agentService.getAvailableActions,
    getCapabilityDetails: agentService.getCapabilityDetails,
    getAgentCapabilities: (agentId: string) => agentCapabilities[agentId] || [],
    getAvailableCapabilities: () => availableCapabilities,

  }), [
    agents, selectedAgent, messages, conversations, currentConversation, agentStatus,
    agentCapabilities, loading, selectAgent, sendMessage, error, availableCapabilities,
    loadingCapabilities, createAgent, updateAgent, deleteAgent, addCapability,
    removeCapability, refreshAgents, refreshAgentStatus, refreshAll,
    loadAgentCapabilities, loadAvailableCapabilities, selectedAgentId
  ]);

  return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>;
};
