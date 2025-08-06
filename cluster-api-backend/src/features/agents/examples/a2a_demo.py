"""
A2A Protocol Demo

This script demonstrates the A2A protocol in action with two agents:
1. Agent A: Sends a ping to Agent B
2. Agent B: Responds to the ping

Run this script in two separate terminals to see the agents communicate.
"""
import asyncio
import logging
import sys
import uuid

# Add the project root to the Python path
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent.parent.parent.parent))

from src.features.agents.agent_manager import AgentManager
from src.features.agents.capabilities.example_a2a_capability import ExampleA2ACapability

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class A2ADemo:
    """Demo class for A2A protocol"""
    
    def __init__(self, agent_id: str, is_responder: bool = False):
        """Initialize the demo"""
        self.agent_id = agent_id
        self.is_responder = is_responder
        self.agent_manager = AgentManager(
            agent_id=agent_id,
            broker_servers="nats://localhost:4222",
            auth_config={
                'secret_key': 'demo-secret-key',  # In production, use a secure key
                'token_expire_minutes': 60,
                'algorithm': 'HS256'
            },
            capabilities=[ExampleA2ACapability]
        )
    
    async def run(self):
        """Run the demo"""
        try:
            # Initialize the agent
            await self.agent_manager.initialize()
            
            if self.is_responder:
                await self._run_responder()
            else:
                await self._run_requester()
                
        except Exception as e:
            logger.error(f"Error in demo: {e}", exc_info=True)
        finally:
            await self.cleanup()
    
    async def _run_responder(self):
        """Run the responder agent"""
        logger.info(f"Responder agent {self.agent_id} is running. Press Ctrl+C to exit.")
        
        # Keep the responder running
        while True:
            try:
                await asyncio.sleep(1)
            except asyncio.CancelledError:
                break
    
    async def _run_requester(self):
        """Run the requester agent"""
        logger.info(f"Requester agent {self.agent_id} is running.")
        
        # Wait a bit for the responder to start
        await asyncio.sleep(2)
        
        try:
            # Discover other agents
            logger.info("Discovering agents...")
            agents = await self.agent_manager.discover_agents(
                capability="ExampleA2ACapability",
                timeout=3.0
            )
            
            if not agents:
                logger.warning("No agents found. Make sure the responder is running.")
                return
            
            logger.info(f"Discovered agents: {[a['id'] for a in agents]}")
            
            # Send a ping to each agent
            for agent in agents:
                if agent['id'] == self.agent_id:
                    continue  # Skip self
                
                logger.info(f"Sending ping to agent {agent['id']}...")
                
                try:
                    # Use the example capability to send a ping
                    response = await self.agent_manager.execute_action(
                        capability_name="ExampleA2ACapability",
                        action="send_ping",
                        parameters={
                            'target_agent_id': agent['id'],
                            'message': f"Hello from {self.agent_id}!",
                            'expect_response': True,
                            'timeout': 5.0
                        }
                    )
                    
                    logger.info(f"Received response: {response}")
                    
                except Exception as e:
                    logger.error(f"Error sending ping to {agent['id']}: {e}")
            
        except asyncio.CancelledError:
            pass
    
    async def cleanup(self):
        """Clean up resources"""
        if hasattr(self, 'agent_manager') and self.agent_manager:
            await self.agent_manager.close()

async def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='A2A Protocol Demo')
    parser.add_argument('--responder', action='store_true', help='Run in responder mode')
    parser.add_argument('--id', type=str, help='Agent ID', default=f"agent-{uuid.uuid4().hex[:4]}")
    args = parser.parse_args()
    
    demo = A2ADemo(agent_id=args.id, is_responder=args.responder)
    
    try:
        await demo.run()
    except KeyboardInterrupt:
        logger.info("Shutting down...")
    finally:
        await demo.cleanup()

if __name__ == "__main__":
    asyncio.run(main())
