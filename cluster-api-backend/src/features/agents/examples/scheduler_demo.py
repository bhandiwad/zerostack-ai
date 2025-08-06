"""
Scheduler Demo

This script demonstrates the advanced scheduling capabilities of the agent system.
It shows how to use the scheduler to distribute workloads across multiple agents
based on resource availability, affinity rules, and other scheduling strategies.
"""
import asyncio
import logging
import random
import time
from typing import Dict, List, Optional

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Add the project root to the Python path
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent.parent.parent.parent))

from src.features.agents.agent_manager import AgentManager
from src.features.agents.scheduler import (
    SchedulingStrategy, ResourceRequirements, NodeAffinity, NodeInfo, SystemMetrics
)

class DemoAgent:
    """Demo agent that simulates workload scheduling"""
    
    def __init__(self, agent_id: str, labels: Optional[Dict[str, str]] = None):
        """Initialize the demo agent"""
        self.agent_id = agent_id
        self.labels = labels or {}
        self.workloads: List[Dict] = []
        self.metrics = SystemMetrics(
            cpu_total=4.0,  # 4 CPU cores
            cpu_available=4.0,
            memory_total_mb=8192,  # 8GB RAM
            memory_available_mb=8192,
            disk_total_mb=102400,  # 100GB disk
            disk_available_mb=102400,
            gpu_count=1,
            gpu_memory_total_mb=8192,  # 8GB GPU
            gpu_memory_available_mb=8192,
            network_bytes_sent=0,
            network_bytes_recv=0
        )
        
    def get_node_info(self) -> NodeInfo:
        """Get node information for scheduling"""
        return NodeInfo(
            node_id=self.agent_id,
            address=f"{self.agent_id}.example.com",
            labels=self.labels,
            metrics=self.metrics
        )
    
    async def schedule_workload(
        self,
        workload: Dict,
        requirements: ResourceRequirements,
        affinity: Optional[NodeAffinity] = None,
        anti_affinity: Optional[NodeAffinity] = None
    ) -> bool:
        """Simulate scheduling a workload on this agent"""
        # Check if we can satisfy the requirements
        if not self._can_schedule(requirements):
            return False
        
        # Update available resources
        self.metrics.cpu_available -= requirements.cpu_cores
        self.metrics.memory_available_mb -= requirements.memory_mb
        self.metrics.disk_available_mb -= requirements.disk_mb
        self.metrics.gpu_count -= requirements.gpu_count
        self.metrics.gpu_memory_available_mb -= requirements.gpu_memory_mb
        
        # Add to workloads
        workload['start_time'] = time.time()
        self.workloads.append(workload)
        
        logger.info(f"[{self.agent_id}] Scheduled workload: {workload['id']} "
                  f"(CPU: {requirements.cpu_cores}, Mem: {requirements.memory_mb}MB)")
        
        # Simulate workload completion after some time
        asyncio.create_task(self._complete_workload(workload, requirements))
        return True
    
    async def _complete_workload(self, workload: Dict, requirements: ResourceRequirements):
        """Simulate workload completion"""
        try:
            duration = random.uniform(5.0, 15.0)  # 5-15 seconds
            await asyncio.sleep(duration)
            
            # Release resources
            self.metrics.cpu_available += requirements.cpu_cores
            self.metrics.memory_available_mb += requirements.memory_mb
            self.metrics.disk_available_mb += requirements.disk_mb
            self.metrics.gpu_count += requirements.gpu_count
            self.metrics.gpu_memory_available_mb += requirements.gpu_memory_mb
            
            # Remove from workloads
            self.workloads = [w for w in self.workloads if w['id'] != workload['id']]
            
            logger.info(f"[{self.agent_id}] Completed workload: {workload['id']} "
                      f"(took {duration:.1f}s)")
            
        except asyncio.CancelledError:
            # Handle cancellation
            logger.info(f"[{self.agent_id}] Workload {workload['id']} was cancelled")
    
    def _can_schedule(self, requirements: ResourceRequirements) -> bool:
        """Check if this agent can schedule the given requirements"""
        return all([
            self.metrics.cpu_available >= requirements.cpu_cores,
            self.metrics.memory_available_mb >= requirements.memory_mb,
            self.metrics.disk_available_mb >= requirements.disk_mb,
            self.metrics.gpu_count >= requirements.gpu_count,
            self.metrics.gpu_memory_available_mb >= requirements.gpu_memory_mb
        ])

