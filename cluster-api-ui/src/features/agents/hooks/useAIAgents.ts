import { useState, useEffect, useCallback } from 'react';
import { AgentType, AIAgentConfig } from '../ai/aiAgents';
import { agentOrchestrator, AgentInstance } from '../ai/agentOrchestrator';
import { messageBus, MessageType, MessageTopic } from '../ai/agentMessageBus';

export const useAIAgents = () => {
  const [agents, setAgents] = useState<AgentInstance[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeAgent, setActiveAgent] = useState<AgentInstance | null>(null);

  // Load all agents
  const loadAgents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const allAgents = agentOrchestrator.getAllAgents();
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
  const selectAgent = useCallback((agentId: string | null) => {
    if (!agentId) {
      setActiveAgent(null);
      return;
    }
    const agent = agents.find(a => a.id === agentId);
    if (agent) {
      setActiveAgent(agent);
    }
  }, [agents]);

  // Get agents by type
  const getAgentsByType = useCallback((type: AgentType) => {
    return agentOrchestrator.getAgentsByType(type);
  }, []);

  // Initialize with existing agents
  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  // Subscribe to agent updates
  useEffect(() => {
    const unsubscribe = messageBus.subscribe(MessageTopic.SYSTEM, (message) => {
      if (message.type === MessageType.EVENT) {
        const { event } = message.payload;
        
        // Refresh agents list on agent-related events
        if ([
          'agent_created',
          'agent_updated',
          'agent_removed'
        ].includes(event)) {
          loadAgents();
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
    createAgent,
    updateAgent,
    removeAgent,
    selectAgent,
    getAgentsByType,
    refreshAgents: loadAgents,
  };
};

export default useAIAgents;
