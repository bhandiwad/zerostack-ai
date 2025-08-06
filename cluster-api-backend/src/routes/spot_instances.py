from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import json
import logging
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import CloudAccount, Cluster, SpotInstanceConfig, SpotInstanceHistory
from ..schemas.spot_instances import (
    SpotInstanceConfigCreate,
    SpotInstanceConfigUpdate,
    SpotInstanceConfigResponse,
    SpotInstanceSavingsResponse,
    SpotInstanceInterruption,
    SpotInstanceRecommendation,
)
from ..services.cloud.spot_manager import SpotInstanceManager
from ..core.security import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get(
    "/accounts/{account_id}/clusters/{cluster_id}/spot",
    response_model=SpotInstanceConfigResponse
)
async def get_spot_instance_config(
    account_id: str,
    cluster_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get spot instance configuration for a cluster
    """
    # Verify user has access to this account and cluster
    account = db.query(CloudAccount).filter(
        CloudAccount.id == account_id,
        CloudAccount.organization_id.in_([org.id for org in current_user.organizations])
    ).first()
    
    if not account:
        raise HTTPException(status_code=404, detail="Cloud account not found")
    
    cluster = db.query(Cluster).filter(
        Cluster.id == cluster_id,
        Cluster.cloud_account_id == account_id
    ).first()
    
    if not cluster:
        raise HTTPException(status_code=404, detail="Cluster not found")
    
    # Get or create spot config
    spot_config = db.query(SpotInstanceConfig).filter(
        SpotInstanceConfig.cluster_id == cluster_id
    ).first()
    
    if not spot_config:
        # Create default config if it doesn't exist
        spot_config = SpotInstanceConfig(
            cluster_id=cluster_id,
            enabled=False,
            allocation_strategy="lowest-price",
            interruption_behavior="terminate",
            max_price=None,
            instance_types=[],
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(spot_config)
        db.commit()
        db.refresh(spot_config)
    
    return spot_config

@router.put(
    "/accounts/{account_id}/clusters/{cluster_id}/spot",
    response_model=SpotInstanceConfigResponse
)
async def update_spot_instance_config(
    account_id: str,
    cluster_id: str,
    config: SpotInstanceConfigUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Update spot instance configuration for a cluster
    """
    # Verify user has access to this account and cluster
    account = db.query(CloudAccount).filter(
        CloudAccount.id == account_id,
        CloudAccount.organization_id.in_([org.id for org in current_user.organizations])
    ).first()
    
    if not account:
        raise HTTPException(status_code=404, detail="Cloud account not found")
    
    cluster = db.query(Cluster).filter(
        Cluster.id == cluster_id,
        Cluster.cloud_account_id == account_id
    ).first()
    
    if not cluster:
        raise HTTPException(status_code=404, detail="Cluster not found")
    
    # Get or create spot config
    spot_config = db.query(SpotInstanceConfig).filter(
        SpotInstanceConfig.cluster_id == cluster_id
    ).first()
    
    if not spot_config:
        spot_config = SpotInstanceConfig(cluster_id=cluster_id)
        db.add(spot_config)
    
    # Update fields
    update_data = config.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(spot_config, field, value)
    
    spot_config.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(spot_config)
    
    # Apply changes to the cloud provider
    try:
        spot_manager = SpotInstanceManager(account, cluster)
        await spot_manager.apply_config(spot_config)
    except Exception as e:
        logger.error(f"Failed to apply spot instance config: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail=f"Failed to apply configuration: {str(e)}"
        )
    
    return spot_config

@router.get(
    "/accounts/{account_id}/clusters/{cluster_id}/spot/savings",
    response_model=SpotInstanceSavingsResponse
)
async def get_spot_instance_savings(
    account_id: str,
    cluster_id: str,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    granularity: str = "daily",
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get spot instance savings report for a cluster
    """
    # Verify user has access
    account = db.query(CloudAccount).filter(
        CloudAccount.id == account_id,
        CloudAccount.organization_id.in_([org.id for org in current_user.organizations])
    ).first()
    
    if not account:
        raise HTTPException(status_code=404, detail="Cloud account not found")
    
    cluster = db.query(Cluster).filter(
        Cluster.id == cluster_id,
        Cluster.cloud_account_id == account_id
    ).first()
    
    if not cluster:
        raise HTTPException(status_code=404, detail="Cluster not found")
    
    # Set default date range if not provided
    if not end_date:
        end_date = datetime.utcnow()
    if not start_date:
        start_date = end_date - timedelta(days=30)
    
    # Get spot savings data
    try:
        spot_manager = SpotInstanceManager(account, cluster)
        savings_data = await spot_manager.get_savings_report(
            start_date=start_date,
            end_date=end_date,
            granularity=granularity
        )
        return savings_data
    except Exception as e:
        logger.error(f"Failed to get spot savings: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail=f"Failed to get savings data: {str(e)}"
        )

@router.get(
    "/accounts/{account_id}/clusters/{cluster_id}/spot/interruptions",
    response_model=List[SpotInstanceInterruption]
)
async def get_spot_instance_interruptions(
    account_id: str,
    cluster_id: str,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    instance_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get spot instance interruption history for a cluster
    """
    # Verify user has access
    account = db.query(CloudAccount).filter(
        CloudAccount.id == account_id,
        CloudAccount.organization_id.in_([org.id for org in current_user.organizations])
    ).first()
    
    if not account:
        raise HTTPException(status_code=404, detail="Cloud account not found")
    
    cluster = db.query(Cluster).filter(
        Cluster.id == cluster_id,
        Cluster.cloud_account_id == account_id
    ).first()
    
    if not cluster:
        raise HTTPException(status_code=404, detail="Cluster not found")
    
    # Set default date range if not provided
    if not end_date:
        end_date = datetime.utcnow()
    if not start_date:
        start_date = end_date - timedelta(days=30)
    
    # Get interruption history
    try:
        spot_manager = SpotInstanceManager(account, cluster)
        interruptions = await spot_manager.get_interruption_history(
            start_date=start_date,
            end_date=end_date,
            instance_type=instance_type
        )
        return interruptions
    except Exception as e:
        logger.error(f"Failed to get interruption history: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail=f"Failed to get interruption history: {str(e)}"
        )

@router.get(
    "/accounts/{account_id}/clusters/{cluster_id}/spot/recommendations",
    response_model=List[SpotInstanceRecommendation]
)
async def get_spot_instance_recommendations(
    account_id: str,
    cluster_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get spot instance optimization recommendations for a cluster
    """
    # Verify user has access
    account = db.query(CloudAccount).filter(
        CloudAccount.id == account_id,
        CloudAccount.organization_id.in_([org.id for org in current_user.organizations])
    ).first()
    
    if not account:
        raise HTTPException(status_code=404, detail="Cloud account not found")
    
    cluster = db.query(Cluster).filter(
        Cluster.id == cluster_id,
        Cluster.cloud_account_id == account_id
    ).first()
    
    if not cluster:
        raise HTTPException(status_code=404, detail="Cluster not found")
    
    # Get recommendations
    try:
        spot_manager = SpotInstanceManager(account, cluster)
        recommendations = await spot_manager.get_recommendations()
        return recommendations
    except Exception as e:
        logger.error(f"Failed to get recommendations: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail=f"Failed to get recommendations: {str(e)}"
        )

@router.post(
    "/accounts/{account_id}/clusters/{cluster_id}/spot/recommendations/{recommendation_id}/apply"
)
async def apply_spot_instance_recommendation(
    account_id: str,
    cluster_id: str,
    recommendation_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Apply a spot instance recommendation
    """
    # Verify user has access
    account = db.query(CloudAccount).filter(
        CloudAccount.id == account_id,
        CloudAccount.organization_id.in_([org.id for org in current_user.organizations])
    ).first()
    
    if not account:
        raise HTTPException(status_code=404, detail="Cloud account not found")
    
    cluster = db.query(Cluster).filter(
        Cluster.id == cluster_id,
        Cluster.cloud_account_id == account_id
    ).first()
    
    if not cluster:
        raise HTTPException(status_code=404, detail="Cluster not found")
    
    # Apply recommendation
    try:
        spot_manager = SpotInstanceManager(account, cluster)
        result = await spot_manager.apply_recommendation(recommendation_id)
        return {"status": "success", "message": result}
    except Exception as e:
        logger.error(f"Failed to apply recommendation: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail=f"Failed to apply recommendation: {str(e)}"
        )
