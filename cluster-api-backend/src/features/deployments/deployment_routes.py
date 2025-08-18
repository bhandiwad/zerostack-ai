from flask import Blueprint, request, jsonify
import uuid
import time
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

deployment_bp = Blueprint('deployments', __name__)

# In-memory storage for demo purposes
deployments = {}

@deployment_bp.route('/deployments', methods=['POST'])
def create_deployment():
    """Create a new cluster deployment"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['template_id', 'cluster_name']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400
        
        # Generate deployment ID
        deployment_id = str(uuid.uuid4())
        
        # Create deployment record
        deployment = {
            'id': deployment_id,
            'cluster_name': data['cluster_name'],
            'template_id': data['template_id'],
            'template_name': data.get('template_name', 'Unknown Template'),
            'status': 'initializing',
            'progress': 0,
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat(),
            'region': data.get('region', 'us-east-1'),
            'estimated_cost': data.get('estimated_cost', '$0'),
            'resources': data.get('resources', {}),
            'logs': [
                {
                    'timestamp': datetime.utcnow().isoformat(),
                    'level': 'info',
                    'message': 'Deployment initiated'
                }
            ]
        }
        
        deployments[deployment_id] = deployment
        
        logger.info(f"Created deployment {deployment_id} for template {data['template_id']}")
        
        return jsonify({
            'success': True,
            'deployment': deployment
        }), 201
        
    except Exception as e:
        logger.error(f"Error creating deployment: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@deployment_bp.route('/deployments/<deployment_id>', methods=['GET'])
def get_deployment(deployment_id):
    """Get deployment status and details"""
    try:
        if deployment_id not in deployments:
            return jsonify({
                'success': False,
                'error': 'Deployment not found'
            }), 404
        
        deployment = deployments[deployment_id]
        
        # Simulate deployment progress
        if deployment['status'] in ['initializing', 'deploying']:
            simulate_deployment_progress(deployment)
        
        return jsonify({
            'success': True,
            'deployment': deployment
        })
        
    except Exception as e:
        logger.error(f"Error getting deployment {deployment_id}: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@deployment_bp.route('/deployments/<deployment_id>/logs', methods=['GET'])
def get_deployment_logs(deployment_id):
    """Get deployment logs"""
    try:
        if deployment_id not in deployments:
            return jsonify({
                'success': False,
                'error': 'Deployment not found'
            }), 404
        
        deployment = deployments[deployment_id]
        
        return jsonify({
            'success': True,
            'logs': deployment['logs']
        })
        
    except Exception as e:
        logger.error(f"Error getting logs for deployment {deployment_id}: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@deployment_bp.route('/deployments', methods=['GET'])
def list_deployments():
    """List all deployments"""
    try:
        deployment_list = list(deployments.values())
        
        return jsonify({
            'success': True,
            'deployments': deployment_list,
            'count': len(deployment_list)
        })
        
    except Exception as e:
        logger.error(f"Error listing deployments: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

def simulate_deployment_progress(deployment):
    """Simulate realistic deployment progress"""
    created_time = datetime.fromisoformat(deployment['created_at'])
    elapsed_seconds = (datetime.utcnow() - created_time).total_seconds()
    
    # Deployment stages with timing
    stages = [
        {'name': 'Validating configuration', 'duration': 10, 'progress': 10},
        {'name': 'Provisioning infrastructure', 'duration': 30, 'progress': 25},
        {'name': 'Setting up networking', 'duration': 20, 'progress': 40},
        {'name': 'Installing Kubernetes', 'duration': 60, 'progress': 60},
        {'name': 'Configuring security', 'duration': 25, 'progress': 75},
        {'name': 'Installing add-ons', 'duration': 30, 'progress': 85},
        {'name': 'Running health checks', 'duration': 15, 'progress': 95},
        {'name': 'Deployment complete', 'duration': 5, 'progress': 100}
    ]
    
    current_time = 0
    current_stage = None
    
    for stage in stages:
        if elapsed_seconds <= current_time + stage['duration']:
            current_stage = stage
            break
        current_time += stage['duration']
    
    if current_stage:
        # Update deployment status
        if current_stage['progress'] < 100:
            deployment['status'] = 'deploying'
            deployment['progress'] = current_stage['progress']
            
            # Add log entry if not already added
            stage_log_exists = any(
                log['message'] == current_stage['name'] 
                for log in deployment['logs']
            )
            
            if not stage_log_exists:
                deployment['logs'].append({
                    'timestamp': datetime.utcnow().isoformat(),
                    'level': 'info',
                    'message': current_stage['name']
                })
        else:
            deployment['status'] = 'completed'
            deployment['progress'] = 100
            deployment['cluster_endpoint'] = f"https://{deployment['cluster_name']}-{deployment['id'][:8]}.k8s.zerostack.ai"
            
            # Add completion log
            completion_log_exists = any(
                log['message'] == 'Cluster deployed successfully' 
                for log in deployment['logs']
            )
            
            if not completion_log_exists:
                deployment['logs'].append({
                    'timestamp': datetime.utcnow().isoformat(),
                    'level': 'success',
                    'message': 'Cluster deployed successfully'
                })
    
    deployment['updated_at'] = datetime.utcnow().isoformat()
