"""
Advanced Cluster Routes
Provides API endpoints for advanced cluster operations including node management, version updates, and OPA policies
"""

from flask import Blueprint, request, jsonify, g
from src.services.advanced_cluster_operations import AdvancedClusterOperations
from src.services.auth_service import require_auth, require_organization_access, require_role, log_audit_action
import logging

logger = logging.getLogger(__name__)

advanced_cluster_bp = Blueprint('advanced_cluster', __name__)

# Initialize advanced cluster operations service
advanced_ops = AdvancedClusterOperations()

@advanced_cluster_bp.route('/clusters/<cluster_id>/nodes/drain', methods=['POST'])
@require_auth
@require_organization_access
@require_role(['super_admin', 'org_admin', 'cluster_admin'])
def drain_node(cluster_id, current_organization_id, current_user_id, current_user_role):
    """
    Drain a specific node in the cluster
    
    Body:
    {
        "node_name": "worker-1",
        "grace_period_seconds": 300,
        "ignore_daemonsets": true,
        "delete_emptydir_data": false,
        "force": false,
        "timeout_seconds": 600
    }
    """
    try:
        data = request.get_json()
        
        
        # Validate required fields
        if 'node_name' not in data:
            return jsonify({
                'success': False,
                'error': 'node_name is required'
            }), 400
        
        node_name = data['node_name']
        
        # Prepare drain configuration
        drain_config = {
            'grace_period_seconds': data.get('grace_period_seconds', 300),
            'ignore_daemonsets': data.get('ignore_daemonsets', True),
            'delete_emptydir_data': data.get('delete_emptydir_data', False),
            'force': data.get('force', False),
            'timeout_seconds': data.get('timeout_seconds', 600)
        }
        
        logger.info(f"User {current_user_id} initiating node drain for {node_name} in cluster {cluster_id}")
        
        # Execute drain operation
        result = advanced_ops.drain_node(cluster_id, node_name, drain_config)
        
        # Log the action
        log_audit_action(
            user_id=current_user_id,
            organization_id=current_organization_id,
            action='drain_node',
            resource_type='cluster_node',
            resource_id=f"{cluster_id}/{node_name}",
            details={
                'cluster_id': cluster_id,
                'node_name': node_name,
                'drain_config': drain_config,
                'success': result['success']
            }
        )
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 500
            
    except Exception as e:
        logger.error(f"Error draining node: {e}")
        return jsonify({
            'success': False,
            'error': f'Node drain operation failed: {str(e)}'
        }), 500

@advanced_cluster_bp.route('/clusters/<cluster_id>/nodes/uncordon', methods=['POST'])
@require_auth
@require_organization_access
@require_role(['super_admin', 'org_admin', 'cluster_admin'])
def uncordon_node(cluster_id, current_organization_id, current_user_id, current_user_role):
    """
    Uncordon a node (mark as schedulable)
    
    Body:
    {
        "node_name": "worker-1"
    }
    """
    try:
        data = request.get_json()
        
        
        # Validate required fields
        if 'node_name' not in data:
            return jsonify({
                'success': False,
                'error': 'node_name is required'
            }), 400
        
        node_name = data['node_name']
        
        logger.info(f"User {current_user_id} uncordoning node {node_name} in cluster {cluster_id}")
        
        # Execute uncordon operation
        result = advanced_ops.uncordon_node(cluster_id, node_name)
        
        # Log the action
        log_audit_action(
            user_id=current_user_id,
            organization_id=current_organization_id,
            action='uncordon_node',
            resource_type='cluster_node',
            resource_id=f"{cluster_id}/{node_name}",
            details={
                'cluster_id': cluster_id,
                'node_name': node_name,
                'success': result['success']
            }
        )
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 500
            
    except Exception as e:
        logger.error(f"Error uncordoning node: {e}")
        return jsonify({
            'success': False,
            'error': f'Node uncordon operation failed: {str(e)}'
        }), 500

