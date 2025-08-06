from datetime import datetime
import uuid
from enum import Enum
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy import Column, String, Text, ForeignKey, Boolean, DateTime, Enum as SQLEnum
from sqlalchemy.orm import relationship

# Import the base model and Base
from .base_model import Base, BaseModel

class AgentStatus(str, Enum):
    """Enum representing the status of an agent"""
    OFFLINE = 'offline'
    STARTING = 'starting'
    ONLINE = 'online'
    BUSY = 'busy'
    ERROR = 'error'
    MAINTENANCE = 'maintenance'
    UPDATING = 'updating'
    UNKNOWN = 'unknown'

# Initialize the database connection when the models are imported
from src.extensions import db

class AgentCapabilityModel(Base):
    """Model representing an agent's capability"""
    __tablename__ = 'agent_capabilities'
    
    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    agent_id = Column(String(64), ForeignKey('agents.id', ondelete='CASCADE'), nullable=False)
    name = Column(String(128), nullable=False)
    config = Column(JSON, default=dict)
    is_active = Column(Boolean, default=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'is_active': self.is_active,
            'config': self.config or {},
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class AgentModel(Base, BaseModel):
    """Model representing an AI agent"""
    __tablename__ = 'agents'
    
    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(128), nullable=False)
    description = Column(Text, nullable=True)
    type = Column(String(64), nullable=False)
    config = Column(JSON, default=dict)
    status = Column(
        SQLEnum(AgentStatus, native_enum=False, values_callable=lambda x: [e.value for e in x]),
        default=AgentStatus.OFFLINE,
        nullable=False
    )
    capabilities = Column(JSON, default=list)
    last_active = Column(DateTime, nullable=True)
    
    # Relationships
    conversations = relationship(
        "AgentConversationModel", 
        back_populates="agent", 
        cascade="all, delete-orphan",
        foreign_keys="[AgentConversationModel.agent_id]"
    )
    action_logs = relationship(
        "AgentActionLogModel", 
        back_populates="agent", 
        cascade="all, delete-orphan",
        foreign_keys="[AgentActionLogModel.agent_id]"
    )
    
    def to_dict(self):
        """Convert the model to a dictionary"""
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'type': self.type,
            'config': self.config,
            'status': self.status,
            'capabilities': self.capabilities,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'last_active': self.last_active.isoformat() if self.last_active else None
        }

class AgentConversationModel(Base, BaseModel):
    """Model representing a conversation with an agent"""
    __tablename__ = 'agent_conversations'
    
    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    agent_id = Column(String(64), ForeignKey('agents.id'), nullable=False)
    title = Column(String(256), nullable=False)
    metadata_ = Column('metadata', JSON, default=dict)
    
    # Relationships
    agent = relationship(
        "AgentModel", 
        back_populates="conversations",
        foreign_keys=[agent_id]
    )
    messages = relationship(
        "AgentMessageModel", 
        back_populates="conversation", 
        cascade="all, delete-orphan",
        foreign_keys="[AgentMessageModel.conversation_id]"
    )
    
    def to_dict(self):
        """Convert the model to a dictionary"""
        return {
            'id': self.id,
            'agent_id': self.agent_id,
            'title': self.title,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'metadata': self.metadata_
        }

class AgentMessageModel(Base):
    """Model representing a message in a conversation"""
    __tablename__ = 'agent_messages'
    
    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id = Column(String(64), ForeignKey('agent_conversations.id'), nullable=False)
    content = Column(Text, nullable=False)
    sender = Column(String(32), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    metadata_ = Column('metadata', JSON, default=dict)
    
    # Relationships
    conversation = relationship(
        "AgentConversationModel", 
        back_populates="messages",
        foreign_keys=[conversation_id]
    )
    
    def to_dict(self):
        """Convert the model to a dictionary"""
        return {
            'id': self.id,
            'conversation_id': self.conversation_id,
            'content': self.content,
            'sender': self.sender,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'metadata': self.metadata_
        }

class AgentActionLogModel(Base):
    """Model for logging agent actions"""
    __tablename__ = 'agent_action_logs'
    
    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    agent_id = Column(String(64), ForeignKey('agents.id'), nullable=False)
    action = Column(String(128), nullable=False)
    parameters = Column(JSON, default=dict)
    result = Column(JSON, default=dict)
    status = Column(String(32), default='pending')
    completed_at = Column(DateTime, nullable=True)
    error = Column(Text, nullable=True)
    metadata_ = Column('metadata', JSON, default=dict)
    
    # Relationships
    agent = relationship(
        "AgentModel", 
        back_populates="action_logs",
        foreign_keys=[agent_id]
    )
    
    def to_dict(self):
        """Convert the model to a dictionary"""
        return {
            'id': self.id,
            'agent_id': self.agent_id,
            'action': self.action,
            'parameters': self.parameters,
            'result': self.result,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'error': self.error,
            'metadata': self.metadata_
        }

# Aliases for backward compatibility
Agent = AgentModel
AgentConversation = AgentConversationModel
AgentMessage = AgentMessageModel
AgentActionLog = AgentActionLogModel
