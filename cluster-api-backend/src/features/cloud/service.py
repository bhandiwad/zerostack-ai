"""
Cloud Account Service

This module provides services for managing cloud accounts and resources.
"""
import logging
import json
from typing import List, Dict, Optional, Any, Tuple
from datetime import datetime, timezone

from cryptography.fernet import Fernet
from pydantic import ValidationError

from ..database import SessionLocal, with_db
from .models import (
    CloudAccount, CloudAccountCreate, CloudAccountUpdate, CloudAccountStatus,
    CloudResource, CloudResourceList, CloudAccountSyncStatus, CloudCostEstimate,
    CloudComplianceCheck, CloudProvider, CloudAccountAuthType
)
from ...core.config import settings
from ...core.security import get_password_hash
from ...utils.retry import async_retry

logger = logging.getLogger(__name__)

# Initialize Fernet for credential encryption
fernet = Fernet(settings.SECRET_KEY.encode())

class CloudAccountService:
    """Service for managing cloud accounts and resources"""
    
    @staticmethod
    def _encrypt_credentials(credentials: Dict[str, Any]) -> bytes:
        """Encrypt credentials before storing in database"""
        return fernet.encrypt(json.dumps(credentials).encode())
    
    @staticmethod
    def _decrypt_credentials(encrypted_credentials: bytes) -> Dict[str, Any]:
        """Decrypt stored credentials"""
        return json.loads(fernet.decrypt(encrypted_credentials).decode())
    
    @staticmethod
    @with_db
    async def create_account(
        account_data: CloudAccountCreate, 
        user_id: str,
        db: SessionLocal
    ) -> CloudAccount:
        """Create a new cloud account"""
        from ..database.models import CloudAccount as CloudAccountModel
        
        # Check if account with same name already exists
        existing = db.query(CloudAccountModel).filter(
            CloudAccountModel.name == account_data.name,
            CloudAccountModel.created_by == user_id
        ).first()
        
        if existing:
            raise ValueError(f"Cloud account with name '{account_data.name}' already exists")
        
        # Encrypt credentials
        encrypted_creds = CloudAccountService._encrypt_credentials(account_data.credentials)
        
        # Create new account
        db_account = CloudAccountModel(
            **account_data.dict(exclude={'credentials'}),
            credentials_encrypted=encrypted_creds,
            created_by=user_id,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        
        db.add(db_account)
        db.commit()
        db.refresh(db_account)
        
        # Validate and test the connection
        try:
            await CloudAccountService._validate_cloud_connection(db_account)
            db_account.status = CloudAccountStatus.ACTIVE
        except Exception as e:
            db_account.status = CloudAccountStatus.ERROR
            db_account.status_message = str(e)
            logger.error(f"Failed to validate cloud account {db_account.id}: {e}", exc_info=True)
        
        db.commit()
        db.refresh(db_account)
        
        return CloudAccount.from_orm(db_account)
    
    @staticmethod
    @with_db
    async def update_account(
        account_id: str,
        update_data: CloudAccountUpdate,
        user_id: str,
        db: SessionLocal
    ) -> Optional[CloudAccount]:
        """Update an existing cloud account"""
        from ..database.models import CloudAccount as CloudAccountModel
        
        db_account = db.query(CloudAccountModel).filter(
            CloudAccountModel.id == account_id,
            CloudAccountModel.created_by == user_id
        ).first()
        
        if not db_account:
            return None
        
        # Update fields
        update_dict = update_data.dict(exclude_unset=True)
        
        # Handle credentials update if provided
        if 'credentials' in update_dict:
            encrypted_creds = CloudAccountService._encrypt_credentials(update_dict['credentials'])
            db_account.credentials_encrypted = encrypted_creds
            # Re-validate the connection when credentials change
            db_account.status = CloudAccountStatus.VALIDATING
            
            try:
                await CloudAccountService._validate_cloud_connection(db_account)
                db_account.status = CloudAccountStatus.ACTIVE
            except Exception as e:
                db_account.status = CloudAccountStatus.ERROR
                db_account.status_message = str(e)
                logger.error(f"Failed to validate updated cloud account {account_id}: {e}", exc_info=True)
        
        # Update other fields
        for field, value in update_dict.items():
            if field != 'credentials' and hasattr(db_account, field):
                setattr(db_account, field, value)
        
        db_account.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(db_account)
        
        return CloudAccount.from_orm(db_account)
    
    @staticmethod
    @with_db
    def get_account(account_id: str, user_id: str, db: SessionLocal) -> Optional[CloudAccount]:
        """Get a cloud account by ID"""
        from ..database.models import CloudAccount as CloudAccountModel
        
        db_account = db.query(CloudAccountModel).filter(
            CloudAccountModel.id == account_id,
            CloudAccountModel.created_by == user_id
        ).first()
        
        if not db_account:
            return None
            
        return CloudAccount.from_orm(db_account)
    
    @staticmethod
    @with_db
    def list_accounts(
        user_id: str, 
        provider: Optional[CloudProvider] = None,
        status: Optional[CloudAccountStatus] = None,
        skip: int = 0,
        limit: int = 100,
        db: SessionLocal = None
    ) -> Tuple[List[CloudAccount], int]:
        """List cloud accounts with optional filtering"""
        from ..database.models import CloudAccount as CloudAccountModel
        
        query = db.query(CloudAccountModel).filter(
            CloudAccountModel.created_by == user_id
        )
        
        if provider:
            query = query.filter(CloudAccountModel.provider == provider)
            
        if status:
            query = query.filter(CloudAccountModel.status == status)
        
        total = query.count()
        accounts = query.offset(skip).limit(limit).all()
        
        return [CloudAccount.from_orm(acc) for acc in accounts], total
    
    @staticmethod
    @with_db
    def delete_account(account_id: str, user_id: str, db: SessionLocal) -> bool:
        """Delete a cloud account"""
        from ..database.models import CloudAccount as CloudAccountModel
        
        db_account = db.query(CloudAccountModel).filter(
            CloudAccountModel.id == account_id,
            CloudAccountModel.created_by == user_id
        ).first()
        
        if not db_account:
            return False
        
        db.delete(db_account)
        db.commit()
        return True
    
    @staticmethod
    @with_db
    async def sync_account_resources(
        account_id: str,
        user_id: str,
        resource_types: Optional[List[str]] = None,
        force: bool = False,
        db: SessionLocal = None
    ) -> CloudAccountSyncStatus:
        """Synchronize resources from a cloud account"""
        from ..database.models import CloudAccount as CloudAccountModel
        
        db_account = db.query(CloudAccountModel).filter(
            CloudAccountModel.id == account_id,
            CloudAccountModel.created_by == user_id
        ).first()
        
        if not db_account:
            raise ValueError("Cloud account not found or access denied")
        
        # Update account status
        db_account.status = CloudAccountStatus.VALIDATING
        db_account.last_sync_started_at = datetime.now(timezone.utc)
        db.commit()
        
        sync_status = CloudAccountSyncStatus(
            account_id=account_id,
            status="in_progress",
            started_at=datetime.now(timezone.utc),
            resources_discovered=0,
            resources_created=0,
            resources_updated=0,
            resources_deleted=0
        )
        
        try:
            # Get the appropriate client for the cloud provider
            client = await CloudAccountService._get_cloud_client(db_account)
            
            # Discover resources
            resources = await client.discover_resources(resource_types=resource_types)
            sync_status.resources_discovered = len(resources)
            
            # TODO: Compare with existing resources and update database
            # This would involve checking what's new, updated, or deleted
            
            # Update account status
            db_account.status = CloudAccountStatus.ACTIVE
            db_account.last_synced_at = datetime.now(timezone.utc)
            db.commit()
            
            sync_status.status = "completed"
            sync_status.completed_at = datetime.now(timezone.utc)
            
        except Exception as e:
            db_account.status = CloudAccountStatus.ERROR
            db_account.status_message = str(e)
            db.commit()
            
            sync_status.status = "failed"
            sync_status.completed_at = datetime.now(timezone.utc)
            sync_status.errors.append({
                "error": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
            
            logger.error(f"Failed to sync cloud account {account_id}: {e}", exc_info=True)
        
        return sync_status
    
    @staticmethod
    async def _validate_cloud_connection(account) -> bool:
        """Validate cloud account credentials and permissions"""
        try:
            client = await CloudAccountService._get_cloud_client(account)
            return await client.validate_connection()
        except Exception as e:
            logger.error(f"Cloud account validation failed: {e}", exc_info=True)
            raise
    
    @staticmethod
    async def _get_cloud_client(account):
        """Get the appropriate cloud client for the account"""
        credentials = CloudAccountService._decrypt_credentials(account.credentials_encrypted)
        
        if account.provider == CloudProvider.AWS:
            from .providers.aws import AWSClient
            return AWSClient(credentials, account.region)
            
        elif account.provider == CloudProvider.AZURE:
            from .providers.azure import AzureClient
            return AzureClient(credentials, account.subscription_id, account.region)
            
        elif account.provider == CloudProvider.GCP:
            from .providers.gcp import GCPClient
            return GCPClient(credentials, account.project_id, account.region)
            
        else:
            raise ValueError(f"Unsupported cloud provider: {account.provider}")


class CloudCostService:
    """Service for managing cloud costs and billing"""
    
    @staticmethod
    @with_db
    async def get_cost_estimate(
        account_id: str,
        user_id: str,
        start_date: datetime,
        end_date: datetime,
        granularity: str = "DAILY",
        db: SessionLocal = None
    ) -> CloudCostEstimate:
        """Get cost estimate for a cloud account"""
        from ..database.models import CloudAccount as CloudAccountModel
        
        account = db.query(CloudAccountModel).filter(
            CloudAccountModel.id == account_id,
            CloudAccountModel.created_by == user_id
        ).first()
        
        if not account:
            raise ValueError("Cloud account not found or access denied")
        
        try:
            client = await CloudAccountService._get_cloud_client(account)
            cost_data = await client.get_cost_estimate(start_date, end_date, granularity)
            
            return CloudCostEstimate(
                account_id=account_id,
                period_start=start_date,
                period_end=end_date,
                total_cost=cost_data.get("total_cost", 0),
                currency=cost_data.get("currency", "USD"),
                breakdown=cost_data.get("breakdown", {}),
                estimated=cost_data.get("estimated", True),
                generated_at=datetime.now(timezone.utc)
            )
            
        except Exception as e:
            logger.error(f"Failed to get cost estimate for account {account_id}: {e}", exc_info=True)
            raise


class CloudComplianceService:
    """Service for managing cloud compliance checks"""
    
    @staticmethod
    @with_db
    async def run_compliance_checks(
        account_id: str,
        user_id: str,
        check_names: Optional[List[str]] = None,
        db: SessionLocal = None
    ) -> List[CloudComplianceCheck]:
        """Run compliance checks on a cloud account"""
        from ..database.models import CloudAccount as CloudAccountModel
        
        account = db.query(CloudAccountModel).filter(
            CloudAccountModel.id == account_id,
            CloudAccountModel.created_by == user_id
        ).first()
        
        if not account:
            raise ValueError("Cloud account not found or access denied")
        
        try:
            client = await CloudAccountService._get_cloud_client(account)
            check_results = await client.run_compliance_checks(check_names)
            
            # Convert to CloudComplianceCheck objects
            return [
                CloudComplianceCheck(
                    account_id=account_id,
                    check_name=result["check_name"],
                    status=result["status"],
                    severity=result["severity"],
                    resource_id=result.get("resource_id"),
                    resource_type=result.get("resource_type"),
                    details=result.get("details", {}),
                    checked_at=datetime.now(timezone.utc)
                )
                for result in check_results
            ]
            
        except Exception as e:
            logger.error(f"Failed to run compliance checks for account {account_id}: {e}", exc_info=True)
            raise
