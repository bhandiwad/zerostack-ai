"""
A2A Protocol Message Format

Defines the standard message format for agent-to-agent communication.
"""
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field, validator
from uuid import uuid4, UUID


class MessageType(str, Enum):
    """Types of A2A messages"""
    REQUEST = "request"
    RESPONSE = "response"
    EVENT = "event"
    ERROR = "error"


class MessageHeader(BaseModel):
    """Message header containing metadata"""
    message_id: str = Field(default_factory=lambda: str(uuid4()))
    message_type: MessageType
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    source_agent_id: str
    target_agent_id: Optional[str] = None  # None for broadcast
    correlation_id: Optional[str] = None  # For request/response correlation
    version: str = "1.0"
    ttl: int = 300  # Time to live in seconds


class MessagePayload(BaseModel):
    """Message payload with content and metadata"""
    action: str
    parameters: Dict[str, Any] = {}
    content: Optional[Union[Dict[str, Any], List[Any], str, bytes]] = None
    metadata: Dict[str, Any] = {}


class A2AMessage(BaseModel):
    """Complete A2A message"""
    header: MessageHeader
    payload: MessagePayload
    signature: Optional[str] = None  # For message authentication

    def to_dict(self) -> Dict[str, Any]:
        """Convert message to dictionary"""
        return self.dict()

    @classmethod
    def create(
        cls,
        message_type: MessageType,
        source_agent_id: str,
        target_agent_id: Optional[str],
        action: str,
        parameters: Optional[Dict[str, Any]] = None,
        content: Optional[Any] = None,
        correlation_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> 'A2AMessage':
        """Create a new A2A message"""
        return cls(
            header=MessageHeader(
                message_type=message_type,
                source_agent_id=source_agent_id,
                target_agent_id=target_agent_id,
                correlation_id=correlation_id,
            ),
            payload=MessagePayload(
                action=action,
                parameters=parameters or {},
                content=content,
                metadata=metadata or {},
            ),
        )

    def create_response(
        self,
        response_action: str,
        parameters: Optional[Dict[str, Any]] = None,
        content: Optional[Any] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> 'A2AMessage':
        """Create a response message to this message"""
        if self.header.message_type != MessageType.REQUEST:
            raise ValueError("Can only create response for request messages")
            
        return self.create(
            message_type=MessageType.RESPONSE,
            source_agent_id=self.header.target_agent_id or "",
            target_agent_id=self.header.source_agent_id,
            action=response_action,
            parameters=parameters or {},
            content=content,
            correlation_id=self.header.message_id,
            metadata=metadata or {},
        )

    def is_expired(self) -> bool:
        """Check if the message has expired based on TTL"""
        age = (datetime.utcnow() - self.header.timestamp).total_seconds()
        return age > self.header.ttl
