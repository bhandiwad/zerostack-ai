import asyncio
from typing import Dict, Any, List, Optional
from kubernetes import client, config
from kubernetes.client import ApiClient
from kubernetes.client.exceptions import ApiException
from .base import AgentCapability
import logging
import json

logger = logging.getLogger(__name__)

class ClusterManagementCapability(AgentCapability):
    """
    Capability for managing Kubernetes clusters.
    Provides operations for cluster inspection, deployment, and management.
    """
    
    def __init__(self, agent_id: str, config: Optional[Dict[str, Any]] = None):
        super().__init__(agent_id, config)
        self.k8s_client = None
        self.contexts = []
        self.current_context = None
    
    async def _initialize(self):
        """Initialize Kubernetes client and load available contexts"""
        try:
            # Load kubeconfig
            kubeconfig = self.config.get('kubeconfig_path')
            if kubeconfig:
                config.load_kube_config(config_file=kubeconfig)
            else:
                config.load_kube_config()
            
            # Initialize clients
            self.k8s_client = {
                'core': client.CoreV1Api(),
                'apps': client.AppsV1Api(),
                'networking': client.NetworkingV1Api(),
                'custom_objects': client.CustomObjectsApi()
            }
            
            # Load available contexts
            contexts, active_context = config.list_kube_config_contexts()
            self.contexts = [ctx['name'] for ctx in contexts]
            if active_context and active_context['context']:
                self.current_context = active_context['name']
            
            logger.info(f"Initialized ClusterManagementCapability with context: {self.current_context}")
            
        except Exception as e:
            logger.error(f"Failed to initialize Kubernetes client: {str(e)}")
            raise
    
    async def execute(self, action: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a cluster management action"""
        try:
            if not self._initialized:
                await self.initialize()
            
            # Route to appropriate handler based on action
            handler = getattr(self, f"_handle_{action}", None)
            if not handler or not callable(handler):
                return {
                    'success': False,
                    'error': f"Unsupported action: {action}",
                    'available_actions': self._list_actions()
                }
            
            # Execute the handler
            result = await handler(parameters)
            return {
                'success': True,
                'data': result
            }
            
        except ApiException as e:
            error_msg = json.loads(e.body)['message'] if e.body else str(e)
            logger.error(f"API error in {action}: {error_msg}")
            return {
                'success': False,
                'error': f"Kubernetes API error: {error_msg}",
                'status': e.status
            }
        except Exception as e:
            logger.error(f"Error in {action}: {str(e)}", exc_info=True)
            return {
                'success': False,
                'error': f"Error executing {action}: {str(e)}"
            }
    
    def _list_actions(self) -> List[str]:
        """List all available actions in this capability"""
        return [
            'list_pods', 'get_pod', 'list_nodes', 'get_node',
            'list_deployments', 'scale_deployment', 'get_deployment',
            'list_services', 'get_service', 'list_ingresses', 'get_ingress',
            'list_namespaces', 'get_cluster_health', 'switch_context'
        ]
    
    # --- Cluster Operations ---
    
    async def _handle_switch_context(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Switch the current Kubernetes context"""
        context_name = params.get('context')
        if not context_name:
            return {
                'current_context': self.current_context,
                'available_contexts': self.contexts
            }
        
        if context_name not in self.contexts:
            raise ValueError(f"Context '{context_name}' not found")
        
        # Load the new context
        config.load_kube_config(context=context_name)
        self.current_context = context_name
        
        # Reinitialize clients with new context
        self.k8s_client = {
            'core': client.CoreV1Api(),
            'apps': client.AppsV1Api(),
            'networking': client.NetworkingV1Api(),
            'custom_objects': client.CustomObjectsApi()
        }
        
        return {
            'success': True,
            'current_context': self.current_context,
            'message': f"Switched to context: {self.current_context}"
        }
    
    async def _handle_get_cluster_health(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get overall cluster health status"""
        # Check nodes
        nodes = self.k8s_client['core'].list_node().items
        node_statuses = []
        
        for node in nodes:
            conditions = {}
            for condition in node.status.conditions:
                if condition.status == 'True':
                    conditions[condition.type] = True
                else:
                    conditions[condition.type] = False
            
            node_statuses.append({
                'name': node.metadata.name,
                'conditions': conditions,
                'allocatable': node.status.allocatable,
                'capacity': node.status.capacity
            })
        
        # Check control plane components
        pods = self.k8s_client['core'].list_namespaced_pod(
            namespace='kube-system',
            label_selector='tier=control-plane'
        )
        
        control_plane_components = {}
        for pod in pods.items:
            component = pod.metadata.labels.get('component', 'unknown')
            status = 'Running' if pod.status.phase == 'Running' else pod.status.phase
            
            if component not in control_plane_components:
                control_plane_components[component] = []
            
            control_plane_components[component].append({
                'name': pod.metadata.name,
                'status': status,
                'ready': all(status.ready for status in pod.status.container_statuses) if pod.status.container_statuses else False
            })
        
        return {
            'nodes': node_statuses,
            'control_plane': control_plane_components,
            'current_context': self.current_context,
            'timestamp': str(datetime.utcnow())
        }
    
    # --- Namespace Operations ---
    
    async def _handle_list_namespaces(self, params: Dict[str, Any]) -> List[Dict[str, Any]]:
        """List all namespaces in the cluster"""
        namespaces = self.k8s_client['core'].list_namespace()
        return [{
            'name': ns.metadata.name,
            'status': ns.status.phase,
            'creation_timestamp': ns.metadata.creation_timestamp.isoformat() if ns.metadata.creation_timestamp else None,
            'labels': ns.metadata.labels or {}
        } for ns in namespaces.items]
    
    # --- Pod Operations ---
    
    async def _handle_list_pods(self, params: Dict[str, Any]) -> List[Dict[str, Any]]:
        """List pods in the specified namespace"""
        namespace = params.get('namespace', 'default')
        label_selector = params.get('label_selector')
        
        pods = self.k8s_client['core'].list_namespaced_pod(
            namespace=namespace,
            label_selector=label_selector
        )
        
        return [{
            'name': pod.metadata.name,
            'namespace': pod.metadata.namespace,
            'status': pod.status.phase,
            'ready': self._get_pod_ready_status(pod),
            'restarts': self._get_pod_restart_count(pod),
            'node': pod.spec.node_name,
            'ip': pod.status.pod_ip,
            'creation_timestamp': pod.metadata.creation_timestamp.isoformat() if pod.metadata.creation_timestamp else None
        } for pod in pods.items]
    
    def _get_pod_ready_status(self, pod) -> str:
        """Get pod ready status as a string"""
        if not pod.status.container_statuses:
            return '0/0'
        ready = sum(1 for cs in pod.status.container_statuses if cs.ready)
        total = len(pod.status.container_statuses)
        return f"{ready}/{total}"
    
    def _get_pod_restart_count(self, pod) -> int:
        """Get total restart count for all containers in a pod"""
        if not pod.status.container_statuses:
            return 0
        return sum(container.restart_count for container in pod.status.container_statuses)
    
    async def _handle_get_pod(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get details for a specific pod"""
        namespace = params.get('namespace', 'default')
        pod_name = params['name']
        
        pod = self.k8s_client['core'].read_namespaced_pod(
            name=pod_name,
            namespace=namespace
        )
        
        return {
            'name': pod.metadata.name,
            'namespace': pod.metadata.namespace,
            'status': pod.status.phase,
            'ready': self._get_pod_ready_status(pod),
            'restarts': self._get_pod_restart_count(pod),
            'node': pod.spec.node_name,
            'ip': pod.status.pod_ip,
            'labels': pod.metadata.labels or {},
            'annotations': pod.metadata.annotations or {},
            'creation_timestamp': pod.metadata.creation_timestamp.isoformat() if pod.metadata.creation_timestamp else None,
            'containers': [{
                'name': container.name,
                'image': container.image,
                'ports': [{
                    'container_port': port.container_port,
                    'protocol': port.protocol,
                    'name': port.name
                } for port in container.ports] if container.ports else []
            } for container in pod.spec.containers],
            'conditions': [{
                'type': condition.type,
                'status': condition.status,
                'reason': condition.reason,
                'message': condition.message,
                'last_transition_time': condition.last_transition_time.isoformat() if condition.last_transition_time else None
            } for condition in pod.status.conditions] if pod.status.conditions else []
        }
    
    # --- Deployment Operations ---
    
    async def _handle_list_deployments(self, params: Dict[str, Any]) -> List[Dict[str, Any]]:
        """List deployments in the specified namespace"""
        namespace = params.get('namespace', 'default')
        label_selector = params.get('label_selector')
        
        deployments = self.k8s_client['apps'].list_namespaced_deployment(
            namespace=namespace,
            label_selector=label_selector
        )
        
        return [{
            'name': dep.metadata.name,
            'namespace': dep.metadata.namespace,
            'ready': f"{dep.status.ready_replicas or 0}/{dep.spec.replicas}",
            'up_to_date': dep.status.updated_replicas or 0,
            'available': dep.status.available_replicas or 0,
            'creation_timestamp': dep.metadata.creation_timestamp.isoformat() if dep.metadata.creation_timestamp else None,
            'labels': dep.metadata.labels or {}
        } for dep in deployments.items]
    
    async def _handle_scale_deployment(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Scale a deployment to the specified number of replicas"""
        namespace = params.get('namespace', 'default')
        deployment_name = params['name']
        replicas = int(params['replicas'])
        
        if replicas < 0:
            raise ValueError("Number of replicas cannot be negative")
        
        # Get current deployment
        deployment = self.k8s_client['apps'].read_namespaced_deployment(
            name=deployment_name,
            namespace=namespace
        )
        
        # Update replicas
        deployment.spec.replicas = replicas
        
        # Apply the update
        updated = self.k8s_client['apps'].patch_namespaced_deployment_scale(
            name=deployment_name,
            namespace=namespace,
            body={
                'spec': {'replicas': replicas}
            }
        )
        
        return {
            'name': deployment_name,
            'namespace': namespace,
            'replicas': updated.spec.replicas,
            'message': f"Scaled deployment {deployment_name} to {replicas} replicas"
        }
    
    async def _handle_get_deployment(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get details for a specific deployment"""
        namespace = params.get('namespace', 'default')
        deployment_name = params['name']
        
        deployment = self.k8s_client['apps'].read_namespaced_deployment(
            name=deployment_name,
            namespace=namespace
        )
        
        return {
            'name': deployment.metadata.name,
            'namespace': deployment.metadata.namespace,
            'labels': deployment.metadata.labels or {},
            'annotations': deployment.metadata.annotations or {},
            'replicas': {
                'desired': deployment.spec.replicas,
                'current': deployment.status.replicas or 0,
                'ready': deployment.status.ready_replicas or 0,
                'updated': deployment.status.updated_replicas or 0,
                'available': deployment.status.available_replicas or 0
            },
            'strategy': deployment.spec.strategy.type if deployment.spec.strategy else 'RollingUpdate',
            'creation_timestamp': deployment.metadata.creation_timestamp.isoformat() if deployment.metadata.creation_timestamp else None,
            'selector': deployment.spec.selector.match_labels if deployment.spec.selector else {},
            'template': {
                'containers': [{
                    'name': container.name,
                    'image': container.image,
                    'ports': [{
                        'container_port': port.container_port,
                        'protocol': port.protocol,
                        'name': port.name
                    } for port in container.ports] if container.ports else []
                } for container in deployment.spec.template.spec.containers]
            } if deployment.spec.template and deployment.spec.template.spec.containers else {}
        }
