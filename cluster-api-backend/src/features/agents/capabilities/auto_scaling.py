import asyncio
import numpy as np
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from .base import AgentCapability
from src.services.openai_service import OpenAIService
from src.services.kubernetes_client import KubernetesClient
import logging
import json
import statistics
from enum import Enum
from dataclasses import dataclass
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import PolynomialFeatures
import warnings
warnings.filterwarnings('ignore')

logger = logging.getLogger(__name__)

class ScalingDirection(str, Enum):
    UP = 'up'
    DOWN = 'down'
    STABLE = 'stable'

class ScalingTrigger(str, Enum):
    CPU_THRESHOLD = 'cpu_threshold'
    MEMORY_THRESHOLD = 'memory_threshold'
    REQUEST_RATE = 'request_rate'
    QUEUE_LENGTH = 'queue_length'
    CUSTOM_METRIC = 'custom_metric'
    PREDICTIVE = 'predictive'

@dataclass
class MetricDataPoint:
    timestamp: datetime
    value: float
    metric_name: str
    resource_name: str
    namespace: str

@dataclass
class ScalingRule:
    rule_id: str
    resource_name: str
    namespace: str
    metric_name: str
    threshold_up: float
    threshold_down: float
    min_replicas: int
    max_replicas: int
    scale_up_cooldown: int  # seconds
    scale_down_cooldown: int  # seconds
    enabled: bool = True
    predictive_enabled: bool = False
    prediction_window: int = 300  # seconds (5 minutes)

@dataclass
class ScalingEvent:
    event_id: str
    timestamp: datetime
    resource_name: str
    namespace: str
    trigger: ScalingTrigger
    direction: ScalingDirection
    from_replicas: int
    to_replicas: int
    metric_value: float
    threshold: float
    reason: str
    success: bool
    prediction_confidence: Optional[float] = None

