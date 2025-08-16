"""
Comprehensive Test Suite for ZeroStack AI Backend
"""
import pytest
import json
from unittest.mock import Mock, patch, MagicMock
from flask import Flask
from src.main import create_app
from src.models.cluster import Cluster
from src.models.cloud_account import CloudAccount
from src.models.user import User, Organization
from src.features.agents.capabilities.support_l1 import SupportL1Agent
from src.features.agents.capabilities.support_l2 import SupportL2Agent
from src.features.agents.capabilities.auto_scaling import AutoScalingAgent


class TestZeroStackAIBackend:
    """Test suite for ZeroStack AI backend functionality"""
    
    @pytest.fixture
    def app(self):
        """Create test Flask application"""
        app = create_app(testing=True)
        app.config['TESTING'] = True
        app.config['DATABASE_URL'] = 'sqlite:///:memory:'
        return app
    
    @pytest.fixture
    def client(self, app):
        """Create test client"""
        return app.test_client()
    
    @pytest.fixture
    def auth_headers(self):
        """Mock authentication headers"""
        return {
            'Authorization': 'Bearer test-jwt-token',
            'Content-Type': 'application/json'
        }
    
    def test_health_check(self, client):
        """Test health check endpoint"""
        response = client.get('/api/health')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'healthy'
        assert 'version' in data
    
    def test_cluster_list_endpoint(self, client, auth_headers):
        """Test cluster listing endpoint"""
        with patch('src.services.cluster_service.get_clusters') as mock_get:
            mock_get.return_value = [
                {
                    'id': '1',
                    'name': 'test-cluster',
                    'status': 'running',
                    'provider': 'aws',
                    'node_count': 3
                }
            ]
            
            response = client.get('/api/clusters', headers=auth_headers)
            assert response.status_code == 200
            data = json.loads(response.data)
            assert len(data) == 1
            assert data[0]['name'] == 'test-cluster'
    
    def test_cluster_creation(self, client, auth_headers):
        """Test cluster creation endpoint"""
        cluster_data = {
            'name': 'new-cluster',
            'provider': 'aws',
            'region': 'us-east-1',
            'kubernetes_version': '1.28.0',
            'node_count': 3
        }
        
        with patch('src.services.cluster_service.create_cluster') as mock_create:
            mock_create.return_value = {
                'id': '123',
                'status': 'creating',
                'message': 'Cluster creation initiated'
            }
            
            response = client.post('/api/clusters', 
                                 data=json.dumps(cluster_data),
                                 headers=auth_headers)
            assert response.status_code == 201
            data = json.loads(response.data)
            assert data['status'] == 'creating'
    
    def test_cluster_scaling(self, client, auth_headers):
        """Test cluster scaling endpoint"""
        scale_data = {
            'target_nodes': 5,
            'graceful': True
        }
        
        with patch('src.services.cluster_service.scale_cluster') as mock_scale:
            mock_scale.return_value = {
                'success': True,
                'message': 'Scaling initiated'
            }
            
            response = client.post('/api/clusters/1/scale',
                                 data=json.dumps(scale_data),
                                 headers=auth_headers)
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['success'] is True
    
    def test_maintenance_mode(self, client, auth_headers):
        """Test maintenance mode endpoint"""
        maintenance_data = {
            'enabled': True,
            'reason': 'Scheduled maintenance',
            'duration_minutes': 60
        }
        
        with patch('src.services.cluster_service.set_maintenance_mode') as mock_maintenance:
            mock_maintenance.return_value = {
                'success': True,
                'message': 'Maintenance mode enabled'
            }
            
            response = client.post('/api/clusters/1/maintenance-mode',
                                 data=json.dumps(maintenance_data),
                                 headers=auth_headers)
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['success'] is True


class TestAIAgentSystem:
    """Test suite for AI Agent functionality"""
    
    @pytest.fixture
    def mock_openai(self):
        """Mock OpenAI client"""
        with patch('openai.ChatCompletion.create') as mock:
            mock.return_value = {
                'choices': [{
                    'message': {
                        'content': 'AI response'
                    }
                }]
            }
            yield mock
    
    def test_support_l1_agent(self, mock_openai):
        """Test L1 support agent functionality"""
        agent = SupportL1Agent()
        
        response = agent.handle_query("How do I create a cluster?")
        
        assert response['success'] is True
        assert 'response' in response
        mock_openai.assert_called_once()
    
    def test_support_l2_agent(self, mock_openai):
        """Test L2 support agent functionality"""
        agent = SupportL2Agent()
        
        log_data = "Error: Pod failed to start"
        response = agent.analyze_logs(log_data)
        
        assert response['success'] is True
        assert 'analysis' in response
        mock_openai.assert_called_once()
    
    def test_auto_scaling_agent(self):
        """Test auto-scaling agent functionality"""
        agent = AutoScalingAgent()
        
        metrics = {
            'cpu_usage': 85,
            'memory_usage': 70,
            'request_rate': 1000
        }
        
        with patch('src.services.metrics_service.get_cluster_metrics') as mock_metrics:
            mock_metrics.return_value = metrics
            
            recommendation = agent.get_scaling_recommendation('cluster-1')
            
            assert 'action' in recommendation
            assert recommendation['action'] in ['scale_up', 'scale_down', 'no_action']
    
    def test_agent_escalation(self, mock_openai):
        """Test agent escalation workflow"""
        l1_agent = SupportL1Agent()
        
        # Simulate complex query that should escalate
        complex_query = "My cluster nodes are experiencing memory leaks and pods are being OOMKilled"
        
        response = l1_agent.handle_query(complex_query)
        
        # Should escalate to L2
        assert response.get('escalate') is True
        assert response.get('escalate_to') == 'L2'


