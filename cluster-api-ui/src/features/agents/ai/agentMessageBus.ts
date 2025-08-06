// Minimal browser-compatible EventEmitter
class EventEmitter {
  private listeners: Record<string, ((...args: unknown[]) => void)[]> = {};

  on(event: string, listener: (...args: unknown[]) => void): this {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
    return this;
  }

  emit(event: string, ...args: unknown[]): boolean {
    if (!this.listeners[event]) {
      return false;
    }
    this.listeners[event].forEach(listener => listener(...args));
    return true;
  }

  off(event: string, listener: (...args: unknown[]) => void): this {
    if (!this.listeners[event]) {
      return this;
    }
    this.listeners[event] = this.listeners[event].filter(l => l !== listener);
    return this;
  }
}
import { v4 as uuidv4 } from 'uuid';

export enum MessageType {
  BROADCAST = 'broadcast',
  DIRECT = 'direct',
  REQUEST = 'request',
  RESPONSE = 'response',
  EVENT = 'event'
}

export enum MessageTopic {
  MONITORING = 'monitoring',
  AUTOMATION = 'automation',
  SECURITY = 'security',
  ANALYTICS = 'analytics',
  SUPPORT = 'support',
  SYSTEM = 'system'
}

export interface AgentMessage<T = unknown> {
  id: string;
  type: MessageType;
  topic: MessageTopic | string;
  sender: string;
  recipients?: string[];
  timestamp: number;
  payload: T;
  metadata?: Record<string, unknown>;
}

type MessageHandler<T = unknown> = (message: AgentMessage<T>) => void | Promise<void>;

export class AgentMessageBus {
  private static instance: AgentMessageBus;
  private eventEmitter: EventEmitter;
  private handlers: Map<string, Set<MessageHandler<unknown>>>; 
  private messageHistory: AgentMessage<unknown>[]; 
  private maxHistory: number;

  private constructor(maxHistory: number = 1000) {
    this.eventEmitter = new EventEmitter();
    this.handlers = new Map();
    this.messageHistory = [];
    this.maxHistory = maxHistory;
  }

  public static getInstance(): AgentMessageBus {
    if (!AgentMessageBus.instance) {
      AgentMessageBus.instance = new AgentMessageBus();
    }
    return AgentMessageBus.instance;
  }

  public subscribe<T>(topic: string, handler: MessageHandler<T>): () => void {
    if (!this.handlers.has(topic)) {
      this.handlers.set(topic, new Set());
    }
    
    const topicHandlers = this.handlers.get(topic)!;
    topicHandlers.add(handler as MessageHandler<unknown>);

    return () => {
      topicHandlers.delete(handler as MessageHandler<unknown>);
      if (topicHandlers.size === 0) {
        this.handlers.delete(topic);
      }
    };
  }

    public async publish<T>(message: Omit<AgentMessage<T>, 'id' | 'timestamp'>): Promise<void> {
        const fullMessage: AgentMessage<T> = {
      ...message,
      id: uuidv4(),
      timestamp: Date.now()
    };

    // Add to history
    this.messageHistory.push(fullMessage);
    if (this.messageHistory.length > this.maxHistory) {
      this.messageHistory.shift();
    }

    // Notify all handlers for the specific topic
    const topicHandlers = this.handlers.get(fullMessage.topic) || new Set();
    const allHandlers = this.handlers.get('*') || new Set();
    
    const allTopicHandlers = new Set([...topicHandlers, ...allHandlers]);
    
    // Process handlers in parallel
    await Promise.all(
      Array.from(allTopicHandlers).map(handler => 
        Promise.resolve(handler(fullMessage)).catch(console.error)
      )
    );
  }

    public async request<T = unknown>(
    topic: string,
    payload: unknown,
    options: { timeout?: number } = {}
  ): Promise<T> {
    const requestId = uuidv4();
    const responseTopic = `response:${requestId}`;
    
    return new Promise((resolve, reject) => {
      const timeout = options.timeout || 30000; // Default 30s timeout
            const timeoutId = window.setTimeout(() => {
        unsubscribe();
        reject(new Error(`Request timed out after ${timeout}ms`));
      }, timeout);

      const unsubscribe = this.subscribe(responseTopic, (response: AgentMessage<unknown>) => {
        clearTimeout(timeoutId);
        unsubscribe();
        
        const responsePayload = response.payload as { error?: string, originalPayload?: unknown };
        if (responsePayload?.error) {
          reject(new Error(responsePayload.error));
        } else {
          resolve(response.payload as T);
        }
      });
      

      
      // Send the request
      this.publish({
        type: MessageType.REQUEST,
        topic,
        sender: 'system',
        recipients: [topic],
        payload,
        metadata: { requestId, responseTopic }
      }).catch(reject);
    });
  }

    public respondToRequest(
    request: AgentMessage<unknown>,
    payload: unknown,
    error?: string
  ): void {
        if (!request.metadata?.responseTopic || typeof request.metadata.responseTopic !== 'string') {
      throw new Error('Cannot respond to a message without a response topic');
    }
    
    this.publish({
      type: MessageType.RESPONSE,
            topic: request.metadata.responseTopic as string,
      sender: request.recipients?.[0] || 'system',
      recipients: [request.sender],
      payload: error ? { error, originalPayload: payload } : payload,
      metadata: {
        requestId: request.metadata.requestId,
        originalRequest: request
      }
    }).catch(console.error);
  }

    public getMessageHistory(filter?: (message: AgentMessage<unknown>) => boolean): AgentMessage<unknown>[] {
    if (!filter) return [...this.messageHistory];
    return this.messageHistory.filter(filter);
  }

  public clearHistory(): void {
    this.messageHistory = [];
  }
}

// Export a singleton instance
export const messageBus = AgentMessageBus.getInstance();
