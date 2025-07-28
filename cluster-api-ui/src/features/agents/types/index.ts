export interface ParameterSchema {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  required?: boolean;
  default?: any;
  enum?: any[];
  items?: ParameterSchema;
  properties?: Record<string, ParameterSchema>;
  format?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

export interface ActionSchema {
  name: string;
  description: string;
  parameters?: Record<string, ParameterSchema>;
  execute?: (params?: any) => Promise<any>;
}

export interface AgentCapability {
  id?: string;
  name: string;
  description: string;
  config?: Record<string, any>;
  actions?: ActionSchema[];
  error?: string;
  enabled?: boolean;
}

export interface AgentAction {
  id: string;
  name: string;
  description: string;
  parameters?: Record<string, any>;
  execute?: (params?: any) => Promise<any>;
}

export type AgentHealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'offline';

export interface AgentStatus {
  isActive: boolean;
  lastPing?: string | Date;
  health: AgentHealthStatus;
  message?: string;
  metrics?: Record<string, any>;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  version?: string;
  status: AgentStatus | string; // Allow string for backward compatibility
  capabilities: AgentCapability[];
  actions?: AgentAction[];
  metadata?: Record<string, any>;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface AgentMessage {
  id: string;
  content: string;
  sender: 'user' | 'agent' | 'system';
  timestamp: string | Date;
  conversationId: string;
  metadata?: Record<string, any>;
  agentId?: string;
  type?: 'info' | 'warning' | 'error' | 'action' | 'response';
}

export interface Conversation {
  id: string;
  title: string;
  agentId: string;
  messages: AgentMessage[];
  createdAt: string | Date;
  updatedAt: string | Date;
  metadata?: Record<string, any>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface CapabilityInfo {
  name: string;
  description: string;
  config?: Record<string, any>;
  actions?: ActionSchema[];
  error?: string;
}

export interface CapabilityActionResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// Alias for backward compatibility
export type AgentConversation = Conversation;
