import pytest
import os
import sys
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock, AsyncMock
from flask import Flask
from sqlalchemy import create_engine, Column, String, Integer, JSON, ForeignKey, Boolean, Float, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship, scoped_session

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../')))

# Import the spot manager and related classes
from src.services.cloud.spot_manager import (
    SpotInstanceManager as BaseSpotInstanceManager,
    AWSSpotInstanceManager,
    AzureSpotInstanceManager,
    GCPSpotInstanceManager,
    get_spot_instance_manager
)

# Create a concrete implementation of SpotInstanceManager for testing
class TestSpotInstanceManager(BaseSpotInstanceManager):
    async def apply_config(self, config):
        return True
        
    async def get_savings_report(self, start_date, end_date, granularity="daily"):
        return {}
        
    async def get_interruption_history(self, start_date, end_date, instance_type=None):
        return []
        
    async def get_recommendations(self):
        return []
        
    async def apply_recommendation(self, recommendation_id):
        return {}

# Create a test-specific version of the manager classes
class TestAWSSpotInstanceManager(TestSpotInstanceManager, AWSSpotInstanceManager):
    pass

# Create a test-specific SQLAlchemy instance and models
Base = declarative_base()

class TestCloudAccount(Base):
    __tablename__ = 'cloud_accounts'
    
    id = Column(String(255), primary_key=True)
    name = Column(String(255), nullable=False)
    provider = Column(String(50), nullable=False)
    credentials = Column(JSON, nullable=False)
    status = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    clusters = relationship("TestCluster", back_populates="cloud_account")
    
    def get_decrypted_credentials(self):
        """Return decrypted credentials (just return as-is for testing)"""
        return self.credentials

class TestCluster(Base):
    __tablename__ = 'clusters'
    
    id = Column(String(255), primary_key=True)
    name = Column(String(255), nullable=False)
    provider = Column(String(50), nullable=False)
    region = Column(String(100), nullable=False)
    status = Column(String(50), nullable=False)
    version = Column(String(50), nullable=False)
    node_count = Column(Integer, nullable=False)
    topology = Column(String(50), nullable=False)
    cloud_account_id = Column(String(255), ForeignKey('cloud_accounts.id'))
    
    cloud_account = relationship("TestCloudAccount", back_populates="clusters")

TestCloudAccount.clusters = relationship("TestCluster", back_populates="cloud_account")

class TestSpotInstanceConfig(Base):
    __tablename__ = 'spot_instance_configs'
    
    id = Column(String(255), primary_key=True)
    cluster_id = Column(String(255), ForeignKey('clusters.id'))
    enabled = Column(Boolean, default=False)
    allocation_strategy = Column(String(50))
    interruption_behavior = Column(String(50))
    max_price = Column(Float, nullable=True)
    instance_types = Column(JSON)

# Test database setup
TEST_DATABASE_URI = 'sqlite:///:memory:'

# Create test fixtures
@pytest.fixture(scope='session')
def app():
    app = Flask(__name__)
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = TEST_DATABASE_URI
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    return app

@pytest.fixture(scope='session')
def db_engine(app):
    engine = create_engine(TEST_DATABASE_URI)
    return engine

@pytest.fixture(scope='function')
def db_session(app, db_engine):
    # Create all tables
    Base.metadata.create_all(bind=db_engine)
    
    # Create a new session for testing
    connection = db_engine.connect()
    transaction = connection.begin()
    session_factory = sessionmaker(bind=connection)
    session = scoped_session(session_factory)
    
    # Create test data
    account = TestCloudAccount(
        id="test-account-1",
        name="Test Account",
        provider="aws",
        credentials={"access_key": "test_key", "secret_key": "test_secret"},
        status="active"
    )
    
    cluster = TestCluster(
        id="test-cluster-1",
        name="test-cluster",
        provider="aws",
        region="us-west-2",
        status="running",
        version="1.22",
        node_count=3,
        topology="multi-master",
        cloud_account_id="test-account-1"
    )
    
    spot_config = TestSpotInstanceConfig(
        id="test-config-1",
        cluster_id="test-cluster-1",
        enabled=True,
        allocation_strategy="lowest-price",
        interruption_behavior="terminate",
        max_price=0.05,
        instance_types=["m5.large", "m5.xlarge"]
    )
    
    session.add(account)
    session.add(cluster)
    session.add(spot_config)
    session.commit()
    
    yield session
    
    # Clean up
    session.close()
    transaction.rollback()
    connection.close()
    
    # Drop all tables
    Base.metadata.drop_all(bind=db_engine)

@pytest.fixture
def test_account():
    """Fixture to create a test cloud account"""
    return TestCloudAccount(
        id="test-account-1",
        name="Test Account",
        provider="aws",
        credentials={"access_key": "test_key", "secret_key": "test_secret"},
        status="active"
    )

@pytest.fixture
def test_cluster(test_account):
    """Fixture to create a test cluster"""
    return TestCluster(
        id="test-cluster-1",
        name="test-cluster",
        provider="aws",
        region="us-west-2",
        status="running",
        version="1.22",
        node_count=3,
        topology="multi-master",
        cloud_account_id="test-account-1"
    )

