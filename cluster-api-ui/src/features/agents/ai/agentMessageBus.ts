import { EventEmitter } from 'events';
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

export interface AgentMessage {
  id: string;
  type: MessageType;
  topic: MessageTopic | string;
  sender: string;
  recipients?: string[];
  timestamp: number;
  payload: any;
  metadata?: Record<string, any>;
}

type MessageHandler = (message: AgentMessage) => void | Promise<void>;

export class AgentMessageBus {
  private static instance: AgentMessageBus;
  private eventEmitter: EventEmitter;
  private handlers: Map<string, Set<MessageHandler>>;
  private messageHistory: AgentMessage[];
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

  public subscribe(topic: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(topic)) {
      this.handlers.set(topic, new Set());
    }
    
    const topicHandlers = this.handlers.get(topic)!;
    topicHandlers.add(handler);

    return () => {
      topicHandlers.delete(handler);
      if (topicHandlers.size === 0) {
        this.handlers.delete(topic);
      }
    };
  }

  public async publish(message: Omit<AgentMessage, 'id' | 'timestamp'>): Promise<void> {
    const fullMessage: AgentMessage = {
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

  public async request<T = any>(
    topic: string,
    payload: any,
    options: { timeout?: number } = {}
  ): Promise<T> {
    const requestId = uuidv4();
    const responseTopic = `response:${requestId}`;
    
    return new Promise((resolve, reject) => {
      const timeout = options.timeout || 30000; // Default 30s timeout
      let timeoutId: NodeJS.Timeout;
      
      const unsubscribe = this.subscribe(responseTopic, (response) => {
        clearTimeout(timeoutId);
        unsubscribe();
        
        if (response.payload.error) {
          reject(new Error(response.payload.error));
        } else {
          resolve(response.payload);
        }
      });
      
      // Set up timeout
      timeoutId = setTimeout(() => {
        unsubscribe();
        reject(new Error(`Request timed out after ${timeout}ms`));
      }, timeout);
      
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
    request: AgentMessage,
    payload: any,
    error?: string
  ): void {
    if (!request.metadata?.responseTopic) {
      throw new Error('Cannot respond to a message without a response topic');
    }
    
    this.publish({
      type: MessageType.RESPONSE,
      topic: request.metadata.responseTopic,
      sender: request.recipients?.[0] || 'system',
      recipients: [request.sender],
      payload: error ? { error, originalPayload: payload } : payload,
      metadata: {
        requestId: request.metadata.requestId,
        originalRequest: request
      }
    }).catch(console.error);
  }

  public getMessageHistory(filter?: (message: AgentMessage) => boolean): AgentMessage[] {
    if (!filter) return [...this.messageHistory];
    return this.messageHistory.filter(filter);
  }

  public clearHistory(): void {
    this.messageHistory = [];
  }
}

// Export a singleton instance
export const messageBus = AgentMessageBus.getInstance();
