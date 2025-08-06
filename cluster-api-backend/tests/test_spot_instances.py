import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from unittest.mock import patch, MagicMock

from ..main import app
from ..models import Cluster, CloudAccount, SpotInstanceConfig, SpotInstanceHistory, SpotInstanceSavings
from ..schemas.spot_instances import SpotInstanceConfigCreate, SpotInstanceSavingsDataPoint
from ..services.cloud.spot_manager import SpotInstanceManager, AWSSpotInstanceManager

client = TestClient(app)

def test_create_spot_config(db: Session):
    """Test creating a spot instance configuration"""
    # Create test data
    account = CloudAccount(
        id="test-account-1",
        name="Test AWS Account",
        provider="aws",
        credentials={"access_key": "test", "secret_key": "test"},
        status="active"
    )
    db.add(account)
    
    cluster = Cluster(
        id="test-cluster-1",
        name="test-cluster",
        provider="aws",
        region="us-west-2",
        status="running",
        version="1.22",
        node_count=3,
        topology="multi-master",
        cloud_account_id=account.id
    )
    db.add(cluster)
    db.commit()
    
    # Test data
    config_data = {
        "enabled": True,
        "allocation_strategy": "lowest-price",
        "interruption_behavior": "terminate",
        "max_price": 0.05,
        "instance_types": ["m5.large", "m5.xlarge"]
    }
    
    # Test creating config
    with patch.object(AWSSpotInstanceManager, 'apply_config') as mock_apply:
        response = client.put(
            f"/api/cloud/accounts/{account.id}/clusters/{cluster.id}/spot",
            json=config_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["enabled"] is True
        assert data["allocation_strategy"] == "lowest-price"
        assert data["interruption_behavior"] == "terminate"
        assert data["max_price"] == 0.05
        assert data["instance_types"] == ["m5.large", "m5.xlarge"]
        
        # Verify the config was saved to the database
        db_config = db.query(SpotInstanceConfig).filter(
            SpotInstanceConfig.cluster_id == cluster.id
        ).first()
        assert db_config is not None
        assert db_config.enabled is True
        
        # Verify the manager was called
        mock_apply.assert_called_once()

def test_get_spot_savings(db: Session):
    """Test getting spot instance savings"""
    # Create test data
    account = CloudAccount(
        id="test-account-2",
        name="Test AWS Account 2",
        provider="aws",
        credentials={"access_key": "test", "secret_key": "test"},
        status="active"
    )
    db.add(account)
    
    cluster = Cluster(
        id="test-cluster-2",
        name="test-cluster-2",
        provider="aws",
        region="us-west-2",
        status="running",
        version="1.22",
        node_count=3,
        topology="multi-master",
        cloud_account_id=account.id
    )
    db.add(cluster)
    
    # Add spot config
    spot_config = SpotInstanceConfig(
        id="test-config-1",
        cluster_id=cluster.id,
        enabled=True,
        allocation_strategy="lowest-price",
        interruption_behavior="terminate"
    )
    db.add(spot_config)
    db.commit()
    
    # Mock the spot manager response
    mock_savings = {
        "start_date": (datetime.utcnow() - timedelta(days=30)).isoformat(),
        "end_date": datetime.utcnow().isoformat(),
        "total_savings": 1245.67,
        "on_demand_cost": 3456.78,
        "spot_cost": 2211.11,
        "savings_percentage": 35.7,
        "granularity": "daily",
        "data_points": [
            {
                "date": (datetime.utcnow() - timedelta(days=i)).isoformat(),
                "on_demand_cost": 100 + (i * 10),
                "spot_cost": 30 + (i * 5),
                "savings": 70 + (i * 5),
                "savings_percentage": 70 - (i * 0.5)
            }
            for i in range(30, 0, -1)
        ]
    }
    
    with patch.object(AWSSpotInstanceManager, 'get_savings_report', return_value=mock_savings):
        response = client.get(
            f"/api/cloud/accounts/{account.id}/clusters/{cluster.id}/spot/savings",
            params={
                "start_date": (datetime.utcnow() - timedelta(days=30)).isoformat(),
                "end_date": datetime.utcnow().isoformat(),
                "granularity": "daily"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["total_savings"] == 1245.67
        assert len(data["data_points"]) == 30
        assert data["granularity"] == "daily"

def test_spot_instance_recommendations(db: Session):
    """Test getting spot instance recommendations"""
    # Create test data
    account = CloudAccount(
        id="test-account-3",
        name="Test AWS Account 3",
        provider="aws",
        credentials={"access_key": "test", "secret_key": "test"},
        status="active"
    )
    db.add(account)
    
    cluster = Cluster(
        id="test-cluster-3",
        name="test-cluster-3",
        provider="aws",
        region="us-west-2",
        status="running",
        version="1.22",
        node_count=3,
        topology="multi-master",
        cloud_account_id=account.id
    )
    db.add(cluster)
    db.commit()
    
    # Mock the spot manager response
    mock_recommendations = [
        {
            "id": "rec-001",
            "type": "instance-type",
            "title": "Switch to spot instances",
            "description": "Save up to 70% by using spot instances for stateless workloads",
            "potential_savings": 450.0,
            "risk_level": "medium",
            "implementation_effort": "low",
            "details": {
                "current_instance_type": "m5.large",
                "recommended_instance_type": "m5.large (Spot)",
                "estimated_savings_percentage": 70,
            }
        }
    ]
    
    with patch.object(AWSSpotInstanceManager, 'get_recommendations', return_value=mock_recommendations):
        response = client.get(
            f"/api/cloud/accounts/{account.id}/clusters/{cluster.id}/spot/recommendations"
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["id"] == "rec-001"
        assert data[0]["type"] == "instance-type"
        assert data[0]["potential_savings"] == 450.0

# Run tests with: pytest tests/test_spot_instances.py -v
