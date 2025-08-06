"""
Run Agent with API Example

This script demonstrates how to start an agent with an API server.

Example usage:
    python -m src.features.agents.examples.run_agent_with_api \
        --host 0.0.0.0 \
        --port 8080 \
        --nats-servers nats://localhost:4222
"""
import argparse
import asyncio
import logging
import signal
import sys
from typing import Optional

# Add the project root to the Python path
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent.parent.parent.parent))

from src.features.agents.agent_manager import AgentManager
from src.features.agents.capabilities.example_a2a_capability import ExampleA2ACapability
from src.features.agents.api.app import create_agent_api, run_agent_api

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('agent.log')
    ]
)
logger = logging.getLogger(__name__)

class AgentWithAPI:
    """Example agent with API server"""
    
    def __init__(
        self,
        agent_id: Optional[str] = None,
        nats_servers: str = "nats://localhost:4222",
        api_host: str = "0.0.0.0",
        api_port: int = 8080,
        api_prefix: str = "/api/v1/agent",
        enable_cors: bool = True,
        debug: bool = False
    ):
        """Initialize the agent with API"""
        self.agent_id = agent_id or f"agent-{self._generate_id()}"
        self.nats_servers = nats_servers
        self.api_host = api_host
        self.api_port = api_port
        self.api_prefix = api_prefix
        self.enable_cors = enable_cors
        self.debug = debug
        
        # Initialize agent manager
        self.agent_manager = AgentManager(
            agent_id=self.agent_id,
            broker_servers=self.nats_servers,
            capabilities=[ExampleA2ACapability],
            metrics_interval=5.0,
            health_check_interval=30.0
        )
        
        # API will be initialized in start()
        self.api = None
    
    @staticmethod
    def _generate_id() -> str:
        """Generate a random agent ID"""
        import uuid
        return str(uuid.uuid4())[:8]
    
    async def initialize(self) -> None:
        """Initialize the agent and API"""
        logger.info(f"Initializing agent '{self.agent_id}'...")
        
        # Initialize agent manager
        await self.agent_manager.initialize()
        
        # Create API
        self.api = create_agent_api(
            agent_manager=self.agent_manager,
            host=self.api_host,
            port=self.api_port,
            api_prefix=self.api_prefix,
            enable_cors=self.enable_cors,
            debug=self.debug
        )
        
        logger.info(f"Agent '{self.agent_id}' initialized")
    
    async def start(self) -> None:
        """Start the agent and API server"""
        if not self.api:
            raise RuntimeError("Agent not initialized. Call initialize() first.")
        
        logger.info(f"Starting agent '{self.agent_id}' with API on {self.api_host}:{self.api_port}{self.api_prefix}")
        
        # Start the API server
        await self.api.start()
    
    async def stop(self) -> None:
        """Stop the agent and API server"""
        logger.info(f"Stopping agent '{self.agent_id}'...")
        
        # Stop the agent manager
        await self.agent_manager.close()
        
        logger.info(f"Agent '{self.agent_id}' stopped")

def parse_args():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description="Run an agent with an API server")
    
    # Agent options
    parser.add_argument(
        "--agent-id",
        type=str,
        default=None,
        help="Agent ID (default: auto-generated)"
    )
    parser.add_argument(
        "--nats-servers",
        type=str,
        default="nats://localhost:4222",
        help="Comma-separated list of NATS server URLs (default: nats://localhost:4222)"
    )
    
    # API options
    parser.add_argument(
        "--host",
        type=str,
        default="0.0.0.0",
        help="API server host (default: 0.0.0.0)"
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8080,
        help="API server port (default: 8080)"
    )
    parser.add_argument(
        "--api-prefix",
        type=str,
        default="/api/v1/agent",
        help="API URL prefix (default: /api/v1/agent)"
    )
    parser.add_argument(
        "--no-cors",
        action="store_false",
        dest="enable_cors",
        help="Disable CORS"
    )
    parser.add_argument(
        "--debug",
        action="store_true",
        help="Enable debug mode"
    )
    
    return parser.parse_args()

async def main():
    """Main entry point"""
    args = parse_args()
    
    # Create and start the agent
    agent = AgentWithAPI(
        agent_id=args.agent_id,
        nats_servers=args.nats_servers,
        api_host=args.host,
        api_port=args.port,
        api_prefix=args.api_prefix,
        enable_cors=args.enable_cors,
        debug=args.debug
    )
    
    # Set up signal handlers for graceful shutdown
    loop = asyncio.get_running_loop()
    stop_event = asyncio.Event()
    
    def signal_handler():
        logger.info("Shutdown signal received, stopping agent...")
        stop_event.set()
    
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, signal_handler)
    
    try:
        # Initialize the agent
        await agent.initialize()
        
        # Start the agent in the background
        agent_task = asyncio.create_task(agent.start())
        
        # Wait for shutdown signal
        await stop_event.wait()
        
        # Stop the agent
        await agent.stop()
        
        # Wait for the agent task to complete
        agent_task.cancel()
        try:
            await agent_task
        except asyncio.CancelledError:
            pass
            
    except Exception as e:
        logger.error(f"Error running agent: {e}", exc_info=True)
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
