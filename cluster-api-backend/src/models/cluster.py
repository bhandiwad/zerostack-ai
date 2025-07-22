from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json

db = SQLAlchemy()

class Cluster(db.Model):
    __tablename__ = 'clusters'
    
    id = db.Column(db.String(36), primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    provider = db.Column(db.String(50), nullable=False)  # aws, gcp, azure, vmware, on-premises, sify
    region = db.Column(db.String(100), nullable=False)
    status = db.Column(db.String(20), nullable=False, default='pending')  # pending, running, failed, stopped, scaling
    version = db.Column(db.String(20), nullable=False)
    node_count = db.Column(db.Integer, nullable=False, default=1)
    topology = db.Column(db.String(50), nullable=False)  # single-master, multi-master, all-in-one, custom
    
    # Resource specifications
    cpu_cores = db.Column(db.Integer, nullable=False, default=2)
    memory_gb = db.Column(db.Integer, nullable=False, default=4)
    storage_gb = db.Column(db.Integer, nullable=False, default=20)
    gpu_count = db.Column(db.Integer, nullable=False, default=0)
    gpu_type = db.Column(db.String(50), nullable=True)  # nvidia-t4, nvidia-v100, nvidia-a100, etc.
    
    # Cost information
    hourly_cost = db.Column(db.Float, nullable=False, default=0.0)
    monthly_cost = db.Column(db.Float, nullable=False, default=0.0)
    
    # Configuration as JSON
    configuration = db.Column(db.Text, nullable=True)  # JSON string
    
    # Timestamps
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Cloud account reference
    cloud_account_id = db.Column(db.String(36), nullable=True)
    
    # User who created the cluster
    created_by = db.Column(db.String(100), nullable=False, default='admin')
    
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

class ClusterMetrics(db.Model):
    __tablename__ = 'cluster_metrics'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    cluster_id = db.Column(db.String(36), db.ForeignKey('clusters.id'), nullable=False)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    
    # Resource utilization metrics
    cpu_usage = db.Column(db.Float, nullable=False, default=0.0)  # percentage
    memory_usage = db.Column(db.Float, nullable=False, default=0.0)  # percentage
    storage_usage = db.Column(db.Float, nullable=False, default=0.0)  # percentage
    network_in = db.Column(db.Float, nullable=False, default=0.0)  # MB/s
    network_out = db.Column(db.Float, nullable=False, default=0.0)  # MB/s
    
    # GPU metrics (if applicable)
    gpu_usage = db.Column(db.Float, nullable=True)  # percentage
    gpu_memory_usage = db.Column(db.Float, nullable=True)  # percentage
    
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

class Alert(db.Model):
    __tablename__ = 'alerts'
    
    id = db.Column(db.String(36), primary_key=True)
    cluster_id = db.Column(db.String(36), db.ForeignKey('clusters.id'), nullable=False)
    severity = db.Column(db.String(20), nullable=False)  # info, warning, error
    message = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    dismissed = db.Column(db.Boolean, nullable=False, default=False)
    dismissed_at = db.Column(db.DateTime, nullable=True)
    dismissed_by = db.Column(db.String(100), nullable=True)
    
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

class CloudAccount(db.Model):
    __tablename__ = 'cloud_accounts'
    
    id = db.Column(db.String(36), primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    provider = db.Column(db.String(50), nullable=False)  # aws, gcp, azure, vmware, on-premises, sify
    
    # Encrypted credentials (in production, use proper encryption)
    credentials = db.Column(db.Text, nullable=False)  # JSON string with encrypted credentials
    
    # Account metadata
    account_id = db.Column(db.String(100), nullable=True)  # Provider-specific account ID
    default_region = db.Column(db.String(100), nullable=True)
    
    # Status and validation
    status = db.Column(db.String(20), nullable=False, default='pending')  # pending, active, error
    last_validated = db.Column(db.DateTime, nullable=True)
    validation_error = db.Column(db.Text, nullable=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.String(100), nullable=False, default='admin')
    
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

class ProviderFlavor(db.Model):
    __tablename__ = 'provider_flavors'
    
    id = db.Column(db.String(100), primary_key=True)  # e.g., aws-t3.medium, sify-gpu-v100
    provider = db.Column(db.String(50), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    display_name = db.Column(db.String(200), nullable=False)
    
    # Resource specifications
    cpu_cores = db.Column(db.Integer, nullable=False)
    memory_gb = db.Column(db.Integer, nullable=False)
    storage_gb = db.Column(db.Integer, nullable=False, default=20)
    
    # GPU specifications
    gpu_count = db.Column(db.Integer, nullable=False, default=0)
    gpu_type = db.Column(db.String(50), nullable=True)
    gpu_memory_gb = db.Column(db.Integer, nullable=True)
    
    # Pricing
    hourly_cost = db.Column(db.Float, nullable=False)
    monthly_cost = db.Column(db.Float, nullable=False)
    
    # Availability
    regions = db.Column(db.Text, nullable=False)  # JSON array of available regions
    available = db.Column(db.Boolean, nullable=False, default=True)
    
    # Metadata
    category = db.Column(db.String(50), nullable=False, default='general')  # general, compute, memory, gpu, storage
    description = db.Column(db.Text, nullable=True)
    
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

