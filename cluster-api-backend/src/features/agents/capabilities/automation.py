import asyncio
from typing import Dict, Any, List, Optional, Callable, Awaitable
from datetime import datetime, timedelta
from .base import AgentCapability
import logging
import json
import time
from enum import Enum

logger = logging.getLogger(__name__)

class TaskStatus(str, Enum):
    PENDING = 'pending'
    RUNNING = 'running'
    COMPLETED = 'completed'
    FAILED = 'failed'
    CANCELLED = 'cancelled'

class Task:
    """Represents an automation task"""
    
    def __init__(self, 
                 task_id: str, 
                 name: str, 
                 action: str, 
                 parameters: Dict[str, Any],
                 schedule: Optional[Dict[str, Any]] = None):
        self.task_id = task_id
        self.name = name
        self.action = action
        self.parameters = parameters or {}
        self.schedule = schedule
        self.status = TaskStatus.PENDING
        self.created_at = datetime.utcnow()
        self.started_at = None
        self.completed_at = None
        self.result = None
        self.error = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert task to dictionary"""
        return {
            'task_id': self.task_id,
            'name': self.name,
            'action': self.action,
            'parameters': self.parameters,
            'schedule': self.schedule,
            'status': self.status.value,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'result': self.result,
            'error': str(self.error) if self.error else None
        }
    
    def start(self):
        """Mark task as started"""
        self.status = TaskStatus.RUNNING
        self.started_at = datetime.utcnow()
    
    def complete(self, result: Any = None):
        """Mark task as completed"""
        self.status = TaskStatus.COMPLETED
        self.completed_at = datetime.utcnow()
        self.result = result
    
    def fail(self, error: Exception):
        """Mark task as failed"""
        self.status = TaskStatus.FAILED
        self.completed_at = datetime.utcnow()
        self.error = error
    
    def cancel(self):
        """Mark task as cancelled"""
        if self.status == TaskStatus.RUNNING:
            self.status = TaskStatus.CANCELLED
            self.completed_at = datetime.utcnow()

class AutomationCapability(AgentCapability):
    """
    Capability for automating repetitive tasks and workflows.
    Provides operations for scheduling, running, and managing automated tasks.
    """
    
    def __init__(self, agent_id: str, config: Optional[Dict[str, Any]] = None):
        super().__init__(agent_id, config)
        self.tasks: Dict[str, Task] = {}
        self.task_handlers: Dict[str, Callable[[Dict[str, Any]], Awaitable[Any]]] = {}
        self.task_queue = asyncio.Queue()
        self.running = False
        self.worker_task = None
    
    async def _initialize(self):
        """Initialize the automation capability"""
        try:
            logger.info("Initializing AutomationCapability")
            
            # Register built-in task handlers
            self._register_default_handlers()
            
            # Start the task worker
            self.running = True
            self.worker_task = asyncio.create_task(self._task_worker())
            
            logger.info("AutomationCapability initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize automation capability: {str(e)}")
            raise
    
    async def cleanup(self):
        """Clean up resources"""
        self.running = False
        if self.worker_task:
            self.worker_task.cancel()
            try:
                await self.worker_task
            except asyncio.CancelledError:
                pass
    
    def _register_default_handlers(self):
        """Register default task handlers"""
        self.register_handler('echo', self._handle_echo)
        self.register_handler('sleep', self._handle_sleep)
        self.register_handler('http_request', self._handle_http_request)
        self.register_handler('execute_command', self._handle_execute_command)
    
    def register_handler(self, action: str, handler: Callable[[Dict[str, Any]], Awaitable[Any]]):
        """Register a task handler for a specific action"""
        self.task_handlers[action] = handler
    
    async def execute(self, action: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute an automation action"""
        try:
            if not self._initialized:
                await self.initialize()
            
            # Route to appropriate handler based on action
            handler = getattr(self, f"_handle_{action}", None)
            if not handler or not callable(handler):
                return {
                    'success': False,
                    'error': f"Unsupported action: {action}",
                    'available_actions': self._list_actions()
                }
            
            # Execute the handler
            result = await handler(parameters)
            return {
                'success': True,
                'data': result
            }
            
        except Exception as e:
            logger.error(f"Error in {action}: {str(e)}", exc_info=True)
            return {
                'success': False,
                'error': f"Error executing {action}: {str(e)}"
            }
    
    def _list_actions(self) -> List[str]:
        """List all available actions in this capability"""
        return [
            'create_task', 'get_task', 'list_tasks', 'cancel_task',
            'schedule_task', 'list_scheduled_tasks', 'cancel_scheduled_task'
        ]
    
    # --- Task Management ---
    
    async def _handle_create_task(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Create and queue a new task"""
        task_id = parameters.get('task_id') or f"task_{int(time.time())}"
        name = parameters.get('name', 'Unnamed Task')
        action = parameters.get('action')
        task_params = parameters.get('parameters', {})
        
        if not action:
            return {'error': 'action is required'}
        
        if action not in self.task_handlers:
            return {'error': f'No handler registered for action: {action}'}
        
        task = Task(task_id, name, action, task_params)
        self.tasks[task_id] = task
        
        # Add to queue
        await self.task_queue.put(task_id)
        
        return {'task_id': task_id, 'status': 'queued'}
    
    async def _handle_get_task(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Get task status and result"""
        task_id = parameters.get('task_id')
        if not task_id:
            return {'error': 'task_id is required'}
        
        task = self.tasks.get(task_id)
        if not task:
            return {'error': f'Task not found: {task_id}'}
        
        return task.to_dict()
    
    async def _handle_list_tasks(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """List all tasks"""
        status = parameters.get('status')
        
        tasks = []
        for task in self.tasks.values():
            if status and task.status.value != status:
                continue
            tasks.append(task.to_dict())
        
        return {'tasks': tasks, 'count': len(tasks)}
    
    async def _handle_cancel_task(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Cancel a running or queued task"""
        task_id = parameters.get('task_id')
        if not task_id:
            return {'error': 'task_id is required'}
        
        task = self.tasks.get(task_id)
        if not task:
            return {'error': f'Task not found: {task_id}'}
        
        if task.status in [TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED]:
            return {'error': f'Task is already {task.status}'}
        
        task.cancel()
        return {'status': 'cancelled'}
    
    # --- Task Scheduling ---
    
    async def _handle_schedule_task(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Schedule a recurring task"""
        task_id = parameters.get('task_id') or f"scheduled_{int(time.time())}"
        name = parameters.get('name', 'Scheduled Task')
        action = parameters.get('action')
        task_params = parameters.get('parameters', {})
        schedule = parameters.get('schedule', {})
        
        if not action:
            return {'error': 'action is required'}
        
        if 'interval' not in schedule and 'cron' not in schedule:
            return {'error': 'schedule.interval or schedule.cron is required'}
        
        task = Task(task_id, name, action, task_params, schedule)
        self.tasks[task_id] = task
        
        # In a real implementation, we would use a proper scheduler like apscheduler
        # For now, we'll just log the scheduled task
        logger.info(f"Scheduled task {task_id} with schedule: {schedule}")
        
        return {'task_id': task_id, 'status': 'scheduled'}
    
    async def _handle_list_scheduled_tasks(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """List all scheduled tasks"""
        scheduled = []
        for task in self.tasks.values():
            if task.schedule:
                scheduled.append(task.to_dict())
        
        return {'scheduled_tasks': scheduled, 'count': len(scheduled)}
    
    async def _handle_cancel_scheduled_task(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Cancel a scheduled task"""
        task_id = parameters.get('task_id')
        if not task_id:
            return {'error': 'task_id is required'}
        
        task = self.tasks.get(task_id)
        if not task:
            return {'error': f'Task not found: {task_id}'}
        
        if not task.schedule:
            return {'error': 'Not a scheduled task'}
        
        # In a real implementation, we would remove the task from the scheduler
        # For now, we'll just remove it from our tasks dictionary
        del self.tasks[task_id]
        
        return {'status': 'cancelled'}
    
    # --- Task Worker ---
    
    async def _task_worker(self):
        """Background worker that processes tasks from the queue"""
        while self.running:
            try:
                # Get the next task from the queue
                task_id = await self.task_queue.get()
                
                task = self.tasks.get(task_id)
                if not task:
                    logger.warning(f"Task not found: {task_id}")
                    continue
                
                # Mark task as started
                task.start()
                
                try:
                    # Get the handler for this task's action
                    handler = self.task_handlers.get(task.action)
                    if not handler:
                        raise ValueError(f"No handler registered for action: {task.action}")
                    
                    # Execute the task
                    logger.info(f"Executing task {task.task_id}: {task.name}")
                    result = await handler(task.parameters)
                    
                    # Mark task as completed
                    task.complete(result)
                    
                except Exception as e:
                    # Mark task as failed
                    logger.error(f"Task {task.task_id} failed: {str(e)}", exc_info=True)
                    task.fail(e)
                
            except asyncio.CancelledError:
                logger.info("Task worker cancelled")
                raise
                
            except Exception as e:
                logger.error(f"Error in task worker: {str(e)}", exc_info=True)
                await asyncio.sleep(1)  # Prevent tight loop on errors
    
    # --- Built-in Task Handlers ---
    
    async def _handle_echo(self, parameters: Dict[str, Any]) -> Any:
        """Echo the input parameters (for testing)"""
        return parameters
    
    async def _handle_sleep(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Sleep for the specified number of seconds"""
        seconds = float(parameters.get('seconds', 1))
        await asyncio.sleep(seconds)
        return {'slept_for': seconds}
    
    async def _handle_http_request(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Make an HTTP request"""
        import aiohttp
        
        url = parameters.get('url')
        method = parameters.get('method', 'GET').upper()
        headers = parameters.get('headers', {})
        data = parameters.get('data')
        json_data = parameters.get('json')
        
        if not url:
            raise ValueError('url is required')
        
        async with aiohttp.ClientSession() as session:
            async with session.request(
                method=method,
                url=url,
                headers=headers,
                data=data,
                json=json_data
            ) as response:
                response_data = await response.text()
                
                try:
                    # Try to parse JSON response
                    response_data = await response.json()
                except:
                    pass
                
                return {
                    'status': response.status,
                    'headers': dict(response.headers),
                    'data': response_data
                }
    
    async def _handle_execute_command(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a shell command"""
        import subprocess
        import shlex
        
        command = parameters.get('command')
        if not command:
            raise ValueError('command is required')
        
        # Parse command string into args
        args = shlex.split(command)
        
        # Execute the command
        process = await asyncio.create_subprocess_exec(
            *args,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        # Wait for the command to complete
        stdout, stderr = await process.communicate()
        
        return {
            'returncode': process.returncode,
            'stdout': stdout.decode('utf-8') if stdout else '',
            'stderr': stderr.decode('utf-8') if stderr else ''
        }
