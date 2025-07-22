import os
import json
import time
import logging
import subprocess
import tempfile
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import yaml

logger = logging.getLogger(__name__)

class InfrastructureProvisioner:
    """Service for provisioning cloud infrastructure for Kubernetes clusters"""
    
    def __init__(self):
        self.supported_providers = ['aws', 'gcp', 'azure', 'vsphere', 'sify']
        self.provider_configs = self._load_provider_configs()
    
    def _load_provider_configs(self):
        """Load provider-specific configuration templates"""
        return {
            'aws': {
                'required_credentials': ['access_key_id', 'secret_access_key'],
                'optional_credentials': ['session_token', 'region'],
                'default_region': 'us-west-2',
                'default_instance_type': 't3.medium',
                'supported_instance_types': [
                    't3.micro', 't3.small', 't3.medium', 't3.large', 't3.xlarge',
                    'm5.large', 'm5.xlarge', 'm5.2xlarge', 'm5.4xlarge',
                    'c5.large', 'c5.xlarge', 'c5.2xlarge', 'c5.4xlarge',
                    'r5.large', 'r5.xlarge', 'r5.2xlarge', 'r5.4xlarge',
                    # GPU instances
                    'p3.2xlarge', 'p3.8xlarge', 'p3.16xlarge',
                    'p4d.24xlarge', 'g4dn.xlarge', 'g4dn.2xlarge'
                ],
                'gpu_instances': ['p3.2xlarge', 'p3.8xlarge', 'p3.16xlarge', 'p4d.24xlarge', 'g4dn.xlarge', 'g4dn.2xlarge']
            },
            'gcp': {
                'required_credentials': ['service_account_json'],
                'optional_credentials': ['project_id', 'region'],
                'default_region': 'us-central1',
                'default_machine_type': 'e2-medium',
                'supported_machine_types': [
                    'e2-micro', 'e2-small', 'e2-medium', 'e2-standard-2', 'e2-standard-4',
                    'n1-standard-1', 'n1-standard-2', 'n1-standard-4', 'n1-standard-8',
                    'n2-standard-2', 'n2-standard-4', 'n2-standard-8', 'n2-standard-16',
                    'c2-standard-4', 'c2-standard-8', 'c2-standard-16',
                    # GPU instances
                    'n1-standard-4-k80', 'n1-standard-8-v100', 'a2-highgpu-1g'
                ],
                'gpu_instances': ['n1-standard-4-k80', 'n1-standard-8-v100', 'a2-highgpu-1g']
            },
            'azure': {
                'required_credentials': ['client_id', 'client_secret', 'tenant_id', 'subscription_id'],
                'optional_credentials': ['resource_group'],
                'default_region': 'East US',
                'default_vm_size': 'Standard_B2s',
                'supported_vm_sizes': [
                    'Standard_B1s', 'Standard_B2s', 'Standard_B4ms', 'Standard_B8ms',
                    'Standard_D2s_v3', 'Standard_D4s_v3', 'Standard_D8s_v3', 'Standard_D16s_v3',
                    'Standard_F2s_v2', 'Standard_F4s_v2', 'Standard_F8s_v2', 'Standard_F16s_v2',
                    # GPU instances
                    'Standard_NC6', 'Standard_NC12', 'Standard_NC24', 'Standard_NV6', 'Standard_NV12'
                ],
                'gpu_instances': ['Standard_NC6', 'Standard_NC12', 'Standard_NC24', 'Standard_NV6', 'Standard_NV12']
            },
            'vsphere': {
                'required_credentials': ['vcenter_server', 'username', 'password'],
                'optional_credentials': ['datacenter', 'datastore', 'network', 'template'],
                'default_template': 'ubuntu-20.04-template',
                'default_cpu': 2,
                'default_memory': 4096,
                'supported_configurations': [
                    {'cpu': 1, 'memory': 2048, 'name': 'small'},
                    {'cpu': 2, 'memory': 4096, 'name': 'medium'},
                    {'cpu': 4, 'memory': 8192, 'name': 'large'},
                    {'cpu': 8, 'memory': 16384, 'name': 'xlarge'}
                ]
            },
            'sify': {
                'required_credentials': ['api_key', 'api_secret'],
                'optional_credentials': ['endpoint_url', 'region'],
                'default_region': 'mumbai-1',
                'default_flavor': 'sify.medium',
                'supported_flavors': [
                    'sify.micro', 'sify.small', 'sify.medium', 'sify.large', 'sify.xlarge',
                    'sify.compute.large', 'sify.compute.xlarge', 'sify.compute.2xlarge',
                    'sify.memory.large', 'sify.memory.xlarge', 'sify.memory.2xlarge',
                    # GPU flavors
                    'sify.gpu.t4', 'sify.gpu.v100', 'sify.gpu.a100'
                ],
                'gpu_flavors': ['sify.gpu.t4', 'sify.gpu.v100', 'sify.gpu.a100']
            }
        }
    
    def validate_provider_config(self, provider: str, config: Dict) -> Tuple[bool, str]:
        """Validate provider configuration"""
        if provider not in self.supported_providers:
            return False, f"Unsupported provider: {provider}"
        
        provider_config = self.provider_configs[provider]
        required_creds = provider_config['required_credentials']
        
        # Check required credentials
        for cred in required_creds:
            if cred not in config:
                return False, f"Missing required credential: {cred}"
        
        return True, "Configuration valid"
    
    def prepare_infrastructure(self, cluster_config: Dict, cloud_account: Dict) -> Dict:
        """Prepare infrastructure configuration for cluster creation"""
        try:
            provider = cluster_config['provider']
            
            # Validate provider configuration
            is_valid, message = self.validate_provider_config(provider, cloud_account)
            if not is_valid:
                return {'success': False, 'error': message}
            
            # Generate infrastructure manifests
            if provider == 'aws':
                return self._prepare_aws_infrastructure(cluster_config, cloud_account)
            elif provider == 'gcp':
                return self._prepare_gcp_infrastructure(cluster_config, cloud_account)
            elif provider == 'azure':
                return self._prepare_azure_infrastructure(cluster_config, cloud_account)
            elif provider == 'vsphere':
                return self._prepare_vsphere_infrastructure(cluster_config, cloud_account)
            elif provider == 'sify':
                return self._prepare_sify_infrastructure(cluster_config, cloud_account)
            else:
                return {'success': False, 'error': f'Unsupported provider: {provider}'}
        
        except Exception as e:
            logger.error(f"Error preparing infrastructure: {e}")
            return {'success': False, 'error': str(e)}
    
    def _prepare_aws_infrastructure(self, cluster_config: Dict, cloud_account: Dict) -> Dict:
        """Prepare AWS infrastructure configuration"""
        try:
            # Generate AWS-specific manifests
            manifests = []
            
            # AWS Cluster manifest
            aws_cluster = {
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
                            'cidrBlock': cluster_config.get('vpc_cidr', '10.0.0.0/16'),
                            'tags': {
                                'Name': f"{cluster_config['name']}-vpc",
                                'kubernetes.io/cluster/' + cluster_config['name']: 'owned'
                            }
                        },
                        'subnets': [
                            {
                                'cidrBlock': '10.0.1.0/24',
                                'availabilityZone': f"{cluster_config['region']}a",
                                'isPublic': True,
                                'tags': {
                                    'Name': f"{cluster_config['name']}-public-subnet-1",
                                    'kubernetes.io/role/elb': '1'
                                }
                            },
                            {
                                'cidrBlock': '10.0.2.0/24',
                                'availabilityZone': f"{cluster_config['region']}b",
                                'isPublic': True,
                                'tags': {
                                    'Name': f"{cluster_config['name']}-public-subnet-2",
                                    'kubernetes.io/role/elb': '1'
                                }
                            },
                            {
                                'cidrBlock': '10.0.3.0/24',
                                'availabilityZone': f"{cluster_config['region']}a",
                                'isPublic': False,
                                'tags': {
                                    'Name': f"{cluster_config['name']}-private-subnet-1",
                                    'kubernetes.io/role/internal-elb': '1'
                                }
                            },
                            {
                                'cidrBlock': '10.0.4.0/24',
                                'availabilityZone': f"{cluster_config['region']}b",
                                'isPublic': False,
                                'tags': {
                                    'Name': f"{cluster_config['name']}-private-subnet-2",
                                    'kubernetes.io/role/internal-elb': '1'
                                }
                            }
                        ]
                    }
                }
            }
            manifests.append(aws_cluster)
            
            # AWS Machine Template for control plane
            control_plane_template = {
                'apiVersion': 'infrastructure.cluster.x-k8s.io/v1beta2',
                'kind': 'AWSMachineTemplate',
                'metadata': {
                    'name': f"{cluster_config['name']}-control-plane-template",
                    'namespace': cluster_config.get('namespace', 'default')
                },
                'spec': {
                    'template': {
                        'spec': {
                            'instanceType': cluster_config.get('control_plane_instance_type', 't3.medium'),
                            'iamInstanceProfile': 'control-plane.cluster-api-provider-aws.sigs.k8s.io',
                            'sshKeyName': cluster_config.get('ssh_key_name', 'default'),
                            'subnet': {
                                'filters': [
                                    {
                                        'name': 'tag:Name',
                                        'values': [f"{cluster_config['name']}-private-subnet-*"]
                                    }
                                ]
                            },
                            'securityGroups': [
                                {
                                    'filters': [
                                        {
                                            'name': 'tag:Name',
                                            'values': [f"{cluster_config['name']}-controlplane-sg"]
                                        }
                                    ]
                                }
                            ]
                        }
                    }
                }
            }
            manifests.append(control_plane_template)
            
            # AWS Machine Template for worker nodes
            worker_template = {
                'apiVersion': 'infrastructure.cluster.x-k8s.io/v1beta2',
                'kind': 'AWSMachineTemplate',
                'metadata': {
                    'name': f"{cluster_config['name']}-worker-template",
                    'namespace': cluster_config.get('namespace', 'default')
                },
                'spec': {
                    'template': {
                        'spec': {
                            'instanceType': cluster_config.get('worker_instance_type', 't3.medium'),
                            'iamInstanceProfile': 'nodes.cluster-api-provider-aws.sigs.k8s.io',
                            'sshKeyName': cluster_config.get('ssh_key_name', 'default'),
                            'subnet': {
                                'filters': [
                                    {
                                        'name': 'tag:Name',
                                        'values': [f"{cluster_config['name']}-private-subnet-*"]
                                    }
                                ]
                            },
                            'securityGroups': [
                                {
                                    'filters': [
                                        {
                                            'name': 'tag:Name',
                                            'values': [f"{cluster_config['name']}-node-sg"]
                                        }
                                    ]
                                }
                            ]
                        }
                    }
                }
            }
            manifests.append(worker_template)
            
            # Add GPU support if requested
            if cluster_config.get('enable_gpu', False):
                gpu_template = {
                    'apiVersion': 'infrastructure.cluster.x-k8s.io/v1beta2',
                    'kind': 'AWSMachineTemplate',
                    'metadata': {
                        'name': f"{cluster_config['name']}-gpu-template",
                        'namespace': cluster_config.get('namespace', 'default')
                    },
                    'spec': {
                        'template': {
                            'spec': {
                                'instanceType': cluster_config.get('gpu_instance_type', 'p3.2xlarge'),
                                'iamInstanceProfile': 'nodes.cluster-api-provider-aws.sigs.k8s.io',
                                'sshKeyName': cluster_config.get('ssh_key_name', 'default'),
                                'subnet': {
                                    'filters': [
                                        {
                                            'name': 'tag:Name',
                                            'values': [f"{cluster_config['name']}-private-subnet-*"]
                                        }
                                    ]
                                },
                                'securityGroups': [
                                    {
                                        'filters': [
                                            {
                                                'name': 'tag:Name',
                                                'values': [f"{cluster_config['name']}-node-sg"]
                                            }
                                        ]
                                    }
                                ],
                                'userData': self._generate_gpu_userdata()
                            }
                        }
                    }
                }
                manifests.append(gpu_template)
            
            return {
                'success': True,
                'manifests': manifests,
                'provider': 'aws',
                'estimated_time': '15-20 minutes',
                'resources': {
                    'vpc': 1,
                    'subnets': 4,
                    'security_groups': 2,
                    'instances': cluster_config.get('control_plane_replicas', 1) + cluster_config.get('worker_replicas', 2)
                }
            }
        
        except Exception as e:
            logger.error(f"Error preparing AWS infrastructure: {e}")
            return {'success': False, 'error': str(e)}
    
    def _prepare_gcp_infrastructure(self, cluster_config: Dict, cloud_account: Dict) -> Dict:
        """Prepare GCP infrastructure configuration"""
        try:
            manifests = []
            
            # GCP Cluster manifest
            gcp_cluster = {
                'apiVersion': 'infrastructure.cluster.x-k8s.io/v1beta1',
                'kind': 'GCPCluster',
                'metadata': {
                    'name': f"{cluster_config['name']}-cluster",
                    'namespace': cluster_config.get('namespace', 'default')
                },
                'spec': {
                    'project': cluster_config.get('project_id', cloud_account.get('project_id')),
                    'region': cluster_config['region'],
                    'network': {
                        'name': f"{cluster_config['name']}-network",
                        'subnets': [
                            {
                                'name': f"{cluster_config['name']}-subnet",
                                'cidrBlock': cluster_config.get('subnet_cidr', '10.0.0.0/24'),
                                'region': cluster_config['region']
                            }
                        ]
                    }
                }
            }
            manifests.append(gcp_cluster)
            
            # GCP Machine Template for control plane
            control_plane_template = {
                'apiVersion': 'infrastructure.cluster.x-k8s.io/v1beta1',
                'kind': 'GCPMachineTemplate',
                'metadata': {
                    'name': f"{cluster_config['name']}-control-plane-template",
                    'namespace': cluster_config.get('namespace', 'default')
                },
                'spec': {
                    'template': {
                        'spec': {
                            'machineType': cluster_config.get('control_plane_machine_type', 'e2-medium'),
                            'image': cluster_config.get('image', 'projects/k8s-staging-cluster-api-gcp/global/images/cluster-api-ubuntu-2004-v1-28-0'),
                            'subnet': f"{cluster_config['name']}-subnet",
                            'serviceAccounts': {
                                'email': f"capg-{cluster_config['name']}@{cluster_config.get('project_id', cloud_account.get('project_id'))}.iam.gserviceaccount.com",
                                'scopes': [
                                    'https://www.googleapis.com/auth/compute',
                                    'https://www.googleapis.com/auth/devstorage.read_only',
                                    'https://www.googleapis.com/auth/logging.write',
                                    'https://www.googleapis.com/auth/monitoring'
                                ]
                            }
                        }
                    }
                }
            }
            manifests.append(control_plane_template)
            
            # GCP Machine Template for worker nodes
            worker_template = {
                'apiVersion': 'infrastructure.cluster.x-k8s.io/v1beta1',
                'kind': 'GCPMachineTemplate',
                'metadata': {
                    'name': f"{cluster_config['name']}-worker-template",
                    'namespace': cluster_config.get('namespace', 'default')
                },
                'spec': {
                    'template': {
                        'spec': {
                            'machineType': cluster_config.get('worker_machine_type', 'e2-medium'),
                            'image': cluster_config.get('image', 'projects/k8s-staging-cluster-api-gcp/global/images/cluster-api-ubuntu-2004-v1-28-0'),
                            'subnet': f"{cluster_config['name']}-subnet",
                            'serviceAccounts': {
                                'email': f"capg-{cluster_config['name']}@{cluster_config.get('project_id', cloud_account.get('project_id'))}.iam.gserviceaccount.com",
                                'scopes': [
                                    'https://www.googleapis.com/auth/compute',
                                    'https://www.googleapis.com/auth/devstorage.read_only',
                                    'https://www.googleapis.com/auth/logging.write',
                                    'https://www.googleapis.com/auth/monitoring'
                                ]
                            }
                        }
                    }
                }
            }
            manifests.append(worker_template)
            
            return {
                'success': True,
                'manifests': manifests,
                'provider': 'gcp',
                'estimated_time': '12-18 minutes',
                'resources': {
                    'network': 1,
                    'subnets': 1,
                    'instances': cluster_config.get('control_plane_replicas', 1) + cluster_config.get('worker_replicas', 2)
                }
            }
        
        except Exception as e:
            logger.error(f"Error preparing GCP infrastructure: {e}")
            return {'success': False, 'error': str(e)}
    
    def _prepare_azure_infrastructure(self, cluster_config: Dict, cloud_account: Dict) -> Dict:
        """Prepare Azure infrastructure configuration"""
        try:
            manifests = []
            
            # Azure Cluster manifest
            azure_cluster = {
                'apiVersion': 'infrastructure.cluster.x-k8s.io/v1beta1',
                'kind': 'AzureCluster',
                'metadata': {
                    'name': f"{cluster_config['name']}-cluster",
                    'namespace': cluster_config.get('namespace', 'default')
                },
                'spec': {
                    'location': cluster_config['region'],
                    'resourceGroup': cluster_config.get('resource_group', f"{cluster_config['name']}-rg"),
                    'subscriptionID': cloud_account.get('subscription_id'),
                    'networkSpec': {
                        'vnet': {
                            'name': f"{cluster_config['name']}-vnet",
                            'cidrBlocks': [cluster_config.get('vpc_cidr', '10.0.0.0/16')]
                        },
                        'subnets': [
                            {
                                'name': f"{cluster_config['name']}-controlplane-subnet",
                                'cidrBlocks': ['10.0.1.0/24'],
                                'role': 'control-plane'
                            },
                            {
                                'name': f"{cluster_config['name']}-node-subnet",
                                'cidrBlocks': ['10.0.2.0/24'],
                                'role': 'node'
                            }
                        ]
                    }
                }
            }
            manifests.append(azure_cluster)
            
            # Azure Machine Template for control plane
            control_plane_template = {
                'apiVersion': 'infrastructure.cluster.x-k8s.io/v1beta1',
                'kind': 'AzureMachineTemplate',
                'metadata': {
                    'name': f"{cluster_config['name']}-control-plane-template",
                    'namespace': cluster_config.get('namespace', 'default')
                },
                'spec': {
                    'template': {
                        'spec': {
                            'vmSize': cluster_config.get('control_plane_vm_size', 'Standard_B2s'),
                            'image': {
                                'marketplace': {
                                    'publisher': 'cncf-upstream',
                                    'offer': 'capi',
                                    'sku': 'ubuntu-2004-gen1',
                                    'version': 'latest'
                                }
                            },
                            'osDisk': {
                                'osType': 'Linux',
                                'diskSizeGB': 30,
                                'managedDisk': {
                                    'storageAccountType': 'Premium_LRS'
                                }
                            },
                            'sshPublicKey': cluster_config.get('ssh_public_key', '')
                        }
                    }
                }
            }
            manifests.append(control_plane_template)
            
            # Azure Machine Template for worker nodes
            worker_template = {
                'apiVersion': 'infrastructure.cluster.x-k8s.io/v1beta1',
                'kind': 'AzureMachineTemplate',
                'metadata': {
                    'name': f"{cluster_config['name']}-worker-template",
                    'namespace': cluster_config.get('namespace', 'default')
                },
                'spec': {
                    'template': {
                        'spec': {
                            'vmSize': cluster_config.get('worker_vm_size', 'Standard_B2s'),
                            'image': {
                                'marketplace': {
                                    'publisher': 'cncf-upstream',
                                    'offer': 'capi',
                                    'sku': 'ubuntu-2004-gen1',
                                    'version': 'latest'
                                }
                            },
                            'osDisk': {
                                'osType': 'Linux',
                                'diskSizeGB': 30,
                                'managedDisk': {
                                    'storageAccountType': 'Premium_LRS'
                                }
                            },
                            'sshPublicKey': cluster_config.get('ssh_public_key', '')
                        }
                    }
                }
            }
            manifests.append(worker_template)
            
            return {
                'success': True,
                'manifests': manifests,
                'provider': 'azure',
                'estimated_time': '18-25 minutes',
                'resources': {
                    'resource_group': 1,
                    'vnet': 1,
                    'subnets': 2,
                    'vms': cluster_config.get('control_plane_replicas', 1) + cluster_config.get('worker_replicas', 2)
                }
            }
        
        except Exception as e:
            logger.error(f"Error preparing Azure infrastructure: {e}")
            return {'success': False, 'error': str(e)}
    
    def _prepare_sify_infrastructure(self, cluster_config: Dict, cloud_account: Dict) -> Dict:
        """Prepare Sify Cloud infrastructure configuration"""
        try:
            manifests = []
            
            # Sify Cluster manifest (custom implementation)
            sify_cluster = {
                'apiVersion': 'infrastructure.cluster.x-k8s.io/v1beta1',
                'kind': 'SifyCluster',
                'metadata': {
                    'name': f"{cluster_config['name']}-cluster",
                    'namespace': cluster_config.get('namespace', 'default')
                },
                'spec': {
                    'region': cluster_config['region'],
                    'apiEndpoint': cloud_account.get('endpoint_url', 'https://api.sifytechnologies.com'),
                    'networkSpec': {
                        'vpc': {
                            'name': f"{cluster_config['name']}-vpc",
                            'cidrBlock': cluster_config.get('vpc_cidr', '10.0.0.0/16')
                        },
                        'subnets': [
                            {
                                'name': f"{cluster_config['name']}-public-subnet",
                                'cidrBlock': '10.0.1.0/24',
                                'type': 'public'
                            },
                            {
                                'name': f"{cluster_config['name']}-private-subnet",
                                'cidrBlock': '10.0.2.0/24',
                                'type': 'private'
                            }
                        ]
                    }
                }
            }
            manifests.append(sify_cluster)
            
            # Sify Machine Template for control plane
            control_plane_template = {
                'apiVersion': 'infrastructure.cluster.x-k8s.io/v1beta1',
                'kind': 'SifyMachineTemplate',
                'metadata': {
                    'name': f"{cluster_config['name']}-control-plane-template",
                    'namespace': cluster_config.get('namespace', 'default')
                },
                'spec': {
                    'template': {
                        'spec': {
                            'flavor': cluster_config.get('control_plane_flavor', 'sify.medium'),
                            'image': cluster_config.get('image', 'ubuntu-20.04-k8s'),
                            'subnet': f"{cluster_config['name']}-private-subnet",
                            'securityGroups': [f"{cluster_config['name']}-controlplane-sg"],
                            'sshKeyName': cluster_config.get('ssh_key_name', 'default')
                        }
                    }
                }
            }
            manifests.append(control_plane_template)
            
            # Sify Machine Template for worker nodes
            worker_template = {
                'apiVersion': 'infrastructure.cluster.x-k8s.io/v1beta1',
                'kind': 'SifyMachineTemplate',
                'metadata': {
                    'name': f"{cluster_config['name']}-worker-template",
                    'namespace': cluster_config.get('namespace', 'default')
                },
                'spec': {
                    'template': {
                        'spec': {
                            'flavor': cluster_config.get('worker_flavor', 'sify.medium'),
                            'image': cluster_config.get('image', 'ubuntu-20.04-k8s'),
                            'subnet': f"{cluster_config['name']}-private-subnet",
                            'securityGroups': [f"{cluster_config['name']}-node-sg"],
                            'sshKeyName': cluster_config.get('ssh_key_name', 'default')
                        }
                    }
                }
            }
            manifests.append(worker_template)
            
            # Add GPU support for Sify Cloud
            if cluster_config.get('enable_gpu', False):
                gpu_template = {
                    'apiVersion': 'infrastructure.cluster.x-k8s.io/v1beta1',
                    'kind': 'SifyMachineTemplate',
                    'metadata': {
                        'name': f"{cluster_config['name']}-gpu-template",
                        'namespace': cluster_config.get('namespace', 'default')
                    },
                    'spec': {
                        'template': {
                            'spec': {
                                'flavor': cluster_config.get('gpu_flavor', 'sify.gpu.t4'),
                                'image': cluster_config.get('gpu_image', 'ubuntu-20.04-k8s-gpu'),
                                'subnet': f"{cluster_config['name']}-private-subnet",
                                'securityGroups': [f"{cluster_config['name']}-node-sg"],
                                'sshKeyName': cluster_config.get('ssh_key_name', 'default'),
                                'userData': self._generate_gpu_userdata()
                            }
                        }
                    }
                }
                manifests.append(gpu_template)
            
            return {
                'success': True,
                'manifests': manifests,
                'provider': 'sify',
                'estimated_time': '10-15 minutes',
                'resources': {
                    'vpc': 1,
                    'subnets': 2,
                    'security_groups': 2,
                    'instances': cluster_config.get('control_plane_replicas', 1) + cluster_config.get('worker_replicas', 2)
                }
            }
        
        except Exception as e:
            logger.error(f"Error preparing Sify infrastructure: {e}")
            return {'success': False, 'error': str(e)}
    
    def _prepare_vsphere_infrastructure(self, cluster_config: Dict, cloud_account: Dict) -> Dict:
        """Prepare vSphere infrastructure configuration"""
        try:
            manifests = []
            
            # vSphere Cluster manifest
            vsphere_cluster = {
                'apiVersion': 'infrastructure.cluster.x-k8s.io/v1beta1',
                'kind': 'VSphereCluster',
                'metadata': {
                    'name': f"{cluster_config['name']}-cluster",
                    'namespace': cluster_config.get('namespace', 'default')
                },
                'spec': {
                    'server': cloud_account.get('vcenter_server'),
                    'thumbprint': cluster_config.get('thumbprint', ''),
                    'controlPlaneEndpoint': {
                        'host': cluster_config.get('control_plane_endpoint', ''),
                        'port': 6443
                    }
                }
            }
            manifests.append(vsphere_cluster)
            
            # vSphere Machine Template for control plane
            control_plane_template = {
                'apiVersion': 'infrastructure.cluster.x-k8s.io/v1beta1',
                'kind': 'VSphereMachineTemplate',
                'metadata': {
                    'name': f"{cluster_config['name']}-control-plane-template",
                    'namespace': cluster_config.get('namespace', 'default')
                },
                'spec': {
                    'template': {
                        'spec': {
                            'template': cluster_config.get('template', 'ubuntu-20.04-template'),
                            'datacenter': cluster_config.get('datacenter'),
                            'datastore': cluster_config.get('datastore'),
                            'folder': cluster_config.get('folder', '/'),
                            'network': {
                                'devices': [
                                    {
                                        'networkName': cluster_config.get('network'),
                                        'dhcp4': True
                                    }
                                ]
                            },
                            'numCPUs': cluster_config.get('control_plane_cpu', 2),
                            'memoryMiB': cluster_config.get('control_plane_memory', 4096),
                            'diskGiB': cluster_config.get('control_plane_disk', 20)
                        }
                    }
                }
            }
            manifests.append(control_plane_template)
            
            # vSphere Machine Template for worker nodes
            worker_template = {
                'apiVersion': 'infrastructure.cluster.x-k8s.io/v1beta1',
                'kind': 'VSphereMachineTemplate',
                'metadata': {
                    'name': f"{cluster_config['name']}-worker-template",
                    'namespace': cluster_config.get('namespace', 'default')
                },
                'spec': {
                    'template': {
                        'spec': {
                            'template': cluster_config.get('template', 'ubuntu-20.04-template'),
                            'datacenter': cluster_config.get('datacenter'),
                            'datastore': cluster_config.get('datastore'),
                            'folder': cluster_config.get('folder', '/'),
                            'network': {
                                'devices': [
                                    {
                                        'networkName': cluster_config.get('network'),
                                        'dhcp4': True
                                    }
                                ]
                            },
                            'numCPUs': cluster_config.get('worker_cpu', 2),
                            'memoryMiB': cluster_config.get('worker_memory', 4096),
                            'diskGiB': cluster_config.get('worker_disk', 20)
                        }
                    }
                }
            }
            manifests.append(worker_template)
            
            return {
                'success': True,
                'manifests': manifests,
                'provider': 'vsphere',
                'estimated_time': '20-30 minutes',
                'resources': {
                    'vms': cluster_config.get('control_plane_replicas', 1) + cluster_config.get('worker_replicas', 2),
                    'cpu_cores': (cluster_config.get('control_plane_cpu', 2) * cluster_config.get('control_plane_replicas', 1)) + 
                                (cluster_config.get('worker_cpu', 2) * cluster_config.get('worker_replicas', 2)),
                    'memory_gb': ((cluster_config.get('control_plane_memory', 4096) * cluster_config.get('control_plane_replicas', 1)) + 
                                 (cluster_config.get('worker_memory', 4096) * cluster_config.get('worker_replicas', 2))) / 1024
                }
            }
        
        except Exception as e:
            logger.error(f"Error preparing vSphere infrastructure: {e}")
            return {'success': False, 'error': str(e)}
    
    def _generate_gpu_userdata(self) -> str:
        """Generate user data script for GPU nodes"""
        return """#!/bin/bash
# Install NVIDIA drivers and Docker GPU runtime
apt-get update
apt-get install -y nvidia-driver-470
apt-get install -y nvidia-docker2
systemctl restart docker

# Install NVIDIA device plugin for Kubernetes
kubectl apply -f https://raw.githubusercontent.com/NVIDIA/k8s-device-plugin/v0.12.0/nvidia-device-plugin.yml
"""
    
    def estimate_cost(self, cluster_config: Dict, provider: str) -> Dict:
        """Estimate infrastructure cost for cluster"""
        try:
            # Cost estimation based on provider and configuration
            cost_per_hour = 0
            cost_breakdown = {}
            
            if provider == 'aws':
                instance_costs = {
                    't3.micro': 0.0104, 't3.small': 0.0208, 't3.medium': 0.0416,
                    't3.large': 0.0832, 't3.xlarge': 0.1664,
                    'm5.large': 0.096, 'm5.xlarge': 0.192, 'm5.2xlarge': 0.384,
                    'p3.2xlarge': 3.06, 'p3.8xlarge': 12.24, 'g4dn.xlarge': 0.526
                }
                
                control_plane_cost = instance_costs.get(cluster_config.get('control_plane_instance_type', 't3.medium'), 0.0416)
                worker_cost = instance_costs.get(cluster_config.get('worker_instance_type', 't3.medium'), 0.0416)
                
                cost_breakdown['control_plane'] = control_plane_cost * cluster_config.get('control_plane_replicas', 1)
                cost_breakdown['workers'] = worker_cost * cluster_config.get('worker_replicas', 2)
                cost_breakdown['networking'] = 0.05  # ELB and data transfer
                cost_breakdown['storage'] = 0.10 * (cluster_config.get('control_plane_replicas', 1) + cluster_config.get('worker_replicas', 2))
                
            elif provider == 'gcp':
                machine_costs = {
                    'e2-micro': 0.00838, 'e2-small': 0.01675, 'e2-medium': 0.03351,
                    'n1-standard-1': 0.0475, 'n1-standard-2': 0.095, 'n1-standard-4': 0.19,
                    'a2-highgpu-1g': 3.673
                }
                
                control_plane_cost = machine_costs.get(cluster_config.get('control_plane_machine_type', 'e2-medium'), 0.03351)
                worker_cost = machine_costs.get(cluster_config.get('worker_machine_type', 'e2-medium'), 0.03351)
                
                cost_breakdown['control_plane'] = control_plane_cost * cluster_config.get('control_plane_replicas', 1)
                cost_breakdown['workers'] = worker_cost * cluster_config.get('worker_replicas', 2)
                cost_breakdown['networking'] = 0.03
                cost_breakdown['storage'] = 0.08 * (cluster_config.get('control_plane_replicas', 1) + cluster_config.get('worker_replicas', 2))
                
            elif provider == 'azure':
                vm_costs = {
                    'Standard_B1s': 0.0104, 'Standard_B2s': 0.0416, 'Standard_B4ms': 0.1664,
                    'Standard_D2s_v3': 0.096, 'Standard_D4s_v3': 0.192,
                    'Standard_NC6': 0.90, 'Standard_NC12': 1.80
                }
                
                control_plane_cost = vm_costs.get(cluster_config.get('control_plane_vm_size', 'Standard_B2s'), 0.0416)
                worker_cost = vm_costs.get(cluster_config.get('worker_vm_size', 'Standard_B2s'), 0.0416)
                
                cost_breakdown['control_plane'] = control_plane_cost * cluster_config.get('control_plane_replicas', 1)
                cost_breakdown['workers'] = worker_cost * cluster_config.get('worker_replicas', 2)
                cost_breakdown['networking'] = 0.04
                cost_breakdown['storage'] = 0.12 * (cluster_config.get('control_plane_replicas', 1) + cluster_config.get('worker_replicas', 2))
                
            elif provider == 'sify':
                flavor_costs = {
                    'sify.micro': 0.008, 'sify.small': 0.016, 'sify.medium': 0.032,
                    'sify.large': 0.064, 'sify.xlarge': 0.128,
                    'sify.gpu.t4': 0.45, 'sify.gpu.v100': 1.20, 'sify.gpu.a100': 2.40
                }
                
                control_plane_cost = flavor_costs.get(cluster_config.get('control_plane_flavor', 'sify.medium'), 0.032)
                worker_cost = flavor_costs.get(cluster_config.get('worker_flavor', 'sify.medium'), 0.032)
                
                cost_breakdown['control_plane'] = control_plane_cost * cluster_config.get('control_plane_replicas', 1)
                cost_breakdown['workers'] = worker_cost * cluster_config.get('worker_replicas', 2)
                cost_breakdown['networking'] = 0.02  # Competitive Sify pricing
                cost_breakdown['storage'] = 0.06 * (cluster_config.get('control_plane_replicas', 1) + cluster_config.get('worker_replicas', 2))
                
            elif provider == 'vsphere':
                # On-premises cost estimation (operational costs)
                cost_breakdown['control_plane'] = 0.02 * cluster_config.get('control_plane_replicas', 1)  # Operational cost
                cost_breakdown['workers'] = 0.02 * cluster_config.get('worker_replicas', 2)
                cost_breakdown['networking'] = 0.01
                cost_breakdown['storage'] = 0.02 * (cluster_config.get('control_plane_replicas', 1) + cluster_config.get('worker_replicas', 2))
            
            cost_per_hour = sum(cost_breakdown.values())
            
            return {
                'success': True,
                'cost_per_hour': round(cost_per_hour, 4),
                'cost_per_day': round(cost_per_hour * 24, 2),
                'cost_per_month': round(cost_per_hour * 24 * 30, 2),
                'breakdown': cost_breakdown,
                'currency': 'USD',
                'provider': provider
            }
        
        except Exception as e:
            logger.error(f"Error estimating cost: {e}")
            return {'success': False, 'error': str(e)}
    
    def validate_cluster_config(self, cluster_config: Dict) -> Tuple[bool, str]:
        """Validate cluster configuration before provisioning"""
        try:
            # Required fields validation
            required_fields = ['name', 'provider', 'region', 'kubernetes_version']
            for field in required_fields:
                if field not in cluster_config or not cluster_config[field]:
                    return False, f"Missing required field: {field}"
            
            # Provider-specific validation
            provider = cluster_config['provider']
            if provider not in self.supported_providers:
                return False, f"Unsupported provider: {provider}"
            
            # Kubernetes version validation
            k8s_version = cluster_config['kubernetes_version']
            if not k8s_version.startswith('v'):
                cluster_config['kubernetes_version'] = f"v{k8s_version}"
            
            # Node count validation
            control_plane_replicas = cluster_config.get('control_plane_replicas', 1)
            worker_replicas = cluster_config.get('worker_replicas', 2)
            
            if control_plane_replicas < 1:
                return False, "Control plane replicas must be at least 1"
            
            if worker_replicas < 1:
                return False, "Worker replicas must be at least 1"
            
            # High availability validation
            if control_plane_replicas > 1 and control_plane_replicas % 2 == 0:
                return False, "Control plane replicas must be odd number for HA (1, 3, 5, etc.)"
            
            return True, "Configuration valid"
        
        except Exception as e:
            logger.error(f"Error validating cluster config: {e}")
            return False, str(e)


    def generate_cluster_manifests(self, cluster_config: Dict) -> List[Dict]:
        """Generate Kubernetes manifests for cluster creation"""
        try:
            manifests = []
            
            # Generate Cluster manifest
            cluster_manifest = {
                'apiVersion': 'cluster.x-k8s.io/v1beta1',
                'kind': 'Cluster',
                'metadata': {
                    'name': cluster_config['name'],
                    'namespace': 'default'
                },
                'spec': {
                    'clusterNetwork': {
                        'pods': {'cidrBlocks': ['192.168.0.0/16']},
                        'services': {'cidrBlocks': ['10.128.0.0/12']}
                    },
                    'infrastructureRef': {
                        'apiVersion': f'{cluster_config["provider"]}.infrastructure.cluster.x-k8s.io/v1beta1',
                        'kind': f'{cluster_config["provider"].title()}Cluster',
                        'name': f'{cluster_config["name"]}-cluster'
                    },
                    'controlPlaneRef': {
                        'apiVersion': 'controlplane.cluster.x-k8s.io/v1beta1',
                        'kind': 'KubeadmControlPlane',
                        'name': f'{cluster_config["name"]}-control-plane'
                    }
                }
            }
            manifests.append(cluster_manifest)
            
            # Generate Control Plane manifest
            control_plane_manifest = {
                'apiVersion': 'controlplane.cluster.x-k8s.io/v1beta1',
                'kind': 'KubeadmControlPlane',
                'metadata': {
                    'name': f'{cluster_config["name"]}-control-plane',
                    'namespace': 'default'
                },
                'spec': {
                    'replicas': cluster_config.get('control_plane_replicas', 1),
                    'version': cluster_config['kubernetes_version'],
                    'machineTemplate': {
                        'infrastructureRef': {
                            'apiVersion': f'{cluster_config["provider"]}.infrastructure.cluster.x-k8s.io/v1beta1',
                            'kind': f'{cluster_config["provider"].title()}MachineTemplate',
                            'name': f'{cluster_config["name"]}-control-plane-template'
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
            manifests.append(control_plane_manifest)
            
            # Generate Worker Node manifest
            worker_manifest = {
                'apiVersion': 'cluster.x-k8s.io/v1beta1',
                'kind': 'MachineDeployment',
                'metadata': {
                    'name': f'{cluster_config["name"]}-workers',
                    'namespace': 'default'
                },
                'spec': {
                    'clusterName': cluster_config['name'],
                    'replicas': cluster_config.get('worker_replicas', 2),
                    'selector': {
                        'matchLabels': {
                            'cluster.x-k8s.io/cluster-name': cluster_config['name'],
                            'cluster.x-k8s.io/deployment-name': f'{cluster_config["name"]}-workers'
                        }
                    },
                    'template': {
                        'metadata': {
                            'labels': {
                                'cluster.x-k8s.io/cluster-name': cluster_config['name'],
                                'cluster.x-k8s.io/deployment-name': f'{cluster_config["name"]}-workers'
                            }
                        },
                        'spec': {
                            'clusterName': cluster_config['name'],
                            'version': cluster_config['kubernetes_version'],
                            'infrastructureRef': {
                                'apiVersion': f'{cluster_config["provider"]}.infrastructure.cluster.x-k8s.io/v1beta1',
                                'kind': f'{cluster_config["provider"].title()}MachineTemplate',
                                'name': f'{cluster_config["name"]}-worker-template'
                            },
                            'bootstrap': {
                                'configRef': {
                                    'apiVersion': 'bootstrap.cluster.x-k8s.io/v1beta1',
                                    'kind': 'KubeadmConfigTemplate',
                                    'name': f'{cluster_config["name"]}-worker-bootstrap'
                                }
                            }
                        }
                    }
                }
            }
            manifests.append(worker_manifest)
            
            # Generate provider-specific infrastructure manifests
            provider_manifests = self._generate_provider_manifests(cluster_config)
            manifests.extend(provider_manifests)
            
            return manifests
            
        except Exception as e:
            logger.error(f"Error generating cluster manifests: {e}")
            raise Exception(f"Manifest generation failed: {str(e)}")
    
    def _generate_provider_manifests(self, cluster_config: Dict) -> List[Dict]:
        """Generate provider-specific infrastructure manifests"""
        provider = cluster_config['provider']
        manifests = []
        
        if provider == 'aws':
            manifests.extend(self._generate_aws_manifests(cluster_config))
        elif provider == 'gcp':
            manifests.extend(self._generate_gcp_manifests(cluster_config))
        elif provider == 'azure':
            manifests.extend(self._generate_azure_manifests(cluster_config))
        elif provider == 'sify':
            manifests.extend(self._generate_sify_manifests(cluster_config))
        elif provider == 'vsphere':
            manifests.extend(self._generate_vsphere_manifests(cluster_config))
        
        return manifests
    
    def _generate_sify_manifests(self, cluster_config: Dict) -> List[Dict]:
        """Generate Sify Cloud specific manifests"""
        manifests = []
        
        # Sify Cluster Infrastructure
        sify_cluster = {
            'apiVersion': 'sify.infrastructure.cluster.x-k8s.io/v1beta1',
            'kind': 'SifyCluster',
            'metadata': {
                'name': f'{cluster_config["name"]}-cluster',
                'namespace': 'default'
            },
            'spec': {
                'region': cluster_config['region'],
                'networkSpec': {
                    'vpc': {
                        'cidrBlock': '10.0.0.0/16'
                    },
                    'subnets': [
                        {
                            'cidrBlock': '10.0.1.0/24',
                            'availabilityZone': f'{cluster_config["region"]}a',
                            'isPublic': True
                        },
                        {
                            'cidrBlock': '10.0.2.0/24',
                            'availabilityZone': f'{cluster_config["region"]}b',
                            'isPublic': False
                        }
                    ]
                }
            }
        }
        manifests.append(sify_cluster)
        
        # Sify Machine Templates
        control_plane_template = {
            'apiVersion': 'sify.infrastructure.cluster.x-k8s.io/v1beta1',
            'kind': 'SifyMachineTemplate',
            'metadata': {
                'name': f'{cluster_config["name"]}-control-plane-template',
                'namespace': 'default'
            },
            'spec': {
                'template': {
                    'spec': {
                        'instanceType': cluster_config.get('instance_type', 'sify.medium'),
                        'region': cluster_config['region'],
                        'rootVolume': {
                            'size': 50,
                            'type': 'gp3'
                        },
                        'sshKeyName': 'default-key',
                        'securityGroups': [
                            {'name': f'{cluster_config["name"]}-control-plane-sg'}
                        ]
                    }
                }
            }
        }
        manifests.append(control_plane_template)
        
        # Worker Machine Template
        worker_template = {
            'apiVersion': 'sify.infrastructure.cluster.x-k8s.io/v1beta1',
            'kind': 'SifyMachineTemplate',
            'metadata': {
                'name': f'{cluster_config["name"]}-worker-template',
                'namespace': 'default'
            },
            'spec': {
                'template': {
                    'spec': {
                        'instanceType': cluster_config.get('instance_type', 'sify.medium'),
                        'region': cluster_config['region'],
                        'rootVolume': {
                            'size': 100,
                            'type': 'gp3'
                        },
                        'sshKeyName': 'default-key',
                        'securityGroups': [
                            {'name': f'{cluster_config["name"]}-worker-sg'}
                        ]
                    }
                }
            }
        }
        
        # Add GPU configuration if enabled
        if cluster_config.get('gpu_enabled', False):
            worker_template['spec']['template']['spec']['instanceType'] = cluster_config.get('gpu_type', 'sify.gpu.t4')
            worker_template['spec']['template']['spec']['userData'] = self._get_gpu_user_data()
        
        manifests.append(worker_template)
        
        return manifests
    
    def _generate_aws_manifests(self, cluster_config: Dict) -> List[Dict]:
        """Generate AWS specific manifests"""
        # Implementation for AWS manifests
        return []
    
    def _generate_gcp_manifests(self, cluster_config: Dict) -> List[Dict]:
        """Generate GCP specific manifests"""
        # Implementation for GCP manifests
        return []
    
    def _generate_azure_manifests(self, cluster_config: Dict) -> List[Dict]:
        """Generate Azure specific manifests"""
        # Implementation for Azure manifests
        return []
    
    def _generate_vsphere_manifests(self, cluster_config: Dict) -> List[Dict]:
        """Generate vSphere specific manifests"""
        # Implementation for vSphere manifests
        return []
    
    def _get_gpu_user_data(self) -> str:
        """Get user data script for GPU nodes"""
        return """#!/bin/bash
# Install NVIDIA drivers and Docker GPU runtime
apt-get update
apt-get install -y nvidia-driver-470
apt-get install -y nvidia-docker2
systemctl restart docker
"""