async def run_demo():
    """Run the scheduler demo"""
    logger.info("Starting scheduler demo...")
    
    # Create some demo agents with different labels
    agents = {
        "agent-1": DemoAgent("agent-1", {"region": "us-west", "gpu": "true", "env": "production"}),
        "agent-2": DemoAgent("agent-2", {"region": "us-east", "env": "staging"}),
        "agent-3": DemoAgent("agent-3", {"region": "eu-west", "gpu": "true", "env": "production"}),
        "agent-4": DemoAgent("agent-4", {"region": "ap-southeast", "env": "staging"}),
    }
    
    # Create an agent manager for scheduling
    agent_manager = AgentManager(
        agent_id="scheduler-demo",
        scheduling_strategy=SchedulingStrategy.RESOURCE_AWARE
    )
    
    # Register the agents with the scheduler
    for agent in agents.values():
        agent_manager.scheduler.node_stats[agent.agent_id] = {
            'workloads': 0,
            'last_assignment': 0,
            'resource_usage': 0.0
        }
    
    # Define some workload types
    workload_types = [
        {
            'name': 'cpu-intensive',
            'requirements': ResourceRequirements(cpu_cores=2.0, memory_mb=2048, disk_mb=1024),
            'affinity': NodeAffinity(preferred_labels={"env": "production"})
        },
        {
            'name': 'gpu-inference',
            'requirements': ResourceRequirements(
                cpu_cores=1.0, 
                memory_mb=4096, 
                gpu_count=1, 
                gpu_memory_mb=4096
            ),
            'affinity': NodeAffinity(required_labels={"gpu": "true"})
        },
        {
            'name': 'memory-intensive',
            'requirements': ResourceRequirements(cpu_cores=1.0, memory_mb=6144, disk_mb=512),
            'affinity': NodeAffinity(preferred_labels={"region": "us-east"})
        },
        {
            'name': 'small-task',
            'requirements': ResourceRequirements(cpu_cores=0.5, memory_mb=512, disk_mb=100)
        }
    ]
    
    async def submit_workloads():
        """Submit workloads to the scheduler"""
        workload_id = 1
        
        while True:
            # Get current node information
            nodes = {
                agent_id: agent.get_node_info()
                for agent_id, agent in agents.items()
            }
            
            # Select a random workload type
            workload_type = random.choice(workload_types)
            
            # Create a workload
            workload = {
                'id': f'workload-{workload_id}',
                'type': workload_type['name'],
                'requirements': workload_type['requirements']
            }
            
            # Schedule the workload
            node_id, reason = await agent_manager.scheduler.schedule(
                workload_type['requirements'],
                nodes,
                strategy=SchedulingStrategy.RESOURCE_AWARE,
                affinity=workload_type.get('affinity')
            )
            
            if node_id:
                # Submit the workload to the selected agent
                scheduled = await agents[node_id].schedule_workload(
                    workload,
                    workload_type['requirements'],
                    workload_type.get('affinity')
                )
                
                if scheduled:
                    logger.info(f"Scheduled {workload['id']} on {node_id}")
                else:
                    logger.warning(f"Failed to schedule {workload['id']} on {node_id}: agent busy")
            else:
                logger.warning(f"Failed to schedule {workload['id']}: {reason}")
            
            workload_id += 1
            await asyncio.sleep(random.uniform(0.5, 2.0))  # Random delay between workloads
    
    # Start the workload submission in the background
    workload_task = asyncio.create_task(submit_workloads())
    
    try:
        # Run for 60 seconds
        await asyncio.sleep(60)
        workload_task.cancel()
        
    except asyncio.CancelledError:
        logger.info("Demo cancelled")
    
    finally:
        # Clean up
        if not workload_task.done():
            workload_task.cancel()
        
        # Print final stats
        logger.info("\n=== Final Stats ===")
        for agent_id, agent in agents.items():
            logger.info(f"\n{agent_id}:")
            logger.info(f"  CPU: {agent.metrics.cpu_available:.1f}/{agent.metrics.cpu_total:.1f} cores")
            logger.info(f"  Memory: {agent.metrics.memory_available_mb}/{agent.metrics.memory_total_mb} MB")
            logger.info(f"  GPU Memory: {agent.metrics.gpu_memory_available_mb}/{agent.metrics.gpu_memory_total_mb} MB")
            logger.info(f"  Workloads completed: {len([w for w in agent.workloads if 'end_time' in w])}")
            logger.info(f"  Active workloads: {len([w for w in agent.workloads if 'end_time' not in w])}")

if __name__ == "__main__":
    try:
        asyncio.run(run_demo())
    except KeyboardInterrupt:
        logger.info("Demo stopped by user")
