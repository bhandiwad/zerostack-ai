from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List, TypedDict, Literal, Union, TYPE_CHECKING, Callable, Awaitable
import logging

if TYPE_CHECKING:
    from ..protocol.a2a.agent_manager import AgentManager
    from ..protocol.a2a.message import A2AMessage

logger = logging.getLogger(__name__)

# Type definitions for action schemas
class ParameterSchema(TypedDict, total=False):
    """Schema for action parameters"""
    type: str  # 'string', 'number', 'boolean', 'array', 'object'
    description: str
    required: bool
    default: Any
    enum: List[Any]
    items: Dict[str, Any]  # For array types
    properties: Dict[str, Any]  # For object types
    format: str  # e.g., 'date-time', 'email', etc.
    minimum: Union[int, float]
    maximum: Union[int, float]
    minLength: int
    maxLength: int
    pattern: str


class ActionSchema(TypedDict):
    """Schema for an action"""
    name: str
    description: str
    parameters: Dict[str, ParameterSchema]

class AgentCapability(ABC):
    """
    Base class for all agent capabilities.
    
    This class provides the foundation for agent capabilities, including:
    - Lifecycle management (initialization, cleanup)
    - A2A protocol integration
    - Action registration and execution
    - Secure message handling
    """
    
    def __init__(self, agent_id: str, config: Optional[Dict[str, Any]] = None):
        """
        Initialize the capability.
        
        Args:
            agent_id: Unique identifier for the agent
            config: Configuration dictionary for the capability
        """
        self.agent_id = agent_id
        self.config = config or {}
        self._initialized = False
        self._a2a_manager: Optional['AgentManager'] = None
        self._message_handlers: Dict[str, Callable[[Dict[str, Any]], Awaitable[Dict[str, Any]]]] = {}
    
    async def initialize(self, a2a_manager: Optional['AgentManager'] = None):
        """
        Initialize the capability.
        
        Args:
            a2a_manager: Optional A2A agent manager for secure communication
        """
        if not self._initialized:
            self._a2a_manager = a2a_manager
            await self._initialize()
            self._initialized = True
            
            # Register default message handlers if A2A is available
            if self._a2a_manager:
                await self._register_a2a_handlers()
    
    async def _register_a2a_handlers(self):
        """Register A2A message handlers"""
        # Default implementation does nothing
        # Subclasses should override this to register their handlers
        pass
    
    @abstractmethod
    async def _initialize(self):
        """Initialize any resources needed by this capability"""
        pass
    
    @abstractmethod
    async def execute(self, action: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute an action with the given parameters
        
        Args:
            action: The action to execute
            parameters: Parameters for the action
            
        Returns:
            Dict containing the result of the action
        """
        pass
    
    def get_actions(self) -> List[ActionSchema]:
        """
        Return a list of available actions and their schemas
        
        Should be overridden by subclasses to provide specific actions
        """
        return []
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Return a dictionary representation of this capability
        
        Returns:
            Dictionary containing capability metadata and actions
        """
        actions = []
        
        # Include both direct actions and A2A message handlers
        for action in self.get_actions():
            actions.append({
                'name': action['name'],
                'description': action['description'],
                'parameters': action['parameters'],
                'type': 'direct'  # Direct method call
            })
        
        # Include A2A message handlers
        for action, handler in self._message_handlers.items():
            if not any(a['name'] == action for a in actions):
                actions.append({
                    'name': action,
                    'description': f"A2A message handler for {action}",
                    'parameters': {},
                    'type': 'a2a'  # A2A message handler
                })
        
        return {
            'name': self.__class__.__name__,
            'description': self.__doc__ or "",
            'config': self.config,
            'actions': actions,
            'supports_a2a': self._a2a_manager is not None
        }
    
    # A2A Protocol Integration
    
    async def send_a2a_message(
        self,
        target_agent_id: str,
        action: str,
        parameters: Optional[Dict[str, Any]] = None,
        expect_response: bool = False,
        timeout: float = 5.0,
        require_secure: bool = True
    ) -> Any:
        """
        Send a message to another agent using A2A protocol
        
        Args:
            target_agent_id: ID of the target agent
            action: Action to perform
            parameters: Parameters for the action
            expect_response: Whether to wait for a response
            timeout: Timeout in seconds for response
            require_secure: Whether to require secure communication
            
        Returns:
            Response from the target agent if expect_response is True
            
        Raises:
            RuntimeError: If A2A is not available
        """
        if not self._a2a_manager:
            raise RuntimeError("A2A protocol is not available for this capability")
            
        return await self._a2a_manager.send_message(
            target_agent_id=target_agent_id,
            action=action,
            parameters=parameters or {},
            expect_response=expect_response,
            timeout=timeout,
            require_secure=require_secure
        )
    
    def register_a2a_handler(
        self, 
        action: str, 
        handler: Callable[[Dict[str, Any]], Awaitable[Dict[str, Any]]]
    ) -> None:
        """
        Register a handler for A2A messages
        
        Args:
            action: Action to handle
            handler: Async function that processes the message and returns a response
        """
        self._message_handlers[action] = handler
        
        # Register with A2A manager if available
        if self._a2a_manager:
            self._a2a_manager.add_message_handler(action, self._handle_a2a_message)
    
    async def _handle_a2a_message(self, message: 'A2AMessage') -> None:
        """
        Handle incoming A2A messages
        
        Args:
            message: Incoming A2A message
        """
        if not message.header.source_agent_id or message.header.source_agent_id == self.agent_id:
            return  # Ignore our own messages
            
        action = message.payload.action
        parameters = message.payload.parameters or {}
        
        # Find a handler for this action
        handler = self._message_handlers.get(action)
        if not handler:
            logger.warning(f"No handler registered for A2A action: {action}")
            return
        
        try:
            # Execute the handler
            result = await handler(parameters)
            
            # If this was a request, send a response
            if message.header.message_type == 'request' and self._a2a_manager:
                await self._a2a_manager.send_message(
                    target_agent_id=message.header.source_agent_id,
                    action=f"{action}_response",
                    parameters=result
                )
                
        except Exception as e:
            logger.error(f"Error handling A2A message: {str(e)}", exc_info=True)
            
            # Send error response if this was a request
            if message.header.message_type == 'request' and self._a2a_manager:
                await self._a2a_manager.send_message(
                    target_agent_id=message.header.source_agent_id,
                    action=f"{action}_error",
                    parameters={
                        'error': str(e),
                        'error_type': type(e).__name__
                    }
                )