class TestCloudProviderIntegration:
    """Test suite for cloud provider integrations"""
    
    def test_aws_provider_validation(self):
        """Test AWS provider credential validation"""
        from src.providers.aws_provider import AWSProvider
        
        credentials = {
            'access_key_id': 'test-key',
            'secret_access_key': 'test-secret',
            'region': 'us-east-1'
        }
        
        with patch('boto3.client') as mock_boto:
            mock_client = Mock()
            mock_client.describe_regions.return_value = {'Regions': []}
            mock_boto.return_value = mock_client
            
            provider = AWSProvider(credentials)
            result = provider.validate_credentials()
            
            assert result['valid'] is True
    
    def test_gcp_provider_validation(self):
        """Test GCP provider credential validation"""
        from src.providers.gcp_provider import GCPProvider
        
        credentials = {
            'service_account_json': '{"type": "service_account"}',
            'project_id': 'test-project'
        }
        
        with patch('google.cloud.compute_v1.RegionsClient') as mock_client:
            provider = GCPProvider(credentials)
            result = provider.validate_credentials()
            
            assert result['valid'] is True
    
    def test_azure_provider_validation(self):
        """Test Azure provider credential validation"""
        from src.providers.azure_provider import AzureProvider
        
        credentials = {
            'client_id': 'test-client',
            'client_secret': 'test-secret',
            'tenant_id': 'test-tenant',
            'subscription_id': 'test-subscription'
        }
        
        with patch('azure.identity.ClientSecretCredential') as mock_cred:
            with patch('azure.mgmt.compute.ComputeManagementClient') as mock_client:
                provider = AzureProvider(credentials)
                result = provider.validate_credentials()
                
                assert result['valid'] is True


class TestDatabaseModels:
    """Test suite for database models"""
    
    def test_user_model(self):
        """Test User model functionality"""
        user = User(
            name='Test User',
            email='test@zerostack.ai',
            role='admin'
        )
        
        assert user.name == 'Test User'
        assert user.email == 'test@zerostack.ai'
        assert user.role == 'admin'
        assert user.is_admin() is True
    
    def test_cluster_model(self):
        """Test Cluster model functionality"""
        cluster = Cluster(
            name='test-cluster',
            provider='aws',
            region='us-east-1',
            status='running'
        )
        
        assert cluster.name == 'test-cluster'
        assert cluster.provider == 'aws'
        assert cluster.is_running() is True
    
    def test_cloud_account_model(self):
        """Test CloudAccount model functionality"""
        account = CloudAccount(
            name='AWS Production',
            provider='aws',
            credentials={'access_key_id': 'test'}
        )
        
        assert account.name == 'AWS Production'
        assert account.provider == 'aws'
        assert account.is_connected() is False  # Default state


class TestSecurityFeatures:
    """Test suite for security features"""
    
    def test_jwt_authentication(self, client):
        """Test JWT authentication"""
        # Test without token
        response = client.get('/api/clusters')
        assert response.status_code == 401
        
        # Test with invalid token
        headers = {'Authorization': 'Bearer invalid-token'}
        response = client.get('/api/clusters', headers=headers)
        assert response.status_code == 401
    
    def test_role_based_access(self, client):
        """Test role-based access control"""
        # Mock user with different roles
        with patch('src.auth.get_current_user') as mock_user:
            # Test admin access
            mock_user.return_value = User(role='admin')
            headers = {'Authorization': 'Bearer admin-token'}
            response = client.delete('/api/clusters/1', headers=headers)
            assert response.status_code != 403
            
            # Test regular user access to admin endpoint
            mock_user.return_value = User(role='user')
            headers = {'Authorization': 'Bearer user-token'}
            response = client.delete('/api/clusters/1', headers=headers)
            assert response.status_code == 403
    
    def test_credential_encryption(self):
        """Test credential encryption functionality"""
        from src.utils.encryption import encrypt_credentials, decrypt_credentials
        
        original_creds = {'api_key': 'secret-key'}
        encrypted = encrypt_credentials(original_creds)
        decrypted = decrypt_credentials(encrypted)
        
        assert encrypted != original_creds
        assert decrypted == original_creds


class TestPerformanceAndReliability:
    """Test suite for performance and reliability"""
    
    def test_api_response_times(self, client, auth_headers):
        """Test API response times"""
        import time
        
        start_time = time.time()
        response = client.get('/api/clusters', headers=auth_headers)
        end_time = time.time()
        
        response_time = end_time - start_time
        assert response_time < 1.0  # Should respond within 1 second
    
    def test_concurrent_requests(self, client, auth_headers):
        """Test handling of concurrent requests"""
        import threading
        import time
        
        results = []
        
        def make_request():
            response = client.get('/api/clusters', headers=auth_headers)
            results.append(response.status_code)
        
        # Create multiple threads
        threads = []
        for _ in range(10):
            thread = threading.Thread(target=make_request)
            threads.append(thread)
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
        
        # All requests should succeed
        assert all(status == 200 for status in results)
    
    def test_error_handling(self, client, auth_headers):
        """Test error handling"""
        # Test 404 error
        response = client.get('/api/clusters/nonexistent', headers=auth_headers)
        assert response.status_code == 404
        
        data = json.loads(response.data)
        assert 'error' in data
        assert 'message' in data
    
    def test_input_validation(self, client, auth_headers):
        """Test input validation"""
        # Test invalid cluster creation data
        invalid_data = {
            'name': '',  # Empty name
            'provider': 'invalid-provider',
            'node_count': -1  # Invalid node count
        }
        
        response = client.post('/api/clusters',
                             data=json.dumps(invalid_data),
                             headers=auth_headers)
        assert response.status_code == 400
        
        data = json.loads(response.data)
        assert 'validation_errors' in data


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
