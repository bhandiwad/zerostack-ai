import requests
import json
import yaml
from kubernetes import client, config
from kubernetes.client.rest import ApiException
import logging
from typing import Dict, List, Optional
from datetime import datetime, timedelta
import asyncio
import aiohttp

logger = logging.getLogger(__name__)

class ClusterAPIService:
    """Service for integrating with Cluster-API providers"""
    
    def __init__(self, kubeconfig_path: Optional[str] = None):
        """Initialize Cluster-API service
        
        Args:
            kubeconfig_path: Path to kubeconfig file. If None, uses in-cluster config
        """
        self.kubeconfig_path = kubeconfig_path
        self.k8s_client = None
        self.custom_api = None
        self._initialize_k8s_client()
        
        # Cache for provider data
        self._provider_cache = {}
        self._cache_expiry = {}
        self.cache_duration = timedelta(hours=1)  # Cache for 1 hour
        
    def _initialize_k8s_client(self):
        """Initialize Kubernetes client"""
        try:
            if self.kubeconfig_path:
                config.load_kube_config(config_file=self.kubeconfig_path)
            else:
                # Try in-cluster config first, fallback to local kubeconfig
                try:
                    config.load_incluster_config()
                except:
                    config.load_kube_config()
            
            self.k8s_client = client.ApiClient()
            self.custom_api = client.CustomObjectsApi()
            logger.info("Kubernetes client initialized successfully")
            
        except Exception as e:
            logger.warning(f"Failed to initialize Kubernetes client: {e}")
            # Continue without K8s client for development/testing
    
    async def get_provider_machine_types(self, provider: str, region: str = None, 
                                       force_refresh: bool = False) -> List[Dict]:
        """Get machine types for a specific provider
        
        Args:
            provider: Provider name (aws, gcp, azure, etc.)
            region: Optional region filter
            force_refresh: Force refresh from provider API
            
        Returns:
            List of machine type dictionaries
        """
        cache_key = f"{provider}_{region or 'all'}_machine_types"
        
        # Check cache first
        if not force_refresh and self._is_cache_valid(cache_key):
            return self._provider_cache[cache_key]
        
        try:
            if provider == 'aws':
                machine_types = await self._get_aws_machine_types(region)
            elif provider == 'gcp':
                machine_types = await self._get_gcp_machine_types(region)
            elif provider == 'azure':
                machine_types = await self._get_azure_machine_types(region)
            elif provider == 'sify':
                machine_types = await self._get_sify_machine_types(region)
            else:
                # For other providers, try to get from Cluster-API CRDs
                machine_types = await self._get_cluster_api_machine_types(provider, region)
            
            # Cache the results
            self._provider_cache[cache_key] = machine_types
            self._cache_expiry[cache_key] = datetime.now() + self.cache_duration
            
            return machine_types
            
        except Exception as e:
            logger.error(f"Failed to get machine types for {provider}: {e}")
            # Return cached data if available, otherwise empty list
            return self._provider_cache.get(cache_key, [])
    
    async def get_provider_regions(self, provider: str, force_refresh: bool = False) -> List[Dict]:
        """Get available regions for a provider"""
        cache_key = f"{provider}_regions"
        
        if not force_refresh and self._is_cache_valid(cache_key):
            return self._provider_cache[cache_key]
        
        try:
            if provider == 'aws':
                regions = await self._get_aws_regions()
            elif provider == 'gcp':
                regions = await self._get_gcp_regions()
            elif provider == 'azure':
                regions = await self._get_azure_regions()
            elif provider == 'sify':
                regions = await self._get_sify_regions()
            else:
                regions = await self._get_cluster_api_regions(provider)
            
            self._provider_cache[cache_key] = regions
            self._cache_expiry[cache_key] = datetime.now() + self.cache_duration
            
            return regions
            
        except Exception as e:
            logger.error(f"Failed to get regions for {provider}: {e}")
            return self._provider_cache.get(cache_key, [])
    
    async def get_kubernetes_versions(self, provider: str, region: str = None) -> List[str]:
        """Get supported Kubernetes versions for a provider"""
        cache_key = f"{provider}_{region or 'all'}_k8s_versions"
        
        if self._is_cache_valid(cache_key):
            return self._provider_cache[cache_key]
        
        try:
            if provider == 'aws':
                versions = await self._get_aws_k8s_versions(region)
            elif provider == 'gcp':
                versions = await self._get_gcp_k8s_versions(region)
            elif provider == 'azure':
                versions = await self._get_azure_k8s_versions(region)
            else:
                # Default supported versions
                versions = ['1.28.0', '1.27.8', '1.26.12', '1.25.16']
            
            self._provider_cache[cache_key] = versions
            self._cache_expiry[cache_key] = datetime.now() + self.cache_duration
            
            return versions
            
        except Exception as e:
            logger.error(f"Failed to get K8s versions for {provider}: {e}")
            return ['1.28.0', '1.27.8', '1.26.12']  # Fallback versions
    
    async def _get_aws_machine_types(self, region: str = None) -> List[Dict]:
        """Get AWS EC2 instance types"""
        # In production, this would use AWS SDK
        # For now, we'll simulate API calls to AWS
        
        base_url = "https://api.aws.amazon.com/ec2"  # Simulated endpoint
        
        try:
            # Simulate AWS API call
            await asyncio.sleep(0.1)  # Simulate network delay
            
            # This would be replaced with actual AWS SDK calls
            instance_types = [
                {
                    'id': 't3.micro',
                    'name': 't3.micro',
                    'displayName': 'T3 Micro - Burstable',
                    'family': 't3',
                    'resources': {
                        'cpu': 2,
                        'memory': 1,
                        'storage': 20,
                        'gpu': None
                    },
                    'pricing': {
                        'hourly': 0.0104,
                        'monthly': 7.59
                    },
                    'category': 'general',
                    'description': 'Burstable performance instances for light workloads',
                    'availability': ['us-east-1', 'us-west-2', 'eu-west-1'] if not region else [region]
                },
                {
                    'id': 't3.small',
                    'name': 't3.small',
                    'displayName': 'T3 Small - Burstable',
                    'family': 't3',
                    'resources': {
                        'cpu': 2,
                        'memory': 2,
                        'storage': 20,
                        'gpu': None
                    },
                    'pricing': {
                        'hourly': 0.0208,
                        'monthly': 15.18
                    },
                    'category': 'general',
                    'description': 'Burstable performance instances',
                    'availability': ['us-east-1', 'us-west-2', 'eu-west-1'] if not region else [region]
                },
                {
                    'id': 'm5.large',
                    'name': 'm5.large',
                    'displayName': 'M5 Large - General Purpose',
                    'family': 'm5',
                    'resources': {
                        'cpu': 2,
                        'memory': 8,
                        'storage': 20,
                        'gpu': None
                    },
                    'pricing': {
                        'hourly': 0.096,
                        'monthly': 70.08
                    },
                    'category': 'general',
                    'description': 'Balanced compute, memory, and networking',
                    'availability': ['us-east-1', 'us-west-2', 'eu-west-1'] if not region else [region]
                },
                {
                    'id': 'c5.xlarge',
                    'name': 'c5.xlarge',
                    'displayName': 'C5 XLarge - Compute Optimized',
                    'family': 'c5',
                    'resources': {
                        'cpu': 4,
                        'memory': 8,
                        'storage': 20,
                        'gpu': None
                    },
                    'pricing': {
                        'hourly': 0.17,
                        'monthly': 124.10
                    },
                    'category': 'compute',
                    'description': 'High-performance processors',
                    'availability': ['us-east-1', 'us-west-2', 'eu-west-1'] if not region else [region]
                },
                {
                    'id': 'p3.2xlarge',
                    'name': 'p3.2xlarge',
                    'displayName': 'P3 2XLarge - GPU Instance',
                    'family': 'p3',
                    'resources': {
                        'cpu': 8,
                        'memory': 61,
                        'storage': 20,
                        'gpu': {
                            'count': 1,
                            'type': 'nvidia-v100',
                            'memory': 16
                        }
                    },
                    'pricing': {
                        'hourly': 3.06,
                        'monthly': 2233.80
                    },
                    'category': 'gpu',
                    'description': 'NVIDIA V100 GPU for machine learning',
                    'availability': ['us-east-1', 'us-west-2'] if not region else [region]
                },
                {
                    'id': 'p4d.24xlarge',
                    'name': 'p4d.24xlarge',
                    'displayName': 'P4d 24XLarge - High-End GPU',
                    'family': 'p4d',
                    'resources': {
                        'cpu': 96,
                        'memory': 1152,
                        'storage': 8000,
                        'gpu': {
                            'count': 8,
                            'type': 'nvidia-a100',
                            'memory': 40
                        }
                    },
                    'pricing': {
                        'hourly': 32.77,
                        'monthly': 23922.10
                    },
                    'category': 'gpu',
                    'description': 'NVIDIA A100 GPUs for demanding ML workloads',
                    'availability': ['us-east-1', 'us-west-2'] if not region else [region]
                }
            ]
            
            # Filter by region if specified
            if region:
                instance_types = [
                    inst for inst in instance_types 
                    if region in inst['availability']
                ]
            
            return instance_types
            
        except Exception as e:
            logger.error(f"Failed to fetch AWS instance types: {e}")
            return []
    
    async def _get_gcp_machine_types(self, region: str = None) -> List[Dict]:
        """Get GCP machine types"""
        try:
            await asyncio.sleep(0.1)  # Simulate API delay
            
            machine_types = [
                {
                    'id': 'e2-micro',
                    'name': 'e2-micro',
                    'displayName': 'E2 Micro - Shared Core',
                    'family': 'e2',
                    'resources': {
                        'cpu': 1,
                        'memory': 1,
                        'storage': 20,
                        'gpu': None
                    },
                    'pricing': {
                        'hourly': 0.0063,
                        'monthly': 4.60
                    },
                    'category': 'general',
                    'description': 'Cost-optimized shared-core machine type',
                    'availability': ['us-central1', 'europe-west1', 'asia-southeast1'] if not region else [region]
                },
                {
                    'id': 'e2-small',
                    'name': 'e2-small',
                    'displayName': 'E2 Small - Shared Core',
                    'family': 'e2',
                    'resources': {
                        'cpu': 1,
                        'memory': 2,
                        'storage': 20,
                        'gpu': None
                    },
                    'pricing': {
                        'hourly': 0.0126,
                        'monthly': 9.20
                    },
                    'category': 'general',
                    'description': 'Cost-optimized shared-core machine type',
                    'availability': ['us-central1', 'europe-west1', 'asia-southeast1'] if not region else [region]
                },
                {
                    'id': 'n1-standard-2',
                    'name': 'n1-standard-2',
                    'displayName': 'N1 Standard 2',
                    'family': 'n1',
                    'resources': {
                        'cpu': 2,
                        'memory': 7.5,
                        'storage': 20,
                        'gpu': None
                    },
                    'pricing': {
                        'hourly': 0.095,
                        'monthly': 69.35
                    },
                    'category': 'general',
                    'description': 'Balanced CPU and memory',
                    'availability': ['us-central1', 'europe-west1', 'asia-southeast1'] if not region else [region]
                },
                {
                    'id': 'n1-standard-4-k80',
                    'name': 'n1-standard-4',
                    'displayName': 'N1 Standard 4 + NVIDIA K80',
                    'family': 'n1',
                    'resources': {
                        'cpu': 4,
                        'memory': 15,
                        'storage': 20,
                        'gpu': {
                            'count': 1,
                            'type': 'nvidia-k80',
                            'memory': 12
                        }
                    },
                    'pricing': {
                        'hourly': 0.64,
                        'monthly': 467.20
                    },
                    'category': 'gpu',
                    'description': 'NVIDIA K80 GPU for machine learning',
                    'availability': ['us-central1', 'europe-west1'] if not region else [region]
                },
                {
                    'id': 'n1-standard-8-t4',
                    'name': 'n1-standard-8',
                    'displayName': 'N1 Standard 8 + NVIDIA T4',
                    'family': 'n1',
                    'resources': {
                        'cpu': 8,
                        'memory': 30,
                        'storage': 20,
                        'gpu': {
                            'count': 1,
                            'type': 'nvidia-t4',
                            'memory': 16
                        }
                    },
                    'pricing': {
                        'hourly': 0.53,
                        'monthly': 386.90
                    },
                    'category': 'gpu',
                    'description': 'NVIDIA T4 GPU for inference',
                    'availability': ['us-central1', 'europe-west1'] if not region else [region]
                }
            ]
            
            if region:
                machine_types = [
                    mt for mt in machine_types 
                    if region in mt['availability']
                ]
            
            return machine_types
            
        except Exception as e:
            logger.error(f"Failed to fetch GCP machine types: {e}")
            return []
    
    async def _get_azure_machine_types(self, region: str = None) -> List[Dict]:
        """Get Azure VM sizes"""
        try:
            await asyncio.sleep(0.1)
            
            vm_sizes = [
                {
                    'id': 'Standard_B1s',
                    'name': 'Standard_B1s',
                    'displayName': 'B1s - Burstable',
                    'family': 'B',
                    'resources': {
                        'cpu': 1,
                        'memory': 1,
                        'storage': 20,
                        'gpu': None
                    },
                    'pricing': {
                        'hourly': 0.0104,
                        'monthly': 7.59
                    },
                    'category': 'general',
                    'description': 'Burstable performance VM',
                    'availability': ['eastus', 'westeurope', 'southeastasia'] if not region else [region]
                },
                {
                    'id': 'Standard_D2s_v3',
                    'name': 'Standard_D2s_v3',
                    'displayName': 'D2s v3 - General Purpose',
                    'family': 'D',
                    'resources': {
                        'cpu': 2,
                        'memory': 8,
                        'storage': 20,
                        'gpu': None
                    },
                    'pricing': {
                        'hourly': 0.096,
                        'monthly': 70.08
                    },
                    'category': 'general',
                    'description': 'General purpose VM with SSD storage',
                    'availability': ['eastus', 'westeurope', 'southeastasia'] if not region else [region]
                },
                {
                    'id': 'Standard_NC6s_v3',
                    'name': 'Standard_NC6s_v3',
                    'displayName': 'NC6s v3 - GPU VM',
                    'family': 'NC',
                    'resources': {
                        'cpu': 6,
                        'memory': 112,
                        'storage': 20,
                        'gpu': {
                            'count': 1,
                            'type': 'nvidia-v100',
                            'memory': 16
                        }
                    },
                    'pricing': {
                        'hourly': 3.06,
                        'monthly': 2233.80
                    },
                    'category': 'gpu',
                    'description': 'NVIDIA V100 GPU for AI workloads',
                    'availability': ['eastus', 'westeurope'] if not region else [region]
                }
            ]
            
            if region:
                vm_sizes = [
                    vm for vm in vm_sizes 
                    if region in vm['availability']
                ]
            
            return vm_sizes
            
        except Exception as e:
            logger.error(f"Failed to fetch Azure VM sizes: {e}")
            return []
    
    async def _get_sify_machine_types(self, region: str = None) -> List[Dict]:
        """Get Sify cloud machine types"""
        try:
            # This would integrate with Sify's actual API
            await asyncio.sleep(0.1)
            
            machine_types = [
                {
                    'id': 'sify-basic-cpu-2-4',
                    'name': 'basic-cpu-2-4',
                    'displayName': 'Sify Basic CPU (2vCPU, 4GB)',
                    'family': 'basic',
                    'resources': {
                        'cpu': 2,
                        'memory': 4,
                        'storage': 50,
                        'gpu': None
                    },
                    'pricing': {
                        'hourly': 0.025,
                        'monthly': 18.25
                    },
                    'category': 'general',
                    'description': 'Cost-effective CPU instances for general workloads',
                    'availability': ['mumbai-1', 'chennai-1', 'bangalore-1'] if not region else [region]
                },
                {
                    'id': 'sify-compute-8-16',
                    'name': 'compute-8-16',
                    'displayName': 'Sify Compute Optimized (8vCPU, 16GB)',
                    'family': 'compute',
                    'resources': {
                        'cpu': 8,
                        'memory': 16,
                        'storage': 100,
                        'gpu': None
                    },
                    'pricing': {
                        'hourly': 0.08,
                        'monthly': 58.40
                    },
                    'category': 'compute',
                    'description': 'High-performance CPU for compute-intensive applications',
                    'availability': ['mumbai-1', 'chennai-1', 'bangalore-1'] if not region else [region]
                },
                {
                    'id': 'sify-gpu-t4-4-16',
                    'name': 'gpu-t4-4-16',
                    'displayName': 'Sify GPU T4 (4vCPU, 16GB, 1xT4)',
                    'family': 'gpu',
                    'resources': {
                        'cpu': 4,
                        'memory': 16,
                        'storage': 100,
                        'gpu': {
                            'count': 1,
                            'type': 'nvidia-t4',
                            'memory': 16
                        }
                    },
                    'pricing': {
                        'hourly': 0.35,
                        'monthly': 255.50
                    },
                    'category': 'gpu',
                    'description': 'NVIDIA T4 GPU for AI/ML inference and training',
                    'availability': ['mumbai-1', 'bangalore-1'] if not region else [region]
                },
                {
                    'id': 'sify-gpu-v100-8-32',
                    'name': 'gpu-v100-8-32',
                    'displayName': 'Sify GPU V100 (8vCPU, 32GB, 1xV100)',
                    'family': 'gpu',
                    'resources': {
                        'cpu': 8,
                        'memory': 32,
                        'storage': 200,
                        'gpu': {
                            'count': 1,
                            'type': 'nvidia-v100',
                            'memory': 32
                        }
                    },
                    'pricing': {
                        'hourly': 1.20,
                        'monthly': 876.00
                    },
                    'category': 'gpu',
                    'description': 'NVIDIA V100 GPU for demanding ML and HPC workloads',
                    'availability': ['mumbai-1', 'bangalore-1'] if not region else [region]
                },
                {
                    'id': 'sify-gpu-a100-16-64',
                    'name': 'gpu-a100-16-64',
                    'displayName': 'Sify GPU A100 (16vCPU, 64GB, 1xA100)',
                    'family': 'gpu',
                    'resources': {
                        'cpu': 16,
                        'memory': 64,
                        'storage': 500,
                        'gpu': {
                            'count': 1,
                            'type': 'nvidia-a100',
                            'memory': 80
                        }
                    },
                    'pricing': {
                        'hourly': 2.50,
                        'monthly': 1825.00
                    },
                    'category': 'gpu',
                    'description': 'NVIDIA A100 GPU for the most demanding AI workloads',
                    'availability': ['mumbai-1'] if not region else [region]
                },
                {
                    'id': 'sify-multi-gpu-a100-32-128',
                    'name': 'multi-gpu-a100-32-128',
                    'displayName': 'Sify Multi-GPU A100 (32vCPU, 128GB, 4xA100)',
                    'family': 'multi-gpu',
                    'resources': {
                        'cpu': 32,
                        'memory': 128,
                        'storage': 1000,
                        'gpu': {
                            'count': 4,
                            'type': 'nvidia-a100',
                            'memory': 80
                        }
                    },
                    'pricing': {
                        'hourly': 8.00,
                        'monthly': 5840.00
                    },
                    'category': 'gpu',
                    'description': 'Multi-GPU A100 setup for large-scale AI training',
                    'availability': ['mumbai-1'] if not region else [region]
                }
            ]
            
            if region:
                machine_types = [
                    mt for mt in machine_types 
                    if region in mt['availability']
                ]
            
            return machine_types
            
        except Exception as e:
            logger.error(f"Failed to fetch Sify machine types: {e}")
            return []
    
    async def _get_aws_regions(self) -> List[Dict]:
        """Get AWS regions"""
        return [
            {'id': 'us-east-1', 'name': 'US East (N. Virginia)', 'location': 'Virginia, USA'},
            {'id': 'us-west-2', 'name': 'US West (Oregon)', 'location': 'Oregon, USA'},
            {'id': 'eu-west-1', 'name': 'Europe (Ireland)', 'location': 'Dublin, Ireland'},
            {'id': 'ap-southeast-1', 'name': 'Asia Pacific (Singapore)', 'location': 'Singapore'},
            {'id': 'us-east-2', 'name': 'US East (Ohio)', 'location': 'Ohio, USA'},
            {'id': 'eu-central-1', 'name': 'Europe (Frankfurt)', 'location': 'Frankfurt, Germany'},
            {'id': 'ap-northeast-1', 'name': 'Asia Pacific (Tokyo)', 'location': 'Tokyo, Japan'}
        ]
    
    async def _get_gcp_regions(self) -> List[Dict]:
        """Get GCP regions"""
        return [
            {'id': 'us-central1', 'name': 'US Central', 'location': 'Iowa, USA'},
            {'id': 'us-east1', 'name': 'US East', 'location': 'South Carolina, USA'},
            {'id': 'europe-west1', 'name': 'Europe West', 'location': 'Belgium'},
            {'id': 'asia-southeast1', 'name': 'Asia Southeast', 'location': 'Singapore'},
            {'id': 'us-west1', 'name': 'US West', 'location': 'Oregon, USA'},
            {'id': 'europe-west2', 'name': 'Europe West 2', 'location': 'London, UK'},
            {'id': 'asia-northeast1', 'name': 'Asia Northeast', 'location': 'Tokyo, Japan'}
        ]
    
    async def _get_azure_regions(self) -> List[Dict]:
        """Get Azure regions"""
        return [
            {'id': 'eastus', 'name': 'East US', 'location': 'Virginia, USA'},
            {'id': 'westus2', 'name': 'West US 2', 'location': 'Washington, USA'},
            {'id': 'westeurope', 'name': 'West Europe', 'location': 'Netherlands'},
            {'id': 'southeastasia', 'name': 'Southeast Asia', 'location': 'Singapore'},
            {'id': 'centralus', 'name': 'Central US', 'location': 'Iowa, USA'},
            {'id': 'northeurope', 'name': 'North Europe', 'location': 'Ireland'},
            {'id': 'eastasia', 'name': 'East Asia', 'location': 'Hong Kong'}
        ]
    
    async def _get_sify_regions(self) -> List[Dict]:
        """Get Sify cloud regions"""
        return [
            {'id': 'mumbai-1', 'name': 'Mumbai Zone 1', 'location': 'Mumbai, India'},
            {'id': 'chennai-1', 'name': 'Chennai Zone 1', 'location': 'Chennai, India'},
            {'id': 'bangalore-1', 'name': 'Bangalore Zone 1', 'location': 'Bangalore, India'},
            {'id': 'delhi-1', 'name': 'Delhi Zone 1', 'location': 'Delhi, India'},
            {'id': 'pune-1', 'name': 'Pune Zone 1', 'location': 'Pune, India'},
            {'id': 'hyderabad-1', 'name': 'Hyderabad Zone 1', 'location': 'Hyderabad, India'},
            {'id': 'kolkata-1', 'name': 'Kolkata Zone 1', 'location': 'Kolkata, India'}
        ]
    
    async def _get_aws_k8s_versions(self, region: str = None) -> List[str]:
        """Get supported Kubernetes versions for AWS EKS"""
        # This would call AWS EKS API
        return ['1.28', '1.27', '1.26', '1.25']
    
    async def _get_gcp_k8s_versions(self, region: str = None) -> List[str]:
        """Get supported Kubernetes versions for GCP GKE"""
        # This would call GCP GKE API
        return ['1.28.3-gke.1286000', '1.27.8-gke.1067004', '1.26.12-gke.1035000']
    
    async def _get_azure_k8s_versions(self, region: str = None) -> List[str]:
        """Get supported Kubernetes versions for Azure AKS"""
        # This would call Azure AKS API
        return ['1.28.0', '1.27.7', '1.26.10']
    
    async def _get_cluster_api_machine_types(self, provider: str, region: str = None) -> List[Dict]:
        """Get machine types from Cluster-API CRDs"""
        if not self.custom_api:
            return []
        
        try:
            # Get provider-specific machine types from Cluster-API CRDs
            # This would query actual Cluster-API resources
            
            # Example: Get AWSMachineTemplate or similar resources
            group = f"infrastructure.cluster.x-k8s.io"
            version = "v1beta1"
            plural = f"{provider}machinetemplates"
            
            response = self.custom_api.list_cluster_custom_object(
                group=group,
                version=version,
                plural=plural
            )
            
            machine_types = []
            for item in response.get('items', []):
                spec = item.get('spec', {}).get('template', {}).get('spec', {})
                
                machine_type = {
                    'id': item.get('metadata', {}).get('name', ''),
                    'name': spec.get('instanceType', ''),
                    'displayName': spec.get('instanceType', ''),
                    'family': 'custom',
                    'resources': {
                        'cpu': spec.get('cpu', 2),
                        'memory': spec.get('memory', 4),
                        'storage': spec.get('storage', 20),
                        'gpu': None
                    },
                    'pricing': {
                        'hourly': 0.10,  # Default pricing
                        'monthly': 73.00
                    },
                    'category': 'general',
                    'description': f'Custom {provider} machine type',
                    'availability': [region] if region else ['default']
                }
                
                machine_types.append(machine_type)
            
            return machine_types
            
        except ApiException as e:
            logger.warning(f"Failed to get Cluster-API machine types: {e}")
            return []
    
    async def _get_cluster_api_regions(self, provider: str) -> List[Dict]:
        """Get regions from Cluster-API provider configuration"""
        # This would query Cluster-API provider configurations
        return [
            {'id': 'default', 'name': 'Default Region', 'location': 'Default Location'}
        ]
    
    def _is_cache_valid(self, cache_key: str) -> bool:
        """Check if cached data is still valid"""
        if cache_key not in self._cache_expiry:
            return False
        return datetime.now() < self._cache_expiry[cache_key]
    
    async def refresh_provider_data(self, provider: str) -> Dict:
        """Refresh all data for a provider"""
        try:
            # Refresh all provider data
            regions = await self.get_provider_regions(provider, force_refresh=True)
            machine_types = await self.get_provider_machine_types(provider, force_refresh=True)
            k8s_versions = await self.get_kubernetes_versions(provider)
            
            return {
                'success': True,
                'data': {
                    'regions': regions,
                    'machineTypes': machine_types,
                    'kubernetesVersions': k8s_versions
                },
                'message': f'Provider data refreshed for {provider}'
            }
            
        except Exception as e:
            logger.error(f"Failed to refresh provider data for {provider}: {e}")
            return {
                'success': False,
                'error': str(e)
            }

# Global service instance
cluster_api_service = ClusterAPIService()

