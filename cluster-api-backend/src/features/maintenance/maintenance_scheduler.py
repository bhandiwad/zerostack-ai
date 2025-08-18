import asyncio
import logging
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import json
import threading
import time
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.date import DateTrigger

logger = logging.getLogger(__name__)

class MaintenanceScheduler:
    """Scheduler for automated maintenance workflows"""
    
    def __init__(self):
        self.scheduler = BackgroundScheduler()
        self.scheduled_workflows = {}
        self.maintenance_windows = {}
        self.scheduler.start()
    
    def schedule_workflow(self, execution_request: Dict[str, Any]) -> str:
        """Schedule a maintenance workflow for future execution"""
        execution_id = str(uuid.uuid4())
        schedule_type = execution_request.get('schedule_type', 'scheduled')
        scheduled_time = execution_request.get('scheduled_time')
        
        # Store scheduled workflow
        self.scheduled_workflows[execution_id] = {
            'id': execution_id,
            'workflow_id': execution_request['workflow_id'],
            'cluster_id': execution_request['cluster_id'],
            'parameters': execution_request['parameters'],
            'schedule_type': schedule_type,
            'scheduled_time': scheduled_time,
            'status': 'scheduled',
            'created_at': datetime.utcnow().isoformat()
        }
        
        if schedule_type == 'scheduled' and scheduled_time:
            # Schedule for specific time
            trigger = DateTrigger(run_date=datetime.fromisoformat(scheduled_time))
            self.scheduler.add_job(
                func=self._execute_scheduled_workflow,
                trigger=trigger,
                args=[execution_id],
                id=execution_id,
                name=f"Maintenance: {execution_request['workflow_id']}"
            )
        elif schedule_type == 'maintenance_window':
            # Schedule during next maintenance window
            self._schedule_for_maintenance_window(execution_id, execution_request)
        elif schedule_type in ['daily', 'weekly', 'monthly']:
            # Schedule recurring
            self._schedule_recurring(execution_id, execution_request, schedule_type)
        
        return execution_id
    
    def _schedule_for_maintenance_window(self, execution_id: str, execution_request: Dict[str, Any]):
        """Schedule workflow for next available maintenance window"""
        cluster_id = execution_request['cluster_id']
        
        # Get or create maintenance window for cluster
        if cluster_id not in self.maintenance_windows:
            # Default maintenance window: Sunday 2 AM UTC
            self.maintenance_windows[cluster_id] = {
                'day_of_week': 6,  # Sunday
                'hour': 2,
                'minute': 0,
                'duration_hours': 4
            }
        
        window = self.maintenance_windows[cluster_id]
        
        # Schedule for next maintenance window
        trigger = CronTrigger(
            day_of_week=window['day_of_week'],
            hour=window['hour'],
            minute=window['minute']
        )
        
        self.scheduler.add_job(
            func=self._execute_scheduled_workflow,
            trigger=trigger,
            args=[execution_id],
            id=execution_id,
            name=f"Maintenance Window: {execution_request['workflow_id']}"
        )
    
    def _schedule_recurring(self, execution_id: str, execution_request: Dict[str, Any], frequency: str):
        """Schedule recurring maintenance workflow"""
        if frequency == 'daily':
            # Daily at 2 AM
            trigger = CronTrigger(hour=2, minute=0)
        elif frequency == 'weekly':
            # Weekly on Sunday at 2 AM
            trigger = CronTrigger(day_of_week=6, hour=2, minute=0)
        elif frequency == 'monthly':
            # Monthly on first Sunday at 2 AM
            trigger = CronTrigger(day=1, hour=2, minute=0)
        else:
            logger.error(f"Unknown frequency: {frequency}")
            return
        
        self.scheduler.add_job(
            func=self._execute_scheduled_workflow,
            trigger=trigger,
            args=[execution_id],
            id=execution_id,
            name=f"Recurring {frequency}: {execution_request['workflow_id']}"
        )
    
    def _execute_scheduled_workflow(self, execution_id: str):
        """Execute a scheduled workflow"""
        try:
            if execution_id not in self.scheduled_workflows:
                logger.error(f"Scheduled workflow {execution_id} not found")
                return
            
            workflow_info = self.scheduled_workflows[execution_id]
            workflow_info['status'] = 'executing'
            workflow_info['executed_at'] = datetime.utcnow().isoformat()
            
            # Import here to avoid circular imports
            from .maintenance_engine import MaintenanceEngine
            
            engine = MaintenanceEngine()
            actual_execution_id = engine.execute_workflow({
                'workflow_id': workflow_info['workflow_id'],
                'cluster_id': workflow_info['cluster_id'],
                'parameters': workflow_info['parameters'],
                'created_at': datetime.utcnow().isoformat(),
                'status': 'pending'
            })
            
            workflow_info['actual_execution_id'] = actual_execution_id
            logger.info(f"Scheduled workflow {execution_id} started with execution ID {actual_execution_id}")
            
        except Exception as e:
            logger.error(f"Error executing scheduled workflow {execution_id}: {str(e)}")
            if execution_id in self.scheduled_workflows:
                self.scheduled_workflows[execution_id]['status'] = 'failed'
                self.scheduled_workflows[execution_id]['error'] = str(e)
    
    def get_scheduled_workflows(self, cluster_id: str = None) -> List[Dict[str, Any]]:
        """Get list of scheduled workflows"""
        workflows = list(self.scheduled_workflows.values())
        
        if cluster_id:
            workflows = [w for w in workflows if w['cluster_id'] == cluster_id]
        
        return workflows
    
    def cancel_scheduled_workflow(self, execution_id: str) -> bool:
        """Cancel a scheduled workflow"""
        try:
            if execution_id in self.scheduled_workflows:
                # Remove from scheduler
                self.scheduler.remove_job(execution_id)
                
                # Update status
                self.scheduled_workflows[execution_id]['status'] = 'cancelled'
                self.scheduled_workflows[execution_id]['cancelled_at'] = datetime.utcnow().isoformat()
                
                return True
        except Exception as e:
            logger.error(f"Error cancelling scheduled workflow {execution_id}: {str(e)}")
        
        return False
    
    def set_maintenance_window(self, cluster_id: str, day_of_week: int, hour: int, minute: int = 0, duration_hours: int = 4):
        """Set maintenance window for a cluster"""
        self.maintenance_windows[cluster_id] = {
            'day_of_week': day_of_week,
            'hour': hour,
            'minute': minute,
            'duration_hours': duration_hours
        }
    
    def get_maintenance_window(self, cluster_id: str) -> Optional[Dict[str, Any]]:
        """Get maintenance window for a cluster"""
        return self.maintenance_windows.get(cluster_id)
    
    def get_next_maintenance_window(self, cluster_id: str) -> Optional[datetime]:
        """Get next maintenance window time for a cluster"""
        window = self.get_maintenance_window(cluster_id)
        if not window:
            return None
        
        # Calculate next occurrence
        now = datetime.utcnow()
        days_ahead = window['day_of_week'] - now.weekday()
        
        if days_ahead <= 0:  # Target day already happened this week
            days_ahead += 7
        
        next_window = now + timedelta(days=days_ahead)
        next_window = next_window.replace(
            hour=window['hour'],
            minute=window['minute'],
            second=0,
            microsecond=0
        )
        
        return next_window
    
    def shutdown(self):
        """Shutdown the scheduler"""
        self.scheduler.shutdown()
