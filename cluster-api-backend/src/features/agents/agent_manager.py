"""
Agent Manager

Manages agent instances, capabilities, and A2A communication.
"""
import asyncio
import logging
import uuid
from typing import Dict, List, Optional, Type, Any, Callable, Awaitable, Tuple
from dataclasses import dataclass, field
import time

from .protocol.a2a.agent_manager import AgentManager as A2AAgentManager
from .protocol.a2a.message import A2AMessage
from .capabilities.base import AgentCapability
from .capabilities.a2a_capability import A2ACapability
from .metrics import MetricsCollector, HealthStatus, HealthCheckResult, SystemMetrics
from .scheduler import Scheduler, SchedulingStrategy, Workload, ResourceRequirements, NodeInfo, NodeAffinity

# Add type hints for message handlers
MessageHandler = Callable[[Dict[str, Any]], Awaitable[Dict[str, Any]]]

@dataclass
class AgentStatus:
    """Agent status information"""
    status: str = "initializing"
    last_seen: float = field(default_factory=time.time)
    capabilities: List[str] = field(default_factory=list)
    metrics: Optional[Dict[str, Any]] = None
    health: Optional[Dict[str, Any]] = None
    version: str = "1.0.0"

logger = logging.getLogger(__name__)

class AgentManager:
    """
    Manages agent instances, capabilities, and A2A communication.
    
    This class is responsible for:
    - Managing agent lifecycle
    - Loading and managing capabilities
    - Facilitating A2A communication
    - Handling capability discovery
    - Metrics collection and health monitoring
    """
    
    def __init__(
        self,
        agent_id: Optional[str] = None,
        broker_servers: str = "nats://localhost:4222",
        auth_config: Optional[Dict[str, Any]] = None,
        scheduling_strategy: SchedulingStrategy = SchedulingStrategy.RESOURCE_AWARE,
        node_labels: Optional[Dict[str, str]] = None,
        capabilities: Optional[List[Type[AgentCapability]]] = None,
        metrics_interval: float = 5.0,
        health_check_interval: float = 30.0
    ):
        """
        Initialize the agent manager.
        
        Args:
            agent_id: Optional agent ID. If not provided, a UUID will be generated.
            broker_servers: Comma-separated list of NATS server addresses.
            auth_config: Configuration for A2A authentication.
            capabilities: List of capability classes to register.
            metrics_interval: Interval in seconds between metrics collection.
            health_check_interval: Interval in seconds between health checks.
        """
        self.agent_id = agent_id or f"agent-{uuid.uuid4().hex[:8]}"
        self.broker_servers = broker_servers
        self.auth_config = auth_config or {}
        self.metrics_interval = metrics_interval
        self.health_check_interval = health_check_interval
        
        # Agent state
        self.capabilities: Dict[str, AgentCapability] = {}
        self.message_handlers: Dict[str, MessageHandler] = {}
        self.agent_status = AgentStatus()
        self.metrics_collector = MetricsCollector()
        self.health_checks: Dict[str, HealthCheckResult] = {}
        self._background_tasks = set()
        self._shutdown_event = asyncio.Event()
        self._initialized = False
        
        # Scheduling
        self.scheduler = Scheduler(strategy=scheduling_strategy)
        self.node_info = NodeInfo(
            node_id=self.agent_id,
            address="",  # Will be set during initialization
            labels=node_labels or {}
        )
        
        # Default capabilities
        self.default_capabilities = [
            A2ACapability
        ]
        
        # Additional user-provided capabilities
        self.capability_classes = (capabilities or []) + self.default_capabilities
        
        # Track discovered agents
        self._known_agents: Dict[str, AgentStatus] = {}
    
    async def initialize(self) -> None:
        """
        Initialize the agent manager and all capabilities.
        
        This method:
        1. Sets up A2A communication
        2. Initializes all capabilities
        """
        if self._initialized:
            return
            
        logger.info(f"Initializing agent manager for agent {self.agent_id}")
        
        # Register system metrics collector
        self.metrics_collector.register_metric_provider("system", self._get_system_metrics)
        
        # Register node info with scheduler
        await self._update_node_info()
        self.agent_status.status = "initializing"
        
        try:
            # Start metrics collection
            await self.metrics_collector.start(interval=self.metrics_interval)
            
            # Initialize A2A manager
            self.a2a_manager = A2AAgentManager(
                agent_id=self.agent_id,
                servers=self.broker_servers,
                auth_config=self.auth_config
            )
            
            # Set node address from A2A manager if available
            if hasattr(self.a2a_manager, 'get_connection_info'):
                conn_info = self.a2a_manager.get_connection_info()
                self.node_info.address = conn_info.get('address', '')
            
            # Connect to the A2A network
            await self.a2a_manager.connect(agent_info={
                'capabilities': [cap.__name__ for cap in self.capability_classes],
                'version': self.agent_status.version,
                'started_at': time.time()
            })
            
            # Initialize capabilities
            await self._initialize_capabilities()
            
            # Register system message handlers
            self._register_system_handlers()
            
            # Start background tasks
            self._start_background_tasks()
            
            self._initialized = True
            self.agent_status.status = "running"
            self.agent_status.capabilities = list(self.capabilities.keys())
            
            logger.info(f"Agent manager initialized with {len(self.capabilities)} capabilities")
            
        except Exception as e:
            self.agent_status.status = "error"
            logger.error(f"Failed to initialize agent manager: {e}", exc_info=True)
            raise
    
    async def _initialize_capabilities(self) -> None:
        """Initialize all registered capabilities"""
        for capability_class in self.capability_classes:
            try:
                # Create capability instance
                capability = capability_class(
                    agent_id=self.agent_id,
                    config={
                        'broker_servers': self.broker_servers,
                        'auth': self.auth_config,
                        'agent_id': self.agent_id
                    }
                )
                
                # Initialize with A2A manager and metrics
                await capability.initialize(a2a_manager=self.a2a_manager)
                
                # Register capability
                self.capabilities[capability_class.__name__] = capability
                
                # Update metrics
                self.metrics_collector.update_capabilities_count(len(self.capabilities))
                
                logger.info(f"Initialized capability: {capability_class.__name__}")
                
            except Exception as e:
                logger.error(f"Failed to initialize capability {capability_class.__name__}: {str(e)}", exc_info=True)
                # Update metrics for failed initialization
                self.metrics_collector.increment_messages_failed()
    
    async def get_capability(self, name: str) -> Optional[AgentCapability]:
        """
        Get a capability by name.
        
        Args:
            name: Name of the capability to get.
            
        Returns:
            The capability instance, or None if not found.
        """
        return self.capabilities.get(name)
    
    async def execute_action(
        self,
        capability_name: str,
        action: str,
        parameters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Execute an action on a capability.
        
        Args:
            capability_name: Name of the capability.
            action: Action to execute.
            parameters: Parameters for the action.
            
        Returns:
            Result of the action.
            
        Raises:
            ValueError: If the capability or action is not found.
        """
        capability = await self.get_capability(capability_name)
        if not capability:
            raise ValueError(f"Capability not found: {capability_name}")
            
        return await capability.execute(action, parameters or {})
    
    async def discover_agents(
        self,
        capability: Optional[str] = None,
        timeout: float = 2.0
    ) -> List[Dict[str, Any]]:
        """
        Discover other agents on the network.
        
        Args:
            capability: Optional capability to filter by.
            timeout: Discovery timeout in seconds.
            
        Returns:
            List of discovered agents.
        """
        if not self.a2a_manager:
            logger.warning("A2A manager not initialized")
            return []
            
        return await self.a2a_manager.discover_agents(
            capability=capability,
            timeout=timeout
        )
    
    async def send_message(
        self,
        target_agent_id: str,
        action: str,
        parameters: Optional[Dict[str, Any]] = None,
        expect_response: bool = False,
        timeout: float = 5.0,
        require_secure: bool = True
    ) -> Any:
        """
        Send a message to another agent.
        
        Args:
            target_agent_id: ID of the target agent.
            action: Action to perform.
            parameters: Parameters for the action.
            expect_response: Whether to wait for a response.
            timeout: Response timeout in seconds.
            require_secure: Whether to require secure communication.
            
        Returns:
            Response from the target agent if expect_response is True.
        """
        if not self.a2a_manager:
            raise RuntimeError("A2A manager not initialized")
            
        return await self.a2a_manager.send_message(
            target_agent_id=target_agent_id,
            action=action,
            parameters=parameters or {},
            expect_response=expect_response,
            timeout=timeout,
            require_secure=require_secure
        )
    
    async def close(self) -> None:
        """Shut down the agent manager and clean up resources"""
        if not self._initialized:
            return
            
        logger.info("Shutting down agent manager...")
        
        # Signal background tasks to stop
        self._shutdown_event.set()
        
        # Cancel all background tasks
        for task in self._background_tasks:
            if not task.done():
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
        
        # Close A2A manager
        if hasattr(self, 'a2a_manager') and self.a2a_manager:
            await self.a2a_manager.close()
        
        self._initialized = False
        logger.info("Agent manager shut down")
    
    async def schedule_workload(
        self,
        workload_name: str,
        requirements: ResourceRequirements,
        affinity: Optional[NodeAffinity] = None,
        anti_affinity: Optional[NodeAffinity] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Tuple[Optional[str], str]:
        """
        Schedule a workload on the best available agent.
        
        Args:
            workload_name: Name of the workload
            requirements: Resource requirements for the workload
            affinity: Affinity rules for scheduling
            anti_affinity: Anti-affinity rules for scheduling
            metadata: Additional metadata for the workload
            
        Returns:
            Tuple of (node_id, reason) where node_id is the selected node ID
            or None if scheduling failed, and reason is a string explaining
            the decision or failure.
        """
        # Create workload
        workload = Workload(
            id=str(uuid.uuid4()),
            name=workload_name,
            requirements=requirements,
            affinity=affinity,
            anti_affinity=anti_affinity,
            metadata=metadata or {}
        )
        
        # Get available nodes (including self)
        nodes = await self._get_available_nodes()
        
        # Schedule the workload
        return self.scheduler.schedule(workload, nodes)
    
    async def _get_available_nodes(self) -> Dict[str, NodeInfo]:
        """Get information about all available nodes"""
        # Start with self
        nodes = {self.agent_id: self.node_info}
        
        # Get other nodes from A2A manager if available
        if hasattr(self.a2a_manager, 'get_connected_agents'):
            try:
                connected_agents = await self.a2a_manager.get_connected_agents()
                for agent_id, agent_info in connected_agents.items():
                    if agent_id == self.agent_id:
                        continue
                        
                    nodes[agent_id] = NodeInfo(
                        node_id=agent_id,
                        address=agent_info.get('address', ''),
                        labels=agent_info.get('labels', {}),
                        metrics=SystemMetrics.from_dict(agent_info.get('metrics', {}))
                    )
            except Exception as e:
                logger.warning(f"Failed to get connected agents: {e}")
        
        return nodes
    
    async def _update_node_info(self) -> None:
        """Update node information with current metrics"""
        metrics = await self.metrics_collector.collect()
        if 'system' in metrics:
            self.node_info.metrics = SystemMetrics.from_dict(metrics['system'])
    
    def _get_system_metrics(self) -> Dict[str, Any]:
        """Get system metrics for the current node"""
        if not self.node_info.metrics:
            return {}
            
        return {
            'cpu_cores': self.node_info.metrics.cpu_total,
            'cpu_available': self.node_info.metrics.cpu_available,
            'memory_total_mb': self.node_info.metrics.memory_total_mb,
            'memory_available_mb': self.node_info.metrics.memory_available_mb,
            'disk_total_mb': self.node_info.metrics.disk_total_mb,
            'disk_available_mb': self.node_info.metrics.disk_available_mb,
            'gpu_count': self.node_info.metrics.gpu_count,
            'gpu_memory_total_mb': self.node_info.metrics.gpu_memory_total_mb,
            'gpu_memory_available_mb': self.node_info.metrics.gpu_memory_available_mb,
            'network_bytes_sent': self.node_info.metrics.network_bytes_sent,
            'network_bytes_recv': self.node_info.metrics.network_bytes_recv
        }
            
            logger.info("Agent manager shut down successfully")
            
        except Exception as e:
            logger.error(f"Error during shutdown: {e}", exc_info=True)
            raise
    
    # Background task management
    def _start_background_tasks(self) -> None:
        """Start all background tasks"""
        if not self.initialized or self._shutting_down:
            return
            
        # Start metrics collection
        self._metrics_task = asyncio.create_task(self._metrics_loop())
        
        # Start health monitoring
        self._health_task = asyncio.create_task(self._health_check_loop())
        
        logger.debug("Started background tasks")
    
    async def _stop_background_tasks(self) -> None:
        """Stop all background tasks"""
        tasks = []
        
        if self._metrics_task and not self._metrics_task.done():
            self._metrics_task.cancel()
            tasks.append(self._metrics_task)
        
        if self._health_task and not self._health_task.done():
            self._health_task.cancel()
            tasks.append(self._health_task)
        
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
    
    async def _metrics_loop(self) -> None:
        """Background task to collect and publish metrics"""
        while not self._shutting_down:
            try:
                # Update metrics
                metrics = await self.metrics.get_metrics()
                self._status.metrics = metrics
                
                # Publish metrics to A2A if available
                if self.a2a_manager and self.initialized and not self._shutting_down:
                    await self.a2a_manager.publish_metrics(metrics)
                
                await asyncio.sleep(self.metrics_interval)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in metrics loop: {e}", exc_info=True)
                await asyncio.sleep(5)  # Prevent tight loop on error
    
    async def _health_check_loop(self) -> None:
        """Background task to monitor agent health"""
        while not self._shutting_down:
            try:
                # Run health checks
                health = await self.metrics.health_checker.run_checks()
                self._status.health = health
                
                # Update status based on health
                if health['status'] == 'unhealthy':
                    self._status.status = "unhealthy"
                elif health['status'] == 'degraded' and self._status.status != 'unhealthy':
                    self._status.status = "degraded"
                elif self._status.status != 'shutting_down':
                    self._status.status = "running"
                
                await asyncio.sleep(self.health_check_interval)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in health check loop: {e}", exc_info=True)
                await asyncio.sleep(5)  # Prevent tight loop on error
    
    # System message handlers
    def _register_system_handlers(self) -> None:
        """Register system message handlers"""
        if not self.a2a_manager:
            return
            
        # Register system message handlers
        self.a2a_manager.add_message_handler("system.ping", self._handle_system_ping)
        self.a2a_manager.add_message_handler("system.status", self._handle_system_status)
        self.a2a_manager.add_message_handler("system.metrics", self._handle_system_metrics)
    
    async def _handle_system_ping(self, message: A2AMessage) -> Dict[str, Any]:
        """Handle system ping message"""
        self.metrics.increment_messages_received()
        return {
            'status': 'ok',
            'agent_id': self.agent_id,
            'timestamp': time.time()
        }
    
    async def _handle_system_status(self, message: A2AMessage) -> Dict[str, Any]:
        """Handle system status request"""
        self.metrics.increment_messages_received()
        return {
            'status': self._status.status,
            'agent_id': self.agent_id,
            'capabilities': self._status.capabilities,
            'version': self._status.version,
            'metrics': self._status.metrics is not None,
            'health': self._status.health is not None,
            'timestamp': time.time()
        }
    
    async def _handle_system_metrics(self, message: A2AMessage) -> Dict[str, Any]:
        """Handle system metrics request"""
        self.metrics.increment_messages_received()
        return await self.metrics.get_metrics()
    
    # Public API
    async def get_status(self) -> Dict[str, Any]:
        """Get current agent status"""
        return {
            'agent_id': self.agent_id,
            'status': self._status.status,
            'capabilities': self._status.capabilities,
            'version': self._status.version,
            'initialized': self.initialized,
            'metrics': self._status.metrics is not None,
            'health': self._status.health,
            'timestamp': time.time()
        }
    
    async def get_metrics(self) -> Dict[str, Any]:
        """Get current metrics"""
        return await self.metrics.get_metrics()
    
    async def get_health(self) -> Dict[str, Any]:
        """Get current health status"""
        return await self.metrics.health_checker.run_checks()
    
    def __del__(self):
        """Ensure resources are cleaned up"""
        if hasattr(self, 'initialized') and self.initialized and not self._shutting_down:
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    asyncio.create_task(self.close())
                else:
                    loop.run_until_complete(self.close())
            except Exception:
                pass  # Best effort cleanup
