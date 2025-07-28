import React, { createContext, useContext, ReactNode } from 'react';
import useAIAgents from '../hooks/useAIAgents';
import { AgentInstance } from '../ai/agentOrchestrator';

interface AIAgentContextType {
  // Agent management
  agents: AgentInstance[];
  activeAgent: AgentInstance | null;
  loading: boolean;
  error: string | null;
  
  // Agent operations
  createAgent: (type: string, config?: any) => Promise<AgentInstance>;
  updateAgent: (id: string, updates: Partial<AgentInstance>) => Promise<AgentInstance | null>;
  removeAgent: (id: string) => Promise<boolean>;
  selectAgent: (id: string | null) => void;
  getAgentsByType: (type: string) => AgentInstance[];
  refreshAgents: () => Promise<AgentInstance[]>;
}

const AIAgentContext = createContext<AIAgentContextType | undefined>(undefined);

interface AIAgentProviderProps {
  children: ReactNode;
}

export const AIAgentProvider: React.FC<AIAgentProviderProps> = ({ children }) => {
  const {
    agents,
    activeAgent,
    loading,
    error,
    createAgent,
    updateAgent,
    removeAgent,
    selectAgent,
    getAgentsByType,
    refreshAgents,
  } = useAIAgents();

  const value = {
    agents,
    activeAgent,
    loading,
    error,
    createAgent,
    updateAgent,
    removeAgent,
    selectAgent,
    getAgentsByType,
    refreshAgents,
  };

  return (
    <AIAgentContext.Provider value={value}>
      {children}
    </AIAgentContext.Provider>
  );
};

export const useAIAgentContext = (): AIAgentContextType => {
  const context = useContext(AIAgentContext);
  if (context === undefined) {
    throw new Error('useAIAgentContext must be used within an AIAgentProvider');
  }
  return context;
};

export default AIAgentProvider;
