export interface ParameterSchema {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  required?: boolean;
  default?: JSONValue;
  enum?: JSONValue[];
  items?: ParameterSchema;
  properties?: Record<string, ParameterSchema>;
  format?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

export interface AgentAction {
  id: string;
  name: string;
  description: string;
  parameters?: Record<string, ParameterSchema>;
  execute?: (params?: unknown) => Promise<unknown>;
}

export interface AgentCapability {
  id?: string;
  name: string;
  description: string;
  config?: Record<string, unknown>;
  actions?: AgentAction[];
  error?: string;
  enabled?: boolean;
}

export type AgentHealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'offline';

export interface AgentStatus {
  isActive: boolean;
  lastPing?: string | Date;
  health: AgentHealthStatus;
  message?: string;
  metrics?: Record<string, unknown>;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  version?: string;
  status: AgentStatus | string; // Allow string for backward compatibility
  capabilities: AgentCapability[];
  actions?: AgentAction[];
  config: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface AgentMessage {
  id: string;
  content: string;
  sender: 'user' | 'agent' | 'system';
  timestamp: string | Date;
  conversationId: string;
  metadata?: Record<string, unknown>;
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
  metadata?: Record<string, unknown>;
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
  config?: Record<string, unknown>;
  actions?: AgentAction[];
  error?: string;
}

export interface CapabilityActionResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

export type JSONValue = string | number | boolean | { [x: string]: JSONValue } | Array<JSONValue>;

// Alias for backward compatibility
export type AgentConversation = Conversation;
