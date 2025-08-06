export enum AgentType {
  MONITORING = 'monitoring',
  AUTOMATION = 'automation',
  ANALYTICS = 'analytics',
  SECURITY = 'security',
  CUSTOM = 'custom',
  SUPPORT = 'support'
}

export interface AgentCapability {
  name: string;
  description: string;
  config?: Record<string, unknown>;
}

export interface AIAgentConfig {
  // Core agent configuration
  type: AgentType;
  name: string;
  description: string;
  capabilities: string[];
  
  // Model configuration
  config: {
    // Required model configuration
    model: string;
    temperature: number;
    maxTokens: number;
    
    // Optional configuration
    systemPrompt?: string;
    
    // Allow additional configuration options
    [key: string]: unknown;
  };
  
  // Metadata and timestamps
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface AgentInstance {
  id: string;
  name: string;
  type: AgentType;
  description: string;
  capabilities: string[];
  config: Record<string, unknown>;
  status: string;
  createdAt: string;
  updatedAt: string;
  lastActive?: string;
  metadata?: Record<string, unknown>;
}
