"""
Enhanced Pydantic-based Agent Models with strict validation and type safety
"""
from pydantic import BaseModel, Field, validator, SecretStr
from typing import List, Dict, Any, Optional, Union, Literal
from enum import Enum
from datetime import datetime
import uuid

class AgentType(str, Enum):
    """Types of AI agents with different behavioral patterns"""
    REACTIVE = "reactive"           # Responds to events and requests
    PROACTIVE = "proactive"         # Takes initiative based on monitoring
    COLLABORATIVE = "collaborative" # Works with other agents
    AUTONOMOUS = "autonomous"       # Fully independent decision making
    SPECIALIZED = "specialized"     # Domain-specific expertise

class AgentStatus(str, Enum):
    """Current operational status of an agent"""
    OFFLINE = "offline"
    STARTING = "starting"
    ONLINE = "online"
    BUSY = "busy"
    ERROR = "error"
    MAINTENANCE = "maintenance"
    UPDATING = "updating"
    LEARNING = "learning"

class AIProvider(str, Enum):
    """Supported AI providers"""
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    AZURE = "azure"
    GOOGLE = "google"
    COHERE = "cohere"
    HUGGINGFACE = "huggingface"
    CUSTOM = "custom"

class MessageType(str, Enum):
    """Types of inter-agent messages"""
    REQUEST = "request"
    RESPONSE = "response"
    BROADCAST = "broadcast"
    ESCALATION = "escalation"
    NOTIFICATION = "notification"
    HEARTBEAT = "heartbeat"

class AIEndpointConfig(BaseModel):
    """Configuration for AI service endpoints with validation"""
    
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = Field(..., min_length=1, max_length=128, description="Human-readable endpoint name")
    provider: AIProvider = Field(..., description="AI service provider")
    model: str = Field(..., min_length=1, description="Model identifier")
    api_key: SecretStr = Field(..., description="API key for authentication")
    base_url: Optional[str] = Field(None, description="Custom base URL for API calls")
    temperature: float = Field(0.7, ge=0.0, le=2.0, description="Sampling temperature")
    max_tokens: int = Field(4000, ge=1, le=32000, description="Maximum tokens per request")
    timeout: int = Field(30, ge=5, le=300, description="Request timeout in seconds")
    is_default: bool = Field(False, description="Whether this is the default endpoint")
    status: Literal["active", "inactive", "testing", "error"] = Field("inactive")
    
    # Performance and reliability settings
    rate_limit: Optional[int] = Field(None, description="Requests per minute limit")
    retry_attempts: int = Field(3, ge=1, le=10, description="Number of retry attempts")
    fallback_endpoint_id: Optional[str] = Field(None, description="Fallback endpoint ID")
    
    # Monitoring and analytics
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_used: Optional[datetime] = Field(None)
    usage_stats: Dict[str, Any] = Field(default_factory=dict)
    
    @validator('base_url')
    def validate_base_url(cls, v):
        if v and not v.startswith(('http://', 'https://')):
            raise ValueError('Base URL must start with http:// or https://')
        return v
    
    @validator('model')
    def validate_model_for_provider(cls, v, values):
        provider = values.get('provider')
        if provider == AIProvider.OPENAI and not any(model in v.lower() for model in ['gpt', 'davinci', 'curie', 'babbage', 'ada']):
            raise ValueError('Invalid OpenAI model name')
        return v

class AgentCapabilityConfig(BaseModel):
    """Configuration for individual agent capabilities"""
    
    name: str = Field(..., description="Capability identifier")
    enabled: bool = Field(True, description="Whether capability is active")
    config: Dict[str, Any] = Field(default_factory=dict, description="Capability-specific configuration")
    priority: int = Field(1, ge=1, le=10, description="Execution priority (1=lowest, 10=highest)")
    timeout: int = Field(30, ge=1, le=300, description="Capability timeout in seconds")
    retry_policy: Dict[str, Any] = Field(default_factory=lambda: {
        "max_attempts": 3,
        "backoff_factor": 2,
        "max_delay": 60
    })

class AgentMemoryConfig(BaseModel):
    """Configuration for agent memory and context management"""
    
    max_context_length: int = Field(8000, ge=1000, le=32000, description="Maximum context window")
    memory_retention_days: int = Field(30, ge=1, le=365, description="Days to retain memories")
    enable_vector_search: bool = Field(True, description="Enable semantic memory search")
    embedding_model: str = Field("all-MiniLM-L6-v2", description="Sentence transformer model")
    similarity_threshold: float = Field(0.7, ge=0.0, le=1.0, description="Similarity threshold for memory retrieval")

class CollaborationRule(BaseModel):
    """Rules governing agent collaboration"""
    
    rule_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = Field(..., description="Rule name")
    condition: str = Field(..., description="Condition that triggers this rule")
    action: str = Field(..., description="Action to take when condition is met")
    target_agents: List[str] = Field(default_factory=list, description="Specific agents this rule applies to")
    priority: int = Field(1, ge=1, le=10, description="Rule priority")
    enabled: bool = Field(True)