class AutoScalingCapability(AgentCapability):
    """
    Auto-scaling capability with predictive analytics.
    Monitors metrics, predicts future load, and automatically scales resources.
    """
    
    def __init__(self, agent_id: str, config: Optional[Dict[str, Any]] = None):
        super().__init__(agent_id, config)
        self.k8s_client: Optional[KubernetesClient] = None
        self.openai_service: Optional[OpenAIService] = None
        self.scaling_rules: Dict[str, ScalingRule] = {}
        self.metric_history: Dict[str, List[MetricDataPoint]] = {}
        self.scaling_events: List[ScalingEvent] = []
        self.monitoring_task = None
        self.running = False
        self.monitoring_interval = self.config.get('monitoring_interval', 30)  # seconds
        self.history_retention = self.config.get('history_retention_hours', 24)
        self.prediction_models: Dict[str, Any] = {}
    
    async def _initialize(self):
        """Initialize the auto-scaling capability"""
        try:
            logger.info("Initializing AutoScalingCapability")
            self.k8s_client = KubernetesClient()
            self.openai_service = OpenAIService()
            
            # Load default scaling rules
            await self._load_default_rules()
            
            # Start monitoring
            self.running = True
            self.monitoring_task = asyncio.create_task(self._monitoring_loop())
            
            logger.info("AutoScalingCapability initialized")
        except Exception as e:
            logger.error(f"Failed to initialize auto-scaling capability: {str(e)}")
            raise
    
    async def cleanup(self):
        """Clean up resources"""
        self.running = False
        if self.monitoring_task:
            self.monitoring_task.cancel()
            try:
                await self.monitoring_task
            except asyncio.CancelledError:
                pass
    
    async def _load_default_rules(self):
        """Load default scaling rules"""
        default_rules = [
            ScalingRule(
                rule_id="cpu_scaling_default",
                resource_name="*",
                namespace="default",
                metric_name="cpu_utilization",
                threshold_up=70.0,
                threshold_down=30.0,
                min_replicas=1,
                max_replicas=10,
                scale_up_cooldown=300,
                scale_down_cooldown=600,
                predictive_enabled=True
            ),
            ScalingRule(
                rule_id="memory_scaling_default",
                resource_name="*",
                namespace="default",
                metric_name="memory_utilization",
                threshold_up=80.0,
                threshold_down=40.0,
                min_replicas=1,
                max_replicas=10,
                scale_up_cooldown=300,
                scale_down_cooldown=600,
                predictive_enabled=True
            )
        ]
        
        for rule in default_rules:
            self.scaling_rules[rule.rule_id] = rule
    
    async def execute(self, action: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute an auto-scaling action"""
        try:
            if not self._initialized:
                await self.initialize()
            
            handler = getattr(self, f"_handle_{action}", None)
            if not handler or not callable(handler):
                return {
                    'success': False,
                    'error': f"Unsupported action: {action}",
                    'available_actions': self._list_actions()
                }
            
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
            'create_scaling_rule', 'update_scaling_rule', 'delete_scaling_rule',
            'list_scaling_rules', 'get_scaling_events', 'get_metrics_history',
            'predict_scaling_needs', 'manual_scale', 'get_scaling_status'
        ]
    
    # --- Scaling Rule Management ---
    
    async def _handle_create_scaling_rule(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new scaling rule"""
        required_fields = ['resource_name', 'namespace', 'metric_name', 'threshold_up', 'threshold_down']
        for field in required_fields:
            if field not in parameters:
                return {'error': f'Missing required field: {field}'}
        
        rule_id = parameters.get('rule_id', f"rule_{parameters['resource_name']}_{parameters['metric_name']}")
        
        rule = ScalingRule(
            rule_id=rule_id,
            resource_name=parameters['resource_name'],
            namespace=parameters['namespace'],
            metric_name=parameters['metric_name'],
            threshold_up=float(parameters['threshold_up']),
            threshold_down=float(parameters['threshold_down']),
            min_replicas=parameters.get('min_replicas', 1),
            max_replicas=parameters.get('max_replicas', 10),
            scale_up_cooldown=parameters.get('scale_up_cooldown', 300),
            scale_down_cooldown=parameters.get('scale_down_cooldown', 600),
            enabled=parameters.get('enabled', True),
            predictive_enabled=parameters.get('predictive_enabled', False),
            prediction_window=parameters.get('prediction_window', 300)
        )
        
        self.scaling_rules[rule_id] = rule
        
        return {
            'rule_id': rule_id,
            'message': f'Scaling rule created for {rule.resource_name}',
            'rule': self._rule_to_dict(rule)
        }
    
    async def _handle_list_scaling_rules(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """List all scaling rules"""
        resource_name = parameters.get('resource_name')
        namespace = parameters.get('namespace')
        
        rules = []
        for rule in self.scaling_rules.values():
            if resource_name and rule.resource_name != resource_name and rule.resource_name != '*':
                continue
            if namespace and rule.namespace != namespace:
                continue
            
            rules.append(self._rule_to_dict(rule))
        
        return {
            'rules': rules,
            'count': len(rules)
        }
    
    async def _handle_get_scaling_events(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Get scaling events history"""
        limit = parameters.get('limit', 50)
        resource_name = parameters.get('resource_name')
        
        events = self.scaling_events
        if resource_name:
            events = [e for e in events if e.resource_name == resource_name]
        
        # Sort by timestamp descending and limit
        events = sorted(events, key=lambda x: x.timestamp, reverse=True)[:limit]
        
        return {
            'events': [self._event_to_dict(event) for event in events],
            'count': len(events)
        }
    
    # --- Predictive Scaling ---
    
    async def _handle_predict_scaling_needs(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Predict future scaling needs"""
        resource_name = parameters.get('resource_name')
        namespace = parameters.get('namespace', 'default')
        prediction_minutes = parameters.get('prediction_minutes', 15)
        
        if not resource_name:
            return {'error': 'resource_name is required'}
        
        # Get relevant metrics
        metrics_key = f"{namespace}/{resource_name}"
        if metrics_key not in self.metric_history:
            return {'error': f'No metrics history found for {resource_name}'}
        
        predictions = {}
        
        # Predict for each metric
        for metric_name in ['cpu_utilization', 'memory_utilization']:
            metric_data = [
                point for point in self.metric_history[metrics_key]
                if point.metric_name == metric_name
            ]
            
            if len(metric_data) < 10:  # Need minimum data points
                continue
            
            prediction = await self._predict_metric_value(metric_data, prediction_minutes)
            predictions[metric_name] = prediction
        
        # Generate scaling recommendation
        recommendation = await self._generate_scaling_recommendation(
            resource_name, namespace, predictions
        )
        
        return {
            'resource': f"{namespace}/{resource_name}",
            'predictions': predictions,
            'recommendation': recommendation,
            'prediction_horizon_minutes': prediction_minutes
        }
    
    async def _predict_metric_value(self, metric_data: List[MetricDataPoint], prediction_minutes: int) -> Dict[str, Any]:
        """Predict future metric value using time series analysis"""
        if len(metric_data) < 10:
            return {'error': 'Insufficient data for prediction'}
        
        try:
            # Prepare data for ML model
            timestamps = [(point.timestamp - metric_data[0].timestamp).total_seconds() for point in metric_data]
            values = [point.value for point in metric_data]
            
            # Use polynomial regression for trend prediction
            X = np.array(timestamps).reshape(-1, 1)
            y = np.array(values)
            
            # Create polynomial features (degree 2 for trend + seasonality)
            poly_features = PolynomialFeatures(degree=2)
            X_poly = poly_features.fit_transform(X)
            
            # Fit model
            model = LinearRegression()
            model.fit(X_poly, y)
            
            # Predict future value
            future_timestamp = timestamps[-1] + (prediction_minutes * 60)
            future_X = poly_features.transform([[future_timestamp]])
            predicted_value = model.predict(future_X)[0]
            
            # Calculate confidence based on recent trend consistency
            recent_values = values[-5:]  # Last 5 data points
            trend_consistency = 1.0 - (np.std(recent_values) / (np.mean(recent_values) + 0.1))
            confidence = max(0.1, min(0.9, trend_consistency))
            
            return {
                'predicted_value': float(predicted_value),
                'confidence': float(confidence),
                'trend': 'increasing' if predicted_value > values[-1] else 'decreasing',
                'current_value': float(values[-1]),
                'data_points_used': len(metric_data)
            }
            
        except Exception as e:
            logger.error(f"Error in prediction: {str(e)}")
            return {'error': f'Prediction failed: {str(e)}'}
    
    async def _generate_scaling_recommendation(self, resource_name: str, namespace: str, predictions: Dict[str, Any]) -> Dict[str, Any]:
        """Generate scaling recommendation based on predictions"""
        if not self.openai_service:
            return self._generate_rule_based_recommendation(resource_name, namespace, predictions)
        
        # Use AI to generate intelligent recommendations
        prompt = f"""
        Analyze the following metric predictions for Kubernetes resource {resource_name} in namespace {namespace}:
        
        Predictions: {json.dumps(predictions, indent=2)}
        
        Based on these predictions, provide a scaling recommendation including:
        1. Whether to scale up, down, or maintain current replicas
        2. Recommended replica count
        3. Reasoning for the recommendation
        4. Risk assessment
        
        Respond in JSON format with keys: action, recommended_replicas, reasoning, risk_level
        """
        
        try:
            response = self.openai_service.get_completion(prompt, max_tokens=300)
            recommendation = json.loads(response)
            return recommendation
        except Exception as e:
            logger.error(f"Error generating AI recommendation: {str(e)}")
            return self._generate_rule_based_recommendation(resource_name, namespace, predictions)
    
    def _generate_rule_based_recommendation(self, resource_name: str, namespace: str, predictions: Dict[str, Any]) -> Dict[str, Any]:
        """Generate rule-based scaling recommendation"""
        # Find applicable scaling rules
        applicable_rules = [
            rule for rule in self.scaling_rules.values()
            if (rule.resource_name == resource_name or rule.resource_name == '*') and
               rule.namespace == namespace and rule.enabled
        ]
        
        if not applicable_rules:
            return {
                'action': 'maintain',
                'recommended_replicas': None,
                'reasoning': 'No applicable scaling rules found',
                'risk_level': 'low'
            }
        
        # Check predictions against thresholds
        scale_up_needed = False
        scale_down_possible = False
        
        for rule in applicable_rules:
            if rule.metric_name in predictions:
                pred = predictions[rule.metric_name]
                if 'predicted_value' in pred:
                    if pred['predicted_value'] > rule.threshold_up:
                        scale_up_needed = True
                    elif pred['predicted_value'] < rule.threshold_down:
                        scale_down_possible = True
        
        if scale_up_needed:
            return {
                'action': 'scale_up',
                'recommended_replicas': None,  # Would need current replica count
                'reasoning': 'Predicted metrics will exceed scale-up thresholds',
                'risk_level': 'medium'
            }
        elif scale_down_possible:
            return {
                'action': 'scale_down',
                'recommended_replicas': None,
                'reasoning': 'Predicted metrics allow for scale-down',
                'risk_level': 'low'
            }
        else:
            return {
                'action': 'maintain',
                'recommended_replicas': None,
                'reasoning': 'Predicted metrics are within acceptable ranges',
                'risk_level': 'low'
            }
    
    # --- Monitoring Loop ---
    
    async def _monitoring_loop(self):
        """Main monitoring loop for auto-scaling"""
        while self.running:
            try:
                await self._collect_metrics()
                await self._evaluate_scaling_rules()
                await self._cleanup_old_data()
                
                await asyncio.sleep(self.monitoring_interval)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in monitoring loop: {str(e)}", exc_info=True)
                await asyncio.sleep(self.monitoring_interval)
    
    async def _collect_metrics(self):
        """Collect metrics from Kubernetes"""
        try:
            if not self.k8s_client or not self.k8s_client.is_connected():
                return
            
            # Simulate metric collection (in real implementation, use metrics server)
            current_time = datetime.utcnow()
            
            # Get list of deployments to monitor
            deployments = await self._get_monitored_deployments()
            
            for deployment in deployments:
                namespace = deployment.get('namespace', 'default')
                name = deployment.get('name', 'unknown')
                metrics_key = f"{namespace}/{name}"
                
                if metrics_key not in self.metric_history:
                    self.metric_history[metrics_key] = []
                
                # Simulate CPU and memory metrics
                cpu_value = np.random.normal(50, 15)  # Simulate CPU around 50%
                memory_value = np.random.normal(60, 20)  # Simulate memory around 60%
                
                # Add some trend (increasing load over time)
                time_factor = (current_time.hour % 12) / 12.0  # Daily pattern
                cpu_value += time_factor * 20
                memory_value += time_factor * 15
                
                # Ensure values are within realistic bounds
                cpu_value = max(0, min(100, cpu_value))
                memory_value = max(0, min(100, memory_value))
                
                # Store metrics
                self.metric_history[metrics_key].extend([
                    MetricDataPoint(current_time, cpu_value, 'cpu_utilization', name, namespace),
                    MetricDataPoint(current_time, memory_value, 'memory_utilization', name, namespace)
                ])
                
        except Exception as e:
            logger.error(f"Error collecting metrics: {str(e)}")
    
    async def _get_monitored_deployments(self) -> List[Dict[str, str]]:
        """Get list of deployments to monitor"""
        # In real implementation, query Kubernetes API
        # For now, return simulated deployments
        return [
            {'name': 'web-app', 'namespace': 'default'},
            {'name': 'api-service', 'namespace': 'default'},
            {'name': 'worker', 'namespace': 'production'}
        ]
    
    async def _evaluate_scaling_rules(self):
        """Evaluate scaling rules against current metrics"""
        for rule in self.scaling_rules.values():
            if not rule.enabled:
                continue
            
            try:
                await self._evaluate_single_rule(rule)
            except Exception as e:
                logger.error(f"Error evaluating rule {rule.rule_id}: {str(e)}")
    
    async def _evaluate_single_rule(self, rule: ScalingRule):
        """Evaluate a single scaling rule"""
        # Get recent metrics for the resource
        metrics_key = f"{rule.namespace}/{rule.resource_name}"
        if rule.resource_name == '*':
            # Handle wildcard rules by checking all resources in namespace
            matching_keys = [key for key in self.metric_history.keys() 
                           if key.startswith(f"{rule.namespace}/")]
        else:
            matching_keys = [metrics_key] if metrics_key in self.metric_history else []
        
        for key in matching_keys:
            if key not in self.metric_history:
                continue
            
            # Get recent metric values
            recent_metrics = [
                point for point in self.metric_history[key]
                if point.metric_name == rule.metric_name and
                   (datetime.utcnow() - point.timestamp).total_seconds() < 300  # Last 5 minutes
            ]
            
            if len(recent_metrics) < 3:  # Need minimum data points
                continue
            
            # Calculate average of recent values
            avg_value = statistics.mean([point.value for point in recent_metrics])
            
            # Check if scaling is needed
            scaling_decision = await self._make_scaling_decision(rule, key, avg_value)
            
            if scaling_decision['action'] != ScalingDirection.STABLE:
                await self._execute_scaling(rule, key, scaling_decision)
    
    async def _make_scaling_decision(self, rule: ScalingRule, resource_key: str, current_value: float) -> Dict[str, Any]:
        """Make scaling decision based on rule and current metrics"""
        namespace, resource_name = resource_key.split('/', 1)
        
        # Check cooldown periods
        recent_events = [
            event for event in self.scaling_events
            if event.resource_name == resource_name and
               event.namespace == namespace and
               (datetime.utcnow() - event.timestamp).total_seconds() < rule.scale_up_cooldown
        ]
        
        if recent_events:
            return {'action': ScalingDirection.STABLE, 'reason': 'In cooldown period'}
        
        # Make decision based on thresholds
        if current_value > rule.threshold_up:
            return {
                'action': ScalingDirection.UP,
                'reason': f'{rule.metric_name} ({current_value:.1f}%) above threshold ({rule.threshold_up}%)',
                'trigger': ScalingTrigger.CPU_THRESHOLD if 'cpu' in rule.metric_name else ScalingTrigger.MEMORY_THRESHOLD
            }
        elif current_value < rule.threshold_down:
            return {
                'action': ScalingDirection.DOWN,
                'reason': f'{rule.metric_name} ({current_value:.1f}%) below threshold ({rule.threshold_down}%)',
                'trigger': ScalingTrigger.CPU_THRESHOLD if 'cpu' in rule.metric_name else ScalingTrigger.MEMORY_THRESHOLD
            }
        else:
            return {'action': ScalingDirection.STABLE, 'reason': 'Within acceptable thresholds'}
    
    async def _execute_scaling(self, rule: ScalingRule, resource_key: str, decision: Dict[str, Any]):
        """Execute scaling action"""
        namespace, resource_name = resource_key.split('/', 1)
        
        try:
            # Get current replica count (simulated)
            current_replicas = 3  # In real implementation, query Kubernetes
            
            # Calculate new replica count
            if decision['action'] == ScalingDirection.UP:
                new_replicas = min(rule.max_replicas, current_replicas + 1)
            else:  # Scale down
                new_replicas = max(rule.min_replicas, current_replicas - 1)
            
            if new_replicas == current_replicas:
                return  # No change needed
            
            # Execute scaling (simulated)
            success = await self._scale_deployment(namespace, resource_name, new_replicas)
            
            # Record scaling event
            event = ScalingEvent(
                event_id=f"scale_{resource_name}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
                timestamp=datetime.utcnow(),
                resource_name=resource_name,
                namespace=namespace,
                trigger=decision.get('trigger', ScalingTrigger.CPU_THRESHOLD),
                direction=decision['action'],
                from_replicas=current_replicas,
                to_replicas=new_replicas,
                metric_value=0.0,  # Would be filled with actual metric value
                threshold=rule.threshold_up if decision['action'] == ScalingDirection.UP else rule.threshold_down,
                reason=decision['reason'],
                success=success
            )
            
            self.scaling_events.append(event)
            
            if success:
                logger.info(f"Successfully scaled {resource_name} from {current_replicas} to {new_replicas} replicas")
            else:
                logger.error(f"Failed to scale {resource_name}")
                
        except Exception as e:
            logger.error(f"Error executing scaling: {str(e)}")
    
    async def _scale_deployment(self, namespace: str, deployment_name: str, replicas: int) -> bool:
        """Scale a deployment (simulated)"""
        try:
            # In real implementation, use Kubernetes client to scale deployment
            logger.info(f"Scaling {namespace}/{deployment_name} to {replicas} replicas")
            return True
        except Exception as e:
            logger.error(f"Error scaling deployment: {str(e)}")
            return False
    
    async def _cleanup_old_data(self):
        """Clean up old metric data and events"""
        cutoff_time = datetime.utcnow() - timedelta(hours=self.history_retention)
        
        # Clean up metric history
        for key in self.metric_history:
            self.metric_history[key] = [
                point for point in self.metric_history[key]
                if point.timestamp > cutoff_time
            ]
        
        # Clean up scaling events
        self.scaling_events = [
            event for event in self.scaling_events
            if event.timestamp > cutoff_time
        ]
    
    # --- Helper Methods ---
    
    def _rule_to_dict(self, rule: ScalingRule) -> Dict[str, Any]:
        """Convert scaling rule to dictionary"""
        return {
            'rule_id': rule.rule_id,
            'resource_name': rule.resource_name,
            'namespace': rule.namespace,
            'metric_name': rule.metric_name,
            'threshold_up': rule.threshold_up,
            'threshold_down': rule.threshold_down,
            'min_replicas': rule.min_replicas,
            'max_replicas': rule.max_replicas,
            'scale_up_cooldown': rule.scale_up_cooldown,
            'scale_down_cooldown': rule.scale_down_cooldown,
            'enabled': rule.enabled,
            'predictive_enabled': rule.predictive_enabled,
            'prediction_window': rule.prediction_window
        }
    
    def _event_to_dict(self, event: ScalingEvent) -> Dict[str, Any]:
        """Convert scaling event to dictionary"""
        return {
            'event_id': event.event_id,
            'timestamp': event.timestamp.isoformat(),
            'resource_name': event.resource_name,
            'namespace': event.namespace,
            'trigger': event.trigger.value,
            'direction': event.direction.value,
            'from_replicas': event.from_replicas,
            'to_replicas': event.to_replicas,
            'metric_value': event.metric_value,
            'threshold': event.threshold,
            'reason': event.reason,
            'success': event.success,
            'prediction_confidence': event.prediction_confidence
        }
