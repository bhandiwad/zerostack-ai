"""
Agent Scheduler

This module implements advanced scheduling and placement strategies for agents.
"""
import logging
from typing import Dict, List, Optional, Any, Callable, Tuple
from dataclasses import dataclass, field
from enum import Enum, auto
import random
import math
from collections import defaultdict

from .metrics import SystemMetrics

logger = logging.getLogger(__name__)

class SchedulingStrategy(Enum):
    """Available scheduling strategies"""
    RANDOM = auto()
    ROUND_ROBIN = auto()
    LEAST_LOADED = auto()
    RESOURCE_AWARE = auto()
    AFFINITY = auto()
    ANTI_AFFINITY = auto()
    CUSTOM = auto()

@dataclass
class ResourceRequirements:
    """Resource requirements for a workload"""
    cpu_cores: float = 0.1
    memory_mb: int = 128
    disk_mb: int = 0
    gpu_count: int = 0
    gpu_memory_mb: int = 0
    
    def validate(self, available: 'ResourceRequirements') -> bool:
        """Check if requirements can be met by available resources"""
        return all([
            self.cpu_cores <= available.cpu_cores,
            self.memory_mb <= available.memory_mb,
            self.disk_mb <= available.disk_mb,
            self.gpu_count <= available.gpu_count,
            self.gpu_memory_mb <= available.gpu_memory_mb
        ])

@dataclass
class NodeAffinity:
    """Affinity rules for scheduling"""
    required_labels: Dict[str, str] = field(default_factory=dict)
    preferred_labels: Dict[str, str] = field(default_factory=dict)
    required_node_ids: List[str] = field(default_factory=list)
    preferred_node_ids: List[str] = field(default_factory=list)

@dataclass
class Workload:
    """A workload to be scheduled on an agent"""
    id: str
    name: str
    requirements: ResourceRequirements
    affinity: Optional[NodeAffinity] = None
    anti_affinity: Optional[NodeAffinity] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class NodeInfo:
    """Information about an agent node"""
    node_id: str
    address: str
    labels: Dict[str, str] = field(default_factory=dict)
    metrics: Optional[SystemMetrics] = None
    
    @property
    def available_resources(self) -> ResourceRequirements:
        """Calculate available resources based on metrics"""
        if not self.metrics:
            return ResourceRequirements()
            
        return ResourceRequirements(
            cpu_cores=self.metrics.cpu_available,
            memory_mb=self.metrics.memory_available_mb,
            disk_mb=self.metrics.disk_available_mb,
            gpu_count=self.metrics.gpu_count,
            gpu_memory_mb=self.metrics.gpu_memory_available_mb
        )
    
    def can_schedule(self, workload: Workload) -> Tuple[bool, str]:
        """Check if this node can schedule the given workload"""
        # Check resource requirements
        if not workload.requirements.validate(self.available_resources):
            return False, "Insufficient resources"
            
        # Check required labels
        if workload.affinity and workload.affinity.required_labels:
            for key, value in workload.affinity.required_labels.items():
                if key not in self.labels or self.labels[key] != value:
                    return False, f"Required label {key}={value} not matched"
                    
        # Check required node IDs
        if workload.affinity and workload.affinity.required_node_ids:
            if self.node_id not in workload.affinity.required_node_ids:
                return False, "Node ID not in required set"
                
        # Check anti-affinity (can't have these labels)
        if workload.anti_affinity and workload.anti_affinity.required_labels:
            for key, value in workload.anti_affinity.required_labels.items():
                if key in self.labels and self.labels[key] == value:
                    return False, f"Anti-affinity label {key}={value} matched"
        
        return True, ""

