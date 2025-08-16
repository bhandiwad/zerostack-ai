from flask import Blueprint, request, jsonify
from typing import Dict, Any, List, Optional
import logging
from datetime import datetime, timedelta
import random
from src.features.agents.capabilities import list_capabilities, get_capability_instance

logger = logging.getLogger(__name__)

management_bp = Blueprint('agent_management', __name__)

# Mock data for demo (in production, this would come from a real monitoring system)
def generate_mock_agents():
    """Generate mock agent data for demonstration"""
    capabilities_map = list_capabilities()
    
    agents = []
    agent_types = [
        ('support_l1', 'L1 Support Agent', ['support_l1']),
        ('support_l2', 'L2 Support Agent', ['support_l2']),
        ('support_l3', 'L3 Support Agent', ['support_l3']),
        ('cluster_management', 'Cluster Management Agent', ['cluster_management']),
        ('monitoring', 'Monitoring Agent', ['monitoring']),
        ('security_scanning', 'Security Agent', ['security_scanning']),
        ('auto_scaling', 'Auto-Scaling Agent', ['auto_scaling']),
        ('agent_training', 'Training Agent', ['agent_training'])
    ]
    
    for agent_id, name, caps in agent_types:
        status_options = ['active', 'inactive', 'error', 'maintenance']
        status = random.choice(status_options) if random.random() > 0.8 else 'active'
        
        agent = {
            'id': agent_id,
            'name': name,
            'type': agent_id.replace('_', ' ').title(),
            'status': status,
            'capabilities': caps,
            'last_activity': (datetime.utcnow() - timedelta(minutes=random.randint(1, 60))).isoformat(),
            'health_score': random.randint(75, 100) if status == 'active' else random.randint(20, 70),
            'tasks_completed': random.randint(50, 500),
            'tasks_failed': random.randint(0, 20),
            'uptime': f"{random.randint(1, 30)}d {random.randint(0, 23)}h {random.randint(0, 59)}m",
            'version': f"1.{random.randint(0, 5)}.{random.randint(0, 10)}"
        }
        agents.append(agent)
    
    return agents

def generate_mock_activities():
    """Generate mock activity data"""
    activities = []
    agent_ids = ['support_l1', 'support_l2', 'support_l3', 'cluster_management', 'monitoring', 'security_scanning']
    actions = [
        'handle_ticket', 'escalate_issue', 'run_diagnostics', 'scale_deployment', 
        'monitor_cluster', 'scan_security', 'analyze_logs', 'generate_report'
    ]
    
    for i in range(50):
        activity = {
            'id': f"activity_{i}",
            'agent_id': random.choice(agent_ids),
            'action': random.choice(actions),
            'status': random.choice(['success', 'failed', 'in_progress']),
            'timestamp': (datetime.utcnow() - timedelta(minutes=random.randint(1, 1440))).isoformat(),
            'duration': random.randint(1, 300) if random.random() > 0.3 else None,
            'details': f"Processed request with {random.choice(['high', 'medium', 'low'])} priority",
            'error_message': "Connection timeout" if random.random() > 0.9 else None
        }
        activities.append(activity)
    
    return sorted(activities, key=lambda x: x['timestamp'], reverse=True)

def generate_mock_metrics():
    """Generate mock metrics data"""
    agent_ids = ['support_l1', 'support_l2', 'support_l3', 'cluster_management', 'monitoring', 'security_scanning']
    metrics = {}
    
    for agent_id in agent_ids:
        metrics[agent_id] = {
            'agent_id': agent_id,
            'cpu_usage': random.randint(10, 80),
            'memory_usage': random.randint(20, 70),
            'response_time': random.randint(50, 500),
            'success_rate': random.randint(85, 99),
            'active_tasks': random.randint(0, 10)
        }
    
    return metrics

