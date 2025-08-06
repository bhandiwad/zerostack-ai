"""
Example A2A Capability

This module demonstrates how to create a capability that uses the A2A protocol
for secure agent-to-agent communication.
"""
import asyncio
import logging
from typing import Dict, Any, List, Optional

from .base import AgentCapability, ActionSchema, ParameterSchema

logger = logging.getLogger(__name__)

class ExampleA2ACapability(AgentCapability):
    """
    Example capability demonstrating A2A protocol usage.
    
    This capability shows how to:
    1. Send messages to other agents
    2. Handle incoming A2A messages
    3. Register message handlers
    4. Discover other agents
    """
    
    async def _initialize(self):
        """Initialize the capability"""
        # Register A2A message handlers
        self.register_a2a_handler("example_ping", self._handle_ping)
        self.register_a2a_handler("example_echo", self._handle_echo)
        
        logger.info(f"Initialized ExampleA2ACapability for agent {self.agent_id}")
    
    async def _register_a2a_handlers(self):
        """Register A2A message handlers with the agent manager"""
        # This is called automatically by the base class
        # after initialization if an A2A manager is available
        logger.debug("Registered A2A message handlers")
    
    async def execute(self, action: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute an action
        
        Args:
            action: The action to execute
            parameters: Parameters for the action
            
        Returns:
            Result of the action
        """
        handler = getattr(self, f"_action_{action}", None)
        if not callable(handler):
            raise ValueError(f"Unknown action: {action}")
            
        return await handler(parameters)
    
    def get_actions(self) -> List[ActionSchema]:
        """Return available actions"""
        return [
            {
                'name': 'discover_agents',
                'description': 'Discover other agents with A2A support',
                'parameters': {
                    'capability': {
                        'type': 'string',
                        'description': 'Filter by capability name',
                        'required': False
                    },
                    'timeout': {
                        'type': 'number',
                        'description': 'Discovery timeout in seconds',
                        'required': False,
                        'default': 2.0
                    }
                }
            },
            {
                'name': 'send_ping',
                'description': 'Send a ping to another agent',
                'parameters': {
                    'target_agent_id': {
                        'type': 'string',
                        'description': 'ID of the target agent',
                        'required': True
                    },
                    'message': {
                        'type': 'string',
                        'description': 'Message to include in ping',
                        'required': False,
                        'default': 'Hello from A2A!'
                    },
                    'expect_response': {
                        'type': 'boolean',
                        'description': 'Wait for a response',
                        'required': False,
                        'default': True
                    },
                    'timeout': {
                        'type': 'number',
                        'description': 'Response timeout in seconds',
                        'required': False,
                        'default': 5.0
                    }
                }
            },
            {
                'name': 'broadcast_message',
                'description': 'Broadcast a message to all agents',
                'parameters': {
                    'message': {
                        'type': 'string',
                        'description': 'Message to broadcast',
                        'required': True
                    },
                    'capability_filter': {
                        'type': 'string',
                        'description': 'Only send to agents with this capability',
                        'required': False
                    }
                }
            }
        ]
    
    # Action implementations
    async def _action_discover_agents(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Discover other agents with A2A support"""
        if not hasattr(self, '_a2a_manager') or not self._a2a_manager:
            return {
                'status': 'error',
                'error': 'A2A protocol is not available'
            }
            
        capability = params.get('capability')
        timeout = float(params.get('timeout', 2.0))
        
        agents = await self._a2a_manager.discover_agents(
            capability=capability,
            timeout=timeout
        )
        
        return {
            'status': 'success',
            'agents': agents
        }
    
    async def _action_send_ping(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Send a ping to another agent"""
        if not hasattr(self, '_a2a_manager') or not self._a2a_manager:
            return {
                'status': 'error',
                'error': 'A2A protocol is not available'
            }
            
        target_agent_id = params['target_agent_id']
        message = params.get('message', 'Hello from A2A!')
        expect_response = params.get('expect_response', True)
        timeout = float(params.get('timeout', 5.0))
        
        try:
            response = await self.send_a2a_message(
                target_agent_id=target_agent_id,
                action='example_ping',
                parameters={
                    'message': message,
                    'timestamp': asyncio.get_event_loop().time()
                },
                expect_response=expect_response,
                timeout=timeout
            )
            
            return {
                'status': 'success',
                'response': response.to_dict() if response else None
            }
            
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e),
                'error_type': type(e).__name__
            }
    
    async def _action_broadcast_message(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Broadcast a message to all agents"""
        if not hasattr(self, '_a2a_manager') or not self._a2a_manager:
            return {
                'status': 'error',
                'error': 'A2A protocol is not available'
            }
            
        message = params['message']
        capability_filter = params.get('capability_filter')
        
        # Discover agents (filtered by capability if specified)
        agents = await self._a2a_manager.discover_agents(
            capability=capability_filter,
            timeout=2.0
        )
        
        # Send message to each agent
        results = {}
        for agent in agents:
            try:
                await self.send_a2a_message(
                    target_agent_id=agent['id'],
                    action='example_broadcast',
                    parameters={
                        'message': message,
                        'from_agent': self.agent_id,
                        'timestamp': asyncio.get_event_loop().time()
                    },
                    expect_response=False
                )
                results[agent['id']] = 'sent'
            except Exception as e:
                results[agent['id']] = f'error: {str(e)}'
        
        return {
            'status': 'success',
            'results': results
        }
    
    # A2A Message Handlers
    
    async def _handle_ping(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Handle incoming ping messages"""
        logger.info(f"Received ping: {params}")
        return {
            'status': 'pong',
            'agent_id': self.agent_id,
            'original_message': params.get('message', ''),
            'timestamp': asyncio.get_event_loop().time()
        }
    
    async def _handle_echo(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Handle incoming echo messages"""
        logger.info(f"Echo request: {params}")
        return {
            'status': 'echo',
            'agent_id': self.agent_id,
            'original_params': params,
            'timestamp': asyncio.get_event_loop().time()
        }
