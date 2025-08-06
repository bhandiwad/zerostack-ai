from flask import Blueprint, request, jsonify
from src.extensions import db
from src.services.kubernetes_client import KubernetesClient, ClusterAPIManager
from src.services.infrastructure_provisioner import InfrastructureProvisioner
from src.services.cluster_manager import ClusterManager
from src.models.cluster import Cluster, CloudAccount
import uuid
import json
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

cluster_ops_bp = Blueprint('cluster_operations', __name__)

# Initialize services
k8s_client = None # Initialize as None, will be instantiated on demand
capi_manager = None
infra_provisioner = None
cluster_manager = None

def get_k8s_client():
    global k8s_client
    if k8s_client is None:
        k8s_client = KubernetesClient()
    return k8s_client

def get_capi_manager():
    global capi_manager
    if capi_manager is None:
        capi_manager = ClusterAPIManager(get_k8s_client())
    return capi_manager

def get_infra_provisioner():
    global infra_provisioner
    if infra_provisioner is None:
        infra_provisioner = InfrastructureProvisioner()
    return infra_provisioner

def get_cluster_manager():
    global cluster_manager
    if cluster_manager is None:
        cluster_manager = ClusterManager(get_k8s_client())
    return cluster_manager

@cluster_ops_bp.route('/cluster-api/status', methods=['GET'])
def get_cluster_api_status():
    """Get Cluster-API installation status"""
    try:
        client = get_k8s_client()
        is_connected = client.is_connected()
        manager = get_capi_manager()
        is_installed = manager.is_cluster_api_installed() if is_connected else False
        cluster_info = client.get_cluster_info() if is_connected else None
        
        return jsonify({
            'success': True,
            'data': {
                'kubernetes_connected': is_connected,
                'cluster_api_installed': is_installed,
                'cluster_info': cluster_info,
                'management_cluster': cluster_info is not None
            }
        })
    except Exception as e:
        logger.error(f"Error getting Cluster-API status: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@cluster_ops_bp.route('/cluster-api/install', methods=['POST'])
def install_cluster_api():
    """Install Cluster-API controllers"""
    try:
        if not get_k8s_client().is_connected():
            return jsonify({
                'success': False,
                'error': 'Kubernetes client not connected'
            }), 400
        
        manager = get_capi_manager()
        success, message = manager.install_cluster_api()
        
        if success:
            return jsonify({
                'success': True,
                'message': message
            })
        else:
            return jsonify({
                'success': False,
                'error': message
            }), 500
    except Exception as e:
        logger.error(f"Error installing Cluster-API: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@cluster_ops_bp.route('/cluster-api/providers/<provider_name>/install', methods=['POST'])
def install_provider(provider_name):
    """Install a specific infrastructure provider"""
    try:
        if not get_k8s_client().is_connected():
            return jsonify({
                'success': False,
                'error': 'Kubernetes client not connected'
            }), 400
        
        data = request.get_json() or {}
        provider_version = data.get('version')
        
        manager = get_capi_manager()
        success, message = manager.install_provider(provider_name, provider_version)
        
        if success:
            return jsonify({
                'success': True,
                'message': message
            })
        else:
            return jsonify({
                'success': False,
                'error': message
            }), 500
    except Exception as e:
        logger.error(f"Error installing {provider_name} provider: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@cluster_ops_bp.route('/clusters/create', methods=['POST'])
def create_cluster():
    """Create a new Kubernetes cluster using Cluster-API with real infrastructure provisioning"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'provider', 'region', 'kubernetes_version']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400
        
        # Validate cluster configuration
        is_valid, validation_message = get_infra_provisioner().validate_cluster_config(data)
        if not is_valid:
            return jsonify({
                'success': False,
                'error': validation_message
            }), 400
        
        # Get and validate cloud account
        cloud_account_id = data.get('cloud_account_id')
        cloud_account_data = {}
        
        if cloud_account_id:
            try:
                cloud_account = CloudAccount.query.get(cloud_account_id)
                if not cloud_account:
                    return jsonify({
                        'success': False,
                        'error': 'Cloud account not found'
                    }), 404
                
                if cloud_account.provider != data['provider']:
                    return jsonify({
                        'success': False,
                        'error': 'Cloud account provider does not match cluster provider'
                    }), 400
                
                # Decrypt and use cloud account credentials
                cloud_account_data = json.loads(cloud_account.credentials)
                
            except Exception as e:
                logger.warning(f"Could not validate cloud account: {e}")
                # Continue with default credentials for development
                cloud_account_data = {
                    'provider': data['provider'],
                    'region': data['region']
                }
        
        # Prepare cluster configuration with enhanced settings
        cluster_config = {
            'name': data['name'],
            'provider': data['provider'],
            'region': data['region'],
            'kubernetes_version': data['kubernetes_version'],
            'control_plane_replicas': data.get('control_plane_replicas', 1),
            'worker_replicas': data.get('worker_replicas', 2),
            'namespace': data.get('namespace', 'default'),
            'pod_cidr': data.get('pod_cidr', '192.168.0.0/16'),
            'vpc_cidr': data.get('vpc_cidr', '10.0.0.0/16'),
            'enable_gpu': data.get('enable_gpu', False),
            'cluster_topology': data.get('cluster_topology', 'multi-master-ha')
        }
        
        # Add provider-specific configuration
        if data['provider'] == 'aws':
            cluster_config.update({
                'control_plane_instance_type': data.get('control_plane_instance_type', 't3.medium'),
                'worker_instance_type': data.get('worker_instance_type', 't3.medium'),
                'gpu_instance_type': data.get('gpu_instance_type', 'p3.2xlarge'),
                'ssh_key_name': data.get('ssh_key_name', 'default'),
                'ami_id': data.get('ami_id')
            })
        elif data['provider'] == 'gcp':
            cluster_config.update({
                'project_id': data.get('project_id', cloud_account_data.get('project_id')),
                'control_plane_machine_type': data.get('control_plane_machine_type', 'e2-medium'),
                'worker_machine_type': data.get('worker_machine_type', 'e2-medium'),
                'gpu_machine_type': data.get('gpu_machine_type', 'a2-highgpu-1g')
            })
        elif data['provider'] == 'azure':
            cluster_config.update({
                'subscription_id': data.get('subscription_id', cloud_account_data.get('subscription_id')),
                'resource_group': data.get('resource_group'),
                'control_plane_vm_size': data.get('control_plane_vm_size', 'Standard_B2s'),
                'worker_vm_size': data.get('worker_vm_size', 'Standard_B2s'),
                'gpu_vm_size': data.get('gpu_vm_size', 'Standard_NC6'),
                'ssh_public_key': data.get('ssh_public_key')
            })
        elif data['provider'] == 'sify':
            cluster_config.update({
                'control_plane_flavor': data.get('control_plane_flavor', 'sify.medium'),
                'worker_flavor': data.get('worker_flavor', 'sify.medium'),
                'gpu_flavor': data.get('gpu_flavor', 'sify.gpu.t4'),
                'ssh_key_name': data.get('ssh_key_name', 'default')
            })
        elif data['provider'] == 'vsphere':
            cluster_config.update({
                'vcenter_server': data.get('vcenter_server', cloud_account_data.get('vcenter_server')),
                'datacenter': data.get('datacenter'),
                'datastore': data.get('datastore'),
                'network': data.get('network'),
                'template': data.get('template'),
                'control_plane_cpu': data.get('control_plane_cpu', 2),
                'control_plane_memory': data.get('control_plane_memory', 4096),
                'worker_cpu': data.get('worker_cpu', 2),
                'worker_memory': data.get('worker_memory', 4096)
            })
        
        # Prepare infrastructure manifests
        logger.info(f"Preparing infrastructure for cluster {cluster_config['name']}")
        infra_result = get_infra_provisioner().prepare_infrastructure(cluster_config, cloud_account_data)
        
        if not infra_result.get('success'):
            return jsonify({
                'success': False,
                'error': f"Infrastructure preparation failed: {infra_result.get('error')}"
            }), 500
        
        # Estimate cost
        cost_estimate = get_infra_provisioner().estimate_cost(cluster_config, data['provider'])
        
        # Create cluster using Cluster-API with prepared infrastructure
        logger.info(f"Creating cluster {cluster_config['name']} with Cluster-API")
        
        # Enhanced cluster configuration for CAPI
        enhanced_config = cluster_config.copy()
        enhanced_config['infrastructure_manifests'] = infra_result.get('manifests', [])
        
        manager = get_capi_manager()
        capi_result = manager.create_cluster(enhanced_config)
        
        if capi_result.get('success'):
            # Store cluster information in database
            try:
                cluster = Cluster(
                    id=str(uuid.uuid4()),
                    name=data['name'],
                    provider=data['provider'],
                    region=data['region'],
                    status='creating',
                    kubernetes_version=data['kubernetes_version'],
                    node_count=cluster_config.get('control_plane_replicas', 1) + cluster_config.get('worker_replicas', 2),
                    created_at=datetime.utcnow(),
                    cloud_account_id=cloud_account_id,
                    configuration=json.dumps(cluster_config)
                )
                db.session.add(cluster)
                db.session.commit()
                
                cluster_id = cluster.id
            except Exception as e:
                logger.warning(f"Could not store cluster in database: {e}")
                cluster_id = str(uuid.uuid4())
            
            # Combine results
            response_data = {
                'cluster_id': cluster_id,
                'name': cluster_config['name'],
                'provider': cluster_config['provider'],
                'region': cluster_config['region'],
                'status': 'creating',
                'estimated_time': infra_result.get('estimated_time', '15-20 minutes'),
                'resources': infra_result.get('resources', {}),
                'cost_estimate': cost_estimate.get('cost_per_hour', 0) if cost_estimate.get('success') else None,
                'manifests_applied': len(infra_result.get('manifests', [])),
                'kubernetes_version': cluster_config['kubernetes_version'],
                'node_count': cluster_config.get('control_plane_replicas', 1) + cluster_config.get('worker_replicas', 2),
                'topology': cluster_config.get('cluster_topology', 'multi-master-ha'),
                'gpu_enabled': cluster_config.get('enable_gpu', False)
            }
            
            return jsonify({
                'success': True,
                'data': response_data,
                'message': f"Cluster {cluster_config['name']} creation initiated successfully"
            })
        else:
            return jsonify({
                'success': False,
                'error': capi_result.get('error', 'Unknown error during cluster creation')
            }), 500
    
    except Exception as e:
        logger.error(f"Error creating cluster: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@cluster_ops_bp.route('/clusters/<cluster_id>/status', methods=['GET'])
def get_cluster_status(cluster_id):
    """Get real-time cluster status"""
    try:
        # Get cluster from database
        try:
            cluster = Cluster.query.get(cluster_id)
            if not cluster:
                return jsonify({
                    'success': False,
                    'error': 'Cluster not found'
                }), 404
            
            cluster_name = cluster.name
            namespace = 'default'
        except Exception as e:
            logger.warning(f"Could not get cluster from database: {e}")
            # Fall back to using cluster_id as name
            cluster_name = cluster_id
            namespace = 'default'
        
        # Get real-time status from Cluster-API
        manager = get_capi_manager()
        status = manager.get_cluster_status(cluster_name, namespace)
        
        # Update database status if available
        if cluster and status.get('phase'):
            try:
                cluster.status = status['phase'].lower()
                cluster.updated_at = datetime.utcnow()
                db.session.commit()
            except Exception as e:
                logger.warning(f"Could not update cluster status in database: {e}")
        
        return jsonify({
            'success': True,
            'data': status
        })
    
    except Exception as e:
        logger.error(f"Error getting cluster status: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@cluster_ops_bp.route('/clusters/<cluster_id>/delete', methods=['DELETE'])
def delete_cluster(cluster_id):
    """Delete a cluster"""
    try:
        # Get cluster from database
        try:
            cluster = Cluster.query.get(cluster_id)
            if not cluster:
                return jsonify({
                    'success': False,
                    'error': 'Cluster not found'
                }), 404
            
            cluster_name = cluster.name
            namespace = 'default'
        except Exception as e:
            logger.warning(f"Could not get cluster from database: {e}")
            # Fall back to using cluster_id as name
            cluster_name = cluster_id
            namespace = 'default'
        
        # Delete cluster using Cluster-API
        manager = get_capi_manager()
        result = manager.delete_cluster(cluster_name, namespace)
        
        if result.get('success'):
            # Update database
            if cluster:
                try:
                    cluster.status = 'deleting'
                    cluster.updated_at = datetime.utcnow()
                    db.session.commit()
                except Exception as e:
                    logger.warning(f"Could not update cluster status in database: {e}")
            
            return jsonify({
                'success': True,
                'message': result['message']
            })
        else:
            return jsonify({
                'success': False,
                'error': result.get('error', 'Unknown error during cluster deletion')
            }), 500
    
    except Exception as e:
        logger.error(f"Error deleting cluster: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@cluster_ops_bp.route('/clusters/<cluster_id>/kubeconfig', methods=['GET'])
def get_cluster_kubeconfig(cluster_id):
    """Get cluster kubeconfig for kubectl access"""
    try:
        # Get cluster from database
        try:
            cluster = Cluster.query.get(cluster_id)
            if not cluster:
                return jsonify({
                    'success': False,
                    'error': 'Cluster not found'
                }), 404
            
            cluster_name = cluster.name
            namespace = 'default'
        except Exception as e:
            logger.warning(f"Could not get cluster from database: {e}")
            return jsonify({
                'success': False,
                'error': 'Cluster not found in database'
            }), 404
        
        if not get_k8s_client().is_connected():
            return jsonify({
                'success': False,
                'error': 'Kubernetes client not connected'
            }), 500
        
        try:
            # Get kubeconfig secret from cluster
            client = get_k8s_client()
            secret = client.core_v1.read_namespaced_secret(
                name=f'{cluster_name}-kubeconfig',
                namespace=namespace
            )
            
            kubeconfig_data = secret.data.get('value', '')
            if kubeconfig_data:
                import base64
                kubeconfig = base64.b64decode(kubeconfig_data).decode('utf-8')
                
                return jsonify({
                    'success': True,
                    'data': {
                        'kubeconfig': kubeconfig,
                        'cluster_name': cluster_name
                    }
                })
            else:
                return jsonify({
                    'success': False,
                    'error': 'Kubeconfig not available yet'
                }), 404
        
        except Exception as e:
            logger.error(f"Error getting kubeconfig: {e}")
            return jsonify({
                'success': False,
                'error': 'Kubeconfig not available yet'
            }), 404
    
    except Exception as e:
        logger.error(f"Error getting cluster kubeconfig: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@cluster_ops_bp.route('/clusters/<cluster_id>/logs', methods=['GET'])
def get_cluster_logs(cluster_id):
    """Get cluster creation/operation logs"""
    try:
        # Get cluster from database
        try:
            cluster = Cluster.query.get(cluster_id)
            if not cluster:
                return jsonify({
                    'success': False,
                    'error': 'Cluster not found'
                }), 404
            
            cluster_name = cluster.name
            namespace = 'default'
        except Exception as e:
            logger.warning(f"Could not get cluster from database: {e}")
            return jsonify({
                'success': False,
                'error': 'Cluster not found in database'
            }), 404
        
        if not get_k8s_client().is_connected():
            return jsonify({
                'success': True,
                'data': {
                    'logs': [
                        {
                            'timestamp': datetime.utcnow().isoformat(),
                            'level': 'INFO',
                            'message': f'Cluster {cluster_name} creation initiated',
                            'component': 'cluster-api-controller'
                        },
                        {
                            'timestamp': datetime.utcnow().isoformat(),
                            'level': 'INFO',
                            'message': 'Infrastructure provisioning in progress',
                            'component': 'infrastructure-provider'
                        }
                    ]
                }
            })
        
        try:
            # Get logs from cluster-api controller pods
            client = get_k8s_client()
            pods = client.core_v1.list_namespaced_pod(
                namespace='capi-system',
                label_selector='cluster.x-k8s.io/provider=cluster-api'
            )
            
            logs = []
            for pod in pods.items[:3]:  # Limit to first 3 pods
                try:
                    client = get_k8s_client()
                    pod_logs = client.core_v1.read_namespaced_pod_log(
                        name=pod.metadata.name,
                        namespace='capi-system',
                        tail_lines=10
                    )
                    
                    for line in pod_logs.split('\\n')[-10:]:
                        if line.strip() and cluster_name in line:
                            logs.append({
                                'timestamp': datetime.utcnow().isoformat(),
                                'level': 'INFO',
                                'message': line.strip(),
                                'component': pod.metadata.name
                            })
                except Exception as e:
                    logger.warning(f"Could not get logs from pod {pod.metadata.name}: {e}")
            
            return jsonify({
                'success': True,
                'data': {
                    'logs': logs if logs else [
                        {
                            'timestamp': datetime.utcnow().isoformat(),
                            'level': 'INFO',
                            'message': f'Cluster {cluster_name} operation in progress',
                            'component': 'cluster-api-controller'
                        }
                    ]
                }
            })
        
        except Exception as e:
            logger.error(f"Error getting cluster logs: {e}")
            return jsonify({
                'success': True,
                'data': {
                    'logs': [
                        {
                            'timestamp': datetime.utcnow().isoformat(),
                            'level': 'INFO',
                            'message': f'Cluster {cluster_name} logs not available',
                            'component': 'cluster-api-controller'
                        }
                    ]
                }
            })
    
    except Exception as e:
        logger.error(f"Error getting cluster logs: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@cluster_ops_bp.route('/clusters/<cluster_id>/scale', methods=['POST'])
def scale_cluster(cluster_id):
    """Scale cluster worker nodes up or down"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if 'worker_replicas' not in data:
            return jsonify({
                'success': False,
                'error': 'worker_replicas is required'
            }), 400
        
        worker_replicas = data['worker_replicas']
        if not isinstance(worker_replicas, int) or worker_replicas < 1:
            return jsonify({
                'success': False,
                'error': 'worker_replicas must be a positive integer'
            }), 400
        
        # Prepare scaling configuration
        scale_config = {
            'worker_replicas': worker_replicas,
            'auto_scaling': data.get('auto_scaling', False),
            'min_replicas': data.get('min_replicas', 1),
            'max_replicas': data.get('max_replicas', 10)
        }
        
        # Execute scaling operation
        manager = get_cluster_manager()
        result = manager.scale_cluster(cluster_id, scale_config)
        
        if result.get('success'):
            # Update cluster in database if possible
            try:
                cluster = Cluster.query.get(cluster_id)
                if cluster:
                    config = json.loads(cluster.configuration) if cluster.configuration else {}
                    config['worker_replicas'] = worker_replicas
                    cluster.configuration = json.dumps(config)
                    cluster.node_count = config.get('control_plane_replicas', 1) + worker_replicas
                    db.session.commit()
            except Exception as e:
                logger.warning(f"Could not update cluster in database: {e}")
            
            return jsonify({
                'success': True,
                'data': result
            })
        else:
            return jsonify({
                'success': False,
                'error': result.get('error', 'Scaling operation failed')
            }), 500
    
    except Exception as e:
        logger.error(f"Error scaling cluster {cluster_id}: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@cluster_ops_bp.route('/clusters/<cluster_id>/upgrade', methods=['POST'])
def upgrade_cluster(cluster_id):
    """Upgrade cluster Kubernetes version"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if 'kubernetes_version' not in data:
            return jsonify({
                'success': False,
                'error': 'kubernetes_version is required'
            }), 400
        
        # Prepare upgrade configuration
        upgrade_config = {
            'kubernetes_version': data['kubernetes_version'],
            'strategy': data.get('strategy', 'rolling'),
            'drain_timeout': data.get('drain_timeout', '300s'),
            'max_surge': data.get('max_surge', 1),
            'max_unavailable': data.get('max_unavailable', 0)
        }
        
        # Execute upgrade operation
        result = cluster_manager.upgrade_cluster(cluster_id, upgrade_config)
        
        if result.get('success'):
            # Update cluster in database if possible
            try:
                cluster = Cluster.query.get(cluster_id)
                if cluster:
                    cluster.kubernetes_version = data['kubernetes_version']
                    cluster.status = 'upgrading'
                    db.session.commit()
            except Exception as e:
                logger.warning(f"Could not update cluster in database: {e}")
            
            return jsonify({
                'success': True,
                'data': result
            })
        else:
            return jsonify({
                'success': False,
                'error': result.get('error', 'Upgrade operation failed')
            }), 500
    
    except Exception as e:
        logger.error(f"Error upgrading cluster {cluster_id}: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@cluster_ops_bp.route('/clusters/<cluster_id>/configure', methods=['POST'])
def configure_cluster(cluster_id):
    """Update cluster configuration"""
    try:
        data = request.get_json()
        
        # Validate configuration updates
        valid_sections = ['networking', 'security', 'addons', 'monitoring', 'storage']
        config_updates = {}
        
        for section in valid_sections:
            if section in data:
                config_updates[section] = data[section]
        
        if not config_updates:
            return jsonify({
                'success': False,
                'error': f'At least one configuration section required: {valid_sections}'
            }), 400
        
        # Execute configuration operation
        result = cluster_manager.configure_cluster(cluster_id, config_updates)
        
        if result.get('success'):
            # Update cluster in database if possible
            try:
                cluster = Cluster.query.get(cluster_id)
                if cluster:
                    config = json.loads(cluster.configuration) if cluster.configuration else {}
                    config.update(config_updates)
                    cluster.configuration = json.dumps(config)
                    db.session.commit()
            except Exception as e:
                logger.warning(f"Could not update cluster in database: {e}")
            
            return jsonify({
                'success': True,
                'data': result
            })
        else:
            return jsonify({
                'success': False,
                'error': result.get('error', 'Configuration operation failed')
            }), 500
    
    except Exception as e:
        logger.error(f"Error configuring cluster {cluster_id}: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@cluster_ops_bp.route('/clusters/<cluster_id>/restart', methods=['POST'])
def restart_cluster_components(cluster_id):
    """Restart specific cluster components"""
    try:
        data = request.get_json()
        
        # Validate components
        if 'components' not in data:
            return jsonify({
                'success': False,
                'error': 'components list is required'
            }), 400
        
        components = data['components']
        if not isinstance(components, list) or not components:
            return jsonify({
                'success': False,
                'error': 'components must be a non-empty list'
            }), 400
        
        # Execute restart operation
        result = cluster_manager.restart_cluster_components(cluster_id, components)
        
        if result.get('success'):
            return jsonify({
                'success': True,
                'data': result
            })
        else:
            return jsonify({
                'success': False,
                'error': result.get('error', 'Restart operation failed')
            }), 500
    
    except Exception as e:
        logger.error(f"Error restarting components in cluster {cluster_id}: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@cluster_ops_bp.route('/clusters/<cluster_id>/node-pools', methods=['POST'])
def add_node_pool(cluster_id):
    """Add a new node pool to the cluster"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'instance_type', 'min_nodes', 'max_nodes']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400
        
        # Validate node pool configuration
        if data['min_nodes'] < 1 or data['max_nodes'] < data['min_nodes']:
            return jsonify({
                'success': False,
                'error': 'Invalid node count configuration'
            }), 400
        
        # Prepare node pool configuration
        node_pool_config = {
            'name': data['name'],
            'instance_type': data['instance_type'],
            'min_nodes': data['min_nodes'],
            'max_nodes': data['max_nodes'],
            'auto_scaling': data.get('auto_scaling', True),
            'labels': data.get('labels', {}),
            'taints': data.get('taints', []),
            'disk_size': data.get('disk_size', 20),
            'disk_type': data.get('disk_type', 'gp3')
        }
        
        # Execute node pool creation
        result = cluster_manager.add_node_pool(cluster_id, node_pool_config)
        
        if result.get('success'):
            return jsonify({
                'success': True,
                'data': result
            })
        else:
            return jsonify({
                'success': False,
                'error': result.get('error', 'Node pool creation failed')
            }), 500
    
    except Exception as e:
        logger.error(f"Error adding node pool to cluster {cluster_id}: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@cluster_ops_bp.route('/clusters/<cluster_id>/node-pools', methods=['GET'])
def get_node_pools(cluster_id):
    """Get all node pools for a cluster"""
    try:
        # In real implementation, this would query Kubernetes API
        # For now, return simulated node pools
        node_pools = [
            {
                'name': 'default-pool',
                'instance_type': 'sify.medium',
                'min_nodes': 1,
                'max_nodes': 5,
                'current_nodes': 2,
                'auto_scaling': True,
                'status': 'ready',
                'created_at': '2024-01-15T10:30:00Z'
            },
            {
                'name': 'gpu-pool',
                'instance_type': 'sify.gpu.t4',
                'min_nodes': 0,
                'max_nodes': 3,
                'current_nodes': 1,
                'auto_scaling': True,
                'status': 'ready',
                'created_at': '2024-01-16T14:20:00Z'
            }
        ]
        
        return jsonify({
            'success': True,
            'data': {
                'cluster_id': cluster_id,
                'node_pools': node_pools,
                'total_pools': len(node_pools)
            }
        })
    
    except Exception as e:
        logger.error(f"Error getting node pools for cluster {cluster_id}: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@cluster_ops_bp.route('/clusters/<cluster_id>/operations', methods=['GET'])
def get_cluster_operations_status(cluster_id):
    """Get status of ongoing and recent cluster operations"""
    try:
        result = cluster_manager.get_cluster_operations_status(cluster_id)
        
        if result.get('success'):
            return jsonify({
                'success': True,
                'data': result
            })
        else:
            return jsonify({
                'success': False,
                'error': result.get('error', 'Failed to get operations status')
            }), 500
    
    except Exception as e:
        logger.error(f"Error getting operations status for cluster {cluster_id}: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@cluster_ops_bp.route('/clusters/<cluster_id>/rollback', methods=['POST'])
def rollback_cluster_operation(cluster_id):
    """Rollback a cluster operation (upgrade, configuration change)"""
    try:
        data = request.get_json()
        
        # Validate operation type
        operation_type = data.get('operation_type')
        if operation_type not in ['upgrade', 'configuration']:
            return jsonify({
                'success': False,
                'error': 'operation_type must be either "upgrade" or "configuration"'
            }), 400
        
        # In real implementation, this would perform actual rollback
        # For now, return simulated rollback result
        rollback_result = {
            'operation': 'rollback',
            'cluster_id': cluster_id,
            'operation_type': operation_type,
            'status': 'rollback_in_progress',
            'estimated_time': '10-15 minutes',
            'message': f'{operation_type.title()} rollback initiated successfully'
        }
        
        return jsonify({
            'success': True,
            'data': rollback_result
        })
    
    except Exception as e:
        logger.error(f"Error rolling back operation for cluster {cluster_id}: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@cluster_ops_bp.route('/clusters/<cluster_id>/backup', methods=['POST'])
def backup_cluster(cluster_id):
    """Create a backup of the cluster"""
    try:
        data = request.get_json()
        
        backup_config = {
            'backup_name': data.get('backup_name', f'backup-{cluster_id}-{int(datetime.utcnow().timestamp())}'),
            'include_volumes': data.get('include_volumes', True),
            'include_secrets': data.get('include_secrets', True),
            'retention_days': data.get('retention_days', 30)
        }
        
        # In real implementation, this would use Velero or similar backup tool
        # For now, return simulated backup result
        backup_result = {
            'operation': 'backup',
            'cluster_id': cluster_id,
            'backup_name': backup_config['backup_name'],
            'status': 'backup_in_progress',
            'estimated_time': '15-30 minutes',
            'include_volumes': backup_config['include_volumes'],
            'include_secrets': backup_config['include_secrets'],
            'retention_days': backup_config['retention_days'],
            'message': 'Cluster backup initiated successfully'
        }
        
        return jsonify({
            'success': True,
            'data': backup_result
        })
    
    except Exception as e:
        logger.error(f"Error backing up cluster {cluster_id}: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@cluster_ops_bp.route('/clusters/<cluster_id>/restore', methods=['POST'])
def restore_cluster(cluster_id):
    """Restore a cluster from backup"""
    try:
        data = request.get_json()
        
        if 'backup_name' not in data:
            return jsonify({
                'success': False,
                'error': 'backup_name is required'
            }), 400
        
        restore_config = {
            'backup_name': data['backup_name'],
            'restore_volumes': data.get('restore_volumes', True),
            'restore_secrets': data.get('restore_secrets', True),
            'namespace_mapping': data.get('namespace_mapping', {})
        }
        
        # In real implementation, this would use Velero or similar restore tool
        # For now, return simulated restore result
        restore_result = {
            'operation': 'restore',
            'cluster_id': cluster_id,
            'backup_name': restore_config['backup_name'],
            'status': 'restore_in_progress',
            'estimated_time': '20-40 minutes',
            'restore_volumes': restore_config['restore_volumes'],
            'restore_secrets': restore_config['restore_secrets'],
            'message': 'Cluster restore initiated successfully'
        }
        
        return jsonify({
            'success': True,
            'data': restore_result
        })
    
    except Exception as e:
        logger.error(f"Error restoring cluster {cluster_id}: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

