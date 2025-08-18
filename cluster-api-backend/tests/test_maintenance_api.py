"""
Test suite for maintenance API endpoints
"""
import pytest
import json
from unittest.mock import Mock, patch, AsyncMock
import sys
import os

# Add src to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from features.maintenance.maintenance_routes import maintenance_bp

class TestMaintenanceAPI:
    """Test cases for maintenance API endpoints"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        from flask import Flask
        app = Flask(__name__)
        app.register_blueprint(maintenance_bp)
        app.config['TESTING'] = True
        return app.test_client()
    
    def test_get_workflows_endpoint(self, client):
        """Test GET /api/maintenance/workflows"""
        response = client.get('/api/maintenance/workflows')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data['success'] is True
        assert 'workflows' in data
        assert isinstance(data['workflows'], list)
        assert len(data['workflows']) > 0
        
        # Check workflow structure
        workflow = data['workflows'][0]
        assert 'id' in workflow
        assert 'name' in workflow
        assert 'description' in workflow
        assert 'category' in workflow
    
    @patch('features.maintenance.maintenance_routes.MaintenanceEngine')
    def test_execute_workflow_immediate(self, mock_engine_class, client):
        """Test POST /api/maintenance/execute with immediate execution"""
        mock_engine = Mock()
        mock_engine_class.return_value = mock_engine
        mock_engine.execute_workflow = AsyncMock(return_value='exec_123')
        
        execution_data = {
            'workflow_id': 'security_patching',
            'schedule_type': 'immediate'
        }
        
        response = client.post('/api/maintenance/execute',
                             json=execution_data,
                             content_type='application/json')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data['success'] is True
        assert 'execution_id' in data
        assert data['execution_id'] == 'exec_123'
        assert 'message' in data
    
    @patch('features.maintenance.maintenance_routes.MaintenanceScheduler')
    def test_execute_workflow_scheduled(self, mock_scheduler_class, client):
        """Test POST /api/maintenance/execute with scheduled execution"""
        mock_scheduler = Mock()
        mock_scheduler_class.return_value = mock_scheduler
        mock_scheduler.schedule_workflow.return_value = 'schedule_123'
        
        execution_data = {
            'workflow_id': 'cluster_upgrade',
            'schedule_type': 'scheduled',
            'schedule_time': '2024-01-15T02:00:00Z'
        }
        
        response = client.post('/api/maintenance/execute',
                             json=execution_data,
                             content_type='application/json')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data['success'] is True
        assert 'schedule_id' in data
        assert data['schedule_id'] == 'schedule_123'
    
    def test_execute_workflow_missing_data(self, client):
        """Test POST /api/maintenance/execute with missing data"""
        response = client.post('/api/maintenance/execute',
                             json={},
                             content_type='application/json')
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'error' in data
    
    def test_execute_workflow_invalid_workflow(self, client):
        """Test POST /api/maintenance/execute with invalid workflow"""
        execution_data = {
            'workflow_id': 'invalid_workflow',
            'schedule_type': 'immediate'
        }
        
        response = client.post('/api/maintenance/execute',
                             json=execution_data,
                             content_type='application/json')
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'error' in data
    
    @patch('features.maintenance.maintenance_routes.MaintenanceEngine')
    def test_get_execution_status(self, mock_engine_class, client):
        """Test GET /api/maintenance/status/<execution_id>"""
        mock_engine = Mock()
        mock_engine_class.return_value = mock_engine
        
        mock_status = {
            'execution_id': 'exec_123',
            'status': 'running',
            'progress': 0.5,
            'current_step': 'Applying patches',
            'steps_completed': 2,
            'total_steps': 4
        }
        
        mock_engine.get_execution_status.return_value = mock_status
        
        response = client.get('/api/maintenance/status/exec_123')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data['success'] is True
        assert data['execution_id'] == 'exec_123'
        assert data['status'] == 'running'
        assert data['progress'] == 0.5
    
    @patch('features.maintenance.maintenance_routes.MaintenanceEngine')
    def test_get_execution_status_not_found(self, mock_engine_class, client):
        """Test GET /api/maintenance/status/<execution_id> with invalid ID"""
        mock_engine = Mock()
        mock_engine_class.return_value = mock_engine
        mock_engine.get_execution_status.return_value = None
        
        response = client.get('/api/maintenance/status/invalid_exec')
        
        assert response.status_code == 404
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'error' in data
    
    @patch('features.maintenance.maintenance_routes.MaintenanceEngine')
    def test_cancel_execution(self, mock_engine_class, client):
        """Test POST /api/maintenance/cancel/<execution_id>"""
        mock_engine = Mock()
        mock_engine_class.return_value = mock_engine
        mock_engine.cancel_execution.return_value = True
        
        response = client.post('/api/maintenance/cancel/exec_123')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data['success'] is True
        assert data['cancelled'] is True
        assert 'message' in data
    
    @patch('features.maintenance.maintenance_routes.MaintenanceEngine')
    def test_cancel_execution_failed(self, mock_engine_class, client):
        """Test POST /api/maintenance/cancel/<execution_id> with failure"""
        mock_engine = Mock()
        mock_engine_class.return_value = mock_engine
        mock_engine.cancel_execution.return_value = False
        
        response = client.post('/api/maintenance/cancel/exec_123')
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'error' in data
    
    @patch('features.maintenance.maintenance_routes.MaintenanceEngine')
    def test_get_execution_history(self, mock_engine_class, client):
        """Test GET /api/maintenance/history"""
        mock_engine = Mock()
        mock_engine_class.return_value = mock_engine
        
        mock_history = [
            {
                'execution_id': 'exec_123',
                'workflow_id': 'security_patching',
                'status': 'completed',
                'started_at': '2024-01-15T10:00:00Z',
                'completed_at': '2024-01-15T10:30:00Z'
            }
        ]
        
        mock_engine.get_execution_history.return_value = mock_history
        
        response = client.get('/api/maintenance/history')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data['success'] is True
        assert 'executions' in data
        assert len(data['executions']) == 1
        assert data['executions'][0]['execution_id'] == 'exec_123'
    
    def test_detect_drift(self, client):
        """Test GET /api/maintenance/drift/detect"""
        response = client.get('/api/maintenance/drift/detect')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data['success'] is True
        assert 'drift_detected' in data
        assert 'drift_count' in data
        assert 'drifts' in data
        assert isinstance(data['drifts'], list)
    
    def test_correct_drift(self, client):
        """Test POST /api/maintenance/drift/correct"""
        response = client.post('/api/maintenance/drift/correct',
                             json={},
                             content_type='application/json')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data['success'] is True
        assert 'corrected' in data
        assert 'corrections_applied' in data
    
    def test_predict_health(self, client):
        """Test GET /api/maintenance/health/predict"""
        response = client.get('/api/maintenance/health/predict')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data['success'] is True
        assert 'predictions' in data
        assert isinstance(data['predictions'], list)
    
    def test_get_maintenance_windows(self, client):
        """Test GET /api/maintenance/windows"""
        response = client.get('/api/maintenance/windows')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data['success'] is True
        assert 'windows' in data
        assert isinstance(data['windows'], list)
    
    def test_create_maintenance_window(self, client):
        """Test POST /api/maintenance/windows"""
        window_data = {
            'name': 'Weekly Maintenance',
            'start_time': '2024-01-21T02:00:00Z',
            'end_time': '2024-01-21T04:00:00Z',
            'description': 'Weekly maintenance window'
        }
        
        response = client.post('/api/maintenance/windows',
                             json=window_data,
                             content_type='application/json')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data['success'] is True
        assert 'window_id' in data
        assert 'message' in data
    
    def test_create_maintenance_window_missing_data(self, client):
        """Test POST /api/maintenance/windows with missing data"""
        response = client.post('/api/maintenance/windows',
                             json={'name': 'Test Window'},
                             content_type='application/json')
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'error' in data
    
    def test_delete_maintenance_window(self, client):
        """Test DELETE /api/maintenance/windows/<window_id>"""
        response = client.delete('/api/maintenance/windows/window_123')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data['success'] is True
        assert 'message' in data
    
    def test_get_workflow_templates(self, client):
        """Test GET /api/maintenance/templates"""
        response = client.get('/api/maintenance/templates')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data['success'] is True
        assert 'templates' in data
        assert isinstance(data['templates'], list)
    
    def test_create_custom_workflow(self, client):
        """Test POST /api/maintenance/workflows/custom"""
        workflow_data = {
            'name': 'Custom Backup Workflow',
            'description': 'Custom workflow for database backups',
            'steps': [
                {'name': 'Stop services', 'type': 'command', 'command': 'kubectl scale --replicas=0'},
                {'name': 'Create backup', 'type': 'backup', 'target': 'database'},
                {'name': 'Start services', 'type': 'command', 'command': 'kubectl scale --replicas=3'}
            ]
        }
        
        response = client.post('/api/maintenance/workflows/custom',
                             json=workflow_data,
                             content_type='application/json')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data['success'] is True
        assert 'workflow_id' in data
        assert 'message' in data
    
    def test_get_system_health(self, client):
        """Test GET /api/maintenance/system/health"""
        response = client.get('/api/maintenance/system/health')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data['success'] is True
        assert 'health_score' in data
        assert 'components' in data
        assert 'recommendations' in data
    
    def test_invalid_json_request(self, client):
        """Test endpoint with invalid JSON"""
        response = client.post('/api/maintenance/execute',
                             data='invalid json',
                             content_type='application/json')
        
        assert response.status_code == 400
    
    def test_method_not_allowed(self, client):
        """Test endpoint with wrong HTTP method"""
        response = client.delete('/api/maintenance/workflows')
        
        assert response.status_code == 405

if __name__ == '__main__':
    pytest.main([__file__, '-v'])
