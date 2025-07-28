from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List, TypedDict, Literal, Union
import logging

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
    """Base class for all agent capabilities"""
    
    def __init__(self, agent_id: str, config: Optional[Dict[str, Any]] = None):
        self.agent_id = agent_id
        self.config = config or {}
        self._initialized = False
    
    async def initialize(self):
        """Initialize the capability"""
        if not self._initialized:
            await self._initialize()
            self._initialized = True
    
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
        """Return a dictionary representation of this capability"""
        return {
            'name': self.__class__.__name__,
            'description': self.__doc__ or "",
            'config': self.config,
            'actions': [
                {
                    'name': action['name'],
                    'description': action['description'],
                    'parameters': action['parameters']
                }
                for action in self.get_actions()
            ]
        }
