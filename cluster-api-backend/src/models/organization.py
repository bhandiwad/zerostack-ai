"""
Multi-tenant Organization Model
Provides organization-level isolation for clusters, users, and resources
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
import enum

Base = declarative_base()

class SubscriptionTier(enum.Enum):
    FREE = "free"
    STARTER = "starter"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"

class OrganizationStatus(enum.Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    TRIAL = "trial"
    EXPIRED = "expired"

class Organization(Base):
    __tablename__ = 'organizations'
    
    id = Column(String(36), primary_key=True)  # UUID
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False)  # URL-friendly identifier
    description = Column(Text)
    
    # Subscription and billing
    subscription_tier = Column(Enum(SubscriptionTier), default=SubscriptionTier.FREE)
    status = Column(Enum(OrganizationStatus), default=OrganizationStatus.TRIAL)
    trial_ends_at = Column(DateTime)
    subscription_ends_at = Column(DateTime)
    
    # Resource limits based on subscription
    max_clusters = Column(Integer, default=3)  # Free tier limit
    max_nodes_per_cluster = Column(Integer, default=5)
    max_users = Column(Integer, default=5)
    max_cloud_accounts = Column(Integer, default=2)
    
    # Contact and billing information
    contact_email = Column(String(255), nullable=False)
    billing_email = Column(String(255))
    phone = Column(String(50))
    address = Column(Text)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String(36))  # User ID who created the org
    
    # Relationships
    users = relationship("User", back_populates="organization")
    clusters = relationship("Cluster", back_populates="organization")
    cloud_accounts = relationship("CloudAccount", back_populates="organization")
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'slug': self.slug,
            'description': self.description,
            'subscription_tier': self.subscription_tier.value if self.subscription_tier else None,
            'status': self.status.value if self.status else None,
            'trial_ends_at': self.trial_ends_at.isoformat() if self.trial_ends_at else None,
            'subscription_ends_at': self.subscription_ends_at.isoformat() if self.subscription_ends_at else None,
            'max_clusters': self.max_clusters,
            'max_nodes_per_cluster': self.max_nodes_per_cluster,
            'max_users': self.max_users,
            'max_cloud_accounts': self.max_cloud_accounts,
            'contact_email': self.contact_email,
            'billing_email': self.billing_email,
            'phone': self.phone,
            'address': self.address,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'user_count': len(self.users) if self.users else 0,
            'cluster_count': len(self.clusters) if self.clusters else 0,
            'cloud_account_count': len(self.cloud_accounts) if self.cloud_accounts else 0
        }
    
    def get_resource_usage(self):
        """Get current resource usage vs limits"""
        return {
            'clusters': {
                'used': len(self.clusters) if self.clusters else 0,
                'limit': self.max_clusters,
                'percentage': (len(self.clusters) / self.max_clusters * 100) if self.max_clusters > 0 else 0
            },
            'users': {
                'used': len(self.users) if self.users else 0,
                'limit': self.max_users,
                'percentage': (len(self.users) / self.max_users * 100) if self.max_users > 0 else 0
            },
            'cloud_accounts': {
                'used': len(self.cloud_accounts) if self.cloud_accounts else 0,
                'limit': self.max_cloud_accounts,
                'percentage': (len(self.cloud_accounts) / self.max_cloud_accounts * 100) if self.max_cloud_accounts > 0 else 0
            }
        }
    
    def can_create_cluster(self):
        """Check if organization can create more clusters"""
        current_clusters = len(self.clusters) if self.clusters else 0
        return current_clusters < self.max_clusters
    
    def can_add_user(self):
        """Check if organization can add more users"""
        current_users = len(self.users) if self.users else 0
        return current_users < self.max_users
    
    def can_add_cloud_account(self):
        """Check if organization can add more cloud accounts"""
        current_accounts = len(self.cloud_accounts) if self.cloud_accounts else 0
        return current_accounts < self.max_cloud_accounts

class UserRole(enum.Enum):
    SUPER_ADMIN = "super_admin"      # Platform-wide admin
    ORG_ADMIN = "org_admin"          # Organization admin
    CLUSTER_ADMIN = "cluster_admin"   # Can manage clusters
    DEVELOPER = "developer"           # Can view and basic operations
    VIEWER = "viewer"                 # Read-only access

class UserStatus(enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"
    SUSPENDED = "suspended"

class User(Base):
    __tablename__ = 'users'
    
    id = Column(String(36), primary_key=True)  # UUID
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    
    # Profile information
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    phone = Column(String(50))
    avatar_url = Column(String(500))
    
    # Role and permissions
    role = Column(Enum(UserRole), default=UserRole.DEVELOPER)
    status = Column(Enum(UserStatus), default=UserStatus.PENDING)
    
    # Organization relationship
    organization_id = Column(String(36), ForeignKey('organizations.id'), nullable=False)
    organization = relationship("Organization", back_populates="users")
    
    # Authentication and security
    last_login_at = Column(DateTime)
    password_changed_at = Column(DateTime, default=datetime.utcnow)
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime)
    
    # Invitation and activation
    invitation_token = Column(String(255))
    invitation_sent_at = Column(DateTime)
    activated_at = Column(DateTime)
    invited_by = Column(String(36))  # User ID who sent invitation
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self, include_sensitive=False):
        data = {
            'id': self.id,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'full_name': f"{self.first_name} {self.last_name}",
            'phone': self.phone,
            'avatar_url': self.avatar_url,
            'role': self.role.value if self.role else None,
            'status': self.status.value if self.status else None,
            'organization_id': self.organization_id,
            'last_login_at': self.last_login_at.isoformat() if self.last_login_at else None,
            'activated_at': self.activated_at.isoformat() if self.activated_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        
        if include_sensitive:
            data.update({
                'password_changed_at': self.password_changed_at.isoformat() if self.password_changed_at else None,
                'failed_login_attempts': self.failed_login_attempts,
                'locked_until': self.locked_until.isoformat() if self.locked_until else None,
                'invitation_sent_at': self.invitation_sent_at.isoformat() if self.invitation_sent_at else None,
                'invited_by': self.invited_by
            })
        
        return data
    
    def has_permission(self, permission):
        """Check if user has specific permission based on role"""
        permissions = {
            UserRole.SUPER_ADMIN: [
                'manage_platform', 'manage_organizations', 'manage_users',
                'manage_clusters', 'view_clusters', 'manage_cloud_accounts',
                'view_monitoring', 'manage_billing'
            ],
            UserRole.ORG_ADMIN: [
                'manage_organization', 'manage_users', 'manage_clusters',
                'view_clusters', 'manage_cloud_accounts', 'view_monitoring',
                'manage_billing'
            ],
            UserRole.CLUSTER_ADMIN: [
                'manage_clusters', 'view_clusters', 'manage_cloud_accounts',
                'view_monitoring'
            ],
            UserRole.DEVELOPER: [
                'view_clusters', 'basic_cluster_operations', 'view_monitoring'
            ],
            UserRole.VIEWER: [
                'view_clusters', 'view_monitoring'
            ]
        }
        
        user_permissions = permissions.get(self.role, [])
        return permission in user_permissions
    
    def is_active(self):
        """Check if user is active and not locked"""
        if self.status != UserStatus.ACTIVE:
            return False
        if self.locked_until and self.locked_until > datetime.utcnow():
            return False
        return True

class AuditLog(Base):
    __tablename__ = 'audit_logs'
    
    id = Column(String(36), primary_key=True)  # UUID
    organization_id = Column(String(36), ForeignKey('organizations.id'), nullable=False)
    user_id = Column(String(36), ForeignKey('users.id'))
    
    # Action details
    action = Column(String(100), nullable=False)  # e.g., 'cluster.create', 'user.invite'
    resource_type = Column(String(50))  # e.g., 'cluster', 'user', 'organization'
    resource_id = Column(String(36))
    
    # Request details
    ip_address = Column(String(45))  # IPv6 compatible
    user_agent = Column(String(500))
    request_method = Column(String(10))
    request_path = Column(String(500))
    
    # Result
    status = Column(String(20))  # success, failure, error
    error_message = Column(Text)
    
    # Additional context
    audit_metadata = Column(Text)  # JSON string for additional data
    
    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'organization_id': self.organization_id,
            'user_id': self.user_id,
            'action': self.action,
            'resource_type': self.resource_type,
            'resource_id': self.resource_id,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent,
            'request_method': self.request_method,
            'request_path': self.request_path,
            'status': self.status,
            'error_message': self.error_message,
            'metadata': self.audit_metadata,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

# Update existing models to include organization_id
class Cluster(Base):
    __tablename__ = 'clusters'
    
    id = Column(String(36), primary_key=True)
    organization_id = Column(String(36), ForeignKey('organizations.id'), nullable=False)
    organization = relationship("Organization", back_populates="clusters")
    
    name = Column(String(255), nullable=False)
    provider = Column(String(50), nullable=False)
    region = Column(String(100), nullable=False)
    kubernetes_version = Column(String(20), nullable=False)
    node_count = Column(Integer, default=3)
    status = Column(String(50), default='pending')
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String(36), ForeignKey('users.id'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'organization_id': self.organization_id,
            'name': self.name,
            'provider': self.provider,
            'region': self.region,
            'kubernetes_version': self.kubernetes_version,
            'node_count': self.node_count,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'created_by': self.created_by
        }

class CloudAccount(Base):
    __tablename__ = 'cloud_accounts'
    
    id = Column(String(36), primary_key=True)
    organization_id = Column(String(36), ForeignKey('organizations.id'), nullable=False)
    organization = relationship("Organization", back_populates="cloud_accounts")
    
    name = Column(String(255), nullable=False)
    provider = Column(String(50), nullable=False)
    credentials = Column(Text, nullable=False)  # Encrypted
    status = Column(String(50), default='active')
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String(36), ForeignKey('users.id'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'organization_id': self.organization_id,
            'name': self.name,
            'provider': self.provider,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'created_by': self.created_by
        }

