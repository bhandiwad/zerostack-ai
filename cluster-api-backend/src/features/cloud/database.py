"""
Cloud Account Database Models

This module defines the SQLAlchemy models for cloud account management.
"""
from datetime import datetime
from typing import Dict, List, Optional, Any
import json
from sqlalchemy import Column, String, Enum, JSON, DateTime, Integer, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship, Session
from sqlalchemy.dialects.postgresql import JSONB

from ...database import Base
from .models import CloudProvider, CloudAccountStatus, CloudAccountAuthType, CloudResourceType

class CloudAccountDB(Base):
    """Database model for cloud accounts"""
    __tablename__ = "cloud_accounts"
    
    id = Column(String(36), primary_key=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    provider = Column(Enum(CloudProvider), nullable=False, index=True)
    description = Column(Text, nullable=True)
    environment = Column(String(50), default="production", nullable=False)
    auth_type = Column(Enum(CloudAccountAuthType), nullable=False)
    credentials_encrypted = Column(Text, nullable=False)  # Store encrypted credentials
    project_id = Column(String(100), nullable=True)
    region = Column(String(50), nullable=True)
    status = Column(Enum(CloudAccountStatus), default=CloudAccountStatus.INACTIVE, nullable=False)
    status_message = Column(Text, nullable=True)
    is_default = Column(Boolean, default=False, nullable=False)
    tags = Column(JSONB, default=dict, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    last_synced_at = Column(DateTime, nullable=True)
    created_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    
    # Relationships
    resources = relationship("CloudResourceDB", back_populates="account", cascade="all, delete-orphan")
    sync_history = relationship("CloudSyncHistoryDB", back_populates="account", cascade="all, delete-orphan")
    cost_history = relationship("CloudCostHistoryDB", back_populates="account", cascade="all, delete-orphan")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert model to dictionary"""
        return {
            "id": self.id,
            "name": self.name,
            "provider": self.provider.value,
            "description": self.description,
            "environment": self.environment,
            "auth_type": self.auth_type.value,
            "project_id": self.project_id,
            "region": self.region,
            "status": self.status.value,
            "status_message": self.status_message,
            "is_default": self.is_default,
            "tags": self.tags,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "last_synced_at": self.last_synced_at.isoformat() if self.last_synced_at else None,
            "created_by": self.created_by
        }


class CloudResourceDB(Base):
    """Database model for cloud resources"""
    __tablename__ = "cloud_resources"
    
    id = Column(String(100), primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    type = Column(Enum(CloudResourceType), nullable=False, index=True)
    provider = Column(Enum(CloudProvider), nullable=False, index=True)
    account_id = Column(String(36), ForeignKey("cloud_accounts.id"), nullable=False, index=True)
    region = Column(String(50), nullable=False, index=True)
    details = Column(JSONB, default=dict, nullable=False)
    tags = Column(JSONB, default=dict, nullable=False)
    created_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)
    last_seen_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Relationships
    account = relationship("CloudAccountDB", back_populates="resources")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert model to dictionary"""
        return {
            "id": self.id,
            "name": self.name,
            "type": self.type.value,
            "provider": self.provider.value,
            "account_id": self.account_id,
            "region": self.region,
            "details": self.details,
            "tags": self.tags,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "last_seen_at": self.last_seen_at.isoformat() if self.last_seen_at else None
        }


class CloudSyncHistoryDB(Base):
    """Database model for cloud account sync history"""
    __tablename__ = "cloud_sync_history"
    
    id = Column(String(36), primary_key=True, index=True)
    account_id = Column(String(36), ForeignKey("cloud_accounts.id"), nullable=False, index=True)
    status = Column(String(20), nullable=False, index=True)  # in_progress, completed, failed
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    completed_at = Column(DateTime, nullable=True, index=True)
    resources_discovered = Column(Integer, default=0, nullable=False)
    resources_created = Column(Integer, default=0, nullable=False)
    resources_updated = Column(Integer, default=0, nullable=False)
    resources_deleted = Column(Integer, default=0, nullable=False)
    errors = Column(JSONB, default=list, nullable=False)
    
    # Relationships
    account = relationship("CloudAccountDB", back_populates="sync_history")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert model to dictionary"""
        return {
            "id": self.id,
            "account_id": self.account_id,
            "status": self.status,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "resources_discovered": self.resources_discovered,
            "resources_created": self.resources_created,
            "resources_updated": self.resources_updated,
            "resources_deleted": self.resources_deleted,
            "errors": self.errors
        }


class CloudCostHistoryDB(Base):
    """Database model for cloud cost history"""
    __tablename__ = "cloud_cost_history"
    
    id = Column(String(36), primary_key=True, index=True)
    account_id = Column(String(36), ForeignKey("cloud_accounts.id"), nullable=False, index=True)
    period_start = Column(DateTime, nullable=False, index=True)
    period_end = Column(DateTime, nullable=False, index=True)
    total_cost = Column(Integer, nullable=False)  # Stored in cents to avoid floating point issues
    currency = Column(String(3), default="USD", nullable=False)
    breakdown = Column(JSONB, default=dict, nullable=False)
    estimated = Column(Boolean, default=True, nullable=False)
    generated_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Relationships
    account = relationship("CloudAccountDB", back_populates="cost_history")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert model to dictionary"""
        return {
            "id": self.id,
            "account_id": self.account_id,
            "period_start": self.period_start.isoformat() if self.period_start else None,
            "period_end": self.period_end.isoformat() if self.period_end else None,
            "total_cost": self.total_cost / 100,  # Convert back to dollars
            "currency": self.currency,
            "breakdown": self.breakdown,
            "estimated": self.estimated,
            "generated_at": self.generated_at.isoformat() if self.generated_at else None
        }


class CloudComplianceCheckDB(Base):
    """Database model for cloud compliance checks"""
    __tablename__ = "cloud_compliance_checks"
    
    id = Column(String(36), primary_key=True, index=True)
    account_id = Column(String(36), ForeignKey("cloud_accounts.id"), nullable=False, index=True)
    check_name = Column(String(100), nullable=False, index=True)
    status = Column(String(20), nullable=False, index=True)  # pass, fail, warning, error
    severity = Column(String(20), nullable=False, index=True)  # low, medium, high, critical
    resource_id = Column(String(100), nullable=True, index=True)
    resource_type = Column(String(50), nullable=True, index=True)
    details = Column(JSONB, default=dict, nullable=False)
    checked_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Relationships
    account = relationship("CloudAccountDB")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert model to dictionary"""
        return {
            "id": self.id,
            "account_id": self.account_id,
            "check_name": self.check_name,
            "status": self.status,
            "severity": self.severity,
            "resource_id": self.resource_id,
            "resource_type": self.resource_type,
            "details": self.details,
            "checked_at": self.checked_at.isoformat() if self.checked_at else None
        }
