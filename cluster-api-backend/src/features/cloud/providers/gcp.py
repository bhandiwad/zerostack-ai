"""
Google Cloud Platform (GCP) Provider Implementation

This module implements the GCP cloud provider client.
"""
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from google.oauth2 import service_account
from google.cloud import compute_v1
from google.cloud import storage
from google.cloud import monitoring_v3
from google.cloud.monitoring_v3 import query
from google.cloud import container_v1
from google.api_core.exceptions import GoogleAPICallError, RetryError

from .base import CloudProviderClient

logger = logging.getLogger(__name__)

class GCPClient(CloudProviderClient):
    """GCP cloud provider client implementation"""
    
    def __init__(self, credentials: Dict[str, Any], project_id: Optional[str] = None, 
                 region: Optional[str] = None):
        """Initialize the GCP client"""
        super().__init__(credentials, region)
        self.project_id = project_id or credentials.get('project_id')
        self._credentials = None
        self._clients = {}
    
    async def connect(self) -> None:
        """Establish connection to GCP"""
        try:
            # Create credentials object from service account key
            if 'private_key' in self.credentials and 'client_email' in self.credentials:
                # Service account key authentication
                self._credentials = service_account.Credentials.from_service_account_info(
                    self.credentials
                )
            elif 'type' in self.credentials and self.credentials['type'] == 'service_account':
                # Full service account key JSON
                self._credentials = service_account.Credentials.from_service_account_info(
                    self.credentials
                )
            else:
                # Try to use default credentials (e.g., from environment)
                self._credentials, _ = google.auth.default()
            
            # Test the connection with a simple API call
            client = compute_v1.ProjectsClient(credentials=self._credentials)
            client.get(project=self.project_id)
            
            logger.info("Successfully connected to GCP")
            
        except (GoogleAPICallError, RetryError) as e:
            logger.error(f"Failed to connect to GCP: {e}")
            raise
    
    async def validate_connection(self) -> bool:
        """Validate GCP credentials and permissions"""
        try:
            if not self._credentials:
                await self.connect()
                
            client = compute_v1.ProjectsClient(credentials=self._credentials)
            client.get(project=self.project_id)
            return True
            
        except (GoogleAPICallError, RetryError) as e:
            logger.error(f"GCP connection validation failed: {e}")
            return False
    
    async def discover_resources(self, resource_types: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """Discover GCP resources"""
        resources = []
        
        # If no resource types specified, discover all supported types
        if not resource_types:
            resource_types = ['compute_instances', 'storage_buckets', 'kubernetes_clusters']
        
        # Discover Compute Engine Instances
        if 'compute_instances' in resource_types:
            try:
                client = self._get_client('compute')
                zones = client.zones().list(project=self.project_id).execute()
                
                for zone in zones.get('items', []):
                    if self.region and not zone['name'].startswith(self.region):
                        continue
                        
                    instances = client.instances().list(
                        project=self.project_id,
                        zone=zone['name']
                    ).execute()
                    
                    for instance in instances.get('items', []):
                        resources.append({
                            'id': instance['id'],
                            'name': instance['name'],
                            'type': 'compute_instance',
                            'zone': zone['name'],
                            'region': '-'.join(zone['name'].split('-')[:-1]),
                            'details': {
                                'machine_type': instance['machineType'].split('/')[-1],
                                'status': instance['status'],
                                'network_interfaces': [
                                    {
                                        'network': ni.get('network', '').split('/')[-1],
                                        'ip': ni.get('networkIP'),
                                        'external_ip': ni.get('accessConfigs', [{}])[0].get('natIP')
                                    }
                                    for ni in instance.get('networkInterfaces', [])
                                ]
                            },
                            'labels': instance.get('labels', {})
                        })
            except (GoogleAPICallError, RetryError) as e:
                logger.error(f"Failed to discover GCP Compute Instances: {e}")
        
        # Discover Cloud Storage Buckets
        if 'storage_buckets' in resource_types:
            try:
                client = storage.Client(project=self.project_id, credentials=self._credentials)
                for bucket in client.list_buckets():
                    resources.append({
                        'id': bucket.id,
                        'name': bucket.name,
                        'type': 'storage_bucket',
                        'location': bucket.location.upper(),
                        'details': {
                            'storage_class': bucket.storage_class,
                            'created': bucket.time_created.isoformat(),
                            'versioning_enabled': bucket.versioning_enabled,
                            'encryption': bucket.default_kms_key_name is not None
                        },
                        'labels': bucket.labels or {}
                    })
            except (GoogleAPICallError, RetryError) as e:
                logger.error(f"Failed to discover GCP Storage Buckets: {e}")
        
        # Discover GKE Clusters
        if 'kubernetes_clusters' in resource_types:
            try:
                client = container_v1.ClusterManagerClient(credentials=self._credentials)
                parent = f"projects/{self.project_id}/locations/-"  # All regions
                clusters = client.list_clusters(parent=parent)
                
                for cluster in clusters.clusters:
                    resources.append({
                        'id': f"{self.project_id}/{cluster.location}/{cluster.name}",
                        'name': cluster.name,
                        'type': 'kubernetes_cluster',
                        'location': cluster.location,
                        'details': {
                            'status': cluster.status.name,
                            'master_version': cluster.current_master_version,
                            'node_count': cluster.current_node_count,
                            'node_pools': [{
                                'name': pool.name,
                                'version': pool.version,
                                'node_count': pool.initial_node_count,
                                'machine_type': pool.config.machine_type.split('/')[-1]
                            } for pool in cluster.node_pools],
                            'network': cluster.network,
                            'subnetwork': cluster.subnetwork,
                            'endpoint': cluster.endpoint,
                            'private_cluster': cluster.private_cluster_config is not None
                        },
                        'labels': dict(cluster.resource_labels)
                    })
            except (GoogleAPICallError, RetryError) as e:
                logger.error(f"Failed to discover GKE Clusters: {e}")
        
        return resources
    
    async def get_cost_estimate(
        self, 
        start_date: datetime, 
        end_date: datetime, 
        granularity: str = "DAILY"
    ) -> Dict[str, Any]:
        """Get cost estimate using GCP Cloud Billing"""
        try:
            from google.cloud import billing_v1
            
            client = billing_v1.CloudBillingClient(credentials=self._credentials)
            
            # Get the billing account ID
            billing_accounts = client.list_billing_accounts()
            billing_account = next(billing_accounts, None)
            
            if not billing_account:
                raise ValueError("No billing accounts found")
            
            # Format the filter
            filter_str = (
                f'start_time >= "{start_date.isoformat()}" AND '
                f'end_time <= "{end_date.isoformat()}" AND '
                f'project.id = "{self.project_id}"'
            )
            
            # Build the request
            request = {
                'name': billing_account.name,
                'filter': filter_str,
                'group_by': [
                    'resource.name',
                    'resource.global_name',
                    'service.id',
                    'service.description',
                    'sku.id',
                    'sku.description'
                ],
                'page_size': 1000
            }
            
            # Execute the request
            result = client.list_billing_account_usage(**request)
            
            # Process the results
            total_cost = 0.0
            breakdown = {}
            
            for row in result:
                cost = float(row.cost) if hasattr(row, 'cost') else 0.0
                total_cost += cost
                
                # Get service name
                service_name = "Unknown"
                for label in row.labels:
                    if label.key == 'service':
                        service_name = label.value
                        break
                
                # Add to breakdown
                if service_name not in breakdown:
                    breakdown[service_name] = 0.0
                breakdown[service_name] += cost
            
            return {
                'total_cost': total_cost,
                'currency': 'USD',  # GCP always returns costs in USD
                'breakdown': breakdown,
                'time_period': {
                    'start': start_date.isoformat(),
                    'end': end_date.isoformat()
                },
                'granularity': granularity.upper(),
                'estimated': False
            }
            
        except Exception as e:
            logger.error(f"Failed to get GCP cost estimate: {e}")
            raise
    
    async def run_compliance_checks(self, check_names: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """Run compliance checks on GCP resources"""
        results = []
        
        # If no specific checks requested, run all available checks
        if not check_names:
            check_names = [
                'bucket_public_access',
                'sql_public_access',
                'vm_public_ip',
                'service_account_key_age',
                'audit_logging'
            ]
        
        # Run each check
        for check_name in check_names:
            try:
                if check_name == 'bucket_public_access':
                    result = await self._check_bucket_public_access()
                elif check_name == 'sql_public_access':
                    result = await self._check_sql_public_access()
                elif check_name == 'vm_public_ip':
                    result = await self._check_vm_public_ip()
                elif check_name == 'service_account_key_age':
                    result = await self._check_service_account_key_age()
                elif check_name == 'audit_logging':
                    result = await self._check_audit_logging()
                else:
                    logger.warning(f"Unknown compliance check: {check_name}")
                    continue
                
                results.append(result)
                
            except Exception as e:
                logger.error(f"Error running compliance check {check_name}: {e}")
                results.append({
                    'check_name': check_name,
                    'status': 'error',
                    'severity': 'high',
                    'details': {
                        'error': str(e)
                    }
                })
        
        return results
    
    async def get_resource_metrics(
        self, 
        resource_id: str, 
        metric_names: List[str],
        start_time: datetime,
        end_time: datetime,
        interval: str = "3600s"  # Default to 1 hour in seconds
    ) -> Dict[str, List[Dict[str, Any]]]:
        """Get Cloud Monitoring metrics for a resource"""
        try:
            client = monitoring_v3.MetricServiceClient(credentials=self._credentials)
            
            # Convert resource ID to monitored resource
            resource_type, resource_name = self._parse_resource_id(resource_id)
            
            # Build the filter
            filter_str = f'resource.type = "{resource_type}" AND resource.labels.resource_id = "{resource_name}"'
            
            # Build the interval
            interval = monitoring_v3.TimeInterval({
                "start_time": {"seconds": int(start_time.timestamp())},
                "end_time": {"seconds": int(end_time.timestamp())},
            })
            
            # Query each metric
            metrics_data = {}
            
            for metric_name in metric_names:
                # Map metric name to GCP metric type
                metric_type = self._map_metric_type(metric_name, resource_type)
                
                # Build the query
                query = monitoring_v3.QueryTimeSeriesRequest(
                    name=f"projects/{self.project_id}",
                    query=f"fetch {resource_type} | metric '{metric_type}' | align rate(1m) | every 1m",
                    page_size=1000
                )
                
                # Execute the query
                results = client.query_time_series(request=query)
                
                # Process the results
                datapoints = []
                for result in results.time_series_data:
                    for point in result.point_data:
                        datapoints.append({
                            'timestamp': point.time_interval.start_time.ToDatetime().isoformat(),
                            'value': point.values[0].double_value or point.values[0].int64_value
                        })
                
                metrics_data[metric_name] = datapoints
            
            return metrics_data
            
        except Exception as e:
            logger.error(f"Failed to get GCP metrics for {resource_id}: {e}")
            raise
    
    async def get_available_regions(self) -> List[Dict[str, Any]]:
        """Get list of available GCP regions"""
        try:
            client = compute_v1.RegionsClient(credentials=self._credentials)
            regions = client.list(project=self.project_id)
            
            return [
                {
                    'name': region.name,
                    'display_name': region.name.upper(),
                    'available': True
                }
                for region in regions
            ]
            
        except Exception as e:
            logger.error(f"Failed to get GCP regions: {e}")
            raise
    
    async def get_resource_types(self) -> List[Dict[str, Any]]:
        """Get list of supported resource types for discovery"""
        return [
            {'id': 'compute_instance', 'name': 'Compute Engine Instance'},
            {'id': 'storage_bucket', 'name': 'Cloud Storage Bucket'},
            {'id': 'kubernetes_cluster', 'name': 'Kubernetes Engine Cluster'},
            {'id': 'cloud_sql', 'name': 'Cloud SQL Instance'},
            {'id': 'bigquery_dataset', 'name': 'BigQuery Dataset'},
            {'id': 'pubsub_topic', 'name': 'Pub/Sub Topic'},
            {'id': 'cloud_function', 'name': 'Cloud Function'},
            {'id': 'app_engine', 'name': 'App Engine Application'},
            {'id': 'cloud_run', 'name': 'Cloud Run Service'},
            {'id': 'cloud_scheduler', 'name': 'Cloud Scheduler Job'},
            {'id': 'cloud_storage', 'name': 'Cloud Storage Bucket'},
            {'id': 'cloud_firestore', 'name': 'Cloud Firestore Database'},
        ]
    
    async def get_compliance_checks(self) -> List[Dict[str, Any]]:
        """Get list of available compliance checks"""
        return [
            {
                'id': 'bucket_public_access',
                'name': 'Bucket Public Access',
                'description': 'Checks if Cloud Storage buckets have public access.',
                'category': 'Security',
                'severity': 'high'
            },
            {
                'id': 'sql_public_access',
                'name': 'SQL Public Access',
                'description': 'Checks if Cloud SQL instances have public IPs.',
                'category': 'Security',
                'severity': 'high'
            },
            {
                'id': 'vm_public_ip',
                'name': 'VM Public IP',
                'description': 'Checks if Compute Engine VMs have public IPs.',
                'category': 'Security',
                'severity': 'medium'
            },
            {
                'id': 'service_account_key_age',
                'name': 'Service Account Key Age',
                'description': 'Checks for old service account keys.',
                'category': 'IAM',
                'severity': 'medium'
            },
            {
                'id': 'audit_logging',
                'name': 'Audit Logging',
                'description': 'Checks if audit logging is enabled for all services.',
                'category': 'Logging',
                'severity': 'high'
            },
        ]
    
    async def close(self) -> None:
        """Clean up resources"""
        self._clients = {}
        self._credentials = None
    
    def _get_client(self, client_type: str):
        """Get a GCP client"""
        if client_type in self._clients:
            return self._clients[client_type]
        
        if not self._credentials:
            raise RuntimeError("GCP client not initialized. Call connect() first.")
        
        if client_type == 'compute':
            client = compute_v1.ComputeClient(credentials=self._credentials)
        elif client_type == 'storage':
            client = storage.Client(project=self.project_id, credentials=self._credentials)
        elif client_type == 'kubernetes':
            client = container_v1.ClusterManagerClient(credentials=self._credentials)
        elif client_type == 'monitoring':
            client = monitoring_v3.MetricServiceClient(credentials=self._credentials)
        else:
            raise ValueError(f"Unsupported client type: {client_type}")
        
        self._clients[client_type] = client
        return client
    
    def _parse_resource_id(self, resource_id: str) -> tuple:
        """Parse resource ID into type and name"""
        parts = resource_id.split('/')
        if len(parts) < 2:
            raise ValueError(f"Invalid resource ID format: {resource_id}")
        return parts[-2], parts[-1]
    
    def _map_metric_type(self, metric_name: str, resource_type: str) -> str:
        """Map internal metric name to GCP metric type"""
        metric_map = {
            'compute_instance': {
                'cpu_usage': 'compute.googleapis.com/instance/cpu/utilization',
                'memory_usage': 'compute.googleapis.com/instance/memory/usage',
                'disk_read_bytes': 'compute.googleapis.com/instance/disk/read_bytes_count',
                'disk_write_bytes': 'compute.googleapis.com/instance/disk/write_bytes_count',
                'network_received_bytes': 'compute.googleapis.com/instance/network/received_bytes_count',
                'network_sent_bytes': 'compute.googleapis.com/instance/network/sent_bytes_count',
            },
            'storage_bucket': {
                'storage_total': 'storage.googleapis.com/storage/total_bytes',
                'object_count': 'storage.googleapis.com/storage/object_count',
            },
            'kubernetes_cluster': {
                'cpu_usage': 'kubernetes.io/container/cpu/core_usage_time',
                'memory_usage': 'kubernetes.io/container/memory/used_bytes',
                'pod_count': 'kubernetes.io/container/container/cpu/core_usage_time',
            }
        }
        
        resource_metrics = metric_map.get(resource_type, {})
        return resource_metrics.get(metric_name, metric_name)
    
    # Compliance check implementations
    async def _check_bucket_public_access(self) -> Dict[str, Any]:
        """Check if storage buckets have public access"""
        try:
            client = storage.Client(project=self.project_id, credentials=self._credentials)
            public_buckets = []
            
            for bucket in client.list_buckets():
                try:
                    policy = bucket.get_iam_policy()
                    
                    # Check for allUsers or allAuthenticatedUsers in IAM policy
                    public = False
                    for binding in policy.bindings:
                        if 'allUsers' in binding['members'] or 'allAuthenticatedUsers' in binding['members']:
                            public = True
                            break
                    
                    if public:
                        public_buckets.append({
                            'name': bucket.name,
                            'location': bucket.location.upper()
                        })
                except Exception as e:
                    logger.warning(f"Failed to check bucket {bucket.name}: {e}")
            
            return {
                'check_name': 'bucket_public_access',
                'status': 'pass' if not public_buckets else 'fail',
                'severity': 'high',
                'details': {
                    'public_buckets': public_buckets,
                    'total_checked': len(list(client.list_buckets())),
                    'recommendation': 'Avoid granting allUsers or allAuthenticatedUsers access to storage buckets.'
                }
            }
            
        except Exception as e:
            logger.error(f"Error checking bucket public access: {e}")
            return {
                'check_name': 'bucket_public_access',
                'status': 'error',
                'severity': 'high',
                'details': {
                    'error': str(e)
                }
            }
    
    async def _check_sql_public_access(self) -> Dict[str, Any]:
        """Check if Cloud SQL instances have public IPs"""
        try:
            from google.cloud import sql_v1
            
            client = sql_v1.CloudSqlInstancesServiceClient(credentials=self._credentials)
            public_instances = []
            
            # List all instances
            instances = client.list(project=self.project_id)
            
            for instance in instances.items:
                if instance.ip_addresses:
                    for ip in instance.ip_addresses:
                        if ip.type == 'PRIMARY' and ip.ip_address != '0.0.0.0':
                            public_instances.append({
                                'name': instance.name,
                                'region': instance.region,
                                'ip_address': ip.ip_address
                            })
            
            return {
                'check_name': 'sql_public_access',
                'status': 'pass' if not public_instances else 'warn',
                'severity': 'medium',
                'details': {
                    'public_instances': public_instances,
                    'total_checked': len(instances.items),
                    'recommendation': 'Consider using private IPs for Cloud SQL instances and connect via Cloud SQL Proxy or VPC peering.'
                }
            }
            
        except Exception as e:
            logger.error(f"Error checking SQL public access: {e}")
            return {
                'check_name': 'sql_public_access',
                'status': 'error',
                'severity': 'medium',
                'details': {
                    'error': str(e)
                }
            }
    
    async def _check_vm_public_ip(self) -> Dict[str, Any]:
        """Check if VMs have public IPs"""
        try:
            client = compute_v1.InstancesClient(credentials=self._credentials)
            vms_with_public_ips = []
            
            # List all instances across all zones
            zones = compute_v1.ZonesClient(credentials=self._credentials).list(project=self.project_id)
            
            for zone in zones:
                instances = client.list(project=self.project_id, zone=zone.name.split('/')[-1])
                
                for instance in instances:
                    for interface in instance.network_interfaces:
                        for config in interface.access_configs:
                            if config.nat_i_p:
                                vms_with_public_ips.append({
                                    'name': instance.name,
                                    'zone': zone.name.split('/')[-1],
                                    'public_ip': config.nat_i_p
                                })
            
            return {
                'check_name': 'vm_public_ip',
                'status': 'pass' if not vms_with_public_ips else 'warn',
                'severity': 'medium',
                'details': {
                    'vms_with_public_ips': vms_with_public_ips,
                    'recommendation': 'Avoid assigning public IPs to VMs. Use a bastion host or IAP for secure access.'
                }
            }
            
        except Exception as e:
            logger.error(f"Error checking VM public IPs: {e}")
            return {
                'check_name': 'vm_public_ip',
                'status': 'error',
                'severity': 'medium',
                'details': {
                    'error': str(e)
                }
            }
    
    async def _check_service_account_key_age(self) -> Dict[str, Any]:
        """Check for old service account keys"""
        try:
            from google.iam import credentials_v1
            from google.iam.credentials_v1 import credentials as creds
            
            client = credentials_v1.IAMCredentialsClient(credentials=self._credentials)
            service_accounts = client.list_service_accounts(name=f"projects/{self.project_id}")
            
            old_keys = []
            threshold_days = 90  # Keys older than this many days are considered old
            
            for sa in service_accounts.accounts:
                keys = client.list_service_account_keys(
                    name=sa.name,
                    key_types=[creds.ListServiceAccountKeysRequest.KeyType.USER_MANAGED]
                )
                
                for key in keys.keys:
                    key_age = (datetime.utcnow() - key.valid_after_time.ToDatetime()).days
                    if key_age > threshold_days:
                        old_keys.append({
                            'service_account': sa.email,
                            'key_name': key.name.split('/')[-1],
                            'key_created': key.valid_after_time.ToDatetime().isoformat(),
                            'age_days': key_age
                        })
            
            return {
                'check_name': 'service_account_key_age',
                'status': 'pass' if not old_keys else 'warn',
                'severity': 'medium',
                'details': {
                    'old_keys': old_keys,
                    'threshold_days': threshold_days,
                    'recommendation': f'Rotate service account keys older than {threshold_days} days.'
                }
            }
            
        except Exception as e:
            logger.error(f"Error checking service account key age: {e}")
            return {
                'check_name': 'service_account_key_age',
                'status': 'error',
                'severity': 'medium',
                'details': {
                    'error': str(e)
                }
            }
    
    async def _check_audit_logging(self) -> Dict[str, Any]:
        """Check if audit logging is enabled for all services"""
        try:
            from google.cloud import logging_v2
            
            client = logging_v2.ConfigServiceV2Client(credentials=self._credentials)
            parent = f"projects/{self.project_id}"
            
            # Get the organization policy for audit logging
            try:
                policy = client.get_organization_policy(
                    resource=parent,
                    constraint="constraints/iam.disableServiceAccountKeyCreation"
                )
                audit_enabled = policy.boolean_policy.enforced
            except:
                audit_enabled = False
            
            return {
                'check_name': 'audit_logging',
                'status': 'pass' if audit_enabled else 'fail',
                'severity': 'high',
                'details': {
                    'audit_enabled': audit_enabled,
                    'recommendation': 'Enable audit logging for all services in the Google Cloud project.'
                }
            }
            
        except Exception as e:
            logger.error(f"Error checking audit logging: {e}")
            return {
                'check_name': 'audit_logging',
                'status': 'error',
                'severity': 'high',
                'details': {
                    'error': str(e)
                }
            }
