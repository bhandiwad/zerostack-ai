import asyncio
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from .base import AgentCapability
import logging
import json
import time

logger = logging.getLogger(__name__)

class MonitoringCapability(AgentCapability):
    """
    Capability for monitoring Kubernetes resources and setting up alerts.
    Provides operations for monitoring cluster health, resource usage, and custom metrics.
    """
    
    def __init__(self, agent_id: str, config: Optional[Dict[str, Any]] = None):
        super().__init__(agent_id, config)
        self.metrics_client = None
        self.alerts = {}
        self.metrics_history = {}
        self.default_metrics_interval = self.config.get('metrics_interval', 60)  # seconds
        self.max_history_points = self.config.get('max_history_points', 1000)
    
    async def _initialize(self):
        """Initialize monitoring clients and load any saved alerts"""
        try:
            # In a real implementation, this would initialize a metrics client
            # For now, we'll just log that we're initializing
            logger.info("Initializing MonitoringCapability")
            
            # Load any saved alerts from config
            saved_alerts = self.config.get('alerts', [])
            for alert in saved_alerts:
                self._add_alert(alert)
            
            logger.info(f"Loaded {len(self.alerts)} alerts")
            
        except Exception as e:
            logger.error(f"Failed to initialize monitoring capability: {str(e)}")
            raise
    
    async def execute(self, action: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a monitoring action"""
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
            'get_metrics', 'get_metrics_history', 'create_alert', 'update_alert',
            'delete_alert', 'list_alerts', 'get_alert_status', 'get_cluster_health'
        ]
    
    # --- Metrics Collection ---
    
    async def _handle_get_metrics(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Get current metrics for the specified resources"""
        resource_type = parameters.get('resource_type', 'pod')
        namespace = parameters.get('namespace', 'default')
        resource_name = parameters.get('resource_name')
        
        # In a real implementation, this would fetch metrics from a metrics server
        # For now, we'll return mock data
        metrics = await self._collect_metrics(resource_type, namespace, resource_name)
        
        # Store in history
        timestamp = datetime.utcnow().isoformat()
        self._store_metrics(timestamp, resource_type, namespace, resource_name, metrics)
        
        return {
            'resource_type': resource_type,
            'namespace': namespace,
            'resource_name': resource_name,
            'timestamp': timestamp,
            'metrics': metrics
        }
    
    async def _handle_get_metrics_history(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Get historical metrics for the specified resource"""
        resource_type = parameters.get('resource_type', 'pod')
        namespace = parameters.get('namespace', 'default')
        resource_name = parameters.get('resource_name')
        
        if not resource_name:
            return {'error': 'resource_name is required'}
        
        key = f"{resource_type}/{namespace}/{resource_name}"
        history = self.metrics_history.get(key, [])
        
        return {
            'resource_type': resource_type,
            'namespace': namespace,
            'resource_name': resource_name,
            'history': history
        }
    
    # --- Alert Management ---
    
    async def _handle_create_alert(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new alert rule"""
        alert_id = parameters.get('id') or f"alert_{int(time.time())}"
        
        if alert_id in self.alerts:
            return {'error': f"Alert with ID {alert_id} already exists"}
        
        alert = {
            'id': alert_id,
            'name': parameters.get('name', 'Unnamed Alert'),
            'description': parameters.get('description', ''),
            'severity': parameters.get('severity', 'medium'),
            'condition': parameters.get('condition', {}),
            'actions': parameters.get('actions', []),
            'enabled': parameters.get('enabled', True),
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat(),
            'status': 'inactive',
            'last_triggered': None,
            'trigger_count': 0
        }
        
        self._add_alert(alert)
        return {'alert_id': alert_id, 'message': 'Alert created successfully'}
    
    async def _handle_update_alert(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Update an existing alert rule"""
        alert_id = parameters.get('id')
        if not alert_id or alert_id not in self.alerts:
            return {'error': f"Alert with ID {alert_id} not found"}
        
        # Update only the provided fields
        alert = self.alerts[alert_id]
        for key in ['name', 'description', 'severity', 'condition', 'actions', 'enabled']:
            if key in parameters:
                alert[key] = parameters[key]
        
        alert['updated_at'] = datetime.utcnow().isoformat()
        self.alerts[alert_id] = alert
        
        return {'alert_id': alert_id, 'message': 'Alert updated successfully'}
    
    async def _handle_delete_alert(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Delete an alert rule"""
        alert_id = parameters.get('id')
        if not alert_id or alert_id not in self.alerts:
            return {'error': f"Alert with ID {alert_id} not found"}
        
        del self.alerts[alert_id]
        return {'message': f"Alert {alert_id} deleted successfully"}
    
    async def _handle_list_alerts(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """List all alert rules"""
        return {
            'alerts': list(self.alerts.values()),
            'count': len(self.alerts)
        }
    
    async def _handle_get_alert_status(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Get the status of an alert rule"""
        alert_id = parameters.get('id')
        if not alert_id or alert_id not in self.alerts:
            return {'error': f"Alert with ID {alert_id} not found"}
        
        return self.alerts[alert_id]
    
    # --- Helper Methods ---
    
    def _add_alert(self, alert: Dict[str, Any]):
        """Add an alert to the registry"""
        if 'id' not in alert:
            alert['id'] = f"alert_{int(time.time())}"
        self.alerts[alert['id']] = alert
    
    async def _collect_metrics(self, resource_type: str, namespace: str, resource_name: Optional[str] = None) -> Dict[str, Any]:
        """Collect metrics for the specified resource"""
        # In a real implementation, this would fetch metrics from a metrics server
        # For now, we'll return mock data
        if resource_type == 'pod':
            return {
                'cpu_usage': {
                    'current': 25.5,  # percentage
                    'limit': 100.0,
                    'unit': 'cores'
                },
                'memory_usage': {
                    'current': 512,  # MB
                    'limit': 1024,
                    'unit': 'MB'
                },
                'network': {
                    'rx_bytes': 1024 * 1024,  # 1 MB
                    'tx_bytes': 512 * 1024,   # 0.5 MB
                    'unit': 'bytes'
                }
            }
        else:
            return {
                'status': 'unknown',
                'message': f'Metrics collection for {resource_type} not implemented'
            }
    
    def _store_metrics(self, timestamp: str, resource_type: str, namespace: str, 
                      resource_name: str, metrics: Dict[str, Any]):
        """Store metrics in history"""
        if not resource_name:
            return
            
        key = f"{resource_type}/{namespace}/{resource_name}"
        if key not in self.metrics_history:
            self.metrics_history[key] = []
        
        # Add new metrics to history
        self.metrics_history[key].append({
            'timestamp': timestamp,
            'metrics': metrics
        })
        
        # Trim history if it gets too large
        if len(self.metrics_history[key]) > self.max_history_points:
            self.metrics_history[key] = self.metrics_history[key][-self.max_history_points:]
    
    async def _evaluate_alerts(self):
        """Evaluate all alerts and trigger actions if conditions are met"""
        for alert_id, alert in list(self.alerts.items()):
            if not alert.get('enabled', True):
                continue
                
            try:
                condition_met = await self._evaluate_condition(alert['condition'])
                if condition_met:
                    await self._trigger_alert(alert)
                else:
                    if alert['status'] == 'firing':
                        alert['status'] = 'resolved'
                        alert['resolved_at'] = datetime.utcnow().isoformat()
            except Exception as e:
                logger.error(f"Error evaluating alert {alert_id}: {str(e)}", exc_info=True)
    
    async def _evaluate_condition(self, condition: Dict[str, Any]) -> bool:
        """Evaluate a condition against current metrics"""
        # In a real implementation, this would evaluate the condition against actual metrics
        # For now, we'll just return a random result for demonstration
        import random
        return random.random() < 0.1  # 10% chance of triggering
    
    async def _trigger_alert(self, alert: Dict[str, Any]):
        """Trigger an alert and execute its actions"""
        alert_id = alert['id']
        now = datetime.utcnow().isoformat()
        
        # Update alert status
        alert['status'] = 'firing'
        alert['last_triggered'] = now
        alert['trigger_count'] = alert.get('trigger_count', 0) + 1
        
        logger.warning(f"Alert triggered: {alert_id} - {alert['name']}")
        
        # Execute actions
        for action in alert.get('actions', []):
            try:
                await self._execute_action(action, alert)
            except Exception as e:
                logger.error(f"Error executing action for alert {alert_id}: {str(e)}", exc_info=True)
    
    async def _execute_action(self, action: Dict[str, Any], alert: Dict[str, Any]):
        """Execute an alert action"""
        action_type = action.get('type')
        
        if action_type == 'log':
            logger.info(f"[ALERT ACTION] {alert['id']} - {action.get('message', 'Alert triggered')}")
        elif action_type == 'webhook':
            # In a real implementation, this would make an HTTP request to the webhook URL
            logger.info(f"[ALERT ACTION] Sending webhook to {action.get('url')}")
        elif action_type == 'email':
            # In a real implementation, this would send an email
            logger.info(f"[ALERT ACTION] Sending email to {action.get('to')}")
        else:
            logger.warning(f"Unknown action type: {action_type}")
    
    # --- Health Checks ---
    
    async def _handle_get_cluster_health(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Get overall cluster health status"""
        # In a real implementation, this would check various cluster health indicators
        # For now, we'll return a mock health status
        return {
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'components': {
                'api_server': {'status': 'healthy'},
                'scheduler': {'status': 'healthy'},
                'controller_manager': {'status': 'healthy'},
                'etcd': {'status': 'healthy'}
            },
            'alerts': {
                'firing': sum(1 for a in self.alerts.values() if a.get('status') == 'firing'),
                'total': len(self.alerts)
            }
        }
