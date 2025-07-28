"""
Multi-Tenant Cluster Management API Routes
Handles cluster operations with organization isolation and resource limits
"""

from flask import Blueprint, request, jsonify
from src.models.organization import Organization, User, AuditLog
from src.services.auth_service import require_auth, require_role, require_organization_access
from src.services.organization_service import OrganizationService
from src.services.cluster_api_service import ClusterAPIService
from src.services.infrastructure_provisioner import InfrastructureProvisioner
from datetime import datetime, timedelta
import uuid
import json
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine

clusters_mt_bp = Blueprint('clusters_multitenant', __name__)

def get_db_session():
    """Get database session for multi-tenant operations"""
    engine = create_engine('sqlite:///cluster_api_multitenant.db')
    Session = sessionmaker(bind=engine)
    return Session()

def get_organization_service():
    """Get OrganizationService instance"""
    return OrganizationService(database_url='sqlite:///cluster_api_multitenant.db')

def get_cluster_api_service():
    """Get ClusterAPIService instance"""
    return ClusterAPIService()

def get_infrastructure_provisioner():
    """Get InfrastructureProvisioner instance"""
    return InfrastructureProvisioner()

def log_audit_event(organization_id, user_id, action, resource_type, resource_id, details=None):
    """Log audit event for compliance and monitoring"""
    session = get_db_session()
    try:
        audit_log = AuditLog(
            id=str(uuid.uuid4()),
            organization_id=organization_id,
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            audit_metadata=json.dumps(details) if details else None,
            timestamp=datetime.utcnow()
        )
        session.add(audit_log)
        session.commit()
    except Exception as e:
        print(f"Audit logging error: {e}")
        session.rollback()
    finally:
        session.close()

def check_resource_limits(organization_id, resource_type, current_count=0):
    """Check if organization can create more resources"""
    org_service = get_organization_service()
    org_result = org_service.get_organization(organization_id)
    
    if org_result[1]:  # If there's an error
        return False, org_result[1]
    
    organization = org_result[0]  # Get the organization dict
    
    if resource_type == 'cluster':
        if current_count >= organization['max_clusters']:
            return False, f"Cluster limit reached ({organization['max_clusters']}). Upgrade subscription to create more clusters."
    elif resource_type == 'cloud_account':
        if current_count >= organization['max_cloud_accounts']:
            return False, f"Cloud account limit reached ({organization['max_cloud_accounts']}). Upgrade subscription to add more accounts."
    
    return True, None