class AgentConfig(BaseModel):
    """Comprehensive agent configuration with validation"""
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = Field(..., min_length=1, max_length=128, description="Agent name")
    description: str = Field(..., max_length=512, description="Agent description")
    agent_type: AgentType = Field(..., description="Agent behavioral type")
    status: AgentStatus = Field(AgentStatus.OFFLINE, description="Current agent status")
    
    # AI Configuration
    ai_endpoint: AIEndpointConfig = Field(..., description="Primary AI endpoint configuration")
    fallback_endpoints: List[str] = Field(default_factory=list, description="Fallback endpoint IDs")
    system_prompt: str = Field(..., min_length=10, description="Core system prompt")
    
    # Capabilities and Memory
    capabilities: List[AgentCapabilityConfig] = Field(default_factory=list)
    memory_config: AgentMemoryConfig = Field(default_factory=AgentMemoryConfig)
    
    # Collaboration and Communication
    collaboration_rules: List[CollaborationRule] = Field(default_factory=list)
    trusted_agents: List[str] = Field(default_factory=list, description="Agents this agent can communicate with")
    escalation_chain: List[str] = Field(default_factory=list, description="Escalation hierarchy")
    
    # Operational Settings
    max_concurrent_tasks: int = Field(5, ge=1, le=50, description="Maximum concurrent tasks")
    task_timeout: int = Field(300, ge=30, le=3600, description="Default task timeout in seconds")
    health_check_interval: int = Field(60, ge=10, le=300, description="Health check interval in seconds")
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_active: Optional[datetime] = Field(None)
    version: str = Field("1.0.0", description="Agent version")
    tags: List[str] = Field(default_factory=list, description="Agent tags for organization")
    
    @validator('trusted_agents')
    def validate_trusted_agents(cls, v, values):
        agent_id = values.get('id')
        if agent_id and agent_id in v:
            raise ValueError('Agent cannot trust itself')
        return v

class A2AMessage(BaseModel):
    """Secure inter-agent message format"""
    
    message_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sender_id: str = Field(..., description="Sending agent ID")
    recipient_id: str = Field(..., description="Receiving agent ID")
    message_type: MessageType = Field(..., description="Type of message")
    
    # Message content
    action: str = Field(..., description="Action to perform")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Action parameters")
    context: Dict[str, Any] = Field(default_factory=dict, description="Additional context")
    
    # Message metadata
    priority: int = Field(1, ge=1, le=10, description="Message priority")
    requires_response: bool = Field(False, description="Whether response is expected")
    expires_at: Optional[datetime] = Field(None, description="Message expiration time")
    correlation_id: Optional[str] = Field(None, description="For request-response correlation")
    
    # Security
    encrypted: bool = Field(False, description="Whether payload is encrypted")
    signature: Optional[str] = Field(None, description="Message signature for verification")
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    delivered_at: Optional[datetime] = Field(None)
    processed_at: Optional[datetime] = Field(None)

class AgentPerformanceMetrics(BaseModel):
    """Performance metrics for agent monitoring"""
    
    agent_id: str = Field(..., description="Agent identifier")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    # Performance metrics
    tasks_completed: int = Field(0, ge=0)
    tasks_failed: int = Field(0, ge=0)
    average_response_time: float = Field(0.0, ge=0.0, description="Average response time in seconds")
    cpu_usage: float = Field(0.0, ge=0.0, le=100.0, description="CPU usage percentage")
    memory_usage: float = Field(0.0, ge=0.0, le=100.0, description="Memory usage percentage")
    
    # AI endpoint metrics
    ai_requests_count: int = Field(0, ge=0)
    ai_tokens_used: int = Field(0, ge=0)
    ai_cost_estimate: float = Field(0.0, ge=0.0, description="Estimated cost in USD")
    
    # Collaboration metrics
    messages_sent: int = Field(0, ge=0)
    messages_received: int = Field(0, ge=0)
    collaborations_initiated: int = Field(0, ge=0)
    
    # Health metrics
    health_score: float = Field(100.0, ge=0.0, le=100.0, description="Overall health score")
    uptime_percentage: float = Field(100.0, ge=0.0, le=100.0)
    error_rate: float = Field(0.0, ge=0.0, le=100.0, description="Error rate percentage")

class AgentLearningData(BaseModel):
    """Data structure for agent learning and improvement"""
    
    agent_id: str = Field(..., description="Agent identifier")
    interaction_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # Interaction data
    input_data: Dict[str, Any] = Field(..., description="Input that triggered the interaction")
    output_data: Dict[str, Any] = Field(..., description="Agent's response/action")
    context: Dict[str, Any] = Field(default_factory=dict, description="Contextual information")
    
    # Outcome and feedback
    success: bool = Field(..., description="Whether the interaction was successful")
    user_feedback: Optional[str] = Field(None, description="Human feedback on the interaction")
    performance_score: Optional[float] = Field(None, ge=0.0, le=1.0, description="Performance score")
    
    # Learning metadata
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    tags: List[str] = Field(default_factory=list, description="Tags for categorization")
    embedding: Optional[List[float]] = Field(None, description="Vector embedding for similarity search")

# Export all models
__all__ = [
    'AgentType', 'AgentStatus', 'AIProvider', 'MessageType',
    'AIEndpointConfig', 'AgentCapabilityConfig', 'AgentMemoryConfig',
    'CollaborationRule', 'AgentConfig', 'A2AMessage',
    'AgentPerformanceMetrics', 'AgentLearningData'
]
