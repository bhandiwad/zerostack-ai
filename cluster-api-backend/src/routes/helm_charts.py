from flask import Blueprint, request, jsonify
from src.services.kubernetes_client import KubernetesClient
import subprocess
import yaml
import os
import tempfile
import shutil
from functools import wraps
import logging

logger = logging.getLogger(__name__)

helm_charts_bp = Blueprint('helm_charts', __name__)

# In-memory storage for repositories (replace with database in production)
repositories = {}

def require_kube_connection(f):
    """Decorator to ensure Kubernetes client is connected before running a command."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        k8s_client = KubernetesClient()
        if not k8s_client.is_connected():
            logger.warning(f"Helm operation '{f.__name__}' blocked: Kubernetes client not connected.")
            if request.method == 'GET':
                # For list endpoints, return empty data to prevent UI errors
                if 'repositories' in f.__name__:
                    return jsonify({'repositories': []})
                if 'charts' in f.__name__:
                    return jsonify({'charts': []})
                if 'releases' in f.__name__:
                    return jsonify({'releases': []})
            # For state-changing requests, return a clear error
            return jsonify({
                'error': 'Helm operation failed: Kubernetes client is not connected.',
                'details': 'Please ensure your kubeconfig is set up correctly.'
            }), 503  # Service Unavailable
        return f(*args, **kwargs)
    return decorated_function

def run_helm_command(command, *args):
    """Helper function to run helm commands"""
    try:
        cmd = ['helm'] + list(command) + list(args)
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True
        )
        return {
            'success': True,
            'stdout': result.stdout,
            'stderr': result.stderr
        }
    except subprocess.CalledProcessError as e:
        logger.error(f"Helm command failed: {e.stderr}")
        return {
            'success': False,
            'error': e.stderr,
            'returncode': e.returncode
        }

@helm_charts_bp.route('/api/v1/helm/repositories', methods=['GET'])
@require_kube_connection
def list_repositories():
    """List all Helm repositories"""
    try:
        result = run_helm_command('repo', 'list', '-o', 'yaml')
        if not result['success']:
            return jsonify({
                'error': 'Failed to list repositories',
                'details': result.get('error', 'Unknown error')
            }), 500
        
        repos = yaml.safe_load(result['stdout']) or []
        return jsonify({
            'repositories': repos
        })
    except Exception as e:
        logger.error(f"Error listing repositories: {str(e)}")
        return jsonify({
            'error': f'Failed to list repositories: {str(e)}'
        }), 500

@helm_charts_bp.route('/api/v1/helm/repositories', methods=['POST'])
@require_kube_connection
def add_repository():
    """Add a new Helm repository"""
    data = request.get_json()
    name = data.get('name')
    url = data.get('url')
    
    if not name or not url:
        return jsonify({
            'error': 'Both name and URL are required'
        }), 400
    
    try:
        result = run_helm_command('repo', 'add', name, url)
        if not result['success']:
            return jsonify({
                'error': 'Failed to add repository',
                'details': result.get('error', 'Unknown error')
            }), 500
        
        # Update repository cache
        run_helm_command('repo', 'update')
        
        return jsonify({
            'message': f'Repository {name} added successfully',
            'name': name,
            'url': url
        }), 201
    except Exception as e:
        logger.error(f"Error adding repository: {str(e)}")
        return jsonify({
            'error': f'Failed to add repository: {str(e)}'
        }), 500

@helm_charts_bp.route('/api/v1/helm/repositories/<string:name>', methods=['DELETE'])
@require_kube_connection
def remove_repository(name):
    """Remove a Helm repository"""
    try:
        result = run_helm_command('repo', 'remove', name)
        if not result['success']:
            return jsonify({
                'error': 'Failed to remove repository',
                'details': result.get('error', 'Unknown error')
            }), 500
        
        return jsonify({
            'message': f'Repository {name} removed successfully'
        })
    except Exception as e:
        logger.error(f"Error removing repository: {str(e)}")
        return jsonify({
            'error': f'Failed to remove repository: {str(e)}'
        }), 500

@helm_charts_bp.route('/api/v1/helm/charts', methods=['GET'])
@require_kube_connection
def list_charts():
    """List all available charts in repositories"""
    try:
        result = run_helm_command('search', 'repo', '--output', 'yaml')
        if not result['success']:
            return jsonify({
                'error': 'Failed to list charts',
                'details': result.get('error', 'Unknown error')
            }), 500
        
        charts = yaml.safe_load(result['stdout']) or []
        return jsonify({
            'charts': charts
        })
    except Exception as e:
        logger.error(f"Error listing charts: {str(e)}")
        return jsonify({
            'error': f'Failed to list charts: {str(e)}'
        }), 500

@helm_charts_bp.route('/api/v1/helm/releases', methods=['GET'])
@require_kube_connection
def list_releases():
    """List all installed Helm releases"""
    try:
        namespace = request.args.get('namespace', 'default')
        result = run_helm_command('list', '--namespace', namespace, '--output', 'yaml')
        
        if not result['success']:
            return jsonify({
                'error': 'Failed to list releases',
                'details': result.get('error', 'Unknown error')
            }), 500
        
        releases = yaml.safe_load(result['stdout']) or []
        return jsonify({
            'releases': releases
        })
    except Exception as e:
        logger.error(f"Error listing releases: {str(e)}")
        return jsonify({
            'error': f'Failed to list releases: {str(e)}'
        }), 500

@helm_charts_bp.route('/api/v1/helm/releases', methods=['POST'])
@require_kube_connection
def install_chart():
    """Install a Helm chart"""
    data = request.get_json()
    release_name = data.get('release_name')
    chart_name = data.get('chart_name')
    namespace = data.get('namespace', 'default')
    version = data.get('version')
    values = data.get('values', {})
    
    if not release_name or not chart_name:
        return jsonify({
            'error': 'Both release_name and chart_name are required'
        }), 400
    
    try:
        # Create a temporary values file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as temp_file:
            yaml.dump(values, temp_file)
            temp_file_path = temp_file.name
        
        try:
            # Build the install command
            cmd = [
                'install',
                release_name,
                chart_name,
                '--namespace', namespace,
                '--values', temp_file_path
            ]
            
            if version:
                cmd.extend(['--version', version])
            
            result = run_helm_command(*cmd)
            
            if not result['success']:
                return jsonify({
                    'error': 'Failed to install chart',
                    'details': result.get('error', 'Unknown error')
                }), 500
            
            return jsonify({
                'message': f'Chart {chart_name} installed successfully as {release_name}',
                'release_name': release_name,
                'namespace': namespace
            }), 201
        finally:
            # Clean up the temporary file
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
    except Exception as e:
        logger.error(f"Error installing chart: {str(e)}")
        return jsonify({
            'error': f'Failed to install chart: {str(e)}'
        }), 500

# TODO: Add more endpoints for upgrade, rollback, uninstall, get release status, etc.