# Multi-tenant cluster operations
@clusters_mt_bp.route('/clusters', methods=['GET'])
@require_auth
@require_organization_access
def get_organization_clusters(current_organization_id, current_user_id, current_user_role):
    """Get clusters for the current organization only"""
    try:
        # Get query parameters
        provider = request.args.get('provider')
        status = request.args.get('status')
        search = request.args.get('search')
        limit = request.args.get('limit', 50, type=int)
        offset = request.args.get('offset', 0, type=int)
        
        session = get_db_session()
        
        try:
            # Base query filtered by organization
            # Note: In a real implementation, clusters would have organization_id field
            # For now, we'll simulate organization-specific clusters
            
            # Simulate organization-specific clusters
            org_clusters = []
            
            # Get organization info for context
            org_service = get_organization_service()
            org_result = org_service.get_organization(current_organization_id)
            
            if org_result[1]:  # If there's an error
                return jsonify({
                    'success': False,
                    'error': org_result[1]
                }), 404
            
            organization = org_result[0]  # Get the organization dict
            
            # Simulate clusters based on organization
            if organization['name'] == 'Sify Technologies':
                org_clusters = [
                    {
                        'id': 'sify-prod-cluster-1',
                        'name': 'sify-production-cluster',
                        'provider': 'sify',
                        'region': 'mumbai-zone-1',
                        'version': '1.28.0',
                        'topology': 'multi-master-ha',
                        'status': 'running',
                        'node_count': 5,
                        'cpu_cores': 20,
                        'memory_gb': 80,
                        'storage_gb': 500,
                        'gpu_count': 2,
                        'gpu_type': 'nvidia-a100',
                        'hourly_cost': 12.50,
                        'monthly_cost': 9000.0,
                        'created_at': '2025-07-15T10:30:00Z',
                        'updated_at': '2025-07-18T08:15:00Z',
                        'created_by': 'admin@sifytechnologies.com',
                        'organization_id': current_organization_id
                    },
                    {
                        'id': 'sify-dev-cluster-1',
                        'name': 'sify-development-cluster',
                        'provider': 'aws',
                        'region': 'ap-south-1',
                        'version': '1.27.8',
                        'topology': 'single-master',
                        'status': 'running',
                        'node_count': 3,
                        'cpu_cores': 12,
                        'memory_gb': 48,
                        'storage_gb': 200,
                        'gpu_count': 0,
                        'gpu_type': None,
                        'hourly_cost': 3.20,
                        'monthly_cost': 2304.0,
                        'created_at': '2025-07-16T14:20:00Z',
                        'updated_at': '2025-07-18T09:10:00Z',
                        'created_by': 'clusters@sifytechnologies.com',
                        'organization_id': current_organization_id
                    }
                ]
            elif organization['name'] == 'Demo Company':
                org_clusters = [
                    {
                        'id': 'demo-test-cluster-1',
                        'name': 'demo-testing-cluster',
                        'provider': 'gcp',
                        'region': 'asia-south1',
                        'version': '1.28.0',
                        'topology': 'single-master',
                        'status': 'running',
                        'node_count': 2,
                        'cpu_cores': 8,
                        'memory_gb': 32,
                        'storage_gb': 100,
                        'gpu_count': 1,
                        'gpu_type': 'nvidia-t4',
                        'hourly_cost': 2.80,
                        'monthly_cost': 2016.0,
                        'created_at': '2025-07-17T11:45:00Z',
                        'updated_at': '2025-07-18T07:30:00Z',
                        'created_by': 'admin@example.com',
                        'organization_id': current_organization_id
                    }
                ]
            elif organization['name'] == 'Tech Startup':
                org_clusters = [
                    {
                        'id': 'startup-app-cluster-1',
                        'name': 'startup-app-cluster',
                        'provider': 'azure',
                        'region': 'centralindia',
                        'version': '1.27.8',
                        'topology': 'all-in-one',
                        'status': 'running',
                        'node_count': 1,
                        'cpu_cores': 4,
                        'memory_gb': 16,
                        'storage_gb': 50,
                        'gpu_count': 0,
                        'gpu_type': None,
                        'hourly_cost': 1.20,
                        'monthly_cost': 864.0,
                        'created_at': '2025-07-18T09:00:00Z',
                        'updated_at': '2025-07-18T09:00:00Z',
                        'created_by': 'founder@techstartup.com',
                        'organization_id': current_organization_id
                    }
                ]
            
            # Apply filters
            filtered_clusters = org_clusters
            
            if provider and provider != 'all':
                filtered_clusters = [c for c in filtered_clusters if c['provider'] == provider]
            
            if status and status != 'all':
                filtered_clusters = [c for c in filtered_clusters if c['status'] == status]
            
            if search:
                filtered_clusters = [c for c in filtered_clusters if search.lower() in c['name'].lower()]
            
            # Apply pagination
            total = len(filtered_clusters)
            paginated_clusters = filtered_clusters[offset:offset + limit]
            
            # Log audit event
            log_audit_event(
                current_organization_id,
                current_user_id,
                'list_clusters',
                'cluster',
                None,
                {'filters': {'provider': provider, 'status': status, 'search': search}}
            )
            
            return jsonify({
                'success': True,
                'data': paginated_clusters,
                'total': total,
                'limit': limit,
                'offset': offset,
                'organization': {
                    'id': organization['id'],
                    'name': organization['name'],
                    'cluster_count': len(org_clusters),
                    'max_clusters': organization['max_clusters']
                }
            })
            
        except Exception as e:
            print(f"Database error: {e}")
            return jsonify({
                'success': True,
                'data': [],
                'total': 0,
                'organization': {
                    'id': current_organization_id,
                    'name': 'Unknown',
                    'cluster_count': 0,
                    'max_clusters': 0
                }
            })
        finally:
            session.close()
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error fetching clusters: {str(e)}'
        }), 500

