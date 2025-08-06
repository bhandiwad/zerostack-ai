import { AgentType, AIAgentConfig, AgentCapability } from '../types/agentTypes';

// Re-export types for backward compatibility
export type { AIAgentConfig, AgentCapability };
export { AgentType };

// Add CUSTOM agent type configuration
export const DEFAULT_AI_AGENT_CONFIGS: Record<AgentType, Omit<AIAgentConfig, 'type'>> = {
  [AgentType.CUSTOM]: {
    name: 'Custom Agent',
    description: 'A custom-configured agent',
    capabilities: [],
    config: {
      model: 'gpt-4',
      temperature: 0.5,
      maxTokens: 1000,
      systemPrompt: 'You are a custom-configured AI agent.'
    }
  },
  [AgentType.MONITORING]: {
    name: 'Monitoring Agent',
    description: 'Monitors cluster health and resources',
    capabilities: ['cluster_health', 'resource_usage'],
    config: {
      model: 'gpt-4',
      temperature: 0.2,
      maxTokens: 1000,
      systemPrompt: 'You are a monitoring agent focused on cluster health and resource utilization.'
    }
  },
  [AgentType.AUTOMATION]: {
    name: 'Automation Agent',
    description: 'Automates cluster operations and workflows',
    capabilities: ['workflow_automation', 'self_healing'],
    config: {
      model: 'gpt-4',
      temperature: 0.3,
      maxTokens: 1500,
      systemPrompt: 'You are an automation agent that helps with cluster operations and workflow automation.'
    }
  },
  [AgentType.SECURITY]: {
    name: 'Security Agent',
    description: 'Enhances cluster security and compliance',
    capabilities: ['vulnerability_scanning', 'compliance_checks'],
    config: {
      model: 'gpt-4',
      temperature: 0.1,
      maxTokens: 1000,
      systemPrompt: 'You are a security-focused agent that ensures cluster security and compliance.'
    }
  },
  [AgentType.ANALYTICS]: {
    name: 'Analytics Agent',
    description: 'Analyzes cluster metrics and logs',
    capabilities: ['metrics_analysis', 'log_analysis'],
    config: {
      model: 'gpt-4',
      temperature: 0.3,
      maxTokens: 2000,
      systemPrompt: 'You are an analytics agent that provides insights from cluster metrics and logs.'
    }
  },
  [AgentType.SUPPORT]: {
    name: 'Support Agent',
    description: 'Provides interactive assistance and troubleshooting',
    capabilities: ['interactive_assistance', 'troubleshooting_guide'],
    config: {
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2000,
      systemPrompt: 'You are a helpful support agent that assists with cluster-related questions and issues.'
    }
  }
};

export const createAIAgent = (type: AgentType, customConfig: Partial<AIAgentConfig> = {}): AIAgentConfig => {
  const baseConfig = DEFAULT_AI_AGENT_CONFIGS[type];
  return {
    type,
    ...baseConfig,
    ...customConfig,
    config: {
      ...baseConfig.config,
      ...(customConfig.config || {})
    },
    capabilities: [
      ...(baseConfig.capabilities || []),
      ...(customConfig.capabilities || [])
    ]
  };
};

export const getAgentTypeDisplayName = (type: AgentType): string => {
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};