@advanced_cluster_bp.route('/clusters/<cluster_id>/nodes/update-version', methods=['POST'])
@require_auth
@require_organization_access
@require_role(['super_admin', 'org_admin', 'cluster_admin'])
def update_node_version(cluster_id, current_organization_id, current_user_id, current_user_role):
    """
    Update Kubernetes version on a specific worker node
    
    Body:
    {
        "node_name": "worker-1",
        "kubernetes_version": "1.29.0",
        "drain_grace_period": 300,
        "delete_emptydir_data": false,
        "drain_timeout": 600
    }
    """
    try:
        data = request.get_json()
        
        
        # Validate required fields
        required_fields = ['node_name', 'kubernetes_version']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400
        
        node_name = data['node_name']
        target_version = data['kubernetes_version']
        
        # Prepare version update configuration
        version_config = {
            'kubernetes_version': target_version,
            'drain_grace_period': data.get('drain_grace_period', 300),
            'delete_emptydir_data': data.get('delete_emptydir_data', False),
            'drain_timeout': data.get('drain_timeout', 600)
        }
        
        logger.info(f"User {current_user_id} updating node {node_name} to version {target_version} in cluster {cluster_id}")
        
        # Execute version update operation
        result = advanced_ops.update_node_version(cluster_id, node_name, version_config)
        
        # Log the action
        log_audit_action(
            user_id=current_user_id,
            organization_id=current_organization_id,
            action='update_node_version',
            resource_type='cluster_node',
            resource_id=f"{cluster_id}/{node_name}",
            details={
                'cluster_id': cluster_id,
                'node_name': node_name,
                'target_version': target_version,
                'success': result['success']
            }
        )
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 500
            
    except Exception as e:
        logger.error(f"Error updating node version: {e}")
        return jsonify({
            'success': False,
            'error': f'Node version update failed: {str(e)}'
        }), 500

@advanced_cluster_bp.route('/clusters/<cluster_id>/master/update-version', methods=['POST'])
@require_auth
@require_organization_access
@require_role(['super_admin', 'org_admin', 'cluster_admin'])
def update_master_version(cluster_id, current_organization_id, current_user_id, current_user_role):
    """
    Update Kubernetes version on master/control plane nodes
    
    Body:
    {
        "kubernetes_version": "1.29.0",
        "strategy": "rolling",
        "continue_on_failure": false,
        "inter_node_wait_seconds": 60
    }
    """
    try:
        data = request.get_json()
        
        
        # Validate required fields
        if 'kubernetes_version' not in data:
            return jsonify({
                'success': False,
                'error': 'kubernetes_version is required'
            }), 400
        
        target_version = data['kubernetes_version']
        
        # Prepare version update configuration
        version_config = {
            'kubernetes_version': target_version,
            'strategy': data.get('strategy', 'rolling'),
            'continue_on_failure': data.get('continue_on_failure', False),
            'inter_node_wait_seconds': data.get('inter_node_wait_seconds', 60)
        }
        
        logger.info(f"User {current_user_id} updating master nodes to version {target_version} in cluster {cluster_id}")
        
        # Execute master version update operation
        result = advanced_ops.update_master_version(cluster_id, version_config)
        
        # Log the action
        log_audit_action(
            user_id=current_user_id,
            organization_id=current_organization_id,
            action='update_master_version',
            resource_type='cluster',
            resource_id=cluster_id,
            details={
                'cluster_id': cluster_id,
                'target_version': target_version,
                'strategy': version_config['strategy'],
                'success': result['success']
            }
        )
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 500
            
    except Exception as e:
        logger.error(f"Error updating master version: {e}")
        return jsonify({
            'success': False,
            'error': f'Master version update failed: {str(e)}'
        }), 500

