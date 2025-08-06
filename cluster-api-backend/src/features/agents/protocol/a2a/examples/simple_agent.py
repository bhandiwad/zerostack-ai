"""
Simple Agent Example

This example demonstrates how to create an agent using the A2A protocol.
"""
import asyncio
import logging
import signal
import sys
from typing import Any, Dict, Optional

# Add the parent directory to the path so we can import the A2A module
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from features.agents.protocol.a2a.agent_manager import AgentManager
from features.agents.protocol.a2a.message import A2AMessage, MessageType

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
    ]
)
logger = logging.getLogger(__name__)

class SimpleAgent:
    """A simple agent that demonstrates A2A communication."""
    
    def __init__(self, agent_id: str, broker_servers: str = "nats://localhost:4222"):
        """Initialize the agent.
        
        Args:
            agent_id: Unique identifier for this agent
            broker_servers: Comma-separated list of NATS server URLs
        """
        self.agent_id = agent_id
        self.broker_servers = broker_servers
        self.agent_manager: Optional[AgentManager] = None
        self.running = False
        
        # Register signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
    
    async def start(self) -> None:
        """Start the agent."""
        if self.running:
            return
            
        logger.info(f"Starting agent {self.agent_id}")
        
        # Create and configure the agent manager
        self.agent_manager = AgentManager(broker_servers=self.broker_servers)
        
        # Connect to the A2A network
        await self.agent_manager.connect(
            agent_id=self.agent_id,
            agent_info={
                "type": "simple_agent",
                "description": "A simple example agent",
            }
        )
        
        # Register capabilities
        await self.agent_manager.register_capability("echo", "Echo back received messages")
        await self.agent_manager.register_capability("ping", "Respond to ping requests")
        
        # Register message handlers
        self.agent_manager.add_message_handler("echo", self._handle_echo)
        self.agent_manager.add_message_handler("ping", self._handle_ping)
        
        self.running = True
        logger.info(f"Agent {self.agent_id} is running")
        
        # Keep the agent running
        while self.running:
            try:
                await asyncio.sleep(1)
            except asyncio.CancelledError:
                break
    
    async def stop(self) -> None:
        """Stop the agent."""
        if not self.running or not self.agent_manager:
            return
            
        logger.info(f"Stopping agent {self.agent_id}")
        self.running = False
        
        # Disconnect from the A2A network
        await self.agent_manager.disconnect()
        logger.info(f"Agent {self.agent_id} stopped")
    
    def _signal_handler(self, signum, frame) -> None:
        """Handle signals for graceful shutdown."""
        logger.info(f"Received signal {signum}, shutting down...")
        asyncio.create_task(self.stop())
    
    async def _handle_echo(self, message: A2AMessage) -> None:
        """Handle echo messages by echoing back the content."""
        if not self.agent_manager:
            return
            
        logger.info(f"Received echo request from {message.header.source_agent_id}")
        
        # Echo back the content
        await self.agent_manager.send_message(
            target_agent_id=message.header.source_agent_id,
            action="echo_response",
            parameters={"original_sender": message.header.source_agent_id},
            content=message.payload.content
        )
    
    async def _handle_ping(self, message: A2AMessage) -> None:
        """Handle ping messages by responding with pong."""
        if not self.agent_manager:
            return
            
        logger.info(f"Received ping from {message.header.source_agent_id}")
        
        # Respond with pong
        await self.agent_manager.send_message(
            target_agent_id=message.header.source_agent_id,
            action="pong",
            parameters={"original_sender": message.header.source_agent_id},
            content={"message": "pong"}
        )


async def main():
    """Run the example."""
    # Get agent ID from command line or use a default
    agent_id = sys.argv[1] if len(sys.argv) > 1 else f"agent-{os.getpid()}"
    
    # Create and start the agent
    agent = SimpleAgent(agent_id=agent_id)
    
    try:
        await agent.start()
    except KeyboardInterrupt:
        pass
    finally:
        await agent.stop()


if __name__ == "__main__":
    asyncio.run(main())