@management_bp.route('/', methods=['GET'])
def get_agents():
    """Get all agents with their status and metrics"""
    try:
        agents = generate_mock_agents()
        
        return jsonify({
            'success': True,
            'agents': agents,
            'count': len(agents)
        })
        
    except Exception as e:
        logger.error(f"Error getting agents: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@management_bp.route('/<agent_id>', methods=['GET'])
def get_agent(agent_id: str):
    """Get specific agent details"""
    try:
        agents = generate_mock_agents()
        agent = next((a for a in agents if a['id'] == agent_id), None)
        
        if not agent:
            return jsonify({
                'success': False,
                'error': 'Agent not found'
            }), 404
        
        return jsonify({
            'success': True,
            'agent': agent
        })
        
    except Exception as e:
        logger.error(f"Error getting agent {agent_id}: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@management_bp.route('/activities', methods=['GET'])
def get_activities():
    """Get agent activities"""
    try:
        limit = request.args.get('limit', 50, type=int)
        agent_id = request.args.get('agent_id')
        
        activities = generate_mock_activities()
        
        if agent_id:
            activities = [a for a in activities if a['agent_id'] == agent_id]
        
        activities = activities[:limit]
        
        return jsonify({
            'success': True,
            'activities': activities,
            'count': len(activities)
        })
        
    except Exception as e:
        logger.error(f"Error getting activities: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@management_bp.route('/metrics', methods=['GET'])
def get_metrics():
    """Get agent performance metrics"""
    try:
        metrics = generate_mock_metrics()
        
        return jsonify({
            'success': True,
            'metrics': metrics
        })
        
    except Exception as e:
        logger.error(f"Error getting metrics: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@management_bp.route('/<agent_id>/start', methods=['POST'])
def start_agent(agent_id: str):
    """Start an agent"""
    try:
        # In a real implementation, this would actually start the agent
        logger.info(f"Starting agent: {agent_id}")
        
        # Simulate starting the agent
        capability = get_capability_instance(agent_id, f"{agent_id}_instance")
        if capability:
            try:
                # In production, this would initialize the capability
                logger.info(f"Agent {agent_id} initialized successfully")
            except Exception as e:
                logger.error(f"Error initializing agent {agent_id}: {str(e)}")
                return jsonify({
                    'success': False,
                    'error': f'Failed to initialize agent: {str(e)}'
                }), 500
        
        return jsonify({
            'success': True,
            'message': f'Agent {agent_id} started successfully'
        })
        
    except Exception as e:
        logger.error(f"Error starting agent {agent_id}: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@management_bp.route('/<agent_id>/stop', methods=['POST'])
def stop_agent(agent_id: str):
    """Stop an agent"""
    try:
        # In a real implementation, this would actually stop the agent
        logger.info(f"Stopping agent: {agent_id}")
        
        # Simulate stopping the agent
        capability = get_capability_instance(agent_id, f"{agent_id}_instance")
        if capability:
            try:
                # In production, this would cleanup the capability
                logger.info(f"Agent {agent_id} stopped successfully")
            except Exception as e:
                logger.error(f"Error stopping agent {agent_id}: {str(e)}")
        
        return jsonify({
            'success': True,
            'message': f'Agent {agent_id} stopped successfully'
        })
        
    except Exception as e:
        logger.error(f"Error stopping agent {agent_id}: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@management_bp.route('/<agent_id>/restart', methods=['POST'])
def restart_agent(agent_id: str):
    """Restart an agent"""
    try:
        # In a real implementation, this would actually restart the agent
        logger.info(f"Restarting agent: {agent_id}")
        
        # Simulate restarting the agent
        capability = get_capability_instance(agent_id, f"{agent_id}_instance")
        if capability:
            try:
                # In production, this would cleanup and reinitialize the capability
                logger.info(f"Agent {agent_id} restarted successfully")
            except Exception as e:
                logger.error(f"Error restarting agent {agent_id}: {str(e)}")
                return jsonify({
                    'success': False,
                    'error': f'Failed to restart agent: {str(e)}'
                }), 500
        
        return jsonify({
            'success': True,
            'message': f'Agent {agent_id} restarted successfully'
        })
        
    except Exception as e:
        logger.error(f"Error restarting agent {agent_id}: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@management_bp.route('/<agent_id>/health', methods=['GET'])
def get_agent_health(agent_id: str):
    """Get agent health status"""
    try:
        # In a real implementation, this would check actual agent health
        agents = generate_mock_agents()
        agent = next((a for a in agents if a['id'] == agent_id), None)
        
        if not agent:
            return jsonify({
                'success': False,
                'error': 'Agent not found'
            }), 404
        
        health_data = {
            'agent_id': agent_id,
            'status': agent['status'],
            'health_score': agent['health_score'],
            'last_heartbeat': datetime.utcnow().isoformat(),
            'uptime': agent['uptime'],
            'memory_usage': random.randint(20, 70),
            'cpu_usage': random.randint(10, 80),
            'active_connections': random.randint(0, 50),
            'error_rate': random.randint(0, 5)
        }
        
        return jsonify({
            'success': True,
            'health': health_data
        })
        
    except Exception as e:
        logger.error(f"Error getting agent health {agent_id}: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@management_bp.route('/capabilities', methods=['GET'])
def get_available_capabilities():
    """Get all available agent capabilities"""
    try:
        capabilities = list_capabilities()
        
        return jsonify({
            'success': True,
            'capabilities': capabilities
        })
        
    except Exception as e:
        logger.error(f"Error getting capabilities: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@management_bp.route('/stats', methods=['GET'])
def get_agent_stats():
    """Get overall agent statistics"""
    try:
        agents = generate_mock_agents()
        activities = generate_mock_activities()
        
        # Calculate stats
        total_agents = len(agents)
        active_agents = len([a for a in agents if a['status'] == 'active'])
        inactive_agents = len([a for a in agents if a['status'] == 'inactive'])
        error_agents = len([a for a in agents if a['status'] == 'error'])
        
        total_tasks = sum(a['tasks_completed'] for a in agents)
        total_failures = sum(a['tasks_failed'] for a in agents)
        success_rate = (total_tasks / (total_tasks + total_failures)) * 100 if (total_tasks + total_failures) > 0 else 0
        
        recent_activities = len([a for a in activities if 
                               datetime.fromisoformat(a['timestamp']) > datetime.utcnow() - timedelta(hours=24)])
        
        stats = {
            'total_agents': total_agents,
            'active_agents': active_agents,
            'inactive_agents': inactive_agents,
            'error_agents': error_agents,
            'total_tasks_completed': total_tasks,
            'total_tasks_failed': total_failures,
            'overall_success_rate': round(success_rate, 2),
            'activities_last_24h': recent_activities,
            'average_health_score': round(sum(a['health_score'] for a in agents) / len(agents), 1) if agents else 0
        }
        
        return jsonify({
            'success': True,
            'stats': stats
        })
        
    except Exception as e:
        logger.error(f"Error getting agent stats: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
