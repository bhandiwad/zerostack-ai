import asyncio
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from .base import AgentCapability
import logging
import json
from enum import Enum

logger = logging.getLogger(__name__)

class SuggestionSeverity(str, Enum):
    INFO = 'info'
    WARNING = 'warning'
    CRITICAL = 'critical'

class SuggestionCategory(str, Enum):
    COST_OPTIMIZATION = 'cost_optimization'
    PERFORMANCE = 'performance'
    SECURITY = 'security'
    RELIABILITY = 'reliability'
    BEST_PRACTICES = 'best_practices'

class Suggestion:
    """Represents a suggestion or recommendation"""
    
    def __init__(self, 
                 suggestion_id: str,
                 title: str,
                 description: str,
                 category: SuggestionCategory,
                 severity: SuggestionSeverity = SuggestionSeverity.INFO,
                 resource_type: Optional[str] = None,
                 resource_name: Optional[str] = None,
                 namespace: Optional[str] = None,
                 details: Optional[Dict[str, Any]] = None,
                 actions: Optional[List[Dict[str, Any]]] = None):
        self.suggestion_id = suggestion_id
        self.title = title
        self.description = description
        self.category = category
        self.severity = severity
        self.resource_type = resource_type
        self.resource_name = resource_name
        self.namespace = namespace
        self.details = details or {}
        self.actions = actions or []
        self.created_at = datetime.utcnow()
        self.acknowledged = False
        self.acknowledged_at = None
        self.acknowledged_by = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert suggestion to dictionary"""
        return {
            'suggestion_id': self.suggestion_id,
            'title': self.title,
            'description': self.description,
            'category': self.category.value,
            'severity': self.severity.value,
            'resource_type': self.resource_type,
            'resource_name': self.resource_name,
            'namespace': self.namespace,
            'details': self.details,
            'actions': self.actions,
            'created_at': self.created_at.isoformat(),
            'acknowledged': self.acknowledged,
            'acknowledged_at': self.acknowledged_at.isoformat() if self.acknowledged_at else None,
            'acknowledged_by': self.acknowledged_by
        }
    
    def acknowledge(self, user: str = 'system', note: Optional[str] = None):
        """Mark the suggestion as acknowledged"""
        self.acknowledged = True
        self.acknowledged_at = datetime.utcnow()
        self.acknowledged_by = user
        if note:
            self.details['acknowledgement_note'] = note

class SuggestionsCapability(AgentCapability):
    """
    Capability for providing intelligent suggestions and recommendations.
    Analyzes cluster state and usage patterns to provide actionable insights.
    """
    
    def __init__(self, agent_id: str, config: Optional[Dict[str, Any]] = None):
        super().__init__(agent_id, config)
        self.suggestions: Dict[str, Suggestion] = {}
        self.analyzers = []
        self.analysis_interval = self.config.get('analysis_interval', 300)  # 5 minutes
        self.analysis_task = None
        self.running = False
    
    async def _initialize(self):
        """Initialize the suggestions capability"""
        try:
            logger.info("Initializing SuggestionsCapability")
            
            # Register built-in analyzers
            self._register_analyzers()
            
            # Start the periodic analysis
            self.running = True
            self.analysis_task = asyncio.create_task(self._periodic_analysis())
            
            logger.info("SuggestionsCapability initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize suggestions capability: {str(e)}")
            raise
    
    async def cleanup(self):
        """Clean up resources"""
        self.running = False
        if self.analysis_task:
            self.analysis_task.cancel()
            try:
                await self.analysis_task
            except asyncio.CancelledError:
                pass
    
    def _register_analyzers(self):
        """Register built-in analyzers"""
        self.analyzers = [
            self._analyze_resource_requests_limits,
            self._analyze_pod_restarts,
            self._analyze_node_utilization,
            self._analyze_image_tags,
            self._analyze_pod_anti_affinity,
        ]
    
    async def execute(self, action: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a suggestions action"""
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
            'get_suggestions', 'acknowledge_suggestion', 'dismiss_suggestion',
            'run_analysis', 'get_analysis_status'
        ]
    
    # --- Suggestion Management ---
    
    async def _handle_get_suggestions(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Get suggestions matching the given filters"""
        category = parameters.get('category')
        severity = parameters.get('severity')
        acknowledged = parameters.get('acknowledged')
        resource_type = parameters.get('resource_type')
        namespace = parameters.get('namespace')
        
        filtered = []
        for suggestion in self.suggestions.values():
            if category and suggestion.category.value != category:
                continue
            if severity and suggestion.severity.value != severity:
                continue
            if acknowledged is not None and suggestion.acknowledged != acknowledged:
                continue
            if resource_type and suggestion.resource_type != resource_type:
                continue
            if namespace and suggestion.namespace != namespace:
                continue
                
            filtered.append(suggestion.to_dict())
        
        return {
            'suggestions': filtered,
            'count': len(filtered),
            'total': len(self.suggestions)
        }
    
    async def _handle_acknowledge_suggestion(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Acknowledge a suggestion"""
        suggestion_id = parameters.get('suggestion_id')
        user = parameters.get('user', 'system')
        note = parameters.get('note')
        
        if not suggestion_id:
            return {'error': 'suggestion_id is required'}
        
        suggestion = self.suggestions.get(suggestion_id)
        if not suggestion:
            return {'error': f'Suggestion not found: {suggestion_id}'}
        
        suggestion.acknowledge(user=user, note=note)
        
        return {'status': 'acknowledged'}
    
    async def _handle_dismiss_suggestion(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Dismiss a suggestion (remove it from the list)"""
        suggestion_id = parameters.get('suggestion_id')
        
        if not suggestion_id:
            return {'error': 'suggestion_id is required'}
        
        if suggestion_id not in self.suggestions:
            return {'error': f'Suggestion not found: {suggestion_id}'}
        
        del self.suggestions[suggestion_id]
        
        return {'status': 'dismissed'}
    
    # --- Analysis ---
    
    async def _handle_run_analysis(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Run analysis to generate new suggestions"""
        force = parameters.get('force', False)
        
        if not self.running and not force:
            return {'status': 'analysis_already_running'}
        
        # If analysis is already running and we're not forcing, return current status
        if self.analysis_task and not self.analysis_task.done() and not force:
            return {'status': 'analysis_in_progress'}
        
        # Run analysis in the background
        self.analysis_task = asyncio.create_task(self._analyze_cluster())
        
        return {'status': 'analysis_started'}
    
    async def _handle_get_analysis_status(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Get the status of the current analysis"""
        if not self.analysis_task:
            return {'status': 'not_running'}
        
        if self.analysis_task.done():
            try:
                await self.analysis_task
                return {'status': 'completed', 'error': None}
            except Exception as e:
                return {'status': 'failed', 'error': str(e)}
        else:
            return {'status': 'in_progress'}
    
    async def _periodic_analysis(self):
        """Run analysis periodically"""
        while self.running:
            try:
                await self._analyze_cluster()
            except Exception as e:
                logger.error(f"Error in periodic analysis: {str(e)}", exc_info=True)
            
            # Wait for the next interval
            try:
                await asyncio.sleep(self.analysis_interval)
            except asyncio.CancelledError:
                break
    
    async def _analyze_cluster(self):
        """Run all registered analyzers to generate suggestions"""
        logger.info("Starting cluster analysis")
        
        # Clear existing suggestions (except acknowledged ones)
        self.suggestions = {
            sid: s for sid, s in self.suggestions.items()
            if s.acknowledged
        }
        
        # Run all analyzers
        for analyzer in self.analyzers:
            try:
                await analyzer()
            except Exception as e:
                logger.error(f"Error in analyzer {analyzer.__name__}: {str(e)}", exc_info=True)
        
        logger.info(f"Cluster analysis complete. Generated {len([s for s in self.suggestions.values() if not s.acknowledged])} new suggestions")
    
    # --- Built-in Analyzers ---
    
    async def _analyze_resource_requests_limits(self):
        """Analyze resource requests and limits"""
        # In a real implementation, this would query the Kubernetes API
        # For now, we'll just add some example suggestions
        
        # Example: Missing resource requests/limits
        self._add_suggestion(
            suggestion_id="missing_requests_limits_123",
            title="Missing resource requests and limits",
            description="Pod 'example-pod' is missing resource requests and limits",
            category=SuggestionCategory.BEST_PRACTICES,
            severity=SuggestionSeverity.WARNING,
            resource_type="pod",
            resource_name="example-pod",
            namespace="default",
            actions=[
                {
                    "name": "Set requests and limits",
                    "description": "Configure resource requests and limits for the pod",
                    "action": "patch_pod",
                    "parameters": {
                        "name": "example-pod",
                        "namespace": "default",
                        "patch": {
                            "spec": {
                                "containers": [
                                    {
                                        "name": "example-container",
                                        "resources": {
                                            "requests": {
                                                "cpu": "100m",
                                                "memory": "128Mi"
                                            },
                                            "limits": {
                                                "cpu": "500m",
                                                "memory": "512Mi"
                                            }
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }
            ]
        )
    
    async def _analyze_pod_restarts(self):
        """Analyze pod restarts"""
        # Example: Pod with many restarts
        self._add_suggestion(
            suggestion_id="pod_restarts_456",
            title="Frequent pod restarts",
            description="Pod 'crashed-app' has restarted 15 times in the last hour",
            category=SuggestionCategory.RELIABILITY,
            severity=SuggestionSeverity.WARNING,
            resource_type="pod",
            resource_name="crashed-app",
            namespace="production",
            details={
                "restart_count": 15,
                "time_window": "1 hour"
            }
        )
    
    async def _analyze_node_utilization(self):
        """Analyze node resource utilization"""
        # Example: Node with high CPU usage
        self._add_suggestion(
            suggestion_id="high_cpu_usage_789",
            title="High CPU usage on node",
            description="Node 'worker-1' has high CPU usage (92%)",
            category=SuggestionCategory.PERFORMANCE,
            severity=SuggestionSeverity.WARNING,
            resource_type="node",
            resource_name="worker-1",
            details={
                "cpu_usage_percent": 92,
                "memory_usage_percent": 65
            },
            actions=[
                {
                    "name": "View node metrics",
                    "description": "View detailed metrics for this node",
                    "action": "view_metrics",
                    "parameters": {
                        "resource_type": "node",
                        "resource_name": "worker-1"
                    }
                },
                {
                    "name": "Add node",
                    "description": "Add a new node to the cluster",
                    "action": "add_node",
                    "parameters": {}
                }
            ]
        )
    
    async def _analyze_image_tags(self):
        """Analyze container image tags"""
        # Example: Using latest tag
        self._add_suggestion(
            suggestion_id="latest_tag_101",
            title="Container using 'latest' tag",
            description="Container 'frontend' is using the 'latest' tag which can lead to inconsistent behavior",
            category=SuggestionCategory.BEST_PRACTICES,
            severity=SuggestionSeverity.INFO,
            resource_type="deployment",
            resource_name="frontend",
            namespace="production"
        )
    
    async def _analyze_pod_anti_affinity(self):
        """Analyze pod anti-affinity rules"""
        # Example: Missing pod anti-affinity
        self._add_suggestion(
            suggestion_id="missing_anti_affinity_202",
            title="Missing pod anti-affinity",
            description="Deployment 'redis' doesn't have pod anti-affinity rules which could lead to downtime",
            category=SuggestionCategory.RELIABILITY,
            severity=SuggestionSeverity.WARNING,
            resource_type="deployment",
            resource_name="redis",
            namespace="production"
        )
    
    # --- Helper Methods ---
    
    def _add_suggestion(self, 
                       suggestion_id: str,
                       title: str,
                       description: str,
                       category: SuggestionCategory,
                       severity: SuggestionSeverity = SuggestionSeverity.INFO,
                       resource_type: Optional[str] = None,
                       resource_name: Optional[str] = None,
                       namespace: Optional[str] = None,
                       details: Optional[Dict[str, Any]] = None,
                       actions: Optional[List[Dict[str, Any]]] = None):
        """Add a new suggestion"""
        # Check if we already have this suggestion
        if suggestion_id in self.suggestions:
            return
        
        # Create and store the suggestion
        suggestion = Suggestion(
            suggestion_id=suggestion_id,
            title=title,
            description=description,
            category=category,
            severity=severity,
            resource_type=resource_type,
            resource_name=resource_name,
            namespace=namespace,
            details=details or {},
            actions=actions or []
        )
        
        self.suggestions[suggestion_id] = suggestion
        
        # Log the suggestion
        logger.info(f"New suggestion: {title} ({severity.value})")