class Scheduler:
    """
    Advanced scheduler for agent workloads.
    
    This class implements various scheduling strategies to determine the best
    placement for workloads across available agent nodes.
    """
    
    def __init__(self, strategy: SchedulingStrategy = SchedulingStrategy.RESOURCE_AWARE):
        """Initialize the scheduler with the specified strategy"""
        self.strategy = strategy
        self.node_index = 0  # For round-robin
        self.node_stats = defaultdict(lambda: {
            'workloads': 0,
            'last_assignment': 0,
            'resource_usage': 0.0
        })
        self.strategy_map = {
            SchedulingStrategy.RANDOM: self._schedule_random,
            SchedulingStrategy.ROUND_ROBIN: self._schedule_round_robin,
            SchedulingStrategy.LEAST_LOADED: self._schedule_least_loaded,
            SchedulingStrategy.RESOURCE_AWARE: self._schedule_resource_aware,
            SchedulingStrategy.AFFINITY: self._schedule_affinity,
            SchedulingStrategy.ANTI_AFFINITY: self._schedule_anti_affinity
        }
    
    def schedule(
        self,
        workload: Workload,
        nodes: Dict[str, NodeInfo],
        strategy: Optional[SchedulingStrategy] = None
    ) -> Tuple[Optional[str], str]:
        """
        Schedule a workload on the best available node.
        
        Args:
            workload: The workload to schedule
            nodes: Dictionary of available nodes by ID
            strategy: Override the default scheduling strategy
            
        Returns:
            Tuple of (node_id, reason) where node_id is the selected node ID
            or None if scheduling failed, and reason is a string explaining
            the decision or failure.
        """
        if not nodes:
            return None, "No nodes available"
            
        strategy = strategy or self.strategy
        strategy_func = self.strategy_map.get(strategy, self._schedule_resource_aware)
        
        # Filter nodes that can satisfy the workload requirements
        feasible_nodes = {}
        for node_id, node in nodes.items():
            can_schedule, reason = node.can_schedule(workload)
            if can_schedule:
                feasible_nodes[node_id] = node
                
        if not feasible_nodes:
            return None, "No nodes can satisfy the workload requirements"
            
        # Apply the scheduling strategy
        selected_node_id = strategy_func(workload, feasible_nodes)
        
        if selected_node_id:
            # Update node statistics
            self.node_stats[selected_node_id]['workloads'] += 1
            self.node_stats[selected_node_id]['last_assignment'] = len(self.node_stats)
            
            # Update resource usage (simple heuristic: higher is worse)
            node = nodes[selected_node_id]
            if node.metrics:
                cpu_usage = 1.0 - (node.metrics.cpu_available / max(node.metrics.cpu_total, 0.1))
                mem_usage = 1.0 - (node.metrics.memory_available_mb / max(node.metrics.memory_total_mb, 1))
                self.node_stats[selected_node_id]['resource_usage'] = (cpu_usage + mem_usage) / 2.0
        
        return selected_node_id, ""
    
    def _schedule_random(self, workload: Workload, nodes: Dict[str, NodeInfo]) -> Optional[str]:
        """Random node selection"""
        return random.choice(list(nodes.keys())) if nodes else None
    
    def _schedule_round_robin(self, workload: Workload, nodes: Dict[str, NodeInfo]) -> Optional[str]:
        """Round-robin node selection"""
        node_ids = list(nodes.keys())
        if not node_ids:
            return None
            
        self.node_index = (self.node_index + 1) % len(node_ids)
        return node_ids[self.node_index]
    
    def _schedule_least_loaded(self, workload: Workload, nodes: Dict[str, NodeInfo]) -> Optional[str]:
        """Select the node with the fewest workloads"""
        if not nodes:
            return None
            
        # Get workload counts for each node
        node_workloads = [
            (node_id, self.node_stats[node_id]['workloads'])
            for node_id in nodes
        ]
        
        # Find nodes with minimum workload count
        min_workloads = min(count for _, count in node_workloads)
        candidates = [
            node_id for node_id, count in node_workloads
            if count == min_workloads
        ]
        
        # If multiple nodes have the same count, choose the one with the oldest assignment
        if len(candidates) > 1:
            candidates.sort(key=lambda n: self.node_stats[n]['last_assignment'])
            
        return candidates[0] if candidates else None
    
    def _schedule_resource_aware(self, workload: Workload, nodes: Dict[str, NodeInfo]) -> Optional[str]:
        """Select node based on resource utilization"""
        if not nodes:
            return None
            
        # Score nodes based on resource utilization (lower is better)
        scores = []
        for node_id, node in nodes.items():
            if not node.metrics:
                continue
                
            # Calculate resource utilization (0-1, lower is better)
            cpu_usage = 1.0 - (node.metrics.cpu_available / max(node.metrics.cpu_total, 0.1))
            mem_usage = 1.0 - (node.metrics.memory_available_mb / max(node.metrics.memory_total_mb, 1))
            
            # Combine scores (weighted average)
            score = (cpu_usage * 0.7) + (mem_usage * 0.3)
            scores.append((node_id, score))
        
        if not scores:
            return None
            
        # Return node with lowest score (least utilized)
        return min(scores, key=lambda x: x[1])[0]
    
    def _schedule_affinity(self, workload: Workload, nodes: Dict[str, NodeInfo]) -> Optional[str]:
        """Select node based on affinity rules"""
        if not workload.affinity or not nodes:
            return self._schedule_resource_aware(workload, nodes)
            
        # First try preferred nodes
        if workload.affinity.preferred_node_ids:
            preferred = [
                node_id for node_id in workload.affinity.preferred_node_ids
                if node_id in nodes
            ]
            if preferred:
                return preferred[0]
                
        # Then try preferred labels
        if workload.affinity.preferred_labels:
            for node_id, node in nodes.items():
                if all(
                    node.labels.get(key) == value
                    for key, value in workload.affinity.preferred_labels.items()
                ):
                    return node_id
        
        # Fall back to resource-aware scheduling
        return self._schedule_resource_aware(workload, nodes)
    
    def _schedule_anti_affinity(self, workload: Workload, nodes: Dict[str, NodeInfo]) -> Optional[str]:
        """Select node based on anti-affinity rules"""
        if not workload.anti_affinity or not nodes:
            return self._schedule_resource_aware(workload, nodes)
            
        # Filter out nodes that match anti-affinity rules
        filtered_nodes = {}
        for node_id, node in nodes.items():
            # Skip nodes with matching anti-affinity labels
            if workload.anti_affinity.required_labels and any(
                node.labels.get(key) == value
                for key, value in workload.anti_affinity.required_labels.items()
            ):
                continue
                
            # Skip nodes in the anti-affinity node list
            if (
                workload.anti_affinity.required_node_ids and
                node_id in workload.anti_affinity.required_node_ids
            ):
                continue
                
            filtered_nodes[node_id] = node
        
        # Use resource-aware scheduling on filtered nodes
        return self._schedule_resource_aware(workload, filtered_nodes or nodes)
    
    def get_node_stats(self, node_id: str) -> Dict[str, Any]:
        """Get statistics for a node"""
        return self.node_stats.get(node_id, {
            'workloads': 0,
            'last_assignment': 0,
            'resource_usage': 0.0
        })