@advanced_cluster_bp.route('/clusters/<cluster_id>/opa-policies', methods=['GET'])
@require_auth
@require_organization_access
def list_opa_policies(cluster_id, current_organization_id, current_user_id, current_user_role):
    """List all OPA policies in the cluster"""
    try:
        
        
        logger.info(f"User {current_user_id} listing OPA policies for cluster {cluster_id}")
        
        # Get OPA policies
        policy_config = {'operation': 'list'}
        result = advanced_ops.manage_opa_policies(cluster_id, policy_config)
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 500
            
    except Exception as e:
        logger.error(f"Error listing OPA policies: {e}")
        return jsonify({
            'success': False,
            'error': f'Failed to list OPA policies: {str(e)}'
        }), 500

@advanced_cluster_bp.route('/clusters/<cluster_id>/opa-policies', methods=['POST'])
@require_auth
@require_organization_access
@require_role(['super_admin', 'org_admin', 'cluster_admin'])
def manage_opa_policies(cluster_id, current_organization_id, current_user_id, current_user_role):
    """
    Manage OPA policies (apply, update, delete)
    
    Body:
    {
        "operation": "apply",
        "policies": [
            {
                "name": "require-labels",
                "kind": "ConstraintTemplate",
                "spec": {...},
                "description": "Require specific labels on resources"
            }
        ]
    }
    
    OR for delete operation:
    {
        "operation": "delete",
        "policy_names": ["require-labels", "disallow-privileged"]
    }
    """
    try:
        data = request.get_json()
        
        
        # Validate required fields
        operation = data.get('operation')
        if operation not in ['apply', 'update', 'delete']:
            return jsonify({
                'success': False,
                'error': 'operation must be one of: apply, update, delete'
            }), 400
        
        if operation in ['apply', 'update'] and 'policies' not in data:
            return jsonify({
                'success': False,
                'error': 'policies array is required for apply/update operations'
            }), 400
        
        if operation == 'delete' and 'policy_names' not in data:
            return jsonify({
                'success': False,
                'error': 'policy_names array is required for delete operation'
            }), 400
        
        logger.info(f"User {current_user_id} managing OPA policies ({operation}) for cluster {cluster_id}")
        
        # Execute OPA policy management
        result = advanced_ops.manage_opa_policies(cluster_id, data)
        
        # Log the action
        log_audit_action(
            user_id=current_user_id,
            organization_id=current_organization_id,
            action=f'opa_policies_{operation}',
            resource_type='cluster',
            resource_id=cluster_id,
            details={
                'cluster_id': cluster_id,
                'operation': operation,
                'policy_count': len(data.get('policies', [])) if operation != 'delete' else len(data.get('policy_names', [])),
                'success': result['success']
            }
        )
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 500
            
    except Exception as e:
        logger.error(f"Error managing OPA policies: {e}")
        return jsonify({
            'success': False,
            'error': f'OPA policy management failed: {str(e)}'
        }), 500

@advanced_cluster_bp.route('/clusters/<cluster_id>/nodes', methods=['GET'])
@require_auth
@require_organization_access
def get_cluster_nodes(cluster_id, current_organization_id, current_user_id, current_user_role):
    """Get detailed status of all nodes in the cluster"""
    try:
        
        
        logger.info(f"User {current_user_id} getting node status for cluster {cluster_id}")
        
        # Get node status
        result = advanced_ops.get_node_status(cluster_id)
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 500
            
    except Exception as e:
        logger.error(f"Error getting cluster nodes: {e}")
        return jsonify({
            'success': False,
            'error': f'Failed to get cluster nodes: {str(e)}'
        }), 500

@advanced_cluster_bp.route('/clusters/<cluster_id>/nodes/<node_name>', methods=['GET'])
@require_auth
@require_organization_access
def get_node_details(cluster_id, node_name, current_organization_id, current_user_id, current_user_role):
    """Get detailed status of a specific node"""
    try:
        
        
        logger.info(f"User {current_user_id} getting details for node {node_name} in cluster {cluster_id}")
        
        # Get specific node status
        result = advanced_ops.get_node_status(cluster_id, node_name)
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 500
            
    except Exception as e:
        logger.error(f"Error getting node details: {e}")
        return jsonify({
            'success': False,
            'error': f'Failed to get node details: {str(e)}'
        }), 500

