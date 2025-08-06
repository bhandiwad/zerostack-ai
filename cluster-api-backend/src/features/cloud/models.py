"""
Cloud Account Models

This module defines the data models for cloud account management.
"""
from enum import Enum
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field, validator
from datetime import datetime


class CloudProvider(str, Enum):
    """Supported cloud providers"""
    AWS = "aws"
    AZURE = "azure"
    GCP = "gcp"
    VMWARE = "vmware"
    OPENSTACK = "openstack"
    VSPHERE = "vsphere"


class CloudAccountStatus(str, Enum):
    """Cloud account status"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"
    VALIDATING = "validating"


class CloudAccountAuthType(str, Enum):
    """Authentication types for cloud accounts"""
    CREDENTIALS = "credentials"
    IAM_ROLE = "iam_role"
    SERVICE_PRINCIPAL = "service_principal"
    OAUTH2 = "oauth2"


class CloudAccountBase(BaseModel):
    """Base model for cloud accounts"""
    name: str = Field(..., min_length=3, max_length=100)
    provider: CloudProvider
    description: Optional[str] = Field(None, max_length=500)
    environment: str = Field("production", max_length=50)
    tags: Dict[str, str] = Field(default_factory=dict)
    is_default: bool = False
    status: CloudAccountStatus = CloudAccountStatus.INACTIVE


class CloudAccountCreate(CloudAccountBase):
    """Model for creating a new cloud account"""
    auth_type: CloudAccountAuthType
    credentials: Dict[str, Any] = Field(..., description="Encrypted credentials for the cloud account")
    project_id: Optional[str] = Field(None, description="Project/Subscription/Tenant ID")
    region: Optional[str] = Field(None, description="Default region")

    @validator('credentials')
    def validate_credentials(cls, v, values):
        """Validate credentials based on auth type"""
        auth_type = values.get('auth_type')
        provider = values.get('provider')
        
        if not auth_type or not provider:
            return v
            
        required_fields = []
        
        if auth_type == CloudAccountAuthType.CREDENTIALS:
            if provider == CloudProvider.AWS:
                required_fields = ['access_key_id', 'secret_access_key']
            elif provider == CloudProvider.GCP:
                required_fields = ['type', 'project_id', 'private_key_id', 'private_key', 'client_email']
            elif provider == CloudProvider.AZURE:
                required_fields = ['subscription_id', 'client_id', 'client_secret', 'tenant_id']
        elif auth_type == CloudAccountAuthType.IAM_ROLE:
            if provider == CloudProvider.AWS:
                required_fields = ['role_arn']
        elif auth_type == CloudAccountAuthType.SERVICE_PRINCIPAL:
            if provider == CloudProvider.AZURE:
                required_fields = ['subscription_id', 'client_id', 'client_secret', 'tenant_id']
        
        for field in required_fields:
            if field not in v:
                raise ValueError(f"Missing required field for {auth_type} auth: {field}")
        
        return v


class CloudAccountUpdate(BaseModel):
    """Model for updating an existing cloud account"""
    name: Optional[str] = Field(None, min_length=3, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    environment: Optional[str] = Field(None, max_length=50)
    tags: Optional[Dict[str, str]] = None
    is_default: Optional[bool] = None
    status: Optional[CloudAccountStatus] = None
    credentials: Optional[Dict[str, Any]] = Field(
        None, 
        description="Updated credentials (if needed)"
    )


class CloudAccount(CloudAccountBase):
    """Cloud account model with read-only fields"""
    id: str
    auth_type: CloudAccountAuthType
    project_id: Optional[str] = None
    region: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    last_synced_at: Optional[datetime] = None
    created_by: str
    
    class Config:
        orm_mode = True


class CloudResourceType(str, Enum):
    """Types of cloud resources"""
    COMPUTE = "compute"
    STORAGE = "storage"
    NETWORK = "network"
    DATABASE = "database"
    KUBERNETES = "kubernetes"
    LOAD_BALANCER = "load_balancer"
    CONTAINER_REGISTRY = "container_registry"
    IAM = "iam"
    OTHER = "other"


class CloudResource(BaseModel):
    """A cloud resource discovered from a cloud account"""
    id: str
    name: str
    type: CloudResourceType
    provider: CloudProvider
    account_id: str
    region: str
    details: Dict[str, Any]
    tags: Dict[str, str] = {}
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    last_seen_at: datetime
    
    class Config:
        orm_mode = True


class CloudResourceList(BaseModel):
    """Paginated list of cloud resources"""
    items: List[CloudResource]
    total: int
    page: int
    page_size: int
    has_more: bool


class CloudAccountSyncStatus(BaseModel):
    """Status of a cloud account resource sync"""
    account_id: str
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    resources_discovered: int = 0
    resources_created: int = 0
    resources_updated: int = 0
    resources_deleted: int = 0
    errors: List[Dict[str, Any]] = []


class CloudCostEstimate(BaseModel):
    """Cost estimate for cloud resources"""
    account_id: str
    period_start: datetime
    period_end: datetime
    total_cost: float
    currency: str = "USD"
    breakdown: Dict[str, float] = {}
    estimated: bool = True
    generated_at: datetime


class CloudComplianceCheck(BaseModel):
    """Compliance check result for cloud resources"""
    id: str
    account_id: str
    check_name: str
    status: str  # pass, fail, warning, error
    severity: str  # low, medium, high, critical
    resource_id: Optional[str] = None
    resource_type: Optional[str] = None
    details: Dict[str, Any] = {}
    checked_at: datetime
