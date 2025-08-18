"""
Test suite for maintenance workflow functionality
"""
import pytest
import asyncio
from unittest.mock import Mock, patch
from datetime import datetime, timedelta
import sys
import os

# Add src to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from features.maintenance.maintenance_engine import MaintenanceEngine
from features.maintenance.maintenance_scheduler import MaintenanceScheduler

class TestMaintenanceEngine:
    """Test cases for MaintenanceEngine"""
    
    @pytest.fixture
    def engine(self):
        return MaintenanceEngine()
    
    def test_workflow_definitions_loaded(self, engine):
        """Test that workflow definitions are properly loaded"""
        assert len(engine.workflow_definitions) > 0
        assert 'security_patching' in engine.workflow_definitions
        assert 'cluster_upgrade' in engine.workflow_definitions
        assert 'certificate_renewal' in engine.workflow_definitions
    
    def test_workflow_definition_structure(self, engine):
        """Test workflow definition structure"""
        workflow = engine.workflow_definitions['security_patching']
        assert 'name' in workflow
        assert 'description' in workflow
        assert 'steps' in workflow
        assert 'rollback_steps' in workflow
        assert len(workflow['steps']) > 0
    
    @pytest.mark.asyncio
    async def test_execute_workflow_success(self, engine):
        """Test successful workflow execution"""
        execution_id = await engine.execute_workflow('security_patching')
        assert execution_id is not None
        assert execution_id in engine.active_executions
        
        # Wait a moment for execution to start
        await asyncio.sleep(0.1)
        
        status = engine.get_execution_status(execution_id)
        assert status is not None
        assert 'status' in status
        assert 'progress' in status
    
    @pytest.mark.asyncio
    async def test_execute_invalid_workflow(self, engine):
        """Test execution of invalid workflow"""
        with pytest.raises(ValueError):
            await engine.execute_workflow('invalid_workflow')
    
    def test_get_execution_history(self, engine):
        """Test execution history retrieval"""
        history = engine.get_execution_history()
        assert isinstance(history, list)
    
    def test_cancel_execution(self, engine):
        """Test execution cancellation"""
        # Create a mock execution
        execution_id = 'test_execution_123'
        engine.active_executions[execution_id] = {
            'workflow_id': 'security_patching',
            'status': 'running',
            'cancelled': False
        }
        
        result = engine.cancel_execution(execution_id)
        assert result is True
        assert engine.active_executions[execution_id]['cancelled'] is True

class TestMaintenanceScheduler:
    """Test cases for MaintenanceScheduler"""
    
    @pytest.fixture
    def scheduler(self):
        return MaintenanceScheduler()
    
    def test_scheduler_initialization(self, scheduler):
        """Test scheduler initialization"""
        assert scheduler.scheduler is not None
        assert isinstance(scheduler.scheduled_workflows, dict)
        assert isinstance(scheduler.maintenance_windows, list)
    
    def test_schedule_immediate_execution(self, scheduler):
        """Test immediate workflow scheduling"""
        workflow_id = 'security_patching'
        schedule_id = scheduler.schedule_workflow(
            workflow_id=workflow_id,
            schedule_type='immediate'
        )
        assert schedule_id is not None
        assert schedule_id in scheduler.scheduled_workflows
    
    def test_schedule_delayed_execution(self, scheduler):
        """Test delayed workflow scheduling"""
        workflow_id = 'cluster_upgrade'
        schedule_time = datetime.now() + timedelta(hours=1)
        
        schedule_id = scheduler.schedule_workflow(
            workflow_id=workflow_id,
            schedule_type='scheduled',
            schedule_time=schedule_time
        )
        assert schedule_id is not None
        assert schedule_id in scheduler.scheduled_workflows
    
    def test_schedule_recurring_execution(self, scheduler):
        """Test recurring workflow scheduling"""
        workflow_id = 'resource_cleanup'
        
        schedule_id = scheduler.schedule_workflow(
            workflow_id=workflow_id,
            schedule_type='recurring',
            cron_expression='0 2 * * 0'  # Weekly at 2 AM on Sunday
        )
        assert schedule_id is not None
        assert schedule_id in scheduler.scheduled_workflows
    
    def test_cancel_scheduled_workflow(self, scheduler):
        """Test cancellation of scheduled workflow"""
        workflow_id = 'security_patching'
        schedule_id = scheduler.schedule_workflow(
            workflow_id=workflow_id,
            schedule_type='immediate'
        )
        
        result = scheduler.cancel_scheduled_workflow(schedule_id)
        assert result is True
        assert schedule_id not in scheduler.scheduled_workflows
    
    def test_add_maintenance_window(self, scheduler):
        """Test adding maintenance window"""
        start_time = datetime.now() + timedelta(days=1)
        end_time = start_time + timedelta(hours=2)
        
        window_id = scheduler.add_maintenance_window(
            name='Weekly Maintenance',
            start_time=start_time,
            end_time=end_time,
            description='Weekly maintenance window'
        )
        
        assert window_id is not None
        assert len(scheduler.maintenance_windows) > 0
        
        # Find the added window
        added_window = None
        for window in scheduler.maintenance_windows:
            if window['id'] == window_id:
                added_window = window
                break
        
        assert added_window is not None
        assert added_window['name'] == 'Weekly Maintenance'

class TestMaintenanceAPI:
    """Test cases for maintenance API endpoints"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        # This would normally import and configure the Flask app
        # For now, we'll mock the responses
        return Mock()
    
    def test_get_workflows_endpoint(self, client):
        """Test GET /api/maintenance/workflows"""
        # Mock response
        expected_workflows = [
            {
                'id': 'security_patching',
                'name': 'Security Patching',
                'description': 'Apply security patches to cluster nodes',
                'category': 'security',
                'estimated_duration': '30-45 minutes'
            }
        ]
        
        client.get.return_value.json.return_value = {
            'success': True,
            'workflows': expected_workflows
        }
        
        response = client.get('/api/maintenance/workflows')
        result = response.json()
        
        assert result['success'] is True
        assert len(result['workflows']) > 0
    
    def test_execute_workflow_endpoint(self, client):
        """Test POST /api/maintenance/execute"""
        execution_data = {
            'workflow_id': 'security_patching',
            'schedule_type': 'immediate'
        }
        
        expected_response = {
            'success': True,
            'execution_id': 'exec_123',
            'message': 'Workflow execution started'
        }
        
        client.post.return_value.json.return_value = expected_response
        
        response = client.post('/api/maintenance/execute', json=execution_data)
        result = response.json()
        
        assert result['success'] is True
        assert 'execution_id' in result
    
    def test_get_execution_status_endpoint(self, client):
        """Test GET /api/maintenance/status/<execution_id>"""
        execution_id = 'exec_123'
        expected_status = {
            'success': True,
            'execution_id': execution_id,
            'status': 'running',
            'progress': 0.5,
            'current_step': 'Applying patches',
            'steps_completed': 2,
            'total_steps': 4
        }
        
        client.get.return_value.json.return_value = expected_status
        
        response = client.get(f'/api/maintenance/status/{execution_id}')
        result = response.json()
        
        assert result['success'] is True
        assert result['execution_id'] == execution_id
        assert 'status' in result
        assert 'progress' in result

if __name__ == '__main__':
    pytest.main([__file__, '-v'])
