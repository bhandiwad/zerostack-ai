"""
Cloud Account API Schemas

This module defines the Pydantic models used for request/response validation
in the cloud account API endpoints.
"""
from datetime import datetime
from typing import List, Optional, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field, validator

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
    name: str = Field(..., min_length=3, max_length=100, description="Name of the cloud account")
    provider: CloudProvider = Field(..., description="Cloud provider")
    description: Optional[str] = Field(None, max_length=500, description="Description of the cloud account")
    environment: str = Field("production", max_length=50, description="Environment (e.g., production, staging, development)")
    tags: Dict[str, str] = Field(default_factory=dict, description="Key-value pairs for categorization")
    is_default: bool = Field(False, description="Whether this is the default account for the provider")

class CloudAccountCreate(CloudAccountBase):
    """Model for creating a new cloud account"""
    auth_type: CloudAccountAuthType = Field(..., description="Authentication type")
    credentials: Dict[str, Any] = Field(..., description="Credentials for the cloud account")
    project_id: Optional[str] = Field(None, description="Project/Subscription/Tenant ID")
    region: Optional[str] = Field(None, description="Default region for the account")

class CloudAccountUpdate(BaseModel):
    """Model for updating an existing cloud account"""
    name: Optional[str] = Field(None, min_length=3, max_length=100, description="Name of the cloud account")
    description: Optional[str] = Field(None, max_length=500, description="Description of the cloud account")
    environment: Optional[str] = Field(None, max_length=50, description="Environment")
    tags: Optional[Dict[str, str]] = Field(None, description="Key-value pairs for categorization")
    is_default: Optional[bool] = Field(None, description="Whether this is the default account for the provider")
    credentials: Optional[Dict[str, Any]] = Field(None, description="Updated credentials")

class CloudAccount(CloudAccountBase):
    """Cloud account model with read-only fields"""
    id: str = Field(..., description="Unique identifier for the cloud account")
    auth_type: CloudAccountAuthType = Field(..., description="Authentication type")
    project_id: Optional[str] = Field(None, description="Project/Subscription/Tenant ID")
    region: Optional[str] = Field(None, description="Default region for the account")
    status: CloudAccountStatus = Field(..., description="Current status of the account")
    status_message: Optional[str] = Field(None, description="Additional status information")
    created_at: datetime = Field(..., description="When the account was created")
    updated_at: datetime = Field(..., description="When the account was last updated")
    last_synced_at: Optional[datetime] = Field(None, description="When the account was last synchronized")
    created_by: str = Field(..., description="ID of the user who created the account")

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
    id: str = Field(..., description="Unique identifier for the resource")
    name: str = Field(..., description="Name of the resource")
    type: CloudResourceType = Field(..., description="Type of the resource")
    provider: CloudProvider = Field(..., description="Cloud provider")
    account_id: str = Field(..., description="ID of the cloud account")
    region: str = Field(..., description="Region where the resource is located")
    details: Dict[str, Any] = Field(default_factory=dict, description="Additional resource details")
    tags: Dict[str, str] = Field(default_factory=dict, description="Resource tags")
    created_at: Optional[datetime] = Field(None, description="When the resource was created")
    updated_at: Optional[datetime] = Field(None, description="When the resource was last updated")
    last_seen_at: datetime = Field(..., description="When the resource was last seen")

    class Config:
        orm_mode = True

class CloudResourceList(BaseModel):
    """Paginated list of cloud resources"""
    items: List[CloudResource] = Field(..., description="List of resources")
    total: int = Field(..., description="Total number of resources")
    page: int = Field(..., description="Current page number")
    page_size: int = Field(..., description="Number of items per page")
    has_more: bool = Field(..., description="Whether there are more items available")

class CloudAccountSyncStatus(BaseModel):
    """Status of a cloud account resource sync"""
    account_id: str = Field(..., description="ID of the cloud account")
    status: str = Field(..., description="Sync status (in_progress, completed, failed)")
    started_at: datetime = Field(..., description="When the sync started")
    completed_at: Optional[datetime] = Field(None, description="When the sync completed")
    resources_discovered: int = Field(0, description="Number of resources discovered")
    resources_created: int = Field(0, description="Number of resources created")
    resources_updated: int = Field(0, description="Number of resources updated")
    resources_deleted: int = Field(0, description="Number of resources deleted")
    errors: List[Dict[str, Any]] = Field(default_factory=list, description="Any errors that occurred during sync")

class CloudCostEstimate(BaseModel):
    """Cost estimate for cloud resources"""
    account_id: str = Field(..., description="ID of the cloud account")
    period_start: datetime = Field(..., description="Start of the cost period")
    period_end: datetime = Field(..., description="End of the cost period")
    total_cost: float = Field(..., description="Total cost in the specified currency")
    currency: str = Field("USD", description="Currency code (e.g., USD, EUR)")
    breakdown: Dict[str, float] = Field(default_factory=dict, description="Cost breakdown by service/category")
    estimated: bool = Field(True, description="Whether the cost is an estimate")
    generated_at: datetime = Field(..., description="When the cost estimate was generated")

class ComplianceCheckSeverity(str, Enum):
    """Severity levels for compliance checks"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ComplianceCheckStatus(str, Enum):
    """Status of a compliance check"""
    PASS = "pass"
    FAIL = "fail"
    WARNING = "warning"
    ERROR = "error"
    SKIPPED = "skipped"

class CloudComplianceCheck(BaseModel):
    """Compliance check result for cloud resources"""
    id: str = Field(..., description="Unique identifier for the check result")
    account_id: str = Field(..., description="ID of the cloud account")
    check_name: str = Field(..., description="Name/identifier of the compliance check")
    status: ComplianceCheckStatus = Field(..., description="Result status of the check")
    severity: ComplianceCheckSeverity = Field(..., description="Severity of a failed check")
    resource_id: Optional[str] = Field(None, description="ID of the resource that was checked")
    resource_type: Optional[str] = Field(None, description="Type of the resource that was checked")
    details: Dict[str, Any] = Field(default_factory=dict, description="Additional details about the check result")
    checked_at: datetime = Field(..., description="When the check was performed")

class CloudProviderRegion(BaseModel):
    """A region available for a cloud provider"""
    name: str = Field(..., description="Region identifier (e.g., us-east-1)")
    display_name: str = Field(..., description="Display name of the region")
    available: bool = Field(True, description="Whether the region is available")
    zones: Optional[List[str]] = Field(None, description="Availability zones in the region")

class CloudProviderResourceType(BaseModel):
    """A resource type supported by a cloud provider"""
    id: str = Field(..., description="Resource type identifier")
    name: str = Field(..., description="Display name of the resource type")
    category: Optional[str] = Field(None, description="Category of the resource type")
    description: Optional[str] = Field(None, description="Description of the resource type")

class CloudProviderCapabilities(BaseModel):
    """Capabilities supported by a cloud provider"""
    provider: CloudProvider = Field(..., description="Cloud provider")
    display_name: str = Field(..., description="Display name of the provider")
    supports_resource_discovery: bool = Field(True, description="Whether resource discovery is supported")
    supports_cost_estimation: bool = Field(True, description="Whether cost estimation is supported")
    supports_compliance_checks: bool = Field(True, description="Whether compliance checks are supported")
    supported_auth_types: List[CloudAccountAuthType] = Field(..., description="Supported authentication types")
