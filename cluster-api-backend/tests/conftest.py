"""
Pytest configuration and shared fixtures
"""
import pytest
import sys
import os
from unittest.mock import Mock

# Add src to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

@pytest.fixture
def mock_kubernetes_client():
    """Mock Kubernetes client for testing"""
    client = Mock()
    
    # Mock common Kubernetes API responses
    client.list_pod_for_all_namespaces.return_value.items = [
        Mock(metadata=Mock(name='test-pod-1', namespace='default'),
             status=Mock(phase='Running')),
        Mock(metadata=Mock(name='test-pod-2', namespace='kube-system'),
             status=Mock(phase='Running'))
    ]
    
    client.list_node.return_value.items = [
        Mock(metadata=Mock(name='node-1'),
             status=Mock(conditions=[
                 Mock(type='Ready', status='True')
             ]))
    ]
    
    return client

@pytest.fixture
def sample_cluster_metrics():
    """Sample cluster metrics for testing"""
    return {
        'cpu_usage': 45.2,
        'memory_usage': 62.1,
        'disk_usage': 35.8,
        'network_io': 1024.5,
        'pod_count': 25,
        'failed_pods': 1,
        'container_restarts': 3,
        'api_response_time': 120.0,
        'etcd_latency': 5.2,
        'unhealthy_nodes': 0,
        'timestamp': '2024-01-15T10:00:00Z'
    }

@pytest.fixture
def sample_workflow_definition():
    """Sample workflow definition for testing"""
    return {
        'id': 'test_workflow',
        'name': 'Test Workflow',
        'description': 'A test workflow for unit testing',
        'category': 'testing',
        'estimated_duration': '5-10 minutes',
        'steps': [
            {
                'name': 'Preparation',
                'type': 'preparation',
                'description': 'Prepare for workflow execution',
                'commands': ['echo "Starting workflow"'],
                'timeout': 30
            },
            {
                'name': 'Main Task',
                'type': 'execution',
                'description': 'Execute main workflow task',
                'commands': ['echo "Executing main task"'],
                'timeout': 300
            },
            {
                'name': 'Cleanup',
                'type': 'cleanup',
                'description': 'Clean up after workflow',
                'commands': ['echo "Cleaning up"'],
                'timeout': 60
            }
        ],
        'rollback_steps': [
            {
                'name': 'Rollback',
                'type': 'rollback',
                'description': 'Rollback workflow changes',
                'commands': ['echo "Rolling back changes"'],
                'timeout': 120
            }
        ],
        'prerequisites': [],
        'success_criteria': [
            'All steps completed successfully',
            'No errors in execution logs'
        ]
    }

@pytest.fixture
def sample_predictive_insight():
    """Sample predictive insight for testing"""
    from features.debugging.predictive_analytics import PredictiveInsight
    from datetime import datetime
    
    return PredictiveInsight(
        id='insight_test_123',
        type='resource_exhaustion',
        title='Test CPU Exhaustion Prediction',
        description='CPU usage trending upward, exhaustion predicted',
        probability=0.78,
        time_to_occurrence='2-4 hours',
        severity='high',
        affected_resources=['node-1', 'node-2'],
        recommended_actions=[
            'Scale out cluster nodes',
            'Optimize high CPU workloads',
            'Review resource requests and limits'
        ],
        confidence=0.85,
        trend_data={
            'direction': 'increasing',
            'rate': 0.05,
            'projection_24h': 85.0
        },
        created_at=datetime.now().isoformat()
    )

@pytest.fixture
def sample_anomaly_detection():
    """Sample anomaly detection for testing"""
    from features.debugging.predictive_analytics import AnomalyDetection
    from datetime import datetime
    
    return AnomalyDetection(
        id='anomaly_test_123',
        metric_name='memory_usage',
        current_value=92.5,
        expected_value=65.0,
        deviation_percentage=42.3,
        anomaly_score=0.89,
        detection_time=datetime.now().isoformat(),
        severity='critical',
        description='Memory usage significantly above expected baseline',
        possible_causes=[
            'Memory leak in application',
            'Increased workload demand',
            'Insufficient memory allocation'
        ],
        recommended_actions=[
            'Investigate memory usage patterns',
            'Scale memory resources',
            'Review application for memory leaks'
        ]
    )

@pytest.fixture
def mock_flask_app():
    """Mock Flask application for testing"""
    from flask import Flask
    
    app = Flask(__name__)
    app.config['TESTING'] = True
    app.config['SECRET_KEY'] = 'test-secret-key'
    
    return app

@pytest.fixture
def mock_database():
    """Mock database for testing"""
    db = Mock()
    
    # Mock common database operations
    db.session.add = Mock()
    db.session.commit = Mock()
    db.session.rollback = Mock()
    db.session.query = Mock()
    
    return db

@pytest.fixture
def mock_redis_client():
    """Mock Redis client for testing"""
    redis_client = Mock()
    
    # Mock Redis operations
    redis_client.get.return_value = None
    redis_client.set.return_value = True
    redis_client.delete.return_value = 1
    redis_client.exists.return_value = False
    
    return redis_client

@pytest.fixture
def mock_ai_client():
    """Mock AI client for testing"""
    ai_client = Mock()
    
    # Mock AI API responses
    ai_client.chat.completions.create.return_value = Mock(
        choices=[
            Mock(message=Mock(content='Test AI response'))
        ]
    )
    
    return ai_client

@pytest.fixture(autouse=True)
def setup_test_environment():
    """Setup test environment variables"""
    os.environ['FLASK_ENV'] = 'testing'
    os.environ['DATABASE_URL'] = 'sqlite:///:memory:'
    os.environ['REDIS_URL'] = 'redis://localhost:6379/1'
    
    yield
    
    # Cleanup
    test_vars = ['FLASK_ENV', 'DATABASE_URL', 'REDIS_URL']
    for var in test_vars:
        if var in os.environ:
            del os.environ[var]
