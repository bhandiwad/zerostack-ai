"""
Tests for the agent scheduler.
"""
import pytest
from unittest.mock import MagicMock, patch

from src.features.agents.scheduler import (
    Scheduler, SchedulingStrategy, Workload, ResourceRequirements, 
    NodeInfo, NodeAffinity, SystemMetrics
)

def create_test_node(node_id: str, cpu: float, memory: int, **kwargs) -> NodeInfo:
    """Create a test node with the given resources"""
    return NodeInfo(
        node_id=node_id,
        address=f"{node_id}.example.com",
        metrics=SystemMetrics(
            cpu_total=cpu,
            cpu_available=cpu,
            memory_total_mb=memory,
            memory_available_mb=memory,
            disk_total_mb=102400,
            disk_available_mb=51200,
            gpu_count=kwargs.get('gpu_count', 0),
            gpu_memory_total_mb=kwargs.get('gpu_memory', 0),
            gpu_memory_available_mb=kwargs.get('gpu_memory', 0),
            network_bytes_sent=0,
            network_bytes_recv=0
        ),
        labels=kwargs.get('labels', {})
    )

class TestScheduler:
    """Tests for the Scheduler class"""
    
    def test_schedule_random_strategy(self):
        """Test random scheduling strategy"""
        scheduler = Scheduler(strategy=SchedulingStrategy.RANDOM)
        nodes = {
            'node1': create_test_node('node1', 4.0, 8192),
            'node2': create_test_node('node2', 8.0, 16384),
            'node3': create_test_node('node3', 2.0, 4096)
        }
        
        workload = Workload(
            id='test-workload',
            name='test',
            requirements=ResourceRequirements(cpu_cores=1.0, memory_mb=1024)
        )
        
        # Test multiple times to ensure random selection
        selected_nodes = set()
        for _ in range(10):
            node_id, _ = scheduler.schedule(workload, nodes)
            assert node_id in nodes
            selected_nodes.add(node_id)
            
        # With enough iterations, we should have selected multiple nodes
        assert len(selected_nodes) > 1
    
    def test_schedule_round_robin(self):
        """Test round-robin scheduling strategy"""
        scheduler = Scheduler(strategy=SchedulingStrategy.ROUND_ROBIN)
        nodes = {
            'node1': create_test_node('node1', 4.0, 8192),
            'node2': create_test_node('node2', 8.0, 16384),
            'node3': create_test_node('node3', 2.0, 4096)
        }
        
        workload = Workload(
            id='test-workload',
            name='test',
            requirements=ResourceRequirements(cpu_cores=1.0, memory_mb=1024)
        )
        
        # Should cycle through nodes in order
        expected_order = ['node1', 'node2', 'node3'] * 2
        for expected_node in expected_order:
            node_id, _ = scheduler.schedule(workload, nodes)
            assert node_id == expected_node
    
    def test_schedule_least_loaded(self):
        """Test least-loaded scheduling strategy"""
        scheduler = Scheduler(strategy=SchedulingStrategy.LEAST_LOADED)
        nodes = {
            'node1': create_test_node('node1', 4.0, 8192),
            'node2': create_test_node('node2', 8.0, 16384),
            'node3': create_test_node('node3', 2.0, 4096)
        }
        
        workload = Workload(
            id='test-workload',
            name='test',
            requirements=ResourceRequirements(cpu_cores=1.0, memory_mb=1024)
        )
        
        # Initially, all nodes have 0 workloads
        node_id, _ = scheduler.schedule(workload, nodes)
        assert node_id in nodes
        
        # Update workload counts manually
        scheduler.node_stats['node1']['workloads'] = 5
        scheduler.node_stats['node2']['workloads'] = 3
        scheduler.node_stats['node3']['workloads'] = 1
        
        # Should select node3 (least loaded)
        node_id, _ = scheduler.schedule(workload, nodes)
        assert node_id == 'node3'
    
    def test_schedule_resource_aware(self):
        """Test resource-aware scheduling strategy"""
        scheduler = Scheduler(strategy=SchedulingStrategy.RESOURCE_AWARE)
        nodes = {
            'node1': create_test_node('node1', 4.0, 8192),  # 50% CPU used
            'node2': create_test_node('node2', 8.0, 8192),  # 25% CPU used
            'node3': create_test_node('node3', 2.0, 4096)   # 100% CPU used
        }
        
        # Simulate some resource usage
        nodes['node1'].metrics.cpu_available = 2.0  # 50% used
        nodes['node2'].metrics.cpu_available = 6.0  # 25% used
        nodes['node3'].metrics.cpu_available = 0.0  # 100% used
        
        workload = Workload(
            id='test-workload',
            name='test',
            requirements=ResourceRequirements(cpu_cores=1.0, memory_mb=1024)
        )
        
        # Should select node2 (least utilized)
        node_id, _ = scheduler.schedule(workload, nodes)
        assert node_id == 'node2'
    
    def test_schedule_affinity(self):
        """Test scheduling with affinity rules"""
        scheduler = Scheduler(strategy=SchedulingStrategy.AFFINITY)
        nodes = {
            'node1': create_test_node('node1', 4.0, 8192, labels={'env': 'prod', 'zone': 'us-west'}),
            'node2': create_test_node('node2', 8.0, 16384, labels={'env': 'staging', 'zone': 'us-east'}),
            'node3': create_test_node('node3', 2.0, 4096, labels={'env': 'prod', 'zone': 'eu-west'})
        }
        
        # Workload with affinity to production environment
        workload = Workload(
            id='prod-workload',
            name='production',
            requirements=ResourceRequirements(cpu_cores=1.0, memory_mb=1024),
            affinity=NodeAffinity(
                preferred_labels={'env': 'prod'}
            )
        )
        
        # Should select a production node (node1 or node3)
        node_id, _ = scheduler.schedule(workload, nodes)
        assert node_id in ['node1', 'node3']
        
        # Workload with required zone
        workload.affinity = NodeAffinity(
            required_labels={'zone': 'us-east'}
        )
        
        # Should select node2 (only one in us-east)
        node_id, _ = scheduler.schedule(workload, nodes)
        assert node_id == 'node2'
    
    def test_schedule_anti_affinity(self):
        """Test scheduling with anti-affinity rules"""
        scheduler = Scheduler(strategy=SchedulingStrategy.ANTI_AFFINITY)
        nodes = {
            'node1': create_test_node('node1', 4.0, 8192, labels={'app': 'web'}),
            'node2': create_test_node('node2', 8.0, 16384, labels={'app': 'db'}),
            'node3': create_test_node('node3', 2.0, 4096, labels={'app': 'cache'})
        }
        
        # Workload that shouldn't run on database nodes
        workload = Workload(
            id='non-db-workload',
            name='frontend',
            requirements=ResourceRequirements(cpu_cores=1.0, memory_mb=1024),
            anti_affinity=NodeAffinity(
                required_labels={'app': 'db'}
            )
        )
        
        # Should select node1 or node3 (not node2 which is the db)
        node_id, _ = scheduler.schedule(workload, nodes)
        assert node_id in ['node1', 'node3']
    
    def test_schedule_insufficient_resources(self):
        """Test scheduling when no nodes have sufficient resources"""
        scheduler = Scheduler()
        nodes = {
            'node1': create_test_node('node1', 1.0, 1024),
            'node2': create_test_node('node2', 1.0, 1024)
        }
        
        # Workload that requires more resources than available
        workload = Workload(
            id='big-workload',
            name='big',
            requirements=ResourceRequirements(cpu_cores=2.0, memory_mb=2048)
        )
        
        # Should return None with an error message
        node_id, reason = scheduler.schedule(workload, nodes)
        assert node_id is None
        assert "No nodes can satisfy the workload requirements" in reason
    
    def test_schedule_gpu_requirements(self):
        """Test scheduling with GPU requirements"""
        scheduler = Scheduler()
        nodes = {
            'cpu-only': create_test_node('cpu-only', 8.0, 32768),
            'gpu-node': create_test_node('gpu-node', 8.0, 32768, gpu_count=2, gpu_memory=16384)
        }
        
        # Workload that requires a GPU
        workload = Workload(
            id='gpu-workload',
            name='gpu-inference',
            requirements=ResourceRequirements(
                cpu_cores=2.0,
                memory_mb=8192,
                gpu_count=1,
                gpu_memory_mb=8192
            )
        )
        
        # Should select the GPU node
        node_id, _ = scheduler.schedule(workload, nodes)
        assert node_id == 'gpu-node'
        
        # Update GPU usage
        nodes['gpu-node'].metrics.gpu_available_mb = 4096
        
        # Now the GPU node doesn't have enough GPU memory
        node_id, reason = scheduler.schedule(workload, nodes)
        assert node_id is None
        assert "Insufficient resources" in reason
