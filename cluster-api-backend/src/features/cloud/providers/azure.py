"""
Azure Cloud Provider Implementation

This module implements the Azure cloud provider client.
"""
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from azure.identity import ClientSecretCredential, DefaultAzureCredential
from azure.mgmt.subscription import SubscriptionClient
from azure.mgmt.resource import ResourceManagementClient
from azure.mgmt.compute import ComputeManagementClient
from azure.mgmt.storage import StorageManagementClient
from azure.mgmt.network import NetworkManagementClient
from azure.core.exceptions import AzureError

from .base import CloudProviderClient

logger = logging.getLogger(__name__)

class AzureClient(CloudProviderClient):
    """Azure cloud provider client implementation"""
    
    def __init__(self, credentials: Dict[str, Any], subscription_id: Optional[str] = None, 
                 tenant_id: Optional[str] = None, region: Optional[str] = None):
        """Initialize the Azure client"""
        super().__init__(credentials, region)
        self.subscription_id = subscription_id or credentials.get('subscription_id')
        self.tenant_id = tenant_id or credentials.get('tenant_id')
        self._credential = None
        self._clients = {}
        
    async def connect(self) -> None:
        """Establish connection to Azure"""
        try:
            # Determine authentication method
            if 'client_id' in self.credentials and 'client_secret' in self.credentials:
                # Service Principal authentication
                self._credential = ClientSecretCredential(
                    tenant_id=self.tenant_id,
                    client_id=self.credentials['client_id'],
                    client_secret=self.credentials['client_secret']
                )
            else:
                # Default credential (managed identity, Azure CLI, etc.)
                self._credential = DefaultAzureCredential()
            
            # Test the connection with a simple API call
            subscription_client = self._get_client('subscription')
            next(subscription_client.subscriptions.list())
            
            logger.info("Successfully connected to Azure")
            
        except AzureError as e:
            logger.error(f"Failed to connect to Azure: {e}")
            raise
    
    async def validate_connection(self) -> bool:
        """Validate Azure credentials and permissions"""
        try:
            if not self._credential:
                await self.connect()
                
            subscription_client = self._get_client('subscription')
            next(subscription_client.subscriptions.list())
            return True
            
        except AzureError as e:
            logger.error(f"Azure connection validation failed: {e}")
            return False
    
    async def discover_resources(self, resource_types: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """Discover Azure resources"""
        resources = []
        
        # If no resource types specified, discover all supported types
        if not resource_types:
            resource_types = ['virtual_machines', 'storage_accounts', 'virtual_networks', 'sql_servers']
        
        resource_client = self._get_client('resource')
        
        # Discover Virtual Machines
        if 'virtual_machines' in resource_types:
            try:
                compute_client = self._get_client('compute')
                for vm in compute_client.virtual_machines.list_all():
                    resources.append({
                        'id': vm.id,
                        'name': vm.name,
                        'type': 'virtual_machine',
                        'resource_group': self._extract_resource_group(vm.id),
                        'location': vm.location,
                        'details': {
                            'vm_size': vm.hardware_profile.vm_size if hasattr(vm, 'hardware_profile') else None,
                            'os_type': vm.storage_profile.os_disk.os_type.value if hasattr(vm, 'storage_profile') else None,
                            'provisioning_state': vm.provisioning_state if hasattr(vm, 'provisioning_state') else None,
                        },
                        'tags': vm.tags or {}
                    })
            except AzureError as e:
                logger.error(f"Failed to discover Azure VMs: {e}")
        
        # Discover Storage Accounts
        if 'storage_accounts' in resource_types:
            try:
                storage_client = self._get_client('storage')
                for account in storage_client.storage_accounts.list():
                    resources.append({
                        'id': account.id,
                        'name': account.name,
                        'type': 'storage_account',
                        'resource_group': self._extract_resource_group(account.id),
                        'location': account.location,
                        'details': {
                            'account_type': account.sku.name if hasattr(account, 'sku') else None,
                            'access_tier': account.access_tier.value if hasattr(account, 'access_tier') else None,
                            'https_traffic': account.enable_https_traffic_only if hasattr(account, 'enable_https_traffic_only') else None,
                        },
                        'tags': account.tags or {}
                    })
            except AzureError as e:
                logger.error(f"Failed to discover Azure Storage Accounts: {e}")
        
        # Discover Virtual Networks
        if 'virtual_networks' in resource_types:
            try:
                network_client = self._get_client('network')
                for vnet in network_client.virtual_networks.list_all():
                    resources.append({
                        'id': vnet.id,
                        'name': vnet.name,
                        'type': 'virtual_network',
                        'resource_group': self._extract_resource_group(vnet.id),
                        'location': vnet.location,
                        'details': {
                            'address_space': [addr.address_prefix for addr in vnet.address_space.address_prefixes] 
                                          if hasattr(vnet, 'address_space') and vnet.address_space else [],
                            'subnets': [subnet.name for subnet in vnet.subnets] if hasattr(vnet, 'subnets') else [],
                        },
                        'tags': vnet.tags or {}
                    })
            except AzureError as e:
                logger.error(f"Failed to discover Azure Virtual Networks: {e}")
        
        # Add discovery for other resource types (SQL, AKS, etc.)
        # ...
        
        return resources
    
    async def get_cost_estimate(
        self, 
        start_date: datetime, 
        end_date: datetime, 
        granularity: str = "DAILY"
    ) -> Dict[str, Any]:
        """Get cost estimate using Azure Cost Management"""
        try:
            # Note: Azure Cost Management API requires additional permissions and setup
            # This is a simplified implementation
            from azure.mgmt.costmanagement import CostManagementClient
            from azure.mgmt.costmanagement.models import QueryDefinition, QueryTimePeriod, QueryAggregation, QueryGrouping
            
            cost_client = self._get_client('costmanagement')
            
            # Define the time period
            time_period = QueryTimePeriod(
                from_property=start_date,
                to=end_date
            )
            
            # Define the query
            query = QueryDefinition(
                type="ActualCost",
                timeframe="Custom",
                time_period=time_period,
                dataset={
                    "granularity": granularity.upper(),
                    "aggregation": {
                        "totalCost": {
                            "name": "Cost",
                            "function": "Sum"
                        }
                    },
                    "grouping": [
                        {
                            "type": "Dimension",
                            "name": "ServiceName"
                        }
                    ]
                }
            )
            
            # Execute the query
            result = await cost_client.query.usage(
                scope=f"/subscriptions/{self.subscription_id}",
                parameters=query
            )
            
            # Process the result
            results = {
                'total_cost': 0.0,
                'currency': 'USD',  # Default, will be updated from the response
                'breakdown': {},
                'time_period': {
                    'start': start_date.isoformat(),
                    'end': end_date.isoformat()
                },
                'granularity': granularity.upper(),
                'estimated': False
            }
            
            for row in result.rows:
                service_name = row[1] if len(row) > 1 else 'Unknown'
                cost = float(row[0]) if row[0] else 0.0
                
                # Update total cost
                results['total_cost'] += cost
                
                # Update service breakdown
                if service_name not in results['breakdown']:
                    results['breakdown'][service_name] = 0.0
                results['breakdown'][service_name] += cost
            
            return results
            
        except Exception as e:
            logger.error(f"Failed to get Azure cost estimate: {e}")
            raise
    
    async def run_compliance_checks(self, check_names: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """Run compliance checks on Azure resources"""
        results = []
        
        # If no specific checks requested, run all available checks
        if not check_names:
            check_names = [
                'vm_encryption',
                'storage_secure_transfer',
                'sql_tde_encryption',
                'nsg_default_rules',
                'key_vault_logging'
            ]
        
        # Run each check
        for check_name in check_names:
            try:
                if check_name == 'vm_encryption':
                    result = await self._check_vm_encryption()
                elif check_name == 'storage_secure_transfer':
                    result = await self._check_storage_secure_transfer()
                elif check_name == 'sql_tde_encryption':
                    result = await self._check_sql_tde_encryption()
                elif check_name == 'nsg_default_rules':
                    result = await self._check_nsg_default_rules()
                elif check_name == 'key_vault_logging':
                    result = await self._check_key_vault_logging()
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
        interval: str = "PT1H"  # ISO 8601 duration, e.g., PT1H, PT5M
    ) -> Dict[str, List[Dict[str, Any]]]:
        """Get Azure Monitor metrics for a resource"""
        try:
            from azure.monitor.query import MetricsQueryClient
            from azure.identity import DefaultAzureCredential
            
            credential = self._credential or DefaultAzureCredential()
            metrics_client = MetricsQueryClient(credential)
            
            # Query metrics
            metrics_response = await metrics_client.query_resource(
                resource_id,
                metric_names=metric_names,
                start_time=start_time,
                end_time=end_time,
                interval=interval
            )
            
            # Process the response
            metrics_data = {}
            for metric in metrics_response.metrics:
                datapoints = []
                for ts, values in zip(metric.timestamps, metric.values):
                    dp = {'timestamp': ts.isoformat()}
                    for i, value in enumerate(values):
                        dp[metric.descriptions[i].name.lower()] = value
                    datapoints.append(dp)
                
                metrics_data[metric.name] = datapoints
            
            return metrics_data
            
        except Exception as e:
            logger.error(f"Failed to get Azure metrics for {resource_id}: {e}")
            raise
    
    async def get_available_regions(self) -> List[Dict[str, Any]]:
        """Get list of available Azure regions"""
        try:
            subscription_client = self._get_client('subscription')
            locations = subscription_client.subscriptions.list_locations(self.subscription_id)
            
            return [
                {
                    'name': loc.name,
                    'display_name': loc.display_name,
                    'available': True  # Azure doesn't provide this info directly
                }
                for loc in locations
            ]
            
        except AzureError as e:
            logger.error(f"Failed to get Azure regions: {e}")
            raise
    
    async def get_resource_types(self) -> List[Dict[str, Any]]:
        """Get list of supported resource types for discovery"""
        return [
            {'id': 'virtual_machine', 'name': 'Virtual Machine'},
            {'id': 'storage_account', 'name': 'Storage Account'},
            {'id': 'virtual_network', 'name': 'Virtual Network'},
            {'id': 'network_security_group', 'name': 'Network Security Group'},
            {'id': 'sql_server', 'name': 'SQL Server'},
            {'id': 'sql_database', 'name': 'SQL Database'},
            {'id': 'key_vault', 'name': 'Key Vault'},
            {'id': 'kubernetes_service', 'name': 'Azure Kubernetes Service'},
            {'id': 'app_service', 'name': 'App Service'},
            {'id': 'function_app', 'name': 'Function App'},
            {'id': 'cosmos_db', 'name': 'Cosmos DB'},
            {'id': 'redis_cache', 'name': 'Redis Cache'},
        ]
    
    async def get_compliance_checks(self) -> List[Dict[str, Any]]:
        """Get list of available compliance checks"""
        return [
            {
                'id': 'vm_encryption',
                'name': 'VM Disk Encryption',
                'description': 'Checks if virtual machine disks are encrypted.',
                'category': 'Security',
                'severity': 'high'
            },
            {
                'id': 'storage_secure_transfer',
                'name': 'Storage Secure Transfer',
                'description': 'Checks if secure transfer is enabled for storage accounts.',
                'category': 'Security',
                'severity': 'high'
            },
            {
                'id': 'sql_tde_encryption',
                'name': 'SQL TDE Encryption',
                'description': 'Checks if Transparent Data Encryption is enabled for SQL databases.',
                'category': 'Security',
                'severity': 'high'
            },
            {
                'id': 'nsg_default_rules',
                'name': 'NSG Default Rules',
                'description': 'Checks for overly permissive default rules in Network Security Groups.',
                'category': 'Networking',
                'severity': 'medium'
            },
            {
                'id': 'key_vault_logging',
                'name': 'Key Vault Logging',
                'description': 'Checks if diagnostic logging is enabled for Key Vaults.',
                'category': 'Monitoring',
                'severity': 'medium'
            },
        ]
    
    async def close(self) -> None:
        """Clean up resources"""
        self._clients = {}
        self._credential = None
    
    def _get_client(self, client_type: str):
        """Get an Azure management client"""
        if client_type in self._clients:
            return self._clients[client_type]
        
        if not self._credential:
            raise RuntimeError("Azure client not initialized. Call connect() first.")
        
        if client_type == 'subscription':
            client = SubscriptionClient(self._credential)
        elif client_type == 'resource':
            client = ResourceManagementClient(self._credential, self.subscription_id)
        elif client_type == 'compute':
            client = ComputeManagementClient(self._credential, self.subscription_id)
        elif client_type == 'storage':
            client = StorageManagementClient(self._credential, self.subscription_id)
        elif client_type == 'network':
            client = NetworkManagementClient(self._credential, self.subscription_id)
        elif client_type == 'costmanagement':
            from azure.mgmt.costmanagement import CostManagementClient
            client = CostManagementClient(self._credential)
        else:
            raise ValueError(f"Unsupported client type: {client_type}")
        
        self._clients[client_type] = client
        return client
    
    def _extract_resource_group(self, resource_id: str) -> str:
        """Extract resource group name from resource ID"""
        parts = resource_id.split('/')
        try:
            return parts[parts.index('resourceGroups') + 1]
        except (ValueError, IndexError):
            return 'unknown'
    
    # Compliance check implementations
    async def _check_vm_encryption(self) -> Dict[str, Any]:
        """Check if VM disks are encrypted"""
        try:
            compute_client = self._get_client('compute')
            unencrypted_vms = []
            
            for vm in compute_client.virtual_machines.list_all():
                is_encrypted = True
                
                # Check OS disk
                if hasattr(vm.storage_profile, 'os_disk') and vm.storage_profile.os_disk:
                    disk = vm.storage_profile.os_disk
                    if not (hasattr(disk, 'encryption_settings') and disk.encryption_settings):
                        is_encrypted = False
                
                # Check data disks
                if is_encrypted and hasattr(vm.storage_profile, 'data_disks'):
                    for disk in vm.storage_profile.data_disks or []:
                        if not (hasattr(disk, 'encryption_settings') and disk.encryption_settings):
                            is_encrypted = False
                            break
                
                if not is_encrypted:
                    unencrypted_vms.append({
                        'id': vm.id,
                        'name': vm.name,
                        'resource_group': self._extract_resource_group(vm.id)
                    })
            
            return {
                'check_name': 'vm_encryption',
                'status': 'pass' if not unencrypted_vms else 'fail',
                'severity': 'high',
                'details': {
                    'unencrypted_vms': unencrypted_vms,
                    'total_checked': len(list(compute_client.virtual_machines.list_all())),
                    'recommendation': 'Enable Azure Disk Encryption for all virtual machines.'
                }
            }
            
        except Exception as e:
            logger.error(f"Error checking VM encryption: {e}")
            return {
                'check_name': 'vm_encryption',
                'status': 'error',
                'severity': 'high',
                'details': {
                    'error': str(e)
                }
            }
    
    async def _check_storage_secure_transfer(self) -> Dict[str, Any]:
        """Check if secure transfer is enabled for storage accounts"""
        try:
            storage_client = self._get_client('storage')
            insecure_accounts = []
            
            for account in storage_client.storage_accounts.list():
                if hasattr(account, 'enable_https_traffic_only') and not account.enable_https_traffic_only:
                    insecure_accounts.append({
                        'id': account.id,
                        'name': account.name,
                        'resource_group': self._extract_resource_group(account.id)
                    })
            
            return {
                'check_name': 'storage_secure_transfer',
                'status': 'pass' if not insecure_accounts else 'fail',
                'severity': 'high',
                'details': {
                    'insecure_accounts': insecure_accounts,
                    'total_checked': len(list(storage_client.storage_accounts.list())),
                    'recommendation': 'Enable secure transfer for all storage accounts.'
                }
            }
            
        except Exception as e:
            logger.error(f"Error checking storage secure transfer: {e}")
            return {
                'check_name': 'storage_secure_transfer',
                'status': 'error',
                'severity': 'high',
                'details': {
                    'error': str(e)
                }
            }
    
    # Add other compliance check methods (_check_sql_tde_encryption, _check_nsg_default_rules, etc.)
    # ...
    
    async def _check_key_vault_logging(self) -> Dict[str, Any]:
        """Check if diagnostic logging is enabled for Key Vaults"""
        try:
            from azure.mgmt.keyvault import KeyVaultManagementClient
            from azure.mgmt.monitor import MonitorManagementClient
            
            keyvault_client = KeyVaultManagementClient(self._credential, self.subscription_id)
            monitor_client = MonitorManagementClient(self._credential, self.subscription_id)
            
            keyvaults_without_logging = []
            
            for vault in keyvault_client.vaults.list():
                # Check if diagnostic settings are configured
                diagnostic_settings = monitor_client.diagnostic_settings.list(resource_uri=vault.id)
                has_logging = False
                
                for setting in diagnostic_settings.value:
                    if setting.storage_account_id or setting.workspace_id:
                        has_logging = True
                        break
                
                if not has_logging:
                    keyvaults_without_logging.append({
                        'id': vault.id,
                        'name': vault.name,
                        'resource_group': self._extract_resource_group(vault.id)
                    })
            
            return {
                'check_name': 'key_vault_logging',
                'status': 'pass' if not keyvaults_without_logging else 'fail',
                'severity': 'medium',
                'details': {
                    'keyvaults_without_logging': keyvaults_without_logging,
                    'total_checked': len(list(keyvault_client.vaults.list())),
                    'recommendation': 'Enable diagnostic logging for all Key Vaults.'
                }
            }
            
        except Exception as e:
            logger.error(f"Error checking Key Vault logging: {e}")
            return {
                'check_name': 'key_vault_logging',
                'status': 'error',
                'severity': 'medium',
                'details': {
                    'error': str(e)
                }
            }
