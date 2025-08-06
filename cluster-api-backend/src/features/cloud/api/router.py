"""
Cloud Account API Router

This module defines the API endpoints for managing cloud accounts.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ...database import get_db
from ...core.security import get_current_user
from ...models.user import User
from .schemas import (
    CloudAccountCreate, CloudAccountUpdate, CloudAccount, 
    CloudResourceList, CloudAccountSyncStatus, CloudCostEstimate,
    CloudComplianceCheck
)
from ..service import CloudAccountService, CloudCostService, CloudComplianceService

router = APIRouter(prefix="/cloud/accounts", tags=["cloud-accounts"])

@router.post("/", response_model=CloudAccount, status_code=status.HTTP_201_CREATED)
async def create_cloud_account(
    account: CloudAccountCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new cloud account
    """
    try:
        return await CloudAccountService.create_account(account, current_user.id, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create cloud account: {str(e)}")

@router.get("/", response_model=List[CloudAccount])
async def list_cloud_accounts(
    provider: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all cloud accounts for the current user
    """
    accounts, _ = await CloudAccountService.list_accounts(
        current_user.id, 
        provider=provider,
        status=status,
        skip=skip,
        limit=limit,
        db=db
    )
    return accounts

@router.get("/{account_id}", response_model=CloudAccount)
async def get_cloud_account(
    account_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific cloud account by ID
    """
    account = await CloudAccountService.get_account(account_id, current_user.id, db)
    if not account:
        raise HTTPException(status_code=404, detail="Cloud account not found")
    return account

@router.put("/{account_id}", response_model=CloudAccount)
async def update_cloud_account(
    account_id: str,
    account_update: CloudAccountUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update a cloud account
    """
    account = await CloudAccountService.update_account(account_id, account_update, current_user.id, db)
    if not account:
        raise HTTPException(status_code=404, detail="Cloud account not found")
    return account

@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_cloud_account(
    account_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a cloud account
    """
    success = await CloudAccountService.delete_account(account_id, current_user.id, db)
    if not success:
        raise HTTPException(status_code=404, detail="Cloud account not found")
    return None

@router.post("/{account_id}/sync", response_model=CloudAccountSyncStatus)
async def sync_cloud_account(
    account_id: str,
    resource_types: Optional[List[str]] = None,
    force: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Synchronize resources from a cloud account
    """
    try:
        return await CloudAccountService.sync_account_resources(
            account_id=account_id,
            user_id=current_user.id,
            resource_types=resource_types,
            force=force,
            db=db
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to sync cloud account: {str(e)}")

@router.get("/{account_id}/resources", response_model=CloudResourceList)
async def list_cloud_resources(
    account_id: str,
    resource_type: Optional[str] = None,
    region: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List resources for a cloud account
    """
    # Implementation would query the database for resources
    # This is a placeholder implementation
    return {"items": [], "total": 0, "page": skip // limit + 1, "page_size": limit, "has_more": False}

@router.get("/{account_id}/costs", response_model=CloudCostEstimate)
async def get_cloud_costs(
    account_id: str,
    start_date: str,
    end_date: str,
    granularity: str = "DAILY",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get cost estimate for a cloud account
    """
    try:
        from datetime import datetime
        start = datetime.fromisoformat(start_date)
        end = datetime.fromisoformat(end_date)
        
        return await CloudCostService.get_cost_estimate(
            account_id=account_id,
            user_id=current_user.id,
            start_date=start,
            end_date=end,
            granularity=granularity,
            db=db
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get cost estimate: {str(e)}")

@router.get("/{account_id}/compliance", response_model=List[CloudComplianceCheck])
async def get_compliance_checks(
    account_id: str,
    check_names: Optional[List[str]] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Run compliance checks on a cloud account
    """
    try:
        return await CloudComplianceService.run_compliance_checks(
            account_id=account_id,
            user_id=current_user.id,
            check_names=check_names,
            db=db
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to run compliance checks: {str(e)}")

@router.get("/providers/regions", response_model=List[dict])
async def list_provider_regions(
    provider: str,
    current_user: User = Depends(get_current_user)
):
    """
    List available regions for a cloud provider
    """
    try:
        # This would use the appropriate provider client to fetch regions
        # For now, returning a sample response
        if provider.lower() == 'aws':
            return [
                {"name": "us-east-1", "display_name": "US East (N. Virginia)"},
                {"name": "us-west-2", "display_name": "US West (Oregon)"},
                # Add more regions as needed
            ]
        elif provider.lower() == 'azure':
            return [
                {"name": "eastus", "display_name": "East US"},
                {"name": "westus", "display_name": "West US"},
            ]
        elif provider.lower() == 'gcp':
            return [
                {"name": "us-central1", "display_name": "Iowa (us-central1)"},
                {"name": "us-east1", "display_name": "South Carolina (us-east1)"},
            ]
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported provider: {provider}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch regions: {str(e)}")

@router.get("/providers/resource-types", response_model=List[dict])
async def list_provider_resource_types(
    provider: str,
    current_user: User = Depends(get_current_user)
):
    """
    List supported resource types for a cloud provider
    """
    try:
        # This would use the appropriate provider client to fetch resource types
        # For now, returning a sample response
        if provider.lower() == 'aws':
            return [
                {"id": "ec2_instance", "name": "EC2 Instance"},
                {"id": "s3_bucket", "name": "S3 Bucket"},
                {"id": "rds_instance", "name": "RDS Instance"},
            ]
        elif provider.lower() == 'azure':
            return [
                {"id": "virtual_machine", "name": "Virtual Machine"},
                {"id": "storage_account", "name": "Storage Account"},
                {"id": "sql_database", "name": "SQL Database"},
            ]
        elif provider.lower() == 'gcp':
            return [
                {"id": "compute_instance", "name": "Compute Instance"},
                {"id": "cloud_storage", "name": "Cloud Storage"},
                {"id": "cloud_sql", "name": "Cloud SQL"},
            ]
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported provider: {provider}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch resource types: {str(e)}")
