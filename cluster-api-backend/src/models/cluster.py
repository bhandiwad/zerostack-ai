from datetime import datetime
import json
from sqlalchemy import Column, String, Integer, Float, Boolean, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship

# Import the base model
from .base_model import Base, BaseModel

class Cluster(Base):
    """Model representing a Kubernetes cluster"""
    __tablename__ = 'clusters'
    
    id = Column(String(36), primary_key=True)
    name = Column(String(100), nullable=False, unique=True)
    provider = Column(String(50), nullable=False)  # aws, gcp, azure, vmware, on-premises, sify
    region = Column(String(100), nullable=False)
    status = Column(String(20), nullable=False, default='pending')  # pending, running, failed, stopped, scaling
    version = Column(String(20), nullable=False)
    node_count = Column(Integer, nullable=False, default=1)
    topology = Column(String(50), nullable=False)  # single-master, multi-master, all-in-one, custom
    
    # Resource specifications
    cpu_cores = Column(Integer, nullable=False, default=2)
    memory_gb = Column(Integer, nullable=False, default=4)
    storage_gb = Column(Integer, nullable=False, default=20)
    gpu_count = Column(Integer, nullable=False, default=0)
    gpu_type = Column(String(50), nullable=True)  # nvidia-t4, nvidia-v100, nvidia-a100, etc.
    
    # Cost information
    hourly_cost = Column(Float, nullable=False, default=0.0)
    monthly_cost = Column(Float, nullable=False, default=0.0)
    
    # Configuration as JSON
    configuration = Column(Text, nullable=True)  # JSON string
    
    # Cloud account reference
    cloud_account_id = Column(String(36), ForeignKey('cloud_accounts.id'), nullable=True)
    
    # User who created the cluster
    created_by = Column(String(100), nullable=False, default='admin')
    
    # Relationships
    spot_config = relationship(
        "SpotInstanceConfig", 
        back_populates="cluster", 
        uselist=False, 
        cascade="all, delete-orphan",
        foreign_keys="[SpotInstanceConfig.cluster_id]"
    )
    metrics = relationship("ClusterMetrics", back_populates="cluster")
    alerts = relationship("Alert", back_populates="cluster")
    
    def to_dict(self):
        config = {}
        if self.configuration:
            try:
                config = json.loads(self.configuration)
            except:
                config = {}
                
        return {
            'id': self.id,
            'name': self.name,
            'provider': self.provider,
            'region': self.region,
            'status': self.status,
            'version': self.version,
            'nodeCount': self.node_count,
            'topology': self.topology,
            'resources': {
                'cpu': self.cpu_cores,
                'memory': self.memory_gb,
                'storage': self.storage_gb,
                'gpu': {
                    'count': self.gpu_count,
                    'type': self.gpu_type
                }
            },
            'cost': {
                'hourly': self.hourly_cost,
                'monthly': self.monthly_cost
            },
            'configuration': config,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
            'cloudAccountId': self.cloud_account_id,
            'createdBy': self.created_by
        }

class ClusterMetrics(Base):
    """Model representing cluster metrics"""
    __tablename__ = 'cluster_metrics'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    cluster_id = Column(String(36), ForeignKey('clusters.id'), nullable=False)
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow)
    cpu_usage = Column(Float, nullable=False, default=0.0)
    memory_usage = Column(Float, nullable=False, default=0.0)
    storage_usage = Column(Float, nullable=False, default=0.0)
    network_in = Column(Float, nullable=False, default=0.0)
    network_out = Column(Float, nullable=False, default=0.0)
    gpu_usage = Column(Float, nullable=True)
    gpu_memory_usage = Column(Float, nullable=True)
    
    # Relationships
    cluster = relationship("Cluster", back_populates="metrics")
    
    def to_dict(self):
        return {
            'clusterId': self.cluster_id,
            'timestamp': self.timestamp.isoformat(),
            'cpu': self.cpu_usage,
            'memory': self.memory_usage,
            'storage': self.storage_usage,
            'network': {
                'in': self.network_in,
                'out': self.network_out
            },
            'gpu': {
                'usage': self.gpu_usage,
                'memoryUsage': self.gpu_memory_usage
            } if self.gpu_usage is not None else None
        }

