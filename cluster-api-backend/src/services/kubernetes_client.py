import os
import yaml
import json
import time
from datetime import datetime, timedelta
from kubernetes import client, config
from kubernetes.client.rest import ApiException
import subprocess
import tempfile
import logging

logger = logging.getLogger(__name__)

class KubernetesClient:
    """Kubernetes client for cluster operations and Cluster-API integration"""
    
    def __init__(self):
        self.api_client = None
        self.core_v1 = None
        self.apps_v1 = None
        self.custom_objects_api = None
        self.connected = False
        self.initialize_client()
    
    def initialize_client(self):
        """Initialize Kubernetes client"""
        try:
            # Try in-cluster config first
            config.load_incluster_config()
            logger.info("Loaded in-cluster Kubernetes config")
        except:
            try:
                # Fall back to local kubeconfig
                config.load_kube_config()
                logger.info("Loaded local Kubernetes config")
            except Exception as e:
                logger.warning(f"Could not load Kubernetes config: {e}. Running in disconnected mode.")
                self.connected = False
                return

        self.api_client = client.ApiClient()
        self.core_v1 = client.CoreV1Api()
        self.apps_v1 = client.AppsV1Api()
        self.custom_objects_api = client.CustomObjectsApi()
        self.connected = True
    
    def is_connected(self):
        """Check if Kubernetes client is connected"""
        return self.connected
    
    def get_cluster_info(self):
        """Get current cluster information"""
        if not self.is_connected():
            return None
        
        try:
            version = client.VersionApi().get_code()
            nodes = self.core_v1.list_node()
            
            return {
                'version': version.git_version,
                'node_count': len(nodes.items),
                'nodes': [
                    {
                        'name': node.metadata.name,
                        'status': self._get_node_status(node),
                        'version': node.status.node_info.kubelet_version,
                        'os': node.status.node_info.os_image
                    }
                    for node in nodes.items
                ]
            }
        except Exception as e:
            logger.error(f"Error getting cluster info: {e}")
            return None
    
    def _get_node_status(self, node):
        """Get node status from conditions"""
        for condition in node.status.conditions:
            if condition.type == "Ready":
                return "Ready" if condition.status == "True" else "NotReady"
        return "Unknown"

