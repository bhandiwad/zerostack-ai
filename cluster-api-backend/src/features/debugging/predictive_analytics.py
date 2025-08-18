"""
Predictive Analytics Engine for Cluster Health and Issue Detection
"""
import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import numpy as np
from dataclasses import dataclass, asdict

logger = logging.getLogger(__name__)

@dataclass
class PredictiveInsight:
    """Represents a predictive insight about cluster health"""
    id: str
    type: str  # 'resource_exhaustion', 'performance_degradation', 'failure_prediction'
    title: str
    description: str
    probability: float  # 0.0 to 1.0
    time_to_occurrence: str  # e.g., "2-4 hours", "1-2 days"
    severity: str  # 'low', 'medium', 'high', 'critical'
    affected_resources: List[str]
    recommended_actions: List[str]
    confidence: float
    trend_data: Dict[str, Any]
    created_at: str

@dataclass
class AnomalyDetection:
    """Represents an anomaly detected in cluster metrics"""
    id: str
    metric_name: str
    current_value: float
    expected_value: float
    deviation_percentage: float
    anomaly_score: float  # 0.0 to 1.0
    detection_time: str
    severity: str
    description: str
    possible_causes: List[str]
    recommended_actions: List[str]

class PredictiveAnalyticsEngine:
    """Advanced predictive analytics for cluster health monitoring"""
    
    def __init__(self):
        self.historical_data = {}
        self.anomaly_threshold = 0.7
        self.prediction_models = {}
        
    async def analyze_cluster_health(self, cluster_id: str = "default") -> Dict[str, Any]:
        """Perform comprehensive predictive health analysis"""
        try:
            # Simulate real-time metrics collection
            current_metrics = await self._collect_cluster_metrics(cluster_id)
            
            # Generate predictive insights
            insights = await self._generate_predictive_insights(current_metrics)
            
            # Detect anomalies
            anomalies = await self._detect_anomalies(current_metrics)
            
            # Calculate health trends
            health_trends = await self._calculate_health_trends(current_metrics)
            
            # Generate recommendations
            recommendations = await self._generate_recommendations(insights, anomalies)
            
            return {
                'cluster_id': cluster_id,
                'analysis_timestamp': datetime.now().isoformat(),
                'overall_health_score': self._calculate_overall_health_score(current_metrics, anomalies),
                'predictive_insights': [asdict(insight) for insight in insights],
                'anomalies': [asdict(anomaly) for anomaly in anomalies],
                'health_trends': health_trends,
                'recommendations': recommendations,
                'metrics_summary': current_metrics
            }
            
        except Exception as e:
            logger.error(f"Error in predictive analysis: {str(e)}")
            raise

    async def _collect_cluster_metrics(self, cluster_id: str) -> Dict[str, Any]:
        """Simulate collection of real-time cluster metrics"""
        # In production, this would connect to Prometheus, Kubernetes API, etc.
        base_time = datetime.now()
        
        # Simulate realistic metrics with some variability
        cpu_base = np.random.normal(45, 10)
        memory_base = np.random.normal(60, 15)
        
        return {
            'cpu_usage': max(0, min(100, cpu_base)),
            'memory_usage': max(0, min(100, memory_base)),
            'disk_usage': np.random.normal(35, 8),
            'network_io': np.random.normal(1024, 200),  # MB/s
            'pod_count': np.random.randint(50, 200),
            'failed_pods': np.random.randint(0, 5),
            'node_count': 5,
            'unhealthy_nodes': np.random.randint(0, 2),
            'api_response_time': np.random.normal(150, 50),  # ms
            'etcd_latency': np.random.normal(5, 2),  # ms
            'container_restarts': np.random.randint(0, 10),
            'pv_usage': np.random.normal(40, 12),
            'ingress_errors': np.random.randint(0, 3),
            'timestamp': base_time.isoformat()
        }

    async def _generate_predictive_insights(self, metrics: Dict[str, Any]) -> List[PredictiveInsight]:
        """Generate predictive insights based on current metrics and trends"""
        insights = []
        
        # CPU exhaustion prediction
        if metrics['cpu_usage'] > 70:
            insights.append(PredictiveInsight(
                id=f"cpu_exhaustion_{datetime.now().timestamp()}",
                type="resource_exhaustion",
                title="CPU Exhaustion Predicted",
                description=f"Current CPU usage at {metrics['cpu_usage']:.1f}% shows upward trend. Exhaustion likely within 2-4 hours if current workload continues.",
                probability=0.75 if metrics['cpu_usage'] > 80 else 0.60,
                time_to_occurrence="2-4 hours",
                severity="high" if metrics['cpu_usage'] > 85 else "medium",
                affected_resources=["worker-nodes", "critical-pods"],
                recommended_actions=[
                    "Scale out worker nodes",
                    "Implement horizontal pod autoscaling",
                    "Review resource-intensive workloads",
                    "Consider CPU limits optimization"
                ],
                confidence=0.82,
                trend_data={
                    "current_usage": metrics['cpu_usage'],
                    "trend_direction": "increasing",
                    "rate_of_change": "+2.3%/hour"
                },
                created_at=datetime.now().isoformat()
            ))

        # Memory pressure prediction
        if metrics['memory_usage'] > 75:
            insights.append(PredictiveInsight(
                id=f"memory_pressure_{datetime.now().timestamp()}",
                type="resource_exhaustion",
                title="Memory Pressure Imminent",
                description=f"Memory usage at {metrics['memory_usage']:.1f}% with increasing allocation rate. OOM events likely within 1-3 hours.",
                probability=0.68,
                time_to_occurrence="1-3 hours",
                severity="high",
                affected_resources=["memory-intensive-pods", "system-components"],
                recommended_actions=[
                    "Increase node memory capacity",
                    "Optimize memory-hungry applications",
                    "Implement memory limits",
                    "Consider memory-based autoscaling"
                ],
                confidence=0.79,
                trend_data={
                    "current_usage": metrics['memory_usage'],
                    "trend_direction": "increasing",
                    "rate_of_change": "+1.8%/hour"
                },
                created_at=datetime.now().isoformat()
            ))

        # Performance degradation prediction
        if metrics['api_response_time'] > 200:
            insights.append(PredictiveInsight(
                id=f"performance_degradation_{datetime.now().timestamp()}",
                type="performance_degradation",
                title="API Performance Degradation Detected",
                description=f"API response time at {metrics['api_response_time']:.0f}ms indicates potential performance issues. Service degradation expected.",
                probability=0.55,
                time_to_occurrence="30-60 minutes",
                severity="medium",
                affected_resources=["kube-apiserver", "etcd", "client-applications"],
                recommended_actions=[
                    "Check etcd performance",
                    "Review API server logs",
                    "Monitor network latency",
                    "Consider API server scaling"
                ],
                confidence=0.71,
                trend_data={
                    "current_response_time": metrics['api_response_time'],
                    "baseline": 120,
                    "deviation": "+67%"
                },
                created_at=datetime.now().isoformat()
            ))

        # Pod failure prediction
        if metrics['container_restarts'] > 5:
            insights.append(PredictiveInsight(
                id=f"pod_instability_{datetime.now().timestamp()}",
                type="failure_prediction",
                title="Pod Instability Pattern Detected",
                description=f"High container restart rate ({metrics['container_restarts']}) suggests underlying stability issues. Cascading failures possible.",
                probability=0.62,
                time_to_occurrence="1-2 hours",
                severity="medium",
                affected_resources=["unstable-pods", "dependent-services"],
                recommended_actions=[
                    "Investigate restart causes",
                    "Check resource constraints",
                    "Review application logs",
                    "Implement circuit breakers"
                ],
                confidence=0.74,
                trend_data={
                    "restart_rate": metrics['container_restarts'],
                    "pattern": "increasing",
                    "affected_namespaces": ["default", "production"]
                },
                created_at=datetime.now().isoformat()
            ))

        return insights

    async def _detect_anomalies(self, metrics: Dict[str, Any]) -> List[AnomalyDetection]:
        """Detect anomalies in current metrics compared to historical baselines"""
        anomalies = []
        
        # Define baseline expectations (in production, these would be learned from historical data)
        baselines = {
            'cpu_usage': {'expected': 45, 'std': 15},
            'memory_usage': {'expected': 55, 'std': 20},
            'api_response_time': {'expected': 120, 'std': 30},
            'etcd_latency': {'expected': 5, 'std': 2},
            'network_io': {'expected': 1024, 'std': 300}
        }
        
        for metric_name, baseline in baselines.items():
            if metric_name in metrics:
                current_value = metrics[metric_name]
                expected_value = baseline['expected']
                std_dev = baseline['std']
                
                # Calculate z-score for anomaly detection
                z_score = abs(current_value - expected_value) / std_dev
                
                if z_score > 2.0:  # Anomaly threshold
                    deviation_pct = ((current_value - expected_value) / expected_value) * 100
                    anomaly_score = min(1.0, z_score / 4.0)  # Normalize to 0-1
                    
                    severity = "critical" if z_score > 3.5 else "high" if z_score > 3.0 else "medium"
                    
                    anomalies.append(AnomalyDetection(
                        id=f"anomaly_{metric_name}_{datetime.now().timestamp()}",
                        metric_name=metric_name,
                        current_value=current_value,
                        expected_value=expected_value,
                        deviation_percentage=deviation_pct,
                        anomaly_score=anomaly_score,
                        detection_time=datetime.now().isoformat(),
                        severity=severity,
                        description=f"{metric_name.replace('_', ' ').title()} is {abs(deviation_pct):.1f}% {'above' if deviation_pct > 0 else 'below'} expected baseline",
                        possible_causes=self._get_possible_causes(metric_name, deviation_pct > 0),
                        recommended_actions=self._get_anomaly_actions(metric_name, deviation_pct > 0)
                    ))
        
        return anomalies

    def _get_possible_causes(self, metric_name: str, is_high: bool) -> List[str]:
        """Get possible causes for metric anomalies"""
        causes_map = {
            'cpu_usage': {
                True: ["High workload demand", "Resource-intensive processes", "Inefficient algorithms", "DDoS attack"],
                False: ["Underutilized resources", "Workload migration", "Scheduled maintenance", "Application issues"]
            },
            'memory_usage': {
                True: ["Memory leaks", "Large dataset processing", "Insufficient garbage collection", "Memory-intensive workloads"],
                False: ["Application shutdown", "Memory optimization", "Workload reduction", "Cache clearing"]
            },
            'api_response_time': {
                True: ["Network congestion", "Database bottlenecks", "High request volume", "Resource contention"],
                False: ["Improved caching", "Network optimization", "Reduced load", "Performance tuning"]
            }
        }
        return causes_map.get(metric_name, {}).get(is_high, ["Unknown cause"])

    def _get_anomaly_actions(self, metric_name: str, is_high: bool) -> List[str]:
        """Get recommended actions for metric anomalies"""
        actions_map = {
            'cpu_usage': {
                True: ["Scale horizontally", "Optimize workloads", "Add CPU limits", "Investigate high-usage pods"],
                False: ["Review resource allocation", "Consider downsizing", "Optimize scheduling", "Check for issues"]
            },
            'memory_usage': {
                True: ["Increase memory limits", "Optimize memory usage", "Add memory monitoring", "Scale vertically"],
                False: ["Review memory requests", "Check for memory leaks", "Optimize allocation", "Monitor trends"]
            },
            'api_response_time': {
                True: ["Scale API servers", "Optimize queries", "Add caching", "Check network latency"],
                False: ["Monitor for issues", "Validate improvements", "Check system health", "Review recent changes"]
            }
        }
        return actions_map.get(metric_name, {}).get(is_high, ["Monitor closely"])

    async def _calculate_health_trends(self, metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate health trends and projections"""
        # Simulate trend calculations (in production, would use historical data)
        return {
            'overall_trend': 'stable',
            'cpu_trend': {
                'direction': 'increasing' if metrics['cpu_usage'] > 60 else 'stable',
                'rate': '+2.1%/hour' if metrics['cpu_usage'] > 60 else '±0.5%/hour',
                'projection_24h': min(100, metrics['cpu_usage'] * 1.15)
            },
            'memory_trend': {
                'direction': 'increasing' if metrics['memory_usage'] > 70 else 'stable',
                'rate': '+1.8%/hour' if metrics['memory_usage'] > 70 else '±0.3%/hour',
                'projection_24h': min(100, metrics['memory_usage'] * 1.12)
            },
            'performance_trend': {
                'direction': 'degrading' if metrics['api_response_time'] > 180 else 'stable',
                'api_latency_change': '+15%' if metrics['api_response_time'] > 180 else '±5%',
                'stability_score': 0.85 if metrics['container_restarts'] < 3 else 0.65
            }
        }

    async def _generate_recommendations(self, insights: List[PredictiveInsight], anomalies: List[AnomalyDetection]) -> List[Dict[str, Any]]:
        """Generate prioritized recommendations based on insights and anomalies"""
        recommendations = []
        
        # High-priority recommendations from critical insights
        critical_insights = [i for i in insights if i.severity == 'critical']
        for insight in critical_insights:
            recommendations.append({
                'id': f"rec_{insight.id}",
                'priority': 'critical',
                'title': f"Address {insight.title}",
                'description': f"Immediate action required: {insight.recommended_actions[0]}",
                'estimated_impact': 'high',
                'effort_level': 'medium',
                'time_sensitive': True
            })
        
        # Anomaly-based recommendations
        high_anomalies = [a for a in anomalies if a.severity in ['critical', 'high']]
        for anomaly in high_anomalies:
            recommendations.append({
                'id': f"rec_{anomaly.id}",
                'priority': 'high',
                'title': f"Investigate {anomaly.metric_name.replace('_', ' ').title()} Anomaly",
                'description': f"Anomaly detected: {anomaly.description}",
                'estimated_impact': 'medium',
                'effort_level': 'low',
                'time_sensitive': anomaly.severity == 'critical'
            })
        
        # Preventive recommendations
        recommendations.append({
            'id': 'rec_preventive_monitoring',
            'priority': 'medium',
            'title': 'Enhance Monitoring Coverage',
            'description': 'Implement comprehensive monitoring for early issue detection',
            'estimated_impact': 'high',
            'effort_level': 'medium',
            'time_sensitive': False
        })
        
        return recommendations

    def _calculate_overall_health_score(self, metrics: Dict[str, Any], anomalies: List[AnomalyDetection]) -> float:
        """Calculate overall cluster health score (0-100)"""
        base_score = 100
        
        # Deduct points for high resource usage
        if metrics['cpu_usage'] > 80:
            base_score -= 20
        elif metrics['cpu_usage'] > 60:
            base_score -= 10
            
        if metrics['memory_usage'] > 85:
            base_score -= 25
        elif metrics['memory_usage'] > 70:
            base_score -= 15
        
        # Deduct points for performance issues
        if metrics['api_response_time'] > 200:
            base_score -= 15
        elif metrics['api_response_time'] > 150:
            base_score -= 8
        
        # Deduct points for failures
        base_score -= metrics['failed_pods'] * 5
        base_score -= metrics['container_restarts'] * 2
        base_score -= metrics['unhealthy_nodes'] * 10
        
        # Deduct points for anomalies
        for anomaly in anomalies:
            if anomaly.severity == 'critical':
                base_score -= 15
            elif anomaly.severity == 'high':
                base_score -= 10
            elif anomaly.severity == 'medium':
                base_score -= 5
        
        return max(0, min(100, base_score))

# Global instance
predictive_engine = PredictiveAnalyticsEngine()
