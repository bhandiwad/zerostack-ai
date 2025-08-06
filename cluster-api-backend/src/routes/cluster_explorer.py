from flask import Blueprint, request, jsonify, abort
from kubernetes.client import ApiClient
from kubernetes.client.api import core_v1_api
from kubernetes.client.exceptions import ApiException
from src.services.kubernetes_client import KubernetesClient
from functools import wraps
import logging

logger = logging.getLogger(__name__)

cluster_explorer_bp = Blueprint('cluster_explorer', __name__)
k8s_client = None  # Initialize as None, will be instantiated on demand

def get_k8s_client():
    """Get a singleton instance of the KubernetesClient, creating it if necessary."""
    global k8s_client
    if k8s_client is None:
        k8s_client = KubernetesClient()
    return k8s_client

def get_api_client(cluster_id):
    """Get API client for the specified cluster"""
    try:
        client_instance = get_k8s_client()
        if not client_instance.is_connected():
            abort(503, description="Kubernetes cluster not configured or accessible.")
        # TODO: Implement cluster context switching based on cluster_id
        # For now, using default context
        return client_instance.get_core_v1_api()
    except Exception as e:
        logger.error(f"Error getting API client for cluster {cluster_id}: {str(e)}")
        raise

def handle_k8s_errors(f):
    """Decorator to handle Kubernetes API errors"""
    @wraps(f)
    def wrapper(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except ApiException as e:
            logger.error(f"Kubernetes API error: {str(e)}")
            return jsonify({
                'error': f"Kubernetes API error: {e.reason}",
                'status': e.status,
                'body': e.body
            }), e.status
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            return jsonify({
                'error': f"Unexpected error: {str(e)}",
                'status': 500
            }), 500
    return wrapper

@cluster_explorer_bp.route('/api/v1/clusters/<string:cluster_id>/resources', methods=['GET'])
@handle_k8s_errors
def list_resources(cluster_id):
    """
    List resources in a cluster
    Query Params:
        namespace: Filter by namespace (default: all namespaces)
        resource_type: The type of resource to list (e.g., 'pods', 'deployments')
        label_selector: Label selector string
        field_selector: Field selector string
    """
    client_instance = get_k8s_client()
    if not client_instance.is_connected():
        # Return a 200 OK with an empty list and a message for the UI to handle gracefully.
        return jsonify({'kind': f'{request.args.get("resource_type", "unknown").capitalize()}List', 'items': [], 'error': 'Kubernetes cluster not configured or accessible.'})

    api = get_api_client(cluster_id)
    namespace = request.args.get('namespace', 'default')
    resource_type = request.args.get('resource_type', 'pods')
    label_selector = request.args.get('label_selector', '')
    field_selector = request.args.get('field_selector', '')

    # Map resource types to their corresponding API methods
    resource_map = {
        'pods': api.list_namespaced_pod if namespace != '_all' else api.list_pod_for_all_namespaces,
        'services': api.list_namespaced_service if namespace != '_all' else api.list_service_for_all_namespaces,
        'configmaps': api.list_namespaced_config_map if namespace != '_all' else api.list_config_map_for_all_namespaces,
        'secrets': api.list_namespaced_secret if namespace != '_all' else api.list_secret_for_all_namespaces,
        'namespaces': api.list_namespace,
        'nodes': api.list_node,
    }

    if resource_type not in resource_map:
        return jsonify({
            'error': f'Unsupported resource type: {resource_type}'
        }), 400

    # Call the appropriate API method
    list_fn = resource_map[resource_type]
    kwargs = {}
    if namespace != '_all' and resource_type not in ['namespaces', 'nodes']:
        kwargs['namespace'] = namespace
    if label_selector:
        kwargs['label_selector'] = label_selector
    if field_selector:
        kwargs['field_selector'] = field_selector

    try:
        response = list_fn(**kwargs)
        return jsonify({
            'kind': f"{resource_type.capitalize()}List",
            'items': [item.to_dict() for item in response.items]
        })
    except Exception as e:
        logger.error(f"Error listing {resource_type}: {str(e)}")
        raise

@cluster_explorer_bp.route('/api/v1/clusters/<string:cluster_id>/resources/<string:resource_type>/<string:name>', methods=['GET'])
@handle_k8s_errors
def get_resource(cluster_id, resource_type, name):
    """Get a specific resource"""
    client_instance = get_k8s_client()
    if not client_instance.is_connected():
        return jsonify({'error': 'Kubernetes cluster not configured or accessible.'}), 503
    api = get_api_client(cluster_id)
    namespace = request.args.get('namespace', 'default')
    
    resource_map = {
        'pods': ('read_namespaced_pod', 'read_pod_status', 'read_pod_log'),
        'services': ('read_namespaced_service', None, None),
        'configmaps': ('read_namespaced_config_map', None, None),
        'secrets': ('read_namespaced_secret', None, None),
    }
    
    if resource_type not in resource_map:
        return jsonify({
            'error': f'Unsupported resource type: {resource_type}'
        }), 400
    
    read_fn_name, status_fn_name, logs_fn_name = resource_map[resource_type]
    
    try:
        # Get the resource
        read_fn = getattr(api, read_fn_name)
        resource = read_fn(name=name, namespace=namespace if namespace != '_all' else 'default')
        
        result = resource.to_dict()
        
        # Get additional status if available
        if status_fn_name:
            status_fn = getattr(api, status_fn_name)
            status = status_fn(name=name, namespace=namespace if namespace != '_all' else 'default')
            result['status'] = status.to_dict()
        
        # Get logs for pods if requested
        if resource_type == 'pods' and request.args.get('logs') == 'true':
            logs_fn = getattr(api, logs_fn_name)
            logs = logs_fn(name=name, namespace=namespace if namespace != '_all' else 'default')
            result['logs'] = logs
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error getting {resource_type}/{name}: {str(e)}")
        raise

# TODO: Add more endpoints for resource operations (create, update, delete, watch, etc.)
