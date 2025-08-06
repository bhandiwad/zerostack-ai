import { useState, useEffect, useCallback } from 'react';
import { AgentType, AIAgentConfig } from '../ai/aiAgents';
import { agentOrchestrator, AgentInstance } from '../ai/agentOrchestrator';
import { messageBus, MessageType, MessageTopic } from '../ai/agentMessageBus';

interface UseAIAgentsReturn {
  agents: AgentInstance[];
  loading: boolean;
  error: string | null;
  activeAgent: AgentInstance | null;
  loadAgents: () => Promise<AgentInstance[]>;
  createAgent: (type: AgentType, config?: Partial<AIAgentConfig>) => Promise<AgentInstance>;
  updateAgent: (agentId: string, updates: Partial<AgentInstance>) => Promise<AgentInstance | null>;
  removeAgent: (agentId: string) => Promise<boolean>;
  selectAgent: (agentId: string | null) => Promise<void>;
  getAgentsByType: (type: AgentType) => AgentInstance[];
  refreshAgents: () => Promise<void>;
}

export const useAIAgents = (): UseAIAgentsReturn => {
  const [agents, setAgents] = useState<AgentInstance[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeAgent, setActiveAgent] = useState<AgentInstance | null>(null);

  // Load all agents
  const loadAgents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const allAgents = await agentOrchestrator.getAllAgents();
      setAgents(allAgents);
      return allAgents;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load agents';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create a new agent
  const createAgent = useCallback(async (type: AgentType, config: Partial<AIAgentConfig> = {}) => {
    setLoading(true);
    setError(null);
    try {
      const newAgent = await agentOrchestrator.createAgent(type, config);
      setAgents(prev => [...prev, newAgent]);
      return newAgent;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create agent';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Update an existing agent
  const updateAgent = useCallback(async (agentId: string, updates: Partial<AgentInstance>) => {
    setLoading(true);
    setError(null);
    try {
      const updatedAgent = await agentOrchestrator.updateAgent(agentId, updates);
      if (updatedAgent) {
        setAgents(prev => 
          prev.map(agent => 
            agent.id === agentId ? updatedAgent : agent
          )
        );
        if (activeAgent?.id === agentId) {
          setActiveAgent(updatedAgent);
        }
      }
      return updatedAgent;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update agent';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [activeAgent]);

  // Remove an agent
  const removeAgent = useCallback(async (agentId: string) => {
    setLoading(true);
    setError(null);
    try {
      const success = await agentOrchestrator.removeAgent(agentId);
      if (success) {
        setAgents(prev => prev.filter(agent => agent.id !== agentId));
        if (activeAgent?.id === agentId) {
          setActiveAgent(null);
        }
      }
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove agent';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [activeAgent]);

  // Select an active agent
  const selectAgent = useCallback(async (agentId: string | null) => {
    if (!agentId) {
      setActiveAgent(null);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Try to find the agent in the local list first
      const existingAgent = agents.find(a => a.id === agentId);
      
      if (existingAgent) {
        setActiveAgent(existingAgent);
      } else {
        // If not found, try to fetch it from the server
        const agent = await agentOrchestrator.getAgent(agentId);
        if (agent) {
          setActiveAgent(agent);
          // Add to local agents list if not present
          setAgents(prev => [...prev, agent]);
        } else {
          setError('Agent not found');
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load agent';
      setError(errorMessage);
      console.error('Error selecting agent:', err);
    } finally {
      setLoading(false);
    }
  }, [agents]);
  
  // Initial load of agents
  useEffect(() => {
    loadAgents().catch(console.error);
  }, [loadAgents]);

  // Get agents by type
  const getAgentsByType = useCallback((type: AgentType) => {
    return agents.filter(agent => agent.config.type === type);
  }, [agents]);

  // Refresh agents list
  const refreshAgents = useCallback(async () => {
    await loadAgents();
  }, [loadAgents]);

  // Initial load of agents & subscribe to agent updates
  useEffect(() => {
    loadAgents().catch(console.error);

    const unsubscribe = messageBus.subscribe(MessageTopic.SYSTEM, (message) => {
      if (message.type === MessageType.EVENT) {
        const { event } = message.payload as { event: string };
        
        // Refresh agents list on agent-related events
        if ([
          'agent_created',
          'agent_updated',
          'agent_removed'
        ].includes(event)) {
          loadAgents().catch(console.error);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [loadAgents]);

  return {
    agents,
    activeAgent,
    loading,
    error,
    loadAgents,
    createAgent,
    updateAgent,
    removeAgent,
    selectAgent,
    getAgentsByType,
    refreshAgents,
  };
};

export default useAIAgents;