class ClusterAPIManager:
    """Manager for Cluster-API operations"""
    
    def __init__(self, k8s_client: KubernetesClient):
        self.k8s_client = k8s_client
        self.capi_group = "cluster.x-k8s.io"
        self.capi_version = "v1beta1"
        
    def is_cluster_api_installed(self):
        """Check if Cluster-API is installed"""
        if not self.k8s_client.is_connected():
            return False
        
        try:
            # Check for CAPI CRDs
            api_instance = client.ApiextensionsV1Api()
            crds = api_instance.list_custom_resource_definition()
            
            capi_crds = [
                "clusters.cluster.x-k8s.io",
                "machines.cluster.x-k8s.io",
                "machinesets.cluster.x-k8s.io"
            ]
            
            found_crds = [crd.metadata.name for crd in crds.items]
            return all(crd in found_crds for crd in capi_crds)
        except Exception as e:
            logger.error(f"Error checking Cluster-API installation: {e}")
            return False
    
    def install_cluster_api(self):
        """Install Cluster-API controllers"""
        if not self.k8s_client.is_connected():
            return False, "Kubernetes client not connected"
        
        try:
            # Install CAPI core components
            capi_version = "v1.6.0"
            capi_url = f"https://github.com/kubernetes-sigs/cluster-api/releases/download/{capi_version}/cluster-api-components.yaml"
            
            # Download and apply CAPI manifests
            result = subprocess.run([
                "kubectl", "apply", "-f", capi_url
            ], capture_output=True, text=True)
            
            if result.returncode != 0:
                return False, f"Failed to install Cluster-API: {result.stderr}"
            
            # Wait for CAPI controllers to be ready
            time.sleep(30)
            
            return True, "Cluster-API installed successfully"
        except Exception as e:
            logger.error(f"Error installing Cluster-API: {e}")
            return False, str(e)
    
    def install_provider(self, provider_name, provider_version=None):
        """Install a specific infrastructure provider"""
        if not self.k8s_client.is_connected():
            return False, "Kubernetes client not connected"
        
        provider_configs = {
            "aws": {
                "name": "cluster-api-provider-aws",
                "version": "v2.3.0",
                "url_template": "https://github.com/kubernetes-sigs/cluster-api-provider-aws/releases/download/{version}/infrastructure-components.yaml"
            },
            "gcp": {
                "name": "cluster-api-provider-gcp",
                "version": "v1.5.0",
                "url_template": "https://github.com/kubernetes-sigs/cluster-api-provider-gcp/releases/download/{version}/infrastructure-components.yaml"
            },
            "azure": {
                "name": "cluster-api-provider-azure",
                "version": "v1.13.0",
                "url_template": "https://github.com/kubernetes-sigs/cluster-api-provider-azure/releases/download/{version}/infrastructure-components.yaml"
            },
            "vsphere": {
                "name": "cluster-api-provider-vsphere",
                "version": "v1.8.0",
                "url_template": "https://github.com/kubernetes-sigs/cluster-api-provider-vsphere/releases/download/{version}/infrastructure-components.yaml"
            }
        }
        
        if provider_name not in provider_configs:
            return False, f"Unsupported provider: {provider_name}"
        
        try:
            config = provider_configs[provider_name]
            version = provider_version or config["version"]
            url = config["url_template"].format(version=version)
            
            # Apply provider manifests
            result = subprocess.run([
                "kubectl", "apply", "-f", url
            ], capture_output=True, text=True)
            
            if result.returncode != 0:
                return False, f"Failed to install {provider_name} provider: {result.stderr}"
            
            return True, f"{provider_name} provider installed successfully"
        except Exception as e:
            logger.error(f"Error installing {provider_name} provider: {e}")
            return False, str(e)
    
    def create_cluster(self, cluster_config):
        """Create a new cluster using Cluster-API"""
        if not self.k8s_client.is_connected():
            return self._simulate_cluster_creation(cluster_config)
        
        try:
            # Generate cluster manifests
            manifests = self._generate_cluster_manifests(cluster_config)
            
            # Apply manifests to create cluster
            for manifest in manifests:
                self._apply_manifest(manifest)
            
            # Return cluster creation status
            return {
                'success': True,
                'cluster_id': cluster_config['name'],
                'status': 'creating',
                'message': 'Cluster creation initiated',
                'manifests_applied': len(manifests)
            }
        except Exception as e:
            logger.error(f"Error creating cluster: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _simulate_cluster_creation(self, cluster_config):
        """Simulate cluster creation for development"""
        return {
            'success': True,
            'cluster_id': cluster_config['name'],
            'status': 'creating',
            'message': 'Cluster creation simulated (development mode)',
            'estimated_time': '15-20 minutes',
            'provider': cluster_config.get('provider', 'unknown'),
            'region': cluster_config.get('region', 'unknown'),
            'node_count': cluster_config.get('node_count', 3)
        }
    
    def _generate_cluster_manifests(self, cluster_config):
        """Generate Cluster-API manifests for cluster creation"""
        manifests = []
        
        # Cluster manifest
        cluster_manifest = {
            'apiVersion': f'{self.capi_group}/{self.capi_version}',
            'kind': 'Cluster',
            'metadata': {
                'name': cluster_config['name'],
                'namespace': cluster_config.get('namespace', 'default')
            },
            'spec': {
                'clusterNetwork': {
                    'pods': {
                        'cidrBlocks': [cluster_config.get('pod_cidr', '192.168.0.0/16')]
                    }
                },
                'infrastructureRef': {
                    'apiVersion': self._get_infrastructure_api_version(cluster_config['provider']),
                    'kind': self._get_infrastructure_cluster_kind(cluster_config['provider']),
                    'name': f"{cluster_config['name']}-cluster"
                },
                'controlPlaneRef': {
                    'apiVersion': 'controlplane.cluster.x-k8s.io/v1beta1',
                    'kind': 'KubeadmControlPlane',
                    'name': f"{cluster_config['name']}-control-plane"
                }
            }
        }
        manifests.append(cluster_manifest)
        
        # Infrastructure cluster manifest
        infra_cluster = self._generate_infrastructure_cluster(cluster_config)
        manifests.append(infra_cluster)
        
        # Control plane manifest
        control_plane = self._generate_control_plane(cluster_config)
        manifests.append(control_plane)
        
        # Worker nodes manifest
        worker_nodes = self._generate_worker_nodes(cluster_config)
        manifests.extend(worker_nodes)
        
        return manifests
    
    def _get_infrastructure_api_version(self, provider):
        """Get infrastructure API version for provider"""
        versions = {
            'aws': 'infrastructure.cluster.x-k8s.io/v1beta2',
            'gcp': 'infrastructure.cluster.x-k8s.io/v1beta1',
            'azure': 'infrastructure.cluster.x-k8s.io/v1beta1',
            'vsphere': 'infrastructure.cluster.x-k8s.io/v1beta1'
        }
        return versions.get(provider, 'infrastructure.cluster.x-k8s.io/v1beta1')
    
    def _get_infrastructure_cluster_kind(self, provider):
        """Get infrastructure cluster kind for provider"""
        kinds = {
            'aws': 'AWSCluster',
            'gcp': 'GCPCluster',
            'azure': 'AzureCluster',
            'vsphere': 'VSphereCluster'
        }
        return kinds.get(provider, 'GenericCluster')
    
    def _generate_infrastructure_cluster(self, cluster_config):
        """Generate infrastructure-specific cluster manifest"""
        provider = cluster_config['provider']
        
        if provider == 'aws':
            return self._generate_aws_cluster(cluster_config)
        elif provider == 'gcp':
            return self._generate_gcp_cluster(cluster_config)
        elif provider == 'azure':
            return self._generate_azure_cluster(cluster_config)
        elif provider == 'vsphere':
            return self._generate_vsphere_cluster(cluster_config)
        else:
            raise ValueError(f"Unsupported provider: {provider}")
    
    def _generate_aws_cluster(self, cluster_config):
        """Generate AWS cluster manifest"""
        return {
            'apiVersion': 'infrastructure.cluster.x-k8s.io/v1beta2',
            'kind': 'AWSCluster',
            'metadata': {
                'name': f"{cluster_config['name']}-cluster",
                'namespace': cluster_config.get('namespace', 'default')
            },
            'spec': {
                'region': cluster_config['region'],
                'sshKeyName': cluster_config.get('ssh_key_name', 'default'),
                'networkSpec': {
                    'vpc': {
                        'cidrBlock': cluster_config.get('vpc_cidr', '10.0.0.0/16')
                    }
                }
            }
        }
    
    def _generate_gcp_cluster(self, cluster_config):
        """Generate GCP cluster manifest"""
        return {
            'apiVersion': 'infrastructure.cluster.x-k8s.io/v1beta1',
            'kind': 'GCPCluster',
            'metadata': {
                'name': f"{cluster_config['name']}-cluster",
                'namespace': cluster_config.get('namespace', 'default')
            },
            'spec': {
                'project': cluster_config['project_id'],
                'region': cluster_config['region'],
                'network': {
                    'name': f"{cluster_config['name']}-network"
                }
            }
        }
    
    def _generate_azure_cluster(self, cluster_config):
        """Generate Azure cluster manifest"""
        return {
            'apiVersion': 'infrastructure.cluster.x-k8s.io/v1beta1',
            'kind': 'AzureCluster',
            'metadata': {
                'name': f"{cluster_config['name']}-cluster",
                'namespace': cluster_config.get('namespace', 'default')
            },
            'spec': {
                'location': cluster_config['region'],
                'resourceGroup': cluster_config.get('resource_group', f"{cluster_config['name']}-rg"),
                'subscriptionID': cluster_config['subscription_id'],
                'networkSpec': {
                    'vnet': {
                        'cidrBlocks': [cluster_config.get('vpc_cidr', '10.0.0.0/16')]
                    }
                }
            }
        }
    
    def _generate_vsphere_cluster(self, cluster_config):
        """Generate vSphere cluster manifest"""
        return {
            'apiVersion': 'infrastructure.cluster.x-k8s.io/v1beta1',
            'kind': 'VSphereCluster',
            'metadata': {
                'name': f"{cluster_config['name']}-cluster",
                'namespace': cluster_config.get('namespace', 'default')
            },
            'spec': {
                'server': cluster_config['vcenter_server'],
                'thumbprint': cluster_config.get('thumbprint', ''),
                'controlPlaneEndpoint': {
                    'host': cluster_config.get('control_plane_endpoint', ''),
                    'port': 6443
                }
            }
        }
    
    def _generate_control_plane(self, cluster_config):
        """Generate control plane manifest"""
        return {
            'apiVersion': 'controlplane.cluster.x-k8s.io/v1beta1',
            'kind': 'KubeadmControlPlane',
            'metadata': {
                'name': f"{cluster_config['name']}-control-plane",
                'namespace': cluster_config.get('namespace', 'default')
            },
            'spec': {
                'replicas': cluster_config.get('control_plane_replicas', 1),
                'version': cluster_config['kubernetes_version'],
                'machineTemplate': {
                    'infrastructureRef': {
                        'apiVersion': self._get_infrastructure_api_version(cluster_config['provider']),
                        'kind': self._get_infrastructure_machine_kind(cluster_config['provider']),
                        'name': f"{cluster_config['name']}-control-plane-template"
                    }
                },
                'kubeadmConfigSpec': {
                    'initConfiguration': {
                        'nodeRegistration': {
                            'kubeletExtraArgs': {
                                'cloud-provider': 'external'
                            }
                        }
                    },
                    'joinConfiguration': {
                        'nodeRegistration': {
                            'kubeletExtraArgs': {
                                'cloud-provider': 'external'
                            }
                        }
                    }
                }
            }
        }
    
    def _get_infrastructure_machine_kind(self, provider):
        """Get infrastructure machine kind for provider"""
        kinds = {
            'aws': 'AWSMachineTemplate',
            'gcp': 'GCPMachineTemplate',
            'azure': 'AzureMachineTemplate',
            'vsphere': 'VSphereMachineTemplate'
        }
        return kinds.get(provider, 'GenericMachineTemplate')
    
    def _generate_worker_nodes(self, cluster_config):
        """Generate worker node manifests"""
        manifests = []
        
        # MachineDeployment for worker nodes
        machine_deployment = {
            'apiVersion': f'{self.capi_group}/{self.capi_version}',
            'kind': 'MachineDeployment',
            'metadata': {
                'name': f"{cluster_config['name']}-workers",
                'namespace': cluster_config.get('namespace', 'default')
            },
            'spec': {
                'clusterName': cluster_config['name'],
                'replicas': cluster_config.get('worker_replicas', 2),
                'selector': {
                    'matchLabels': {
                        'cluster.x-k8s.io/cluster-name': cluster_config['name']
                    }
                },
                'template': {
                    'spec': {
                        'clusterName': cluster_config['name'],
                        'version': cluster_config['kubernetes_version'],
                        'infrastructureRef': {
                            'apiVersion': self._get_infrastructure_api_version(cluster_config['provider']),
                            'kind': self._get_infrastructure_machine_kind(cluster_config['provider']),
                            'name': f"{cluster_config['name']}-worker-template"
                        },
                        'bootstrap': {
                            'configRef': {
                                'apiVersion': 'bootstrap.cluster.x-k8s.io/v1beta1',
                                'kind': 'KubeadmConfigTemplate',
                                'name': f"{cluster_config['name']}-worker-bootstrap"
                            }
                        }
                    }
                }
            }
        }
        manifests.append(machine_deployment)
        
        return manifests
    
    def _apply_manifest(self, manifest):
        """Apply a Kubernetes manifest"""
        if not self.k8s_client.is_connected():
            logger.info(f"Would apply manifest: {manifest['kind']}/{manifest['metadata']['name']}")
            return
        
        try:
            # Convert manifest to YAML and apply
            with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as f:
                yaml.dump(manifest, f)
                f.flush()
                
                result = subprocess.run([
                    "kubectl", "apply", "-f", f.name
                ], capture_output=True, text=True)
                
                if result.returncode != 0:
                    raise Exception(f"Failed to apply manifest: {result.stderr}")
                
                logger.info(f"Applied manifest: {manifest['kind']}/{manifest['metadata']['name']}")
        except Exception as e:
            logger.error(f"Error applying manifest: {e}")
            raise
    
    def get_cluster_status(self, cluster_name, namespace='default'):
        """Get cluster status"""
        if not self.k8s_client.is_connected():
            return self._simulate_cluster_status(cluster_name)
        
        try:
            # Get cluster object
            cluster = self.k8s_client.custom_objects_api.get_namespaced_custom_object(
                group=self.capi_group,
                version=self.capi_version,
                namespace=namespace,
                plural='clusters',
                name=cluster_name
            )
            
            # Extract status information
            status = cluster.get('status', {})
            phase = status.get('phase', 'Unknown')
            conditions = status.get('conditions', [])
            
            return {
                'name': cluster_name,
                'phase': phase,
                'ready': phase == 'Provisioned',
                'conditions': conditions,
                'infrastructure_ready': status.get('infrastructureReady', False),
                'control_plane_ready': status.get('controlPlaneReady', False)
            }
        except ApiException as e:
            if e.status == 404:
                return {'name': cluster_name, 'phase': 'NotFound', 'ready': False}
            raise
        except Exception as e:
            logger.error(f"Error getting cluster status: {e}")
            return {'name': cluster_name, 'phase': 'Error', 'ready': False, 'error': str(e)}
    
    def _simulate_cluster_status(self, cluster_name):
        """Simulate cluster status for development"""
        # Simulate different phases based on cluster name or time
        import random
        phases = ['Pending', 'Provisioning', 'Provisioned', 'Failed']
        phase = random.choice(phases)
        
        return {
            'name': cluster_name,
            'phase': phase,
            'ready': phase == 'Provisioned',
            'simulated': True,
            'infrastructure_ready': phase in ['Provisioning', 'Provisioned'],
            'control_plane_ready': phase == 'Provisioned'
        }
    
    def delete_cluster(self, cluster_name, namespace='default'):
        """Delete a cluster"""
        if not self.k8s_client.is_connected():
            return {'success': True, 'message': f'Cluster {cluster_name} deletion simulated'}
        
        try:
            # Delete cluster object (cascades to all related resources)
            self.k8s_client.custom_objects_api.delete_namespaced_custom_object(
                group=self.capi_group,
                version=self.capi_version,
                namespace=namespace,
                plural='clusters',
                name=cluster_name
            )
            
            return {'success': True, 'message': f'Cluster {cluster_name} deletion initiated'}
        except ApiException as e:
            if e.status == 404:
                return {'success': False, 'error': f'Cluster {cluster_name} not found'}
            raise
        except Exception as e:
            logger.error(f"Error deleting cluster: {e}")
            return {'success': False, 'error': str(e)}
    
    def scale_cluster(self, cluster_name, worker_count, namespace='default'):
        """Scale cluster worker nodes"""
        if not self.k8s_client.is_connected():
            return {'success': True, 'message': f'Cluster {cluster_name} scaling to {worker_count} workers simulated'}
        
        try:
            # Get MachineDeployment for workers
            machine_deployment = self.k8s_client.custom_objects_api.get_namespaced_custom_object(
                group=self.capi_group,
                version=self.capi_version,
                namespace=namespace,
                plural='machinedeployments',
                name=f'{cluster_name}-workers'
            )
            
            # Update replica count
            machine_deployment['spec']['replicas'] = worker_count
            
            # Apply updated MachineDeployment
            self.k8s_client.custom_objects_api.patch_namespaced_custom_object(
                group=self.capi_group,
                version=self.capi_version,
                namespace=namespace,
                plural='machinedeployments',
                name=f'{cluster_name}-workers',
                body=machine_deployment
            )
            
            return {'success': True, 'message': f'Cluster {cluster_name} scaling to {worker_count} workers'}
        except Exception as e:
            logger.error(f"Error scaling cluster: {e}")
            return {'success': False, 'error': str(e)}