class Alert(Base):
    """Model representing cluster alerts"""
    __tablename__ = 'alerts'
    
    id = Column(String(36), primary_key=True)
    cluster_id = Column(String(36), ForeignKey('clusters.id'), nullable=False)
    severity = Column(String(20), nullable=False)  # info, warning, error, critical
    message = Column(Text, nullable=False)
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow)
    dismissed = Column(Boolean, nullable=False, default=False)
    dismissed_at = Column(DateTime, nullable=True)
    dismissed_by = Column(String(100), nullable=True)
    
    # Relationships
    cluster = relationship("Cluster", back_populates="alerts")
    
    def to_dict(self):
        return {
            'id': self.id,
            'clusterId': self.cluster_id,
            'severity': self.severity,
            'message': self.message,
            'timestamp': self.timestamp.isoformat(),
            'dismissed': self.dismissed,
            'dismissedAt': self.dismissed_at.isoformat() if self.dismissed_at else None,
            'dismissedBy': self.dismissed_by
        }

class CloudAccount(Base):
    """Model representing cloud provider accounts"""
    __tablename__ = 'cloud_accounts'
    
    id = Column(String(36), primary_key=True)
    name = Column(String(100), nullable=False)
    provider = Column(String(50), nullable=False)  # aws, gcp, azure, etc.
    credentials = Column(Text, nullable=False)  # Encrypted credentials
    account_id = Column(String(100), nullable=True)
    default_region = Column(String(100), nullable=True)
    status = Column(String(20), nullable=False, default='pending')  # pending, active, error
    last_validated = Column(DateTime, nullable=True)
    validation_error = Column(Text, nullable=True)
    created_by = Column(String(100), nullable=False, default='admin')
    
    # Relationships
    clusters = relationship("Cluster", backref="cloud_account")
    
    def to_dict(self, include_credentials=False):
        result = {
            'id': self.id,
            'name': self.name,
            'provider': self.provider,
            'accountId': self.account_id,
            'defaultRegion': self.default_region,
            'status': self.status,
            'lastValidated': self.last_validated.isoformat() if self.last_validated else None,
            'validationError': self.validation_error,
            'createdAt': self.created_at.isoformat(),
            'updatedAt': self.updated_at.isoformat(),
            'createdBy': self.created_by
        }
        
        if include_credentials:
            try:
                result['credentials'] = json.loads(self.credentials)
            except:
                result['credentials'] = {}
                
        return result

class ProviderFlavor(Base):
    """Model representing cloud provider instance types/flavors"""
    __tablename__ = 'provider_flavors'
    
    id = Column(String(100), primary_key=True)  # e.g., 'aws-t3.medium', 'gcp-n1-standard-2'
    provider = Column(String(50), nullable=False)  # aws, gcp, azure, etc.
    name = Column(String(100), nullable=False)  # e.g., 't3.medium', 'n1-standard-2'
    display_name = Column(String(200), nullable=False)  # e.g., 'T3 Medium', 'N1 Standard 2'
    
    # Resource specifications
    cpu_cores = Column(Integer, nullable=False)
    memory_gb = Column(Integer, nullable=False)  # RAM in GB
    storage_gb = Column(Integer, nullable=False, default=20)  # Default storage in GB
    gpu_count = Column(Integer, nullable=False, default=0)
    gpu_type = Column(String(50), nullable=True)  # e.g., 'NVIDIA T4', 'NVIDIA V100'
    gpu_memory_gb = Column(Integer, nullable=True)  # GPU memory in GB
    
    # Cost information (per hour in USD)
    hourly_cost = Column(Float, nullable=False)
    monthly_cost = Column(Float, nullable=False)  # Calculated as hourly_cost * 730 (avg hours in month)
    
    # Regions where this flavor is available (comma-separated)
    regions = Column(Text, nullable=False)  # JSON array of region names
    
    # Metadata
    available = Column(Boolean, nullable=False, default=True)  # If false, this flavor is not available for selection
    category = Column(String(50), nullable=False, default='general')  # general, compute-optimized, memory-optimized, etc.
    description = Column(Text, nullable=True)
    
    def to_dict(self):
        regions_list = []
        if self.regions:
            try:
                regions_list = json.loads(self.regions)
            except:
                regions_list = []
                
        return {
            'id': self.id,
            'provider': self.provider,
            'name': self.name,
            'displayName': self.display_name,
            'resources': {
                'cpu': self.cpu_cores,
                'memory': self.memory_gb,
                'storage': self.storage_gb,
                'gpu': {
                    'count': self.gpu_count,
                    'type': self.gpu_type,
                    'memory': self.gpu_memory_gb
                } if self.gpu_count > 0 else None
            },
            'pricing': {
                'hourly': self.hourly_cost,
                'monthly': self.monthly_cost
            },
            'regions': regions_list,
            'available': self.available,
            'category': self.category,
            'description': self.description
        }

