import { useContext } from 'react';
import { AgentContext, ExtendedAgentContextType } from '../context/AgentContext';

// Custom hook to use the agent context
export const useAgents = (): ExtendedAgentContextType => {
  const context = useContext(AgentContext);
  if (context === undefined) {
    throw new Error('useAgents must be used within an AgentProvider');
  }
  return context;
};
