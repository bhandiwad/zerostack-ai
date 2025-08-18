"""
AI-Powered Debugging Routes
REST API endpoints for cluster analysis and intelligent debugging
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from typing import Dict, List, Any

from .cluster_analyzer import cluster_analyzer, ClusterMetrics, IssueSeverity, IssueCategory
from .predictive_analytics import predictive_engine

logger = logging.getLogger(__name__)

debugging_bp = Blueprint('debugging', __name__)

@debugging_bp.route('/debugging/health-check', methods=['POST'])
def analyze_cluster_health():
    """Analyze cluster health and detect issues"""
    try:
        data = request.get_json()
        
        # Parse metrics from request
        metrics = ClusterMetrics(
            cpu_usage=data.get('cpu_usage', 0),
            memory_usage=data.get('memory_usage', 0),
            disk_usage=data.get('disk_usage', 0),
            pod_count=data.get('pod_count', 0),
            node_count=data.get('node_count', 0),
            failed_pods=data.get('failed_pods', 0),
            pending_pods=data.get('pending_pods', 0),
            network_errors=data.get('network_errors', 0),
            timestamp=datetime.now()
        )
        
        logs = data.get('logs', [])
        
        # Run analysis
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        issues = loop.run_until_complete(
            cluster_analyzer.analyze_cluster_health(metrics, logs)
        )
        loop.close()
        
        # Convert issues to JSON-serializable format
        issues_data = []
        for issue in issues:
            issues_data.append({
                'id': issue.id,
                'title': issue.title,
                'description': issue.description,
                'severity': issue.severity.value,
                'category': issue.category.value,
                'affected_resources': issue.affected_resources,
                'recommendations': issue.recommendations,
                'auto_fixable': issue.auto_fixable,
                'detected_at': issue.detected_at.isoformat(),
                'confidence': issue.confidence
            })
        
        return jsonify({
            'success': True,
            'analysis_timestamp': datetime.now().isoformat(),
            'issues_found': len(issues),
            'critical_issues': len([i for i in issues if i.severity == IssueSeverity.CRITICAL]),
            'issues': issues_data,
            'overall_health': _calculate_health_score(issues)
        })
        
    except Exception as e:
        logger.error(f"Health check analysis failed: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@debugging_bp.route('/debugging/fix-recommendations/<issue_id>', methods=['GET'])
def get_fix_recommendations(issue_id):
    """Get detailed fix recommendations for a specific issue"""
    try:
        # This would normally look up the issue from storage
        # For now, return generic recommendations based on issue type
        
        return jsonify({
            'success': True,
            'issue_id': issue_id,
            'recommendations': {
                'auto_fixable': True,
                'fix_steps': [
                    "kubectl get pods -o wide",
                    "kubectl describe nodes",
                    "kubectl top nodes",
                    "kubectl apply -f recommended-fix.yaml"
                ],
                'estimated_time': '5-10 minutes',
                'risk_level': 'low',
                'rollback_steps': [
                    "kubectl rollout undo deployment/<deployment-name>",
                    "kubectl get pods --watch"
                ]
            }
        })
        
    except Exception as e:
        logger.error(f"Failed to get fix recommendations: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@debugging_bp.route('/debugging/predictions', methods=['POST'])
def predict_future_issues():
    """Predict potential future issues based on historical data"""
    try:
        data = request.get_json()
        historical_data = data.get('historical_metrics', [])
        
        # Convert to ClusterMetrics objects
        metrics_list = []
        for metric_data in historical_data:
            metrics = ClusterMetrics(
                cpu_usage=metric_data.get('cpu_usage', 0),
                memory_usage=metric_data.get('memory_usage', 0),
                disk_usage=metric_data.get('disk_usage', 0),
                pod_count=metric_data.get('pod_count', 0),
                node_count=metric_data.get('node_count', 0),
                failed_pods=metric_data.get('failed_pods', 0),
                pending_pods=metric_data.get('pending_pods', 0),
                network_errors=metric_data.get('network_errors', 0),
                timestamp=datetime.fromisoformat(metric_data.get('timestamp', datetime.now().isoformat()))
            )
            metrics_list.append(metrics)
        
        # Run prediction analysis
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        predictions = loop.run_until_complete(
            cluster_analyzer.predict_future_issues(metrics_list)
        )
        loop.close()
        
        return jsonify({
            'success': True,
            'prediction_timestamp': datetime.now().isoformat(),
            'predictions': predictions,
            'confidence_level': 'high' if len(metrics_list) > 10 else 'medium'
        })
        
    except Exception as e:
        logger.error(f"Prediction analysis failed: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@debugging_bp.route('/debugging/ai-config', methods=['POST'])
def configure_ai_models():
    """Configure AI models for advanced analysis"""
    try:
        data = request.get_json()
        openai_key = data.get('openai_key')
        anthropic_key = data.get('anthropic_key')
        
        # Initialize AI models
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        success = loop.run_until_complete(
            cluster_analyzer.initialize_ai_models(openai_key, anthropic_key)
        )
        loop.close()
        
        return jsonify({
            'success': success,
            'message': 'AI models configured successfully' if success else 'Failed to configure AI models',
            'features_enabled': {
                'advanced_pattern_detection': success,
                'predictive_analysis': success,
                'root_cause_analysis': success
            }
        })
        
    except Exception as e:
        logger.error(f"AI configuration failed: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@debugging_bp.route('/debugging/analysis-history', methods=['GET'])
def get_analysis_history():
    """Get historical analysis data"""
    try:
        history = cluster_analyzer.analysis_history[-20:]  # Last 20 analyses
        
        return jsonify({
            'success': True,
            'history': history,
            'total_analyses': len(cluster_analyzer.analysis_history)
        })
        
    except Exception as e:
        logger.error(f"Failed to get analysis history: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@debugging_bp.route('/debugging/simulate-issues', methods=['POST'])
def simulate_cluster_issues():
    """Simulate various cluster issues for testing (development only)"""
    try:
        data = request.get_json()
        issue_type = data.get('type', 'cpu_high')
        
        # Generate simulated metrics based on issue type
        if issue_type == 'cpu_high':
            metrics = ClusterMetrics(
                cpu_usage=95.5,
                memory_usage=45.2,
                disk_usage=30.1,
                pod_count=150,
                node_count=5,
                failed_pods=0,
                pending_pods=2,
                network_errors=0,
                timestamp=datetime.now()
            )
        elif issue_type == 'memory_critical':
            metrics = ClusterMetrics(
                cpu_usage=65.3,
                memory_usage=98.7,
                disk_usage=55.4,
                pod_count=180,
                node_count=5,
                failed_pods=3,
                pending_pods=8,
                network_errors=2,
                timestamp=datetime.now()
            )
        elif issue_type == 'pod_failures':
            metrics = ClusterMetrics(
                cpu_usage=45.2,
                memory_usage=60.1,
                disk_usage=40.3,
                pod_count=120,
                node_count=4,
                failed_pods=12,
                pending_pods=5,
                network_errors=8,
                timestamp=datetime.now()
            )
        else:
            # Healthy cluster
            metrics = ClusterMetrics(
                cpu_usage=25.3,
                memory_usage=35.7,
                disk_usage=20.1,
                pod_count=100,
                node_count=4,
                failed_pods=0,
                pending_pods=0,
                network_errors=0,
                timestamp=datetime.now()
            )
        
        # Simulate logs
        simulated_logs = [
            f"[{datetime.now().isoformat()}] INFO: Cluster analysis requested",
            f"[{datetime.now().isoformat()}] WARN: High resource usage detected",
            f"[{datetime.now().isoformat()}] ERROR: Pod scheduling failed"
        ]
        
        # Run analysis on simulated data
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        issues = loop.run_until_complete(
            cluster_analyzer.analyze_cluster_health(metrics, simulated_logs)
        )
        loop.close()
        
        # Convert to response format
        issues_data = []
        for issue in issues:
            issues_data.append({
                'id': issue.id,
                'title': issue.title,
                'description': issue.description,
                'severity': issue.severity.value,
                'category': issue.category.value,
                'affected_resources': issue.affected_resources,
                'recommendations': issue.recommendations,
                'auto_fixable': issue.auto_fixable,
                'detected_at': issue.detected_at.isoformat(),
                'confidence': issue.confidence
            })
        
        return jsonify({
            'success': True,
            'simulation_type': issue_type,
            'simulated_metrics': {
                'cpu_usage': metrics.cpu_usage,
                'memory_usage': metrics.memory_usage,
                'disk_usage': metrics.disk_usage,
                'failed_pods': metrics.failed_pods,
                'pending_pods': metrics.pending_pods
            },
            'issues_detected': len(issues),
            'issues': issues_data,
            'overall_health': _calculate_health_score(issues)
        })
        
    except Exception as e:
        logger.error(f"Issue simulation failed: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

def _calculate_health_score(issues):
    """Calculate overall cluster health score based on detected issues"""
    if not issues:
        return {'score': 100, 'status': 'excellent'}
    
    # Weight issues by severity
    severity_weights = {
        IssueSeverity.CRITICAL: 30,
        IssueSeverity.HIGH: 20,
        IssueSeverity.MEDIUM: 10,
        IssueSeverity.LOW: 5,
        IssueSeverity.INFO: 1
    }
    
    total_penalty = 0
    for issue in issues:
        total_penalty += severity_weights.get(issue.severity, 5)
    
    score = max(0, 100 - total_penalty)
    
    if score >= 90:
        status = 'excellent'
    elif score >= 75:
        status = 'good'
    elif score >= 50:
        status = 'fair'
    elif score >= 25:
        status = 'poor'
    else:
        status = 'critical'
    
    return {'score': score, 'status': status}

@debugging_bp.route('/debugging/predictive-analysis', methods=['GET'])
def get_predictive_analysis():
    """Get predictive analytics and anomaly detection for cluster health"""
    try:
        cluster_id = request.args.get('cluster_id', 'default')
        
        # Run predictive analysis
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        analysis = loop.run_until_complete(
            predictive_engine.analyze_cluster_health(cluster_id)
        )
        loop.close()
        
        return jsonify({
            'success': True,
            'analysis': analysis
        })
        
    except Exception as e:
        logger.error(f"Predictive analysis failed: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@debugging_bp.route('/debugging/anomaly-detection', methods=['POST'])
def detect_anomalies():
    """Detect anomalies in real-time cluster metrics"""
    try:
        data = request.get_json()
        metrics = data.get('metrics', {})
        
        # Run anomaly detection
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        async def run_anomaly_detection():
            current_metrics = await predictive_engine._collect_cluster_metrics('default')
            anomalies = await predictive_engine._detect_anomalies(current_metrics)
            return current_metrics, anomalies
        
        current_metrics, anomalies = loop.run_until_complete(run_anomaly_detection())
        loop.close()
        
        # Import asdict for dataclass serialization
        from dataclasses import asdict
        
        return jsonify({
            'success': True,
            'detection_timestamp': datetime.now().isoformat(),
            'anomalies_found': len(anomalies),
            'anomalies': [asdict(anomaly) for anomaly in anomalies],
            'metrics_analyzed': current_metrics
        })
        
    except Exception as e:
        logger.error(f"Anomaly detection failed: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@debugging_bp.route('/debugging/intelligent-alerts', methods=['GET'])
def get_intelligent_alerts():
    """Get intelligent alerts with smart filtering and prioritization"""
    try:
        # Simulate intelligent alert system
        alerts = [
            {
                'id': f'alert_{datetime.now().timestamp()}',
                'title': 'CPU Threshold Exceeded',
                'description': 'Cluster CPU usage has exceeded 85% for more than 5 minutes',
                'severity': 'high',
                'priority': 1,
                'category': 'resource_exhaustion',
                'affected_resources': ['worker-node-1', 'worker-node-2'],
                'smart_filter_reason': 'Filtered out similar alerts in the last hour',
                'escalation_level': 1,
                'time_to_escalate': '15 minutes',
                'recommended_actions': [
                    'Scale out worker nodes',
                    'Review high-CPU workloads',
                    'Implement CPU limits'
                ],
                'correlation_id': 'cpu_cluster_001',
                'created_at': datetime.now().isoformat(),
                'last_updated': datetime.now().isoformat()
            },
            {
                'id': f'alert_{datetime.now().timestamp() + 1}',
                'title': 'Predictive Memory Pressure',
                'description': 'AI predicts memory exhaustion within 2 hours based on current trends',
                'severity': 'medium',
                'priority': 2,
                'category': 'predictive',
                'affected_resources': ['memory-intensive-pods'],
                'smart_filter_reason': 'Proactive alert based on trend analysis',
                'escalation_level': 0,
                'time_to_escalate': '1 hour',
                'recommended_actions': [
                    'Monitor memory usage closely',
                    'Prepare for memory scaling',
                    'Review memory-intensive applications'
                ],
                'correlation_id': 'memory_prediction_001',
                'created_at': datetime.now().isoformat(),
                'last_updated': datetime.now().isoformat()
            }
        ]
        
        return jsonify({
            'success': True,
            'alerts': alerts,
            'total_alerts': len(alerts),
            'high_priority_count': len([a for a in alerts if a['priority'] <= 2]),
            'smart_filtering_enabled': True,
            'correlation_groups': 2
        })
        
    except Exception as e:
        logger.error(f"Intelligent alerts failed: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
