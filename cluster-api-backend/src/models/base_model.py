"""
Base model class for all SQLAlchemy models.
"""
from datetime import datetime
from sqlalchemy.ext.declarative import declared_attr
from sqlalchemy import Column, String, DateTime, Text
import uuid

# Import the shared Base from extensions to ensure all models use the same metadata
from src.extensions import Base

class BaseModel:
    """Base model with common fields and methods."""
    
    # Common fields for all models
    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # This will be set by SQLAlchemy when the model is created
    __table__ = None
    __abstract__ = True  # Mark as abstract so SQLAlchemy doesn't try to create a table for this class
    
    @declared_attr
    def __tablename__(cls):
        """
        Generate __tablename__ automatically.
        Convert CamelCase class name to snake_case table name.
        """
        import re
        # Convert CamelCase to snake_case
        name = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', cls.__name__)
        return re.sub('([a-z0-9])([A-Z])', r'\1_\2', name).lower() + 's'
    
    def to_dict(self):
        """Convert the model instance to a dictionary."""
        return {
            'id': self.id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
