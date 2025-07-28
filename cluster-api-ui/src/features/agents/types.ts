export interface AgentStatus {
  isActive: boolean;
  lastPing: Date;
  health: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  message?: string;
}

export interface AgentParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect';
  description: string;
  required: boolean;
  default?: any;
  options?: Array<{ label: string; value: string }>;
  placeholder?: string;
}

export interface AgentCapability {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  parameters?: Record<string, AgentParameter>;
  actions: AgentAction[];
}

export interface AgentAction {
  id: string;
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (params: any) => Promise<any>;
}

export interface AgentMessage {
  id: string;
  content: string;
  sender: 'user' | 'agent' | 'system';
  timestamp: Date;
  conversationId: string;
  metadata?: Record<string, any>;
}

export interface Conversation {
  id: string;
  title: string;
  agentId: string;
  createdAt: Date;
  updatedAt: Date;
  messages: AgentMessage[];
  metadata?: Record<string, any>;
}

export interface AgentConfig {
  // Common configuration
  enabled: boolean;
  pollingInterval?: number; // in seconds
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  
  // Agent-specific configuration
  [key: string]: any;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  version?: string;
  status: AgentStatus;
  capabilities: AgentCapability[];
  actions?: AgentAction[];
  config: AgentConfig;
  metadata?: {
    type?: string;
    [key: string]: any;
  };
}

export interface CapabilityInfo {
  name: string;
  description: string;
  actions: string[];
}

export interface AgentContextType {
  // Agent management
  agents: Agent[];
  loading: boolean;
  error: string | null;
  selectedAgent: Agent | null;
  
  // Conversation management
  conversations: Record<string, Conversation>;
  currentConversation: Conversation | null;
  messages: AgentMessage[];
  loadingMessages: boolean;
  
  // Core agent actions
  sendMessage: (content: string, conversationId?: string) => Promise<void>;
  createConversation: (agentId: string, title?: string) => Promise<Conversation>;
  selectConversation: (conversationId: string) => void;
  executeAction: (agentId: string, action: string, params?: any) => Promise<any>;
  refreshAgents: () => Promise<Agent[]>;
  refreshAll: () => Promise<void>;
  
  // Capability management
  getAgentCapabilities: (agentId: string) => AgentCapability[];
  getCapabilityDetails: (agentId: string, capabilityName: string) => Promise<CapabilityInfo | null>;
  getAvailableCapabilities: () => CapabilityInfo[];
  loadAgentCapabilities: (agentId: string) => Promise<void>;
}