@clusters_mt_bp.route('/clusters', methods=['POST'])
@require_auth
@require_role(['org_admin', 'cluster_admin', 'super_admin'])
@require_organization_access
def create_organization_cluster(current_organization_id, current_user_id, current_user_role):
    """Create a new cluster for the current organization"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'provider', 'region', 'version', 'topology']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400
        
        # Get organization info
        org_service = get_organization_service()
        org_result = org_service.get_organization(current_organization_id)
        
        if org_result[1]:  # If there's an error
            return jsonify({
                'success': False,
                'error': org_result[1]
            }), 404
        
        organization = org_result[0]  # Get the organization dict
        
        # Check resource limits
        current_cluster_count = 0  # In real implementation, count from database
        if organization['name'] == 'Sify Technologies':
            current_cluster_count = 2
        elif organization['name'] == 'Demo Company':
            current_cluster_count = 1
        elif organization['name'] == 'Tech Startup':
            current_cluster_count = 1
        
        can_create, limit_error = check_resource_limits(
            current_organization_id, 
            'cluster', 
            current_cluster_count
        )
        
        if not can_create:
            return jsonify({
                'success': False,
                'error': limit_error
            }), 403
        
        # Validate node count limits
        node_count = data.get('nodeCount', 1)
        if node_count > organization['max_nodes_per_cluster']:
            return jsonify({
                'success': False,
                'error': f'Node count ({node_count}) exceeds limit ({organization["max_nodes_per_cluster"]}). Upgrade subscription for larger clusters.'
            }), 403
        
        # Check if cluster name already exists in organization
        # In real implementation, check database with organization_id filter
        
        # Generate cluster ID
        cluster_id = str(uuid.uuid4())
        
        # Get infrastructure provisioner
        provisioner = get_infrastructure_provisioner()
        
        # Create cluster configuration
        cluster_config = {
            'id': cluster_id,
            'name': data['name'],
            'provider': data['provider'],
            'region': data['region'],
            'kubernetes_version': data.get('kubernetes_version', data.get('version', '1.28.0')),
            'topology': data['topology'],
            'node_count': node_count,
            'control_plane_replicas': 3 if data['topology'] == 'multi-master' else 1,
            'worker_replicas': node_count,
            'instance_type': data.get('instanceType', 'standard'),
            'gpu_enabled': data.get('gpuEnabled', False),
            'gpu_type': data.get('gpuType'),
            'gpu_count': data.get('gpuCount', 0),
            'networking': data.get('networking', {}),
            'security': data.get('security', {}),
            'monitoring': data.get('monitoring', {}),
            'storage': data.get('storage', {}),
            'organization_id': current_organization_id,
            'created_by': current_user_id,
            'created_at': datetime.utcnow().isoformat()
        }
        
        # Validate cluster configuration
        validation_result = provisioner.validate_cluster_config(cluster_config)
        
        if not validation_result[0]:  # If validation failed
            return jsonify({
                'success': False,
                'error': f'Configuration validation failed: {validation_result[1]}'
            }), 400
        
        # Generate infrastructure manifests
        try:
            manifests = provisioner.generate_cluster_manifests(cluster_config)
            
            # In real implementation, apply manifests to Cluster-API
            # For now, simulate cluster creation
            
            cluster_response = {
                'id': cluster_id,
                'name': data['name'],
                'provider': data['provider'],
                'region': data['region'],
                'version': data['version'],
                'topology': data['topology'],
                'status': 'creating',
                'node_count': node_count,
                'organization_id': current_organization_id,
                'created_by': current_user_id,
                'created_at': datetime.utcnow().isoformat(),
                'estimated_completion': (datetime.utcnow() + timedelta(minutes=15)).isoformat(),
                'manifests_generated': len(manifests),
                'cost_estimate': {'monthly': 150.0, 'hourly': 0.21}  # Placeholder cost estimate
            }
            
            # Log audit event
            log_audit_event(
                current_organization_id,
                current_user_id,
                'create_cluster',
                'cluster',
                cluster_id,
                {
                    'cluster_name': data['name'],
                    'provider': data['provider'],
                    'region': data['region'],
                    'node_count': node_count
                }
            )
            
            return jsonify({
                'success': True,
                'data': cluster_response,
                'message': f'Cluster "{data["name"]}" creation initiated successfully'
            }), 201
            
        except Exception as provisioning_error:
            return jsonify({
                'success': False,
                'error': f'Cluster provisioning failed: {str(provisioning_error)}'
            }), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Cluster creation error: {str(e)}'
        }), 500

@clusters_mt_bp.route('/clusters/<cluster_id>', methods=['GET'])
@require_auth
@require_organization_access
def get_organization_cluster(cluster_id, current_organization_id, current_user_id, current_user_role):
    """Get specific cluster details (organization-scoped)"""
    try:
        # In real implementation, verify cluster belongs to organization
        # For now, simulate organization-specific cluster details
        
        # Simulate cluster details based on cluster_id and organization
        cluster_details = None
        
        if cluster_id == 'sify-prod-cluster-1':
            cluster_details = {
                'id': cluster_id,
                'name': 'sify-production-cluster',
                'provider': 'sify',
                'region': 'mumbai-zone-1',
                'version': '1.28.0',
                'topology': 'multi-master-ha',
                'status': 'running',
                'node_count': 5,
                'cpu_cores': 20,
                'memory_gb': 80,
                'storage_gb': 500,
                'gpu_count': 2,
                'gpu_type': 'nvidia-a100',
                'hourly_cost': 12.50,
                'monthly_cost': 9000.0,
                'organization_id': current_organization_id,
                'created_by': 'admin@sifytechnologies.com',
                'created_at': '2025-07-15T10:30:00Z',
                'updated_at': '2025-07-18T08:15:00Z',
                'kubeconfig_available': True,
                'endpoints': {
                    'api_server': 'https://sify-prod-cluster-1.sify.cloud:6443',
                    'dashboard': 'https://dashboard.sify-prod-cluster-1.sify.cloud'
                },
                'metrics': {
                    'cpu_usage': 65.2,
                    'memory_usage': 78.5,
                    'storage_usage': 45.8,
                    'network_in': 125.6,
                    'network_out': 89.3
                },
                'nodes': [
                    {'name': 'master-1', 'status': 'Ready', 'role': 'master', 'cpu': '4', 'memory': '16Gi'},
                    {'name': 'master-2', 'status': 'Ready', 'role': 'master', 'cpu': '4', 'memory': '16Gi'},
                    {'name': 'master-3', 'status': 'Ready', 'role': 'master', 'cpu': '4', 'memory': '16Gi'},
                    {'name': 'worker-1', 'status': 'Ready', 'role': 'worker', 'cpu': '4', 'memory': '16Gi'},
                    {'name': 'worker-2', 'status': 'Ready', 'role': 'worker', 'cpu': '4', 'memory': '16Gi'}
                ]
            }
        elif cluster_id == 'demo-test-cluster-1':
            cluster_details = {
                'id': cluster_id,
                'name': 'demo-testing-cluster',
                'provider': 'gcp',
                'region': 'asia-south1',
                'version': '1.28.0',
                'topology': 'single-master',
                'status': 'running',
                'node_count': 2,
                'cpu_cores': 8,
                'memory_gb': 32,
                'storage_gb': 100,
                'gpu_count': 1,
                'gpu_type': 'nvidia-t4',
                'hourly_cost': 2.80,
                'monthly_cost': 2016.0,
                'organization_id': current_organization_id,
                'created_by': 'admin@example.com',
                'created_at': '2025-07-17T11:45:00Z',
                'updated_at': '2025-07-18T07:30:00Z',
                'kubeconfig_available': True,
                'endpoints': {
                    'api_server': 'https://demo-test-cluster-1.gcp.example.com:6443',
                    'dashboard': 'https://dashboard.demo-test-cluster-1.gcp.example.com'
                },
                'metrics': {
                    'cpu_usage': 42.1,
                    'memory_usage': 56.8,
                    'storage_usage': 23.4,
                    'network_in': 45.2,
                    'network_out': 38.7
                },
                'nodes': [
                    {'name': 'master-1', 'status': 'Ready', 'role': 'master', 'cpu': '4', 'memory': '16Gi'},
                    {'name': 'worker-1', 'status': 'Ready', 'role': 'worker', 'cpu': '4', 'memory': '16Gi'}
                ]
            }
        
        if not cluster_details:
            return jsonify({
                'success': False,
                'error': 'Cluster not found or access denied'
            }), 404
        
        # Verify cluster belongs to current organization
        if cluster_details['organization_id'] != current_organization_id:
            return jsonify({
                'success': False,
                'error': 'Access denied: Cluster belongs to different organization'
            }), 403
        
        # Log audit event
        log_audit_event(
            current_organization_id,
            current_user_id,
            'view_cluster',
            'cluster',
            cluster_id,
            {'cluster_name': cluster_details['name']}
        )
        
        return jsonify({
            'success': True,
            'data': cluster_details
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error fetching cluster: {str(e)}'
        }), 500

@clusters_mt_bp.route('/clusters/<cluster_id>/scale', methods=['POST'])
@require_auth
@require_role(['org_admin', 'cluster_admin', 'super_admin'])
@require_organization_access
def scale_organization_cluster(cluster_id, current_organization_id, current_user_id, current_user_role):
    """Scale cluster nodes (organization-scoped)"""
    try:
        data = request.get_json()
        new_node_count = data.get('nodeCount') or data.get('node_count')
        
        if not new_node_count or new_node_count < 1:
            return jsonify({
                'success': False,
                'error': 'Invalid node count'
            }), 400
        
        # Get organization info for limits
        org_service = get_organization_service()
        org_result = org_service.get_organization(current_organization_id)
        
        if org_result[1]:  # If there's an error
            return jsonify({
                'success': False,
                'error': org_result[1]
            }), 404
        
        organization = org_result[0]  # Get the organization dict
        
        # Check node count limits
        if new_node_count > organization['max_nodes_per_cluster']:
            return jsonify({
                'success': False,
                'error': f'Node count ({new_node_count}) exceeds limit ({organization["max_nodes_per_cluster"]}). Upgrade subscription for larger clusters.'
            }), 403
        
        # In real implementation, verify cluster belongs to organization and scale
        # For now, simulate scaling operation
        
        scaling_response = {
            'cluster_id': cluster_id,
            'operation': 'scale',
            'old_node_count': 3,  # Simulated current count
            'new_node_count': new_node_count,
            'status': 'scaling',
            'estimated_completion': (datetime.utcnow() + timedelta(minutes=10)).isoformat(),
            'organization_id': current_organization_id
        }
        
        # Log audit event
        log_audit_event(
            current_organization_id,
            current_user_id,
            'scale_cluster',
            'cluster',
            cluster_id,
            {
                'old_node_count': 3,
                'new_node_count': new_node_count,
                'operation': 'scale'
            }
        )
        
        return jsonify({
            'success': True,
            'data': scaling_response,
            'message': f'Cluster scaling initiated: 3 → {new_node_count} nodes'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Cluster scaling error: {str(e)}'
        }), 500

@clusters_mt_bp.route('/clusters/<cluster_id>', methods=['DELETE'])
@require_auth
@require_role(['org_admin', 'cluster_admin', 'super_admin'])
@require_organization_access
def delete_organization_cluster(cluster_id, current_organization_id, current_user_id, current_user_role):
    """Delete a cluster (organization-scoped)"""
    try:
        # In real implementation, verify cluster belongs to organization
        # For now, simulate cluster deletion
        
        deletion_response = {
            'cluster_id': cluster_id,
            'operation': 'delete',
            'status': 'deleting',
            'estimated_completion': (datetime.utcnow() + timedelta(minutes=5)).isoformat(),
            'organization_id': current_organization_id
        }
        
        # Log audit event
        log_audit_event(
            current_organization_id,
            current_user_id,
            'delete_cluster',
            'cluster',
            cluster_id,
            {'operation': 'delete'}
        )
        
        return jsonify({
            'success': True,
            'data': deletion_response,
            'message': 'Cluster deletion initiated successfully'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Cluster deletion error: {str(e)}'
        }), 500

@clusters_mt_bp.route('/organization/usage', methods=['GET'])
@require_auth
@require_organization_access
def get_organization_resource_usage(current_organization_id, current_user_id, current_user_role):
    """Get organization resource usage and limits"""
    try:
        org_service = get_organization_service()
        usage, error = org_service.get_resource_usage(current_organization_id)
        
        if error:
            return jsonify({
                'success': False,
                'error': error
            }), 404
        
        return jsonify({
            'success': True,
            'data': usage
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error fetching resource usage: {str(e)}'
        }), 500

@clusters_mt_bp.route('/organization/audit-logs', methods=['GET'])
@require_auth
@require_role(['org_admin', 'super_admin'])
@require_organization_access
def get_organization_audit_logs(current_organization_id, current_user_id, current_user_role):
    """Get audit logs for the organization"""
    try:
        limit = request.args.get('limit', 50, type=int)
        offset = request.args.get('offset', 0, type=int)
        action_filter = request.args.get('action')
        resource_type_filter = request.args.get('resource_type')
        
        session = get_db_session()
        
        try:
            query = session.query(AuditLog).filter(
                AuditLog.organization_id == current_organization_id
            )
            
            if action_filter:
                query = query.filter(AuditLog.action == action_filter)
            
            if resource_type_filter:
                query = query.filter(AuditLog.resource_type == resource_type_filter)
            
            total = query.count()
            audit_logs = query.order_by(AuditLog.timestamp.desc()).offset(offset).limit(limit).all()
            
            return jsonify({
                'success': True,
                'data': [log.to_dict() for log in audit_logs],
                'total': total,
                'limit': limit,
                'offset': offset
            })
            
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'Error fetching audit logs: {str(e)}'
            }), 500
        finally:
            session.close()
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Audit log error: {str(e)}'
        }), 500

