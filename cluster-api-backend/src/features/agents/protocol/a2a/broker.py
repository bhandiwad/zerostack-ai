"""
Message Broker Interface for A2A Communication

Defines the interface for different message broker implementations.
"""
from abc import ABC, abstractmethod
from typing import Any, Callable, Optional, Dict, List
from ..a2a.message import A2AMessage


class MessageBroker(ABC):
    """Abstract base class for message brokers"""
    
    @abstractmethod
    async def connect(self) -> None:
        """Connect to the message broker"""
        pass
    
    @abstractmethod
    async def disconnect(self) -> None:
        """Disconnect from the message broker"""
        pass
    
    @abstractmethod
    async def publish(self, message: A2AMessage, subject: Optional[str] = None) -> None:
        """Publish a message to the broker"""
        pass
    
    @abstractmethod
    async def subscribe(
        self, 
        subject: str, 
        callback: Callable[[A2AMessage], None],
        queue_group: Optional[str] = None
    ) -> str:
        """Subscribe to messages on a subject"""
        pass
    
    @abstractmethod
    async def unsubscribe(self, subscription_id: str) -> None:
        """Unsubscribe from a subscription"""
        pass
    
    @abstractmethod
    async def request(
        self, 
        message: A2AMessage, 
        subject: str, 
        timeout: float = 5.0
    ) -> A2AMessage:
        """Send a request and wait for a response"""
        pass
    
    @abstractmethod
    async def authenticate(self, credentials: Dict[str, str]) -> None:
        """Authenticate with the broker"""
        pass
    
    @abstractmethod
    async def authorize(self, permissions: List[str]) -> None:
        """Authorize with the broker"""
        pass


class BrokerError(Exception):
    """Base class for broker errors."""
    pass


class BrokerConnectionError(BrokerError):
    """Raised when there is an error connecting to the broker."""
    pass


class BrokerPublishError(BrokerError):
    """Raised when there is an error publishing a message."""
    pass


class BrokerSubscriptionError(BrokerError):
    """Raised when there is an error subscribing to a topic."""
    pass


class BrokerAuthError(BrokerError):
    """Raised when there is an authentication or authorization error."""
    pass
