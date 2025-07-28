import os
from datetime import datetime
import uuid
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

# Create the SQLAlchemy instance without binding to an app
db = SQLAlchemy()
migrate = Migrate()

class AgentCapabilityModel(db.Model):
    """Model representing an agent's capability"""
    __tablename__ = 'agent_capabilities'
    
    id = db.Column(db.String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    agent_id = db.Column(db.String(64), db.ForeignKey('agents.id', ondelete='CASCADE'), nullable=False)
    name = db.Column(db.String(128), nullable=False)
    config = db.Column(db.JSON, default=dict)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'is_active': self.is_active,
            'config': self.config or {},
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class AgentModel(db.Model):
    """Model representing an AI agent"""
    __tablename__ = 'agents'
    
    id = db.Column(db.String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(128), nullable=False)
    description = db.Column(db.Text, nullable=True)
    version = db.Column(db.String(32))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    metadata_ = db.Column('metadata', db.JSON, default=dict)
    
    # Relationships
    conversations = db.relationship('AgentConversationModel', backref='agent', lazy=True, cascade='all, delete-orphan')
    action_logs = db.relationship('AgentActionLogModel', backref='agent', lazy=True, cascade='all, delete-orphan')
    capabilities = db.relationship('AgentCapabilityModel', backref='agent', lazy=True, cascade='all, delete-orphan')
    
    def __init__(self, **kwargs):
        super(AgentModel, self).__init__(**kwargs)
        # Initialize default capabilities if none exist
        if not self.capabilities and self.is_active:
            self._init_default_capabilities()
    
    def _init_default_capabilities(self):
        """Initialize default capabilities for the agent"""
        from src.features.agents.capabilities import list_capabilities
        
        # Get all available capabilities
        available_caps = list_capabilities()
        
        # Add default capabilities
        for cap_name in available_caps:
            self.capabilities.append(AgentCapabilityModel(
                name=cap_name,
                config={},  # Default empty config
                is_active=True
            ))
    
    def has_capability(self, capability_name: str) -> bool:
        """Check if agent has a specific capability"""
        return any(cap.name == capability_name and cap.is_active 
                 for cap in self.capabilities)
    
    def get_capability_config(self, capability_name: str) -> dict:
        """Get configuration for a specific capability"""
        for cap in self.capabilities:
            if cap.name == capability_name and cap.is_active:
                return cap.config or {}
        return {}
    
    def update_capability(self, capability_name: str, config: dict = None, is_active: bool = None) -> bool:
        """Update or add a capability"""
        for cap in self.capabilities:
            if cap.name == capability_name:
                if config is not None:
                    cap.config = config
                if is_active is not None:
                    cap.is_active = is_active
                cap.updated_at = datetime.utcnow()
                return True
        
        # Capability doesn't exist, add it
        if is_active is None:
            is_active = True
            
        self.capabilities.append(AgentCapabilityModel(
            name=capability_name,
            config=config or {},
            is_active=is_active
        ))
        return True
    
    def to_dict(self, include_capabilities: bool = True):
        result = {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'version': self.version,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'metadata': self.metadata_ or {}
        }
        
        if include_capabilities:
            result['capabilities'] = [cap.to_dict() for cap in self.capabilities]
        
        return result

class AgentConversationModel(db.Model):
    """Model representing a conversation with an agent"""
    __tablename__ = 'agent_conversations'
    
    id = db.Column(db.String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    agent_id = db.Column(db.String(64), 
                        db.ForeignKey('agents.id', name='fk_agent_conversations_agent_id', ondelete='CASCADE'), 
                        nullable=False)
    title = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    metadata_ = db.Column('metadata', db.JSON, default=dict)
    
    messages = db.relationship('AgentMessageModel', backref='conversation', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'agent_id': self.agent_id,
            'title': self.title,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'metadata': self.metadata_ or {}
        }

class AgentMessageModel(db.Model):
    """Model representing a message in a conversation"""
    __tablename__ = 'agent_messages'
    
    id = db.Column(db.String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id = db.Column(db.String(64), 
                               db.ForeignKey('agent_conversations.id', name='fk_agent_messages_conversation_id', ondelete='CASCADE'), 
                               nullable=False)
    content = db.Column(db.Text, nullable=False)
    sender = db.Column(db.String(32), nullable=False)  # 'user' or 'agent'
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    metadata_ = db.Column('metadata', db.JSON, default=dict)
    
    def to_dict(self):
        return {
            'id': self.id,
            'conversation_id': self.conversation_id,
            'content': self.content,
            'sender': self.sender,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'metadata': self.metadata_ or {}
        }

class AgentActionLogModel(db.Model):
    """Model for logging agent actions"""
    __tablename__ = 'agent_action_logs'
    
    id = db.Column(db.String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    agent_id = db.Column(db.String(64), 
                        db.ForeignKey('agents.id', name='fk_agent_action_logs_agent_id', ondelete='CASCADE'), 
                        nullable=False)
    action = db.Column(db.String(128), nullable=False)
    parameters = db.Column(db.JSON, default=dict)
    result = db.Column(db.JSON, default=dict)
    status = db.Column(db.String(32), default='pending')  # 'pending', 'in_progress', 'completed', 'failed'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)
    error = db.Column(db.Text, nullable=True)
    metadata_ = db.Column('metadata', db.JSON, default=dict)
    
    def to_dict(self):
        return {
            'id': self.id,
            'agent_id': self.agent_id,
            'action': self.action,
            'parameters': self.parameters or {},
            'result': self.result,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'error': self.error,
            'metadata': self.metadata_ or {}
        }

def init_extensions(app):
    """Initialize Flask extensions with the given app."""
    # Ensure the instance folder exists
    os.makedirs(app.instance_path, exist_ok=True)
    
    # Configure SQLAlchemy
    app.config.setdefault('SQLALCHEMY_DATABASE_URI', 
                         f'sqlite:///{os.path.join(app.instance_path, "app.db")}')
    app.config.setdefault('SQLALCHEMY_TRACK_MODIFICATIONS', False)
    
    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db, directory=os.path.join(app.root_path, 'migrations'))
    
    # Make models available in the app context
    app.extensions['models'] = {
        'Agent': AgentModel,
        'AgentConversation': AgentConversationModel,
        'AgentMessage': AgentMessageModel,
        'AgentActionLog': AgentActionLogModel
    }
    
    # Create tables if they don't exist
    with app.app_context():
        db.create_all()
    
    return db
