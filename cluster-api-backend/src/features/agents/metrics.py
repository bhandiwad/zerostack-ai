"""
Agent Metrics and Health Monitoring

This module provides metrics collection and health monitoring for agents.
"""
import time
import psutil
import platform
from typing import Dict, Any, Optional, List, Callable, Awaitable
from dataclasses import dataclass, asdict, field
from datetime import datetime
from enum import Enum
import asyncio
import logging

logger = logging.getLogger(__name__)

class HealthStatus(str, Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"

@dataclass
class SystemMetrics:
    """System-level metrics"""
    cpu_percent: float = 0.0
    memory_percent: float = 0.0
    memory_used: int = 0  # in bytes
    memory_total: int = 0  # in bytes
    disk_usage: float = 0.0  # percent
    network_sent: int = 0  # in bytes
    network_recv: int = 0  # in bytes
    timestamp: float = field(default_factory=time.time)
    
    @classmethod
    def collect(cls) -> 'SystemMetrics':
        """Collect current system metrics"""
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        net_io = psutil.net_io_counters()
        
        return cls(
            cpu_percent=psutil.cpu_percent(interval=0.1),
            memory_percent=memory.percent,
            memory_used=memory.used,
            memory_total=memory.total,
            disk_usage=disk.percent,
            network_sent=net_io.bytes_sent,
            network_recv=net_io.bytes_recv
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return asdict(self)

@dataclass
class AgentMetrics:
    """Agent-specific metrics"""
    messages_sent: int = 0
    messages_received: int = 0
    messages_failed: int = 0
    requests_in_flight: int = 0
    capabilities_registered: int = 0
    last_heartbeat: Optional[float] = None
    uptime_seconds: float = 0.0
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return asdict(self)

class HealthCheckResult:
    """Result of a health check"""
    def __init__(self, status: HealthStatus, message: str = "", details: Optional[Dict[str, Any]] = None):
        self.status = status
        self.message = message
        self.details = details or {}
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'status': self.status.value,
            'message': self.message,
            'details': self.details,
            'timestamp': datetime.utcnow().isoformat()
        }

class HealthChecker:
    """Health check registry and runner"""
    def __init__(self):
        self.checks: List[Callable[[], Awaitable[HealthCheckResult]]] = []
    
    def register(self, check: Callable[[], Awaitable[HealthCheckResult]]) -> None:
        """Register a health check"""
        self.checks.append(check)
    
    async def run_checks(self) -> Dict[str, Any]:
        """Run all health checks and return aggregated results"""
        results = []
        overall_status = HealthStatus.HEALTHY
        
        for check in self.checks:
            try:
                result = await check()
                if result.status == HealthStatus.UNHEALTHY:
                    overall_status = HealthStatus.UNHEALTHY
                elif result.status == HealthStatus.DEGRADED and overall_status != HealthStatus.UNHEALTHY:
                    overall_status = HealthStatus.DEGRADED
                results.append(result.to_dict())
            except Exception as e:
                logger.exception(f"Health check failed: {e}")
                results.append({
                    'status': HealthStatus.UNHEALTHY.value,
                    'message': f"Health check error: {str(e)}",
                    'error': str(e),
                    'timestamp': datetime.utcnow().isoformat()
                })
                overall_status = HealthStatus.UNHEALTHY
        
        return {
            'status': overall_status.value,
            'timestamp': datetime.utcnow().isoformat(),
            'checks': results
        }

class MetricsCollector:
    """Collects and manages agent metrics"""
    def __init__(self, agent_id: str):
        self.agent_id = agent_id
        self.system_metrics = SystemMetrics()
        self.agent_metrics = AgentMetrics()
        self.start_time = time.time()
        self.health_checker = HealthChecker()
        self._running = False
        self._task: Optional[asyncio.Task] = None
    
    async def start(self, interval: float = 5.0) -> None:
        """Start metrics collection"""
        if self._running:
            return
            
        self._running = True
        self._task = asyncio.create_task(self._collect_loop(interval))
        
        # Register default health checks
        self.health_checker.register(self._check_system_resources)
        self.health_checker.register(self._check_agent_health)
    
    async def stop(self) -> None:
        """Stop metrics collection"""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
    
    async def _collect_loop(self, interval: float) -> None:
        """Background task to collect metrics at regular intervals"""
        while self._running:
            try:
                # Update system metrics
                self.system_metrics = SystemMetrics.collect()
                
                # Update agent metrics
                self.agent_metrics.uptime_seconds = time.time() - self.start_time
                
                # Sleep until next collection
                await asyncio.sleep(interval)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in metrics collection: {e}")
                await asyncio.sleep(interval)  # Prevent tight loop on error
    
    async def get_metrics(self) -> Dict[str, Any]:
        """Get current metrics"""
        health = await self.health_checker.run_checks()
        
        return {
            'agent_id': self.agent_id,
            'system': self.system_metrics.to_dict(),
            'agent': self.agent_metrics.to_dict(),
            'health': health,
            'platform': {
                'system': platform.system(),
                'release': platform.release(),
                'machine': platform.machine(),
                'python_version': platform.python_version()
            },
            'timestamp': datetime.utcnow().isoformat()
        }
    
    # Health check implementations
    async def _check_system_resources(self) -> HealthCheckResult:
        """Check system resource usage"""
        if self.system_metrics.memory_percent > 90:
            return HealthCheckResult(
                status=HealthStatus.UNHEALTHY,
                message="High memory usage",
                details={
                    'memory_percent': self.system_metrics.memory_percent,
                    'memory_used': self.system_metrics.memory_used,
                    'memory_total': self.system_metrics.memory_total
                }
            )
        
        if self.system_metrics.cpu_percent > 90:
            return HealthCheckResult(
                status=HealthStatus.DEGRADED,
                message="High CPU usage",
                details={'cpu_percent': self.system_metrics.cpu_percent}
            )
        
        if self.system_metrics.disk_usage > 90:
            return HealthCheckResult(
                status=HealthStatus.DEGRADED,
                message="High disk usage",
                details={'disk_usage': self.system_metrics.disk_usage}
            )
        
        return HealthCheckResult(
            status=HealthStatus.HEALTHY,
            message="System resources are healthy"
        )
    
    async def _check_agent_health(self) -> HealthCheckResult:
        """Check agent-specific health metrics"""
        if self.agent_metrics.messages_failed > 10 and \
           self.agent_metrics.messages_failed / (self.agent_metrics.messages_sent + 1) > 0.1:
            return HealthCheckResult(
                status=HealthStatus.DEGRADED,
                message="High message failure rate",
                details={
                    'messages_sent': self.agent_metrics.messages_sent,
                    'messages_failed': self.agent_metrics.messages_failed,
                    'failure_rate': self.agent_metrics.messages_failed / (self.agent_metrics.messages_sent + 1)
                }
            )
        
        return HealthCheckResult(
            status=HealthStatus.HEALTHY,
            message="Agent is healthy"
        )
    
    # Metric update methods
    def increment_messages_sent(self, count: int = 1) -> None:
        """Increment messages sent counter"""
        self.agent_metrics.messages_sent += count
    
    def increment_messages_received(self, count: int = 1) -> None:
        """Increment messages received counter"""
        self.agent_metrics.messages_received += count
    
    def increment_messages_failed(self, count: int = 1) -> None:
        """Increment messages failed counter"""
        self.agent_metrics.messages_failed += count
    
    def update_heartbeat(self) -> None:
        """Update last heartbeat timestamp"""
        self.agent_metrics.last_heartbeat = time.time()
    
    def update_capabilities_count(self, count: int) -> None:
        """Update number of registered capabilities"""
        self.agent_metrics.capabilities_registered = count
