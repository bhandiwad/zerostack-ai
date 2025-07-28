import { AgentCapability } from '../types';

export enum AgentType {
  MONITORING = 'monitoring',
  AUTOMATION = 'automation',
  SECURITY = 'security',
  ANALYTICS = 'analytics',
  SUPPORT = 'support'
}

export interface AIAgentConfig {
  type: AgentType;
  name: string;
  description: string;
  capabilities: AgentCapability[];
  config: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  };
}

export const DEFAULT_AI_AGENT_CONFIGS: Record<AgentType, Omit<AIAgentConfig, 'type'>> = {
  [AgentType.MONITORING]: {
    name: 'Monitoring Agent',
    description: 'Monitors cluster health and resources',
    capabilities: [
      {
        name: 'cluster_health',
        description: 'Check cluster health status',
        config: { enabled: true }
      },
      {
        name: 'resource_usage',
        description: 'Monitor resource usage metrics',
        config: { enabled: true }
      }
    ],
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
    capabilities: [
      {
        name: 'workflow_execution',
        description: 'Execute predefined workflows',
        config: { enabled: true }
      },
      {
        name: 'scheduled_tasks',
        description: 'Manage scheduled automation tasks',
        config: { enabled: true }
      }
    ],
    config: {
      model: 'gpt-4',
      temperature: 0.3,
      maxTokens: 1500,
      systemPrompt: 'You are an automation agent that helps with cluster operations and workflow automation.'
    }
  },
  [AgentType.SECURITY]: {
    name: 'Security Agent',
    description: 'Monitors and enforces security policies',
    capabilities: [
      {
        name: 'vulnerability_scanning',
        description: 'Scan for security vulnerabilities',
        config: { enabled: true }
      },
      {
        name: 'compliance_checks',
        description: 'Run compliance checks against policies',
        config: { enabled: true }
      }
    ],
    config: {
      model: 'gpt-4',
      temperature: 0.1,
      maxTokens: 1000,
      systemPrompt: 'You are a security-focused agent that ensures cluster security and compliance.'
    }
  },
  [AgentType.ANALYTICS]: {
    name: 'Analytics Agent',
    description: 'Analyzes cluster metrics and provides insights',
    capabilities: [
      {
        name: 'performance_analysis',
        description: 'Analyze cluster performance metrics',
        config: { enabled: true }
      },
      {
        name: 'anomaly_detection',
        description: 'Detect anomalies in cluster behavior',
        config: { enabled: true }
      }
    ],
    config: {
      model: 'gpt-4',
      temperature: 0.3,
      maxTokens: 2000,
      systemPrompt: 'You are an analytics agent that provides insights from cluster metrics and logs.'
    }
  },
  [AgentType.SUPPORT]: {
    name: 'Support Agent',
    description: 'Provides assistance and troubleshooting',
    capabilities: [
      {
        name: 'troubleshooting',
        description: 'Help troubleshoot cluster issues',
        config: { enabled: true }
      },
      {
        name: 'documentation',
        description: 'Provide documentation and guidance',
        config: { enabled: true }
      }
    ],
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