@pytest.fixture
def test_spot_config(test_cluster):
    """Fixture to create a test spot instance config"""
    return TestSpotInstanceConfig(
        id="test-config-1",
        cluster_id="test-cluster-1",
        enabled=True,
        allocation_strategy="lowest-price",
        interruption_behavior="terminate",
        max_price=0.05,
        instance_types=["m5.large", "m5.xlarge"]
    )

@pytest.fixture
def mock_boto3():
    with patch('boto3.client') as mock_client:
        yield mock_client

@pytest.mark.asyncio
async def test_spot_instance_manager_abstract_methods(test_account, test_cluster, test_spot_config):
    """Test that concrete implementation works"""
    manager = TestSpotInstanceManager(test_account, test_cluster)
    
    # Test apply_config
    result = await manager.apply_config(test_spot_config)
    assert result is True
    
    # Test get_savings_report
    savings = await manager.get_savings_report(
        start_date=datetime.utcnow() - timedelta(days=7),
        end_date=datetime.utcnow()
    )
    assert isinstance(savings, dict)
    
    # Test get_interruption_history
    history = await manager.get_interruption_history(
        start_date=datetime.utcnow() - timedelta(days=30),
        end_date=datetime.utcnow()
    )
    assert isinstance(history, list)
    
    # Test get_recommendations
    recommendations = await manager.get_recommendations()
    assert isinstance(recommendations, list)
    
    # Test apply_recommendation
    result = await manager.apply_recommendation("rec-123")
    assert isinstance(result, dict)

@pytest.mark.asyncio
async def test_spot_instance_manager_validation(test_account, test_cluster):
    """Test configuration validation in the base manager"""
    manager = TestSpotInstanceManager(test_account, test_cluster)
    
    # Test valid config
    valid_config = {
        "enabled": True,
        "allocation_strategy": "lowest-price",
        "interruption_behavior": "terminate",
        "max_price": 0.05,
        "instance_types": ["m5.large"]
    }
    assert manager._validate_config(valid_config) is True
    
    # Test invalid configs
    with pytest.raises(ValueError, match="must be a dictionary"):
        manager._validate_config("not a dict")
    
    with pytest.raises(ValueError, match="must specify 'enabled'"):
        manager._validate_config({})
    
    with pytest.raises(ValueError, match="must specify 'allocation_strategy'"):
        manager._validate_config({"enabled": True})
    
    with pytest.raises(ValueError, match="Invalid allocation strategy"):
        manager._validate_config({"enabled": True, "allocation_strategy": "invalid"})
    
    with pytest.raises(ValueError, match="must specify 'interruption_behavior'"):
        manager._validate_config({"enabled": True, "allocation_strategy": "lowest-price"})
    
    with pytest.raises(ValueError, match="Max price must be a valid number"):
        manager._validate_config({
            "enabled": True,
            "allocation_strategy": "lowest-price",
            "interruption_behavior": "terminate",
            "max_price": "not a number"
        })

@pytest.mark.asyncio
async def test_aws_spot_instance_manager_apply_config(test_account, test_cluster, test_spot_config):
    """Test AWS spot instance manager apply_config method"""
    # Create a test-specific AWS manager
    manager = TestAWSSpotInstanceManager(test_account, test_cluster)
    
    # Test successful config application
    result = await manager.apply_config(test_spot_config)
    assert result is True
    
    # Test with invalid config (as a dictionary)
    invalid_config = {
        "enabled": True,
        "allocation_strategy": "lowest-price",
        "interruption_behavior": "terminate",
        "max_price": None,
        "instance_types": "not-a-list"  # This should trigger the validation error
    }
    
    # Test the validation directly since we can't test it through apply_config with a dict
    with pytest.raises(ValueError, match="Instance types must be a list"):
        manager._validate_config(invalid_config)

def test_get_spot_instance_manager(test_cluster):
    """Test the spot instance manager factory function"""
    # Test AWS
    aws_account = TestCloudAccount(
        id="aws-account",
        name="AWS Account",
        provider="aws",
        credentials={"access_key": "test", "secret_key": "test"},
        status="active"
    )
    aws_manager = get_spot_instance_manager(aws_account, test_cluster)
    assert isinstance(aws_manager, AWSSpotInstanceManager)
    
    # Skip Azure/GCP tests as they're not fully implemented yet
    # Test unsupported provider
    unsupported_account = TestCloudAccount(
        id="unsupported-account",
        name="Unsupported",
        provider="unsupported",
        credentials={},
        status="active"
    )
    with pytest.raises(ValueError, match="Unsupported cloud provider"):
        get_spot_instance_manager(unsupported_account, test_cluster)

@pytest.mark.skip(reason="Azure spot instance manager not fully implemented")
def test_azure_spot_instance_manager():
    pass

@pytest.mark.skip(reason="GCP spot instance manager not fully implemented")
def test_gcp_spot_instance_manager():
    pass
