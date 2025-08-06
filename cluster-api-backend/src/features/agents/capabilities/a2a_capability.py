"""
A2A Protocol Capability

Provides secure agent-to-agent communication capabilities using the A2A protocol.
"""
import asyncio
import logging
from typing import Dict, Any, List, Optional, Union, Callable, Awaitable

from .base import AgentCapability, ActionSchema, ParameterSchema
from ..protocol.a2a.agent_manager import AgentManager
from ..protocol.a2a.message import A2AMessage, MessageType
from ..protocol.a2a.auth import AuthConfig, Authenticator

logger = logging.getLogger(__name__)

class A2ACapability(AgentCapability):
    """
    Capability for secure agent-to-agent communication using the A2A protocol.
    
    This capability enables agents to:
    - Discover other agents on the network
    - Send secure messages to other agents
    - Register and manage their own capabilities
    - Handle incoming A2A messages
    """
    
    def __init__(self, agent_id: str, config: Optional[Dict[str, Any]] = None):
        super().__init__(agent_id, config or {})
        self.agent_manager: Optional[AgentManager] = None
        self.authenticator: Optional[Authenticator] = None
        self.message_handlers: Dict[str, Callable[[Dict[str, Any]], Awaitable[Dict[str, Any]]]] = {}
        self.connected = False
    
    async def _initialize(self):
        """Initialize the A2A capability"""
        # Initialize authentication
        auth_config = self.config.get('auth', {
            'secret_key': self.agent_id + '_secret_key',  # In production, use a secure key
            'token_expire_minutes': 60,
            'algorithm': 'HS256'
        })
        
        if isinstance(auth_config, dict):
            self.authenticator = Authenticator(AuthConfig(**auth_config))
        
        # Initialize agent manager
        broker_servers = self.config.get('broker_servers', 'nats://localhost:4222')
        self.agent_manager = AgentManager(
            broker_servers=broker_servers,
            auth_config=auth_config,
            agent_id=self.agent_id
        )
        
        # Register default message handlers
        self.register_message_handler('ping', self._handle_ping)
        self.register_message_handler('discover', self._handle_discover)
        
        # Connect to the A2A network
        await self.agent_manager.connect(agent_info={
            'capabilities': [cap['name'] for cap in self.get_actions()]
        })
        self.connected = True
        
        logger.info(f"A2A capability initialized for agent {self.agent_id}")
    
    async def execute(self, action: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute an A2A action
        
        Args:
            action: The action to execute
            parameters: Parameters for the action
            
        Returns:
            Result of the action
        """
        if not self.connected or not self.agent_manager:
            raise RuntimeError("A2A capability not initialized")
        
        handler = getattr(self, f"_action_{action}", None)
        if not callable(handler):
            raise ValueError(f"Unknown action: {action}")
        
        return await handler(parameters)
    
    def get_actions(self) -> List[ActionSchema]:
        """Return available A2A actions"""
        return [
            {
                'name': 'discover_agents',
                'description': 'Discover other agents on the network',
                'parameters': {
                    'capability': {
                        'type': 'string',
                        'description': 'Filter agents by capability',
                        'required': False
                    },
                    'timeout': {
                        'type': 'number',
                        'description': 'Timeout in seconds',
                        'required': False,
                        'default': 2.0
                    }
                }
            },
            {
                'name': 'send_message',
                'description': 'Send a message to another agent',
                'parameters': {
                    'target_agent_id': {
                        'type': 'string',
                        'description': 'ID of the target agent',
                        'required': True
                    },
                    'action': {
                        'type': 'string',
                        'description': 'Action to perform',
                        'required': True
                    },
                    'parameters': {
                        'type': 'object',
                        'description': 'Parameters for the action',
                        'required': False,
                        'default': {}
                    },
                    'expect_response': {
                        'type': 'boolean',
                        'description': 'Whether to wait for a response',
                        'required': False,
                        'default': False
                    },
                    'timeout': {
                        'type': 'number',
                        'description': 'Timeout in seconds (for responses)',
                        'required': False,
                        'default': 5.0
                    },
                    'require_secure': {
                        'type': 'boolean',
                        'description': 'Require secure communication',
                        'required': False,
                        'default': True
                    }
                }
            },
            {
                'name': 'register_message_handler',
                'description': 'Register a handler for incoming messages',
                'parameters': {
                    'action': {
                        'type': 'string',
                        'description': 'Action to handle',
                        'required': True
                    },
                    'handler_name': {
                        'type': 'string',
                        'description': 'Name of the handler function',
                        'required': True
                    }
                }
            }
        ]
    
    # Action implementations
    async def _action_discover_agents(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Discover other agents on the network"""
        if not self.agent_manager:
            raise RuntimeError("Agent manager not initialized")
            
        capability = params.get('capability')
        timeout = float(params.get('timeout', 2.0))
        
        agents = await self.agent_manager.discover_agents(
            capability=capability,
            timeout=timeout
        )
        
        return {
            'status': 'success',
            'agents': agents
        }
    
    async def _action_send_message(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Send a message to another agent"""
        if not self.agent_manager:
            raise RuntimeError("Agent manager not initialized")
            
        target_agent_id = params['target_agent_id']
        action = params['action']
        message_params = params.get('parameters', {})
        expect_response = params.get('expect_response', False)
        timeout = float(params.get('timeout', 5.0))
        require_secure = params.get('require_secure', True)
        
        if expect_response:
            response = await self.agent_manager.send_message(
                target_agent_id=target_agent_id,
                action=action,
                parameters=message_params,
                expect_response=True,
                timeout=timeout,
                require_secure=require_secure
            )
            
            return {
                'status': 'success',
                'response': response.to_dict() if response else None
            }
        else:
            await self.agent_manager.send_message(
                target_agent_id=target_agent_id,
                action=action,
                parameters=message_params,
                expect_response=False,
                require_secure=require_secure
            )
            
            return {
                'status': 'success',
                'message': 'Message sent successfully'
            }
    
    async def _action_register_message_handler(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Register a handler for incoming messages"""
        action = params['action']
        handler_name = params['handler_name']
        
        # Get the handler function from the agent
        handler = getattr(self, f"_handle_{handler_name}", None)
        if not callable(handler):
            return {
                'status': 'error',
                'error': f'Handler function _handle_{handler_name} not found'
            }
        
        self.register_message_handler(action, handler)
        
        return {
            'status': 'success',
            'message': f'Handler registered for action: {action}'
        }
    
    # Message handler management
    def register_message_handler(self, action: str, handler: Callable[[Dict[str, Any]], Awaitable[Dict[str, Any]]]):
        """Register a handler for incoming messages"""
        self.message_handlers[action] = handler
        
        # Register with agent manager if connected
        if self.agent_manager and self.connected:
            self.agent_manager.add_message_handler(action, self._handle_incoming_message)
    
    async def _handle_incoming_message(self, message: A2AMessage) -> None:
        """Handle incoming A2A messages"""
        if not message.header.source_agent_id or message.header.source_agent_id == self.agent_id:
            return  # Ignore our own messages
        
        action = message.payload.action
        parameters = message.payload.parameters or {}
        
        # Find a handler for this action
        handler = self.message_handlers.get(action)
        if not handler:
            logger.warning(f"No handler registered for action: {action}")
            return
        
        try:
            # Execute the handler
            result = await handler(parameters)
            
            # If this was a request, send a response
            if message.header.message_type == MessageType.REQUEST:
                response = message.create_response(
                    response_action=f"{action}_response",
                    parameters=result
                )
                
                if self.agent_manager:
                    await self.agent_manager.send_message(
                        target_agent_id=message.header.source_agent_id,
                        action=f"{action}_response",
                        parameters=result
                    )
                    
        except Exception as e:
            logger.error(f"Error handling message: {str(e)}", exc_info=True)
            
            # Send error response if this was a request
            if message.header.message_type == MessageType.REQUEST and self.agent_manager:
                error_response = message.create_error_response(
                    error_code="handler_error",
                    error_message=str(e)
                )
                
                await self.agent_manager.send_message(
                    target_agent_id=message.header.source_agent_id,
                    action=f"{action}_error",
                    parameters={
                        'error': str(e),
                        'error_type': type(e).__name__
                    }
                )
    
    # Default message handlers
    async def _handle_ping(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Handle ping requests"""
        return {
            'status': 'success',
            'message': 'pong',
            'agent_id': self.agent_id,
            'timestamp': asyncio.get_event_loop().time()
        }
    
    async def _handle_discover(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Handle discovery requests"""
        return {
            'status': 'success',
            'agent_id': self.agent_id,
            'capabilities': [cap['name'] for cap in self.get_actions()],
            'timestamp': asyncio.get_event_loop().time()
        }
