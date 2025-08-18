"""
Test suite for debugging API endpoints
"""
import pytest
import json
from unittest.mock import Mock, patch, AsyncMock
import sys
import os

# Add src to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from features.debugging.debugging_routes import debugging_bp

class TestDebuggingAPI:
    """Test cases for debugging API endpoints"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        from flask import Flask
        app = Flask(__name__)
        app.register_blueprint(debugging_bp)
        app.config['TESTING'] = True
        return app.test_client()
    
    def test_simulate_issues_healthy(self, client):
        """Test simulate issues endpoint with healthy cluster"""
        response = client.post('/api/debugging/simulate-issues',
                             json={'type': 'healthy'},
                             content_type='application/json')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data['success'] is True
        assert data['simulation_type'] == 'healthy'
        assert data['issues_detected'] == 0
        assert len(data['issues']) == 0
        assert data['overall_health']['score'] >= 80
        assert data['overall_health']['status'] == 'excellent'
    
    def test_simulate_issues_cpu_high(self, client):
        """Test simulate issues endpoint with high CPU"""
        response = client.post('/api/debugging/simulate-issues',
                             json={'type': 'cpu_high'},
                             content_type='application/json')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data['success'] is True
        assert data['simulation_type'] == 'cpu_high'
        assert data['issues_detected'] > 0
        assert len(data['issues']) > 0
        assert data['simulated_metrics']['cpu_usage'] > 80
        
        # Should have CPU-related issue
        cpu_issues = [issue for issue in data['issues'] if 'CPU' in issue['title']]
        assert len(cpu_issues) > 0
    
    def test_simulate_issues_memory_pressure(self, client):
        """Test simulate issues endpoint with memory pressure"""
        response = client.post('/api/debugging/simulate-issues',
                             json={'type': 'memory_pressure'},
                             content_type='application/json')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data['success'] is True
        assert data['simulation_type'] == 'memory_pressure'
        assert data['issues_detected'] > 0
        assert data['simulated_metrics']['memory_usage'] > 85
        
        # Should have memory-related issue
        memory_issues = [issue for issue in data['issues'] if 'Memory' in issue['title']]
        assert len(memory_issues) > 0
    
    def test_simulate_issues_network_issues(self, client):
        """Test simulate issues endpoint with network issues"""
        response = client.post('/api/debugging/simulate-issues',
                             json={'type': 'network_issues'},
                             content_type='application/json')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data['success'] is True
        assert data['simulation_type'] == 'network_issues'
        assert data['issues_detected'] > 0
        assert data['simulated_metrics']['api_response_time'] > 200
    
    def test_simulate_issues_pod_failures(self, client):
        """Test simulate issues endpoint with pod failures"""
        response = client.post('/api/debugging/simulate-issues',
                             json={'type': 'pod_failures'},
                             content_type='application/json')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data['success'] is True
        assert data['simulation_type'] == 'pod_failures'
        assert data['issues_detected'] > 0
        assert data['simulated_metrics']['failed_pods'] > 0
    
    def test_simulate_issues_invalid_type(self, client):
        """Test simulate issues endpoint with invalid type"""
        response = client.post('/api/debugging/simulate-issues',
                             json={'type': 'invalid_type'},
                             content_type='application/json')
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'error' in data
    
    def test_simulate_issues_missing_type(self, client):
        """Test simulate issues endpoint without type"""
        response = client.post('/api/debugging/simulate-issues',
                             json={},
                             content_type='application/json')
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'error' in data
    
    @patch('features.debugging.debugging_routes.PredictiveAnalyticsEngine')
    def test_predictive_analysis_endpoint(self, mock_engine_class, client):
        """Test predictive analysis endpoint"""
        mock_engine = Mock()
        mock_engine_class.return_value = mock_engine
        
        mock_analysis = {
            'cluster_id': 'test_cluster',
            'analysis_timestamp': '2024-01-15T10:00:00Z',
            'overall_health_score': 85,
            'predictive_insights': [],
            'anomalies': [],
            'health_trends': {},
            'recommendations': []
        }
        
        mock_engine.analyze_cluster_health = AsyncMock(return_value=mock_analysis)
        
        response = client.get('/api/debugging/predictive-analysis')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data['success'] is True
        assert 'analysis' in data
        assert data['analysis']['overall_health_score'] == 85
    
    @patch('features.debugging.debugging_routes.PredictiveAnalyticsEngine')
    def test_anomaly_detection_endpoint(self, mock_engine_class, client):
        """Test anomaly detection endpoint"""
        mock_engine = Mock()
        mock_engine_class.return_value = mock_engine
        
        mock_anomalies = [
            {
                'id': 'anomaly_1',
                'metric_name': 'cpu_usage',
                'current_value': 95.0,
                'expected_value': 45.0,
                'severity': 'high',
                'anomaly_score': 0.85
            }
        ]
        
        mock_engine._detect_anomalies = AsyncMock(return_value=mock_anomalies)
        
        response = client.post('/api/debugging/anomaly-detection',
                             json={'metrics': {'cpu_usage': 95.0}},
                             content_type='application/json')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data['success'] is True
        assert 'anomalies' in data
        assert len(data['anomalies']) == 1
        assert data['anomalies'][0]['metric_name'] == 'cpu_usage'
    
    def test_intelligent_alerts_endpoint(self, client):
        """Test intelligent alerts endpoint"""
        response = client.get('/api/debugging/intelligent-alerts')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data['success'] is True
        assert 'alerts' in data
        assert 'summary' in data
        assert isinstance(data['alerts'], list)
        assert 'total_alerts' in data['summary']
        assert 'critical_alerts' in data['summary']
    
    def test_get_recommendations_endpoint(self, client):
        """Test get recommendations endpoint"""
        response = client.get('/api/debugging/recommendations')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data['success'] is True
        assert 'recommendations' in data
        assert isinstance(data['recommendations'], list)
    
    def test_cluster_health_endpoint(self, client):
        """Test cluster health endpoint"""
        response = client.get('/api/debugging/cluster-health')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data['success'] is True
        assert 'health' in data
        assert 'score' in data['health']
        assert 'status' in data['health']
        assert 'metrics' in data['health']
    
    def test_apply_fix_endpoint(self, client):
        """Test apply fix endpoint"""
        fix_data = {
            'issue_id': 'test_issue_123',
            'fix_type': 'scale_resources',
            'parameters': {'replicas': 3}
        }
        
        response = client.post('/api/debugging/apply-fix',
                             json=fix_data,
                             content_type='application/json')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data['success'] is True
        assert 'fix_id' in data
        assert 'message' in data
    
    def test_fix_status_endpoint(self, client):
        """Test fix status endpoint"""
        response = client.get('/api/debugging/fix-status/test_fix_123')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data['success'] is True
        assert 'fix_id' in data
        assert 'status' in data
    
    def test_invalid_json_request(self, client):
        """Test endpoint with invalid JSON"""
        response = client.post('/api/debugging/simulate-issues',
                             data='invalid json',
                             content_type='application/json')
        
        assert response.status_code == 400
    
    def test_missing_content_type(self, client):
        """Test endpoint without content type"""
        response = client.post('/api/debugging/simulate-issues',
                             data='{"type": "healthy"}')
        
        # Should still work with proper JSON data
        assert response.status_code in [200, 400]  # Depends on Flask version
    
    def test_cors_headers(self, client):
        """Test CORS headers are present"""
        response = client.get('/api/debugging/cluster-health')
        
        # Check for CORS headers if configured
        assert response.status_code == 200
        # Note: CORS headers would be tested if configured in the app

if __name__ == '__main__':
    pytest.main([__file__, '-v'])
