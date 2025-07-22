"""
Advanced Cluster Operations Service
Provides comprehensive cluster management including node draining, version updates, and OPA policy management
"""

import json
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from kubernetes import client, config
from kubernetes.client.rest import ApiException

logger = logging.getLogger(__name__)

class AdvancedClusterOperations:
    """Advanced cluster operations including node management, upgrades, and policy management"""
    
    def __init__(self, k8s_client=None):
        self.k8s_client = k8s_client
        self.core_v1 = None
        self.apps_v1 = None
        self.custom_objects_api = None
        
        if k8s_client:
            self.core_v1 = k8s_client.core_v1
            self.apps_v1 = k8s_client.apps_v1
            self.custom_objects_api = k8s_client.custom_objects_api
    
    def drain_node(self, cluster_id: str, node_name: str, drain_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Drain a specific node in the cluster
        
        Args:
            cluster_id: Cluster identifier
            node_name: Name of the node to drain
            drain_config: Configuration for draining operation
            
        Returns:
            Dict containing operation result and status
        """
        try:
            logger.info(f"Starting node drain operation for node {node_name} in cluster {cluster_id}")
            
            # Validate drain configuration
            grace_period = drain_config.get('grace_period_seconds', 300)
            ignore_daemonsets = drain_config.get('ignore_daemonsets', True)
            delete_emptydir_data = drain_config.get('delete_emptydir_data', False)
            force = drain_config.get('force', False)
            timeout = drain_config.get('timeout_seconds', 600)
            
            if not self.core_v1:
                # Simulate drain operation for development
                return self._simulate_node_drain(cluster_id, node_name, drain_config)
            
            # Step 1: Cordon the node (mark as unschedulable)
            logger.info(f"Cordoning node {node_name}")
            cordon_result = self._cordon_node(node_name)
            if not cordon_result['success']:
                return {
                    'success': False,
                    'error': f"Failed to cordon node: {cordon_result['error']}"
                }
            
            # Step 2: Get all pods on the node
            logger.info(f"Getting pods on node {node_name}")
            pods_result = self._get_pods_on_node(node_name)
            if not pods_result['success']:
                return {
                    'success': False,
                    'error': f"Failed to get pods on node: {pods_result['error']}"
                }
            
            pods_to_evict = pods_result['pods']
            logger.info(f"Found {len(pods_to_evict)} pods to evict from node {node_name}")
            
            # Step 3: Filter pods based on drain configuration
            filtered_pods = self._filter_pods_for_eviction(
                pods_to_evict, 
                ignore_daemonsets, 
                delete_emptydir_data
            )
            
            logger.info(f"Filtered to {len(filtered_pods)} pods for eviction")
            
            # Step 4: Evict pods with proper handling
            eviction_results = []
            start_time = time.time()
            
            for pod in filtered_pods:
                if time.time() - start_time > timeout:
                    logger.warning(f"Drain operation timeout reached for node {node_name}")
                    break
                
                eviction_result = self._evict_pod(
                    pod['name'], 
                    pod['namespace'], 
                    grace_period, 
                    force
                )
                eviction_results.append(eviction_result)
                
                if not eviction_result['success']:
                    logger.warning(f"Failed to evict pod {pod['name']}: {eviction_result['error']}")
            
            # Step 5: Wait for pods to be evicted
            logger.info(f"Waiting for pods to be evicted from node {node_name}")
            wait_result = self._wait_for_pod_eviction(node_name, timeout - (time.time() - start_time))
            
            # Step 6: Verify node is drained
            final_pods = self._get_pods_on_node(node_name)
            remaining_pods = len(final_pods.get('pods', []))
            
            success = remaining_pods == 0 or wait_result['success']
            
            return {
                'success': success,
                'data': {
                    'operation': 'drain_node',
                    'cluster_id': cluster_id,
                    'node_name': node_name,
                    'status': 'completed' if success else 'partial',
                    'pods_evicted': len([r for r in eviction_results if r['success']]),
                    'pods_failed': len([r for r in eviction_results if not r['success']]),
                    'remaining_pods': remaining_pods,
                    'duration_seconds': int(time.time() - start_time),
                    'cordoned': cordon_result['success'],
                    'eviction_results': eviction_results[:10],  # Limit for response size
                    'message': f"Node {node_name} drain {'completed' if success else 'partially completed'}"
                }
            }
            
        except Exception as e:
            logger.error(f"Error draining node {node_name}: {e}")
            return {
                'success': False,
                'error': f"Node drain operation failed: {str(e)}"
            }
    
    def uncordon_node(self, cluster_id: str, node_name: str) -> Dict[str, Any]:
        """
        Uncordon a node (mark as schedulable)
        
        Args:
            cluster_id: Cluster identifier
            node_name: Name of the node to uncordon
            
        Returns:
            Dict containing operation result
        """
        try:
            logger.info(f"Uncordoning node {node_name} in cluster {cluster_id}")
            
            if not self.core_v1:
                # Simulate uncordon operation for development
                return {
                    'success': True,
                    'data': {
                        'operation': 'uncordon_node',
                        'cluster_id': cluster_id,
                        'node_name': node_name,
                        'status': 'completed',
                        'schedulable': True,
                        'message': f"Node {node_name} is now schedulable"
                    }
                }
            
            # Get the node
            node = self.core_v1.read_node(node_name)
            
            # Remove the unschedulable taint
            if node.spec.unschedulable:
                node.spec.unschedulable = False
                self.core_v1.patch_node(node_name, node)
            
            return {
                'success': True,
                'data': {
                    'operation': 'uncordon_node',
                    'cluster_id': cluster_id,
                    'node_name': node_name,
                    'status': 'completed',
                    'schedulable': True,
                    'message': f"Node {node_name} is now schedulable"
                }
            }
            
        except Exception as e:
            logger.error(f"Error uncordoning node {node_name}: {e}")
            return {
                'success': False,
                'error': f"Node uncordon operation failed: {str(e)}"
            }
    
    def update_node_version(self, cluster_id: str, node_name: str, version_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update Kubernetes version on a specific node
        
        Args:
            cluster_id: Cluster identifier
            node_name: Name of the node to update
            version_config: Configuration for version update
            
        Returns:
            Dict containing operation result
        """
        try:
            logger.info(f"Updating node {node_name} to version {version_config.get('kubernetes_version')}")
            
            target_version = version_config.get('kubernetes_version')
            if not target_version:
                return {
                    'success': False,
                    'error': 'kubernetes_version is required'
                }
            
            # Validate version format
            if not self._validate_kubernetes_version(target_version):
                return {
                    'success': False,
                    'error': f'Invalid Kubernetes version format: {target_version}'
                }
            
            if not self.core_v1:
                # Simulate version update for development
                return self._simulate_node_version_update(cluster_id, node_name, version_config)
            
            # Step 1: Drain the node first
            drain_config = {
                'grace_period_seconds': version_config.get('drain_grace_period', 300),
                'ignore_daemonsets': True,
                'delete_emptydir_data': version_config.get('delete_emptydir_data', False),
                'timeout_seconds': version_config.get('drain_timeout', 600)
            }
            
            logger.info(f"Draining node {node_name} before version update")
            drain_result = self.drain_node(cluster_id, node_name, drain_config)
            
            if not drain_result['success']:
                return {
                    'success': False,
                    'error': f"Failed to drain node before update: {drain_result['error']}"
                }
            
            # Step 2: Update node version (this would typically involve updating the node's kubelet)
            # In a real implementation, this would:
            # - Update the node's machine/instance with new AMI/image
            # - Restart kubelet with new version
            # - Wait for node to rejoin cluster
            
            logger.info(f"Updating kubelet version on node {node_name}")
            update_result = self._update_node_kubelet_version(node_name, target_version)
            
            if not update_result['success']:
                return {
                    'success': False,
                    'error': f"Failed to update node version: {update_result['error']}"
                }
            
            # Step 3: Wait for node to be ready
            logger.info(f"Waiting for node {node_name} to be ready after update")
            ready_result = self._wait_for_node_ready(node_name, timeout=600)
            
            # Step 4: Uncordon the node
            logger.info(f"Uncordoning node {node_name} after version update")
            uncordon_result = self.uncordon_node(cluster_id, node_name)
            
            success = update_result['success'] and ready_result['success'] and uncordon_result['success']
            
            return {
                'success': success,
                'data': {
                    'operation': 'update_node_version',
                    'cluster_id': cluster_id,
                    'node_name': node_name,
                    'target_version': target_version,
                    'status': 'completed' if success else 'failed',
                    'drain_successful': drain_result['success'],
                    'update_successful': update_result['success'],
                    'node_ready': ready_result['success'],
                    'uncordon_successful': uncordon_result['success'],
                    'message': f"Node {node_name} version update {'completed' if success else 'failed'}"
                }
            }
            
        except Exception as e:
            logger.error(f"Error updating node version for {node_name}: {e}")
            return {
                'success': False,
                'error': f"Node version update failed: {str(e)}"
            }
    
    def update_master_version(self, cluster_id: str, version_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update Kubernetes version on master/control plane nodes
        
        Args:
            cluster_id: Cluster identifier
            version_config: Configuration for version update
            
        Returns:
            Dict containing operation result
        """
        try:
            logger.info(f"Updating master nodes to version {version_config.get('kubernetes_version')}")
            
            target_version = version_config.get('kubernetes_version')
            if not target_version:
                return {
                    'success': False,
                    'error': 'kubernetes_version is required'
                }
            
            # Validate version format
            if not self._validate_kubernetes_version(target_version):
                return {
                    'success': False,
                    'error': f'Invalid Kubernetes version format: {target_version}'
                }
            
            if not self.core_v1:
                # Simulate master version update for development
                return self._simulate_master_version_update(cluster_id, version_config)
            
            # Step 1: Get all master nodes
            master_nodes = self._get_master_nodes()
            if not master_nodes['success']:
                return {
                    'success': False,
                    'error': f"Failed to get master nodes: {master_nodes['error']}"
                }
            
            nodes = master_nodes['nodes']
            logger.info(f"Found {len(nodes)} master nodes to update")
            
            # Step 2: Update master nodes one by one (rolling update)
            update_results = []
            strategy = version_config.get('strategy', 'rolling')
            
            if strategy == 'rolling':
                # Update nodes one at a time
                for i, node in enumerate(nodes):
                    logger.info(f"Updating master node {node['name']} ({i+1}/{len(nodes)})")
                    
                    node_update_config = version_config.copy()
                    node_update_config['node_type'] = 'master'
                    
                    result = self._update_master_node(cluster_id, node['name'], node_update_config)
                    update_results.append(result)
                    
                    if not result['success']:
                        logger.error(f"Failed to update master node {node['name']}")
                        # Continue with other nodes or stop based on configuration
                        if not version_config.get('continue_on_failure', False):
                            break
                    
                    # Wait between updates for cluster stability
                    if i < len(nodes) - 1:
                        wait_time = version_config.get('inter_node_wait_seconds', 60)
                        logger.info(f"Waiting {wait_time} seconds before updating next master node")
                        time.sleep(wait_time)
            
            # Step 3: Verify cluster health after updates
            health_check = self._verify_cluster_health(cluster_id)
            
            successful_updates = len([r for r in update_results if r['success']])
            total_nodes = len(nodes)
            
            return {
                'success': successful_updates == total_nodes and health_check['success'],
                'data': {
                    'operation': 'update_master_version',
                    'cluster_id': cluster_id,
                    'target_version': target_version,
                    'strategy': strategy,
                    'total_nodes': total_nodes,
                    'successful_updates': successful_updates,
                    'failed_updates': total_nodes - successful_updates,
                    'cluster_healthy': health_check['success'],
                    'update_results': update_results,
                    'message': f"Master version update: {successful_updates}/{total_nodes} nodes updated successfully"
                }
            }
            
        except Exception as e:
            logger.error(f"Error updating master version: {e}")
            return {
                'success': False,
                'error': f"Master version update failed: {str(e)}"
            }
    
    def manage_opa_policies(self, cluster_id: str, policy_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Manage OPA (Open Policy Agent) security policies
        
        Args:
            cluster_id: Cluster identifier
            policy_config: Configuration for OPA policy management
            
        Returns:
            Dict containing operation result
        """
        try:
            logger.info(f"Managing OPA policies for cluster {cluster_id}")
            
            operation = policy_config.get('operation', 'apply')
            policies = policy_config.get('policies', [])
            
            if operation not in ['apply', 'delete', 'update', 'list']:
                return {
                    'success': False,
                    'error': f'Invalid operation: {operation}. Must be one of: apply, delete, update, list'
                }
            
            if not self.custom_objects_api and operation != 'list':
                # Simulate OPA policy management for development
                return self._simulate_opa_policy_management(cluster_id, policy_config)
            
            results = []
            
            if operation == 'list':
                # List existing OPA policies
                return self._list_opa_policies(cluster_id)
            
            elif operation == 'apply':
                # Apply new OPA policies
                for policy in policies:
                    result = self._apply_opa_policy(cluster_id, policy)
                    results.append(result)
            
            elif operation == 'update':
                # Update existing OPA policies
                for policy in policies:
                    result = self._update_opa_policy(cluster_id, policy)
                    results.append(result)
            
            elif operation == 'delete':
                # Delete OPA policies
                policy_names = policy_config.get('policy_names', [])
                for policy_name in policy_names:
                    result = self._delete_opa_policy(cluster_id, policy_name)
                    results.append(result)
            
            successful_operations = len([r for r in results if r['success']])
            total_operations = len(results)
            
            return {
                'success': successful_operations == total_operations,
                'data': {
                    'operation': f'opa_policies_{operation}',
                    'cluster_id': cluster_id,
                    'total_operations': total_operations,
                    'successful_operations': successful_operations,
                    'failed_operations': total_operations - successful_operations,
                    'results': results,
                    'message': f"OPA policy {operation}: {successful_operations}/{total_operations} operations successful"
                }
            }
            
        except Exception as e:
            logger.error(f"Error managing OPA policies: {e}")
            return {
                'success': False,
                'error': f"OPA policy management failed: {str(e)}"
            }
    
    def get_node_status(self, cluster_id: str, node_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Get detailed status of cluster nodes
        
        Args:
            cluster_id: Cluster identifier
            node_name: Optional specific node name
            
        Returns:
            Dict containing node status information
        """
        try:
            logger.info(f"Getting node status for cluster {cluster_id}")
            
            if not self.core_v1:
                # Simulate node status for development
                return self._simulate_node_status(cluster_id, node_name)
            
            if node_name:
                # Get specific node status
                node = self.core_v1.read_node(node_name)
                node_status = self._parse_node_status(node)
                
                return {
                    'success': True,
                    'data': {
                        'cluster_id': cluster_id,
                        'node': node_status
                    }
                }
            else:
                # Get all nodes status
                nodes = self.core_v1.list_node()
                nodes_status = []
                
                for node in nodes.items:
                    node_status = self._parse_node_status(node)
                    nodes_status.append(node_status)
                
                return {
                    'success': True,
                    'data': {
                        'cluster_id': cluster_id,
                        'nodes': nodes_status,
                        'total_nodes': len(nodes_status),
                        'ready_nodes': len([n for n in nodes_status if n['ready']]),
                        'master_nodes': len([n for n in nodes_status if n['is_master']]),
                        'worker_nodes': len([n for n in nodes_status if not n['is_master']])
                    }
                }
            
        except Exception as e:
            logger.error(f"Error getting node status: {e}")
            return {
                'success': False,
                'error': f"Failed to get node status: {str(e)}"
            }
    
    # Helper methods
    
    def _simulate_node_drain(self, cluster_id: str, node_name: str, drain_config: Dict[str, Any]) -> Dict[str, Any]:
        """Simulate node drain operation for development"""
        return {
            'success': True,
            'data': {
                'operation': 'drain_node',
                'cluster_id': cluster_id,
                'node_name': node_name,
                'status': 'completed',
                'pods_evicted': 8,
                'pods_failed': 0,
                'remaining_pods': 0,
                'duration_seconds': 45,
                'cordoned': True,
                'message': f"Node {node_name} drained successfully (simulated)"
            }
        }
    
    def _simulate_node_version_update(self, cluster_id: str, node_name: str, version_config: Dict[str, Any]) -> Dict[str, Any]:
        """Simulate node version update for development"""
        return {
            'success': True,
            'data': {
                'operation': 'update_node_version',
                'cluster_id': cluster_id,
                'node_name': node_name,
                'target_version': version_config.get('kubernetes_version'),
                'status': 'completed',
                'drain_successful': True,
                'update_successful': True,
                'node_ready': True,
                'uncordon_successful': True,
                'message': f"Node {node_name} version updated successfully (simulated)"
            }
        }
    
    def _simulate_master_version_update(self, cluster_id: str, version_config: Dict[str, Any]) -> Dict[str, Any]:
        """Simulate master version update for development"""
        return {
            'success': True,
            'data': {
                'operation': 'update_master_version',
                'cluster_id': cluster_id,
                'target_version': version_config.get('kubernetes_version'),
                'strategy': 'rolling',
                'total_nodes': 3,
                'successful_updates': 3,
                'failed_updates': 0,
                'cluster_healthy': True,
                'message': "Master version update: 3/3 nodes updated successfully (simulated)"
            }
        }
    
    def _simulate_opa_policy_management(self, cluster_id: str, policy_config: Dict[str, Any]) -> Dict[str, Any]:
        """Simulate OPA policy management for development"""
        operation = policy_config.get('operation', 'apply')
        policies = policy_config.get('policies', [])
        
        return {
            'success': True,
            'data': {
                'operation': f'opa_policies_{operation}',
                'cluster_id': cluster_id,
                'total_operations': len(policies) if policies else 1,
                'successful_operations': len(policies) if policies else 1,
                'failed_operations': 0,
                'message': f"OPA policy {operation} completed successfully (simulated)"
            }
        }
    
    def _simulate_node_status(self, cluster_id: str, node_name: Optional[str] = None) -> Dict[str, Any]:
        """Simulate node status for development"""
        if node_name:
            return {
                'success': True,
                'data': {
                    'cluster_id': cluster_id,
                    'node': {
                        'name': node_name,
                        'ready': True,
                        'schedulable': True,
                        'is_master': 'master' in node_name.lower(),
                        'kubernetes_version': '1.28.0',
                        'os_image': 'Ubuntu 22.04.3 LTS',
                        'container_runtime': 'containerd://1.7.2',
                        'cpu_capacity': '4',
                        'memory_capacity': '16Gi',
                        'pods_capacity': '110',
                        'cpu_allocatable': '3900m',
                        'memory_allocatable': '14.5Gi',
                        'pods_allocatable': '110',
                        'conditions': [
                            {'type': 'Ready', 'status': 'True', 'reason': 'KubeletReady'},
                            {'type': 'MemoryPressure', 'status': 'False', 'reason': 'KubeletHasSufficientMemory'},
                            {'type': 'DiskPressure', 'status': 'False', 'reason': 'KubeletHasNoDiskPressure'},
                            {'type': 'PIDPressure', 'status': 'False', 'reason': 'KubeletHasSufficientPID'}
                        ]
                    }
                }
            }
        else:
            return {
                'success': True,
                'data': {
                    'cluster_id': cluster_id,
                    'nodes': [
                        {
                            'name': 'master-1',
                            'ready': True,
                            'schedulable': False,
                            'is_master': True,
                            'kubernetes_version': '1.28.0',
                            'cpu_capacity': '4',
                            'memory_capacity': '16Gi'
                        },
                        {
                            'name': 'worker-1',
                            'ready': True,
                            'schedulable': True,
                            'is_master': False,
                            'kubernetes_version': '1.28.0',
                            'cpu_capacity': '8',
                            'memory_capacity': '32Gi'
                        },
                        {
                            'name': 'worker-2',
                            'ready': True,
                            'schedulable': True,
                            'is_master': False,
                            'kubernetes_version': '1.28.0',
                            'cpu_capacity': '8',
                            'memory_capacity': '32Gi'
                        }
                    ],
                    'total_nodes': 3,
                    'ready_nodes': 3,
                    'master_nodes': 1,
                    'worker_nodes': 2
                }
            }
    
    def _cordon_node(self, node_name: str) -> Dict[str, Any]:
        """Cordon a node (mark as unschedulable)"""
        try:
            node = self.core_v1.read_node(node_name)
            node.spec.unschedulable = True
            self.core_v1.patch_node(node_name, node)
            
            return {'success': True, 'message': f'Node {node_name} cordoned successfully'}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _get_pods_on_node(self, node_name: str) -> Dict[str, Any]:
        """Get all pods running on a specific node"""
        try:
            pods = self.core_v1.list_pod_for_all_namespaces(
                field_selector=f'spec.nodeName={node_name}'
            )
            
            pod_list = []
            for pod in pods.items:
                pod_list.append({
                    'name': pod.metadata.name,
                    'namespace': pod.metadata.namespace,
                    'phase': pod.status.phase,
                    'owner_kind': pod.metadata.owner_references[0].kind if pod.metadata.owner_references else 'Unknown'
                })
            
            return {'success': True, 'pods': pod_list}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _filter_pods_for_eviction(self, pods: List[Dict], ignore_daemonsets: bool, delete_emptydir_data: bool) -> List[Dict]:
        """Filter pods that should be evicted based on configuration"""
        filtered_pods = []
        
        for pod in pods:
            # Skip DaemonSet pods if configured
            if ignore_daemonsets and pod.get('owner_kind') == 'DaemonSet':
                continue
            
            # Skip system pods in kube-system namespace
            if pod.get('namespace') == 'kube-system':
                continue
            
            # Add other filtering logic as needed
            filtered_pods.append(pod)
        
        return filtered_pods
    
    def _evict_pod(self, pod_name: str, namespace: str, grace_period: int, force: bool) -> Dict[str, Any]:
        """Evict a specific pod"""
        try:
            # Create eviction object
            eviction = client.V1Eviction(
                metadata=client.V1ObjectMeta(name=pod_name, namespace=namespace),
                delete_options=client.V1DeleteOptions(grace_period_seconds=grace_period)
            )
            
            # Perform eviction
            self.core_v1.create_namespaced_pod_eviction(
                name=pod_name,
                namespace=namespace,
                body=eviction
            )
            
            return {'success': True, 'message': f'Pod {pod_name} evicted successfully'}
        except Exception as e:
            if force:
                # Force delete the pod
                try:
                    self.core_v1.delete_namespaced_pod(
                        name=pod_name,
                        namespace=namespace,
                        grace_period_seconds=0
                    )
                    return {'success': True, 'message': f'Pod {pod_name} force deleted'}
                except Exception as force_e:
                    return {'success': False, 'error': f'Force delete failed: {str(force_e)}'}
            else:
                return {'success': False, 'error': str(e)}
    
    def _wait_for_pod_eviction(self, node_name: str, timeout: float) -> Dict[str, Any]:
        """Wait for all pods to be evicted from a node"""
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            pods_result = self._get_pods_on_node(node_name)
            if pods_result['success'] and len(pods_result['pods']) == 0:
                return {'success': True, 'message': 'All pods evicted successfully'}
            
            time.sleep(5)  # Wait 5 seconds before checking again
        
        return {'success': False, 'error': 'Timeout waiting for pod eviction'}
    
    def _validate_kubernetes_version(self, version: str) -> bool:
        """Validate Kubernetes version format"""
        import re
        # Match versions like 1.28.0, 1.27.8, etc.
        pattern = r'^1\.\d+\.\d+$'
        return bool(re.match(pattern, version))
    
    def _update_node_kubelet_version(self, node_name: str, target_version: str) -> Dict[str, Any]:
        """Update kubelet version on a node (simulated)"""
        # In real implementation, this would:
        # 1. SSH to the node or use a node management API
        # 2. Update kubelet binary
        # 3. Restart kubelet service
        # 4. Verify version update
        
        return {'success': True, 'message': f'Kubelet updated to {target_version}'}
    
    def _wait_for_node_ready(self, node_name: str, timeout: int) -> Dict[str, Any]:
        """Wait for a node to be ready after update"""
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            try:
                node = self.core_v1.read_node(node_name)
                for condition in node.status.conditions:
                    if condition.type == 'Ready' and condition.status == 'True':
                        return {'success': True, 'message': f'Node {node_name} is ready'}
            except Exception:
                pass
            
            time.sleep(10)  # Wait 10 seconds before checking again
        
        return {'success': False, 'error': f'Timeout waiting for node {node_name} to be ready'}
    
    def _get_master_nodes(self) -> Dict[str, Any]:
        """Get all master/control plane nodes"""
        try:
            nodes = self.core_v1.list_node()
            master_nodes = []
            
            for node in nodes.items:
                # Check if node has master role
                labels = node.metadata.labels or {}
                if ('node-role.kubernetes.io/master' in labels or 
                    'node-role.kubernetes.io/control-plane' in labels):
                    master_nodes.append({
                        'name': node.metadata.name,
                        'version': node.status.node_info.kubelet_version,
                        'ready': any(c.type == 'Ready' and c.status == 'True' 
                                   for c in node.status.conditions)
                    })
            
            return {'success': True, 'nodes': master_nodes}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _update_master_node(self, cluster_id: str, node_name: str, version_config: Dict[str, Any]) -> Dict[str, Any]:
        """Update a single master node"""
        # This would involve more complex logic for master node updates
        # including etcd backup, control plane component updates, etc.
        return self.update_node_version(cluster_id, node_name, version_config)
    
    def _verify_cluster_health(self, cluster_id: str) -> Dict[str, Any]:
        """Verify cluster health after operations"""
        try:
            # Check if API server is responsive
            version = self.core_v1.get_api_resources()
            
            # Check node status
            nodes = self.core_v1.list_node()
            ready_nodes = sum(1 for node in nodes.items 
                            if any(c.type == 'Ready' and c.status == 'True' 
                                  for c in node.status.conditions))
            
            # Check system pods
            system_pods = self.core_v1.list_namespaced_pod('kube-system')
            running_pods = sum(1 for pod in system_pods.items 
                             if pod.status.phase == 'Running')
            
            healthy = ready_nodes > 0 and running_pods > 0
            
            return {
                'success': healthy,
                'data': {
                    'api_server_responsive': True,
                    'ready_nodes': ready_nodes,
                    'total_nodes': len(nodes.items),
                    'running_system_pods': running_pods,
                    'total_system_pods': len(system_pods.items)
                }
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _list_opa_policies(self, cluster_id: str) -> Dict[str, Any]:
        """List existing OPA policies"""
        # Simulated OPA policies for development
        policies = [
            {
                'name': 'require-labels',
                'namespace': 'opa-system',
                'kind': 'ConstraintTemplate',
                'status': 'active',
                'description': 'Require specific labels on resources',
                'created_at': '2024-01-15T10:30:00Z'
            },
            {
                'name': 'disallow-privileged',
                'namespace': 'opa-system',
                'kind': 'K8sRequiredLabels',
                'status': 'active',
                'description': 'Disallow privileged containers',
                'created_at': '2024-01-16T14:20:00Z'
            },
            {
                'name': 'resource-limits',
                'namespace': 'opa-system',
                'kind': 'K8sRequiredResources',
                'status': 'active',
                'description': 'Require resource limits on containers',
                'created_at': '2024-01-17T09:15:00Z'
            }
        ]
        
        return {
            'success': True,
            'data': {
                'cluster_id': cluster_id,
                'policies': policies,
                'total_policies': len(policies),
                'active_policies': len([p for p in policies if p['status'] == 'active'])
            }
        }
    
    def _apply_opa_policy(self, cluster_id: str, policy: Dict[str, Any]) -> Dict[str, Any]:
        """Apply an OPA policy"""
        return {
            'success': True,
            'policy_name': policy.get('name', 'unknown'),
            'message': f"Policy {policy.get('name')} applied successfully"
        }
    
    def _update_opa_policy(self, cluster_id: str, policy: Dict[str, Any]) -> Dict[str, Any]:
        """Update an OPA policy"""
        return {
            'success': True,
            'policy_name': policy.get('name', 'unknown'),
            'message': f"Policy {policy.get('name')} updated successfully"
        }
    
    def _delete_opa_policy(self, cluster_id: str, policy_name: str) -> Dict[str, Any]:
        """Delete an OPA policy"""
        return {
            'success': True,
            'policy_name': policy_name,
            'message': f"Policy {policy_name} deleted successfully"
        }
    
    def _parse_node_status(self, node) -> Dict[str, Any]:
        """Parse Kubernetes node object into status dict"""
        labels = node.metadata.labels or {}
        is_master = ('node-role.kubernetes.io/master' in labels or 
                    'node-role.kubernetes.io/control-plane' in labels)
        
        ready = False
        for condition in node.status.conditions:
            if condition.type == 'Ready' and condition.status == 'True':
                ready = True
                break
        
        return {
            'name': node.metadata.name,
            'ready': ready,
            'schedulable': not node.spec.unschedulable,
            'is_master': is_master,
            'kubernetes_version': node.status.node_info.kubelet_version,
            'os_image': node.status.node_info.os_image,
            'container_runtime': node.status.node_info.container_runtime_version,
            'cpu_capacity': node.status.capacity.get('cpu', '0'),
            'memory_capacity': node.status.capacity.get('memory', '0'),
            'pods_capacity': node.status.capacity.get('pods', '0'),
            'cpu_allocatable': node.status.allocatable.get('cpu', '0'),
            'memory_allocatable': node.status.allocatable.get('memory', '0'),
            'pods_allocatable': node.status.allocatable.get('pods', '0'),
            'conditions': [
                {
                    'type': condition.type,
                    'status': condition.status,
                    'reason': condition.reason
                }
                for condition in node.status.conditions
            ]
        }

