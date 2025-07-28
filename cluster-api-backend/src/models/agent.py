from datetime import datetime
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy import Column, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
import uuid

# Create a global model registry
class ModelRegistry:
    db = None
    
    @classmethod
    def init_models(cls, database):
        """Initialize models with the database instance"""
        cls.db = database
        return cls.db

# Create the registry instance
model_registry = ModelRegistry()

class BaseModel:
    """Base model class that provides common functionality"""
    
    @classmethod
    def init_db(cls, db):
        """Initialize the base model with the database instance"""
        cls.db = db
        cls.query = db.session.query_property()

# Define model classes with their schemas
class Agent:
    """Model definition for Agent"""
    class Model:
        __tablename__ = 'agents'
        
        id = None  # Will be set by SQLAlchemy
        name = None
        description = None
        version = None
        is_active = None
        created_at = None
        updated_at = None
        metadata_ = None
        conversations = None
        action_logs = None

# Create the actual model class with the database instance
class AgentModel(BaseModel):
    """Model representing an AI agent"""
    __tablename__ = 'agents'
    
    id = db.Column(db.String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(128), nullable=False)
    description = db.Column(db.Text, nullable=True)
    type = db.Column(db.String(64), nullable=False)  # monitoring, automation, security, etc.
    config = db.Column(JSON, default=dict)  # Agent configuration
    status = db.Column(JSON, default=dict)  # Current status (is_active, health, etc.)
    capabilities = db.Column(JSON, default=list)  # List of capability names
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_active = db.Column(db.DateTime, nullable=True)
    metadata_ = db.Column('metadata', JSON, default=dict)  # Additional metadata
    
    # Relationships
    conversations = db.relationship('AgentConversationModel', backref='agent', lazy=True, cascade='all, delete-orphan')
    action_logs = db.relationship('AgentActionLogModel', backref='agent', lazy=True, cascade='all, delete-orphan')
    
    # These will be set by SQLAlchemy when the model is registered
    id = None
    name = None
    description = None
    version = None
    is_active = None
    created_at = None
    updated_at = None
    metadata_ = None
    conversations = None
    action_logs = None
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'version': self.version,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'metadata': self.metadata_ or {}
        }

    def to_dict(self):
        """Convert model to dictionary"""
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'type': self.type,
            'config': self.config,
            'status': self.status,
            'capabilities': self.capabilities,
            'is_active': self.status.get('is_active', False) if isinstance(self.status, dict) else False,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'last_active': self.last_active.isoformat() if self.last_active else None,
            'metadata': self.metadata_
        }

# Alias for backward compatibility
Agent = AgentModel

class AgentConversation:
    """Model definition for AgentConversation"""
    class Model:
        __tablename__ = 'agent_conversations'
        
        id = None
        agent_id = None
        title = None
        created_at = None
        updated_at = None
        metadata_ = None
        messages = None

# Create the actual model class with the database instance
class AgentConversationModel(BaseModel):
    """Model representing a conversation with an agent"""
    __tablename__ = 'agent_conversations'
    
    # These will be set by SQLAlchemy when the model is registered
    id = None
    agent_id = None
    title = None
    created_at = None
    updated_at = None
    metadata_ = None
    messages = None
    
    def to_dict(self):
        return {
            'id': self.id,
            'agent_id': self.agent_id,
            'title': self.title,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'message_count': len(self.messages),
            'metadata': self.metadata_ or {}
        }

# Alias for backward compatibility
AgentConversation = AgentConversationModel

class AgentMessage:
    """Model definition for AgentMessage"""
    class Model:
        __tablename__ = 'agent_messages'
        
        id = None
        conversation_id = None
        content = None
        sender = None
        timestamp = None
        metadata_ = None

# Create the actual model class with the database instance
class AgentMessageModel(BaseModel, ModelRegistry.db.Model if ModelRegistry.db else object):
    """Model representing a message in a conversation"""
    __tablename__ = 'agent_messages'
    
    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id = Column(String(64), ForeignKey('agent_conversations.id'), nullable=False)
    content = Column(Text, nullable=False)
    sender = Column(String(32), nullable=False)  # 'user' or 'agent'
    timestamp = Column(DateTime, default=datetime.utcnow)
    metadata_ = Column('metadata', JSON, default=dict)
    
    def to_dict(self):
        return {
            'id': self.id,
            'conversation_id': self.conversation_id,
            'content': self.content,
            'sender': self.sender,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'metadata': self.metadata_ or {}
        }

# Alias for backward compatibility
AgentMessage = AgentMessageModel

class AgentActionLog:
    """Model definition for AgentActionLog"""
    class Model:
        __tablename__ = 'agent_action_logs'
        
        id = None
        agent_id = None
        action = None
        parameters = None
        result = None
        status = None
        created_at = None
        completed_at = None
        error = None
        metadata_ = None

# Create the actual model class with the database instance
class AgentActionLogModel(BaseModel):
    """Model for logging agent actions"""
    __tablename__ = 'agent_action_logs'
    
    # These will be set by SQLAlchemy when the model is registered
    id = None
    agent_id = None
    action = None
    parameters = None
    result = None
    status = 'pending'  # 'pending', 'in_progress', 'completed', 'failed'
    created_at = None
    completed_at = None
    error = None
    metadata_ = None

    def to_dict(self):
        return {
            'id': self.id,
            'agent_id': self.agent_id,
            'action': self.action,
            'parameters': self.parameters or {},
            'result': self.result,
            'error': self.error,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        }