@advanced_cluster_bp.route('/clusters/<cluster_id>/security-policies/templates', methods=['GET'])
@require_auth
@require_organization_access
def get_security_policy_templates(cluster_id, current_organization_id, current_user_id, current_user_role):
    """Get available security policy templates"""
    try:
        
        
        logger.info(f"User {current_user_id} getting security policy templates for cluster {cluster_id}")
        
        # Return predefined security policy templates
        templates = [
            {
                'name': 'require-labels',
                'category': 'governance',
                'description': 'Require specific labels on all resources',
                'severity': 'medium',
                'template': {
                    'apiVersion': 'templates.gatekeeper.sh/v1beta1',
                    'kind': 'ConstraintTemplate',
                    'metadata': {'name': 'k8srequiredlabels'},
                    'spec': {
                        'crd': {
                            'spec': {
                                'names': {'kind': 'K8sRequiredLabels'},
                                'validation': {
                                    'properties': {
                                        'labels': {
                                            'type': 'array',
                                            'items': {'type': 'string'}
                                        }
                                    }
                                }
                            }
                        },
                        'targets': [{
                            'target': 'admission.k8s.gatekeeper.sh',
                            'rego': '''
                                package k8srequiredlabels
                                
                                violation[{"msg": msg}] {
                                    required := input.parameters.labels
                                    provided := input.review.object.metadata.labels
                                    missing := required[_]
                                    not provided[missing]
                                    msg := sprintf("Missing required label: %v", [missing])
                                }
                            '''
                        }]
                    }
                }
            },
            {
                'name': 'disallow-privileged',
                'category': 'security',
                'description': 'Disallow privileged containers',
                'severity': 'high',
                'template': {
                    'apiVersion': 'templates.gatekeeper.sh/v1beta1',
                    'kind': 'ConstraintTemplate',
                    'metadata': {'name': 'k8sdisallowprivileged'},
                    'spec': {
                        'crd': {
                            'spec': {
                                'names': {'kind': 'K8sDisallowPrivileged'},
                                'validation': {'properties': {}}
                            }
                        },
                        'targets': [{
                            'target': 'admission.k8s.gatekeeper.sh',
                            'rego': '''
                                package k8sdisallowprivileged
                                
                                violation[{"msg": msg}] {
                                    container := input.review.object.spec.containers[_]
                                    container.securityContext.privileged
                                    msg := "Privileged containers are not allowed"
                                }
                            '''
                        }]
                    }
                }
            },
            {
                'name': 'require-resource-limits',
                'category': 'resource-management',
                'description': 'Require CPU and memory limits on containers',
                'severity': 'medium',
                'template': {
                    'apiVersion': 'templates.gatekeeper.sh/v1beta1',
                    'kind': 'ConstraintTemplate',
                    'metadata': {'name': 'k8srequireresources'},
                    'spec': {
                        'crd': {
                            'spec': {
                                'names': {'kind': 'K8sRequireResources'},
                                'validation': {
                                    'properties': {
                                        'limits': {
                                            'type': 'array',
                                            'items': {'type': 'string'}
                                        }
                                    }
                                }
                            }
                        },
                        'targets': [{
                            'target': 'admission.k8s.gatekeeper.sh',
                            'rego': '''
                                package k8srequireresources
                                
                                violation[{"msg": msg}] {
                                    container := input.review.object.spec.containers[_]
                                    required := input.parameters.limits
                                    missing := required[_]
                                    not container.resources.limits[missing]
                                    msg := sprintf("Missing required resource limit: %v", [missing])
                                }
                            '''
                        }]
                    }
                }
            },
            {
                'name': 'disallow-host-network',
                'category': 'security',
                'description': 'Disallow pods from using host network',
                'severity': 'high',
                'template': {
                    'apiVersion': 'templates.gatekeeper.sh/v1beta1',
                    'kind': 'ConstraintTemplate',
                    'metadata': {'name': 'k8sdisallowhostnetwork'},
                    'spec': {
                        'crd': {
                            'spec': {
                                'names': {'kind': 'K8sDisallowHostNetwork'},
                                'validation': {'properties': {}}
                            }
                        },
                        'targets': [{
                            'target': 'admission.k8s.gatekeeper.sh',
                            'rego': '''
                                package k8sdisallowhostnetwork
                                
                                violation[{"msg": msg}] {
                                    input.review.object.spec.hostNetwork
                                    msg := "Pods cannot use host network"
                                }
                            '''
                        }]
                    }
                }
            },
            {
                'name': 'enforce-pod-security-standards',
                'category': 'security',
                'description': 'Enforce Pod Security Standards (restricted profile)',
                'severity': 'high',
                'template': {
                    'apiVersion': 'templates.gatekeeper.sh/v1beta1',
                    'kind': 'ConstraintTemplate',
                    'metadata': {'name': 'k8spodsecuritystandards'},
                    'spec': {
                        'crd': {
                            'spec': {
                                'names': {'kind': 'K8sPodSecurityStandards'},
                                'validation': {'properties': {}}
                            }
                        },
                        'targets': [{
                            'target': 'admission.k8s.gatekeeper.sh',
                            'rego': '''
                                package k8spodsecuritystandards
                                
                                violation[{"msg": msg}] {
                                    container := input.review.object.spec.containers[_]
                                    container.securityContext.runAsRoot
                                    msg := "Containers must not run as root"
                                }
                                
                                violation[{"msg": msg}] {
                                    container := input.review.object.spec.containers[_]
                                    not container.securityContext.readOnlyRootFilesystem
                                    msg := "Containers must use read-only root filesystem"
                                }
                            '''
                        }]
                    }
                }
            }
        ]
        
        return jsonify({
            'success': True,
            'data': {
                'cluster_id': cluster_id,
                'templates': templates,
                'total_templates': len(templates),
                'categories': list(set(t['category'] for t in templates))
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting security policy templates: {e}")
        return jsonify({
            'success': False,
            'error': f'Failed to get security policy templates: {str(e)}'
        }), 500

@advanced_cluster_bp.route('/clusters/<cluster_id>/maintenance-mode', methods=['POST'])
@require_auth
@require_organization_access
@require_role(['super_admin', 'org_admin', 'cluster_admin'])
def toggle_maintenance_mode(cluster_id, current_organization_id, current_user_id, current_user_role):
    """
    Enable or disable maintenance mode for the cluster
    
    Body:
    {
        "enabled": true,
        "reason": "Scheduled maintenance",
        "duration_minutes": 60
    }
    """
    try:
        data = request.get_json()
        
        
        enabled = data.get('enabled', False)
        reason = data.get('reason', 'Maintenance mode')
        duration = data.get('duration_minutes', 60)
        
        logger.info(f"User {current_user_id} {'enabling' if enabled else 'disabling'} maintenance mode for cluster {cluster_id}")
        
        # In real implementation, this would:
        # 1. Cordon all nodes if enabling
        # 2. Add maintenance annotations/labels
        # 3. Update cluster status
        # 4. Send notifications
        
        # Simulate maintenance mode toggle
        result = {
            'success': True,
            'data': {
                'operation': 'maintenance_mode',
                'cluster_id': cluster_id,
                'enabled': enabled,
                'reason': reason,
                'duration_minutes': duration if enabled else None,
                'status': 'maintenance' if enabled else 'active',
                'message': f"Maintenance mode {'enabled' if enabled else 'disabled'} successfully"
            }
        }
        
        # Log the action
        log_audit_action(
            user_id=current_user_id,
            organization_id=current_organization_id,
            action='toggle_maintenance_mode',
            resource_type='cluster',
            resource_id=cluster_id,
            details={
                'cluster_id': cluster_id,
                'enabled': enabled,
                'reason': reason,
                'duration_minutes': duration
            }
        )
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"Error toggling maintenance mode: {e}")
        return jsonify({
            'success': False,
            'error': f'Failed to toggle maintenance mode: {str(e)}'
        }), 500

