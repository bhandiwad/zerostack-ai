"""
NATS-based message broker implementation for A2A communication.
"""
import asyncio
import json
import logging
from typing import Any, Callable, Dict, Optional, cast, Union
import nats
from nats.aio.client import Client as NatsClient
from nats.aio.subscription import Subscription
from nats.js.client import JetStreamContext
from pydantic import ValidationError

from ..a2a.message import A2AMessage, MessageType
from ..a2a.broker import (
    MessageBroker, 
    BrokerConnectionError, 
    BrokerPublishError,
    BrokerSubscriptionError,
    BrokerAuthError
)
from ..auth import Authenticator, AuthConfig, AgentClaims, AuthError

logger = logging.getLogger(__name__)

class NATSBroker(MessageBroker):
    """NATS-based message broker implementation with authentication"""
    
    def __init__(
        self, 
        servers: str = "nats://localhost:4222",
        auth_config: Optional[Union[AuthConfig, dict]] = None,
        agent_id: Optional[str] = None
    ):
        """Initialize the NATS broker.
        
        Args:
            servers: Comma-separated list of NATS server URLs
            auth_config: Authentication configuration or dict with config
            agent_id: ID of the agent using this broker (required for authentication)
        """
        self.servers = servers
        self.agent_id = agent_id
        self.nc: Optional[NatsClient] = None
        self.js: Optional[JetStreamContext] = None
        self._subscriptions: Dict[str, Subscription] = {}
        self._message_handlers: Dict[str, Callable[[A2AMessage], None]] = {}
        
        # Initialize authenticator if auth config is provided
        self.authenticator: Optional[Authenticator] = None
        if auth_config:
            if isinstance(auth_config, dict):
                auth_config = AuthConfig(**auth_config)
            self.authenticator = Authenticator(auth_config)
            if not agent_id:
                logger.warning(
                    "Authentication is enabled but agent_id is not set. "
                    "Message signing will not be available."
                )
    
    async def connect(self) -> None:
        """Connect to the NATS server."""
        try:
            # Configure connection options
            connect_options = {
                "servers": self.servers.split(','),
                "connect_timeout": 5,
                "max_reconnect_attempts": 5,
                "reconnect_time_wait": 1,
                "error_cb": self._error_cb,
                "disconnected_cb": self._disconnected_cb,
                "reconnected_cb": self._reconnected_cb,
            }
            
            # Add authentication if configured
            if self.authenticator and self.agent_id:
                # Generate a token for NATS authentication
                token = await self.authenticator.create_token(
                    agent_id=self.agent_id,
                    audience="nats_server",
                    metadata={"purpose": "nats_connection"}
                )
                connect_options["token"] = token
            
            # Connect to NATS
            self.nc = await nats.connect(**connect_options)
            self.js = self.nc.jetstream()
            
            # Create a stream for A2A messages if it doesn't exist
            try:
                await self.js.add_stream(
                    name="A2A_MESSAGES",
                    subjects=["a2a.>"],
                    retention="workqueue",
                    max_msgs_per_subject=1,
                )
            except Exception as e:
                if "already in use" not in str(e):
                    raise
                    
        except Exception as e:
            raise BrokerConnectionError(f"Failed to connect to NATS: {str(e)}")
    
    async def disconnect(self) -> None:
        """Disconnect from the NATS server."""
        if self.nc:
            await self.nc.drain()
            await self.nc.close()
            self.nc = None
            self.js = None
    
    async def publish(self, message: A2AMessage, subject: Optional[str] = None) -> Optional[A2AMessage]:
        """Publish a message to the broker.
        
        Args:
            message: The A2A message to publish
            subject: Optional subject to publish to (defaults to a2a.{message_type}.{target_agent_id})
            
        Returns:
            Response message if this is a request/response, None otherwise
            
        Raises:
            BrokerAuthError: If message authentication fails
            BrokerPublishError: If message publishing fails
        """
        if not self.nc or not self.js:
            raise BrokerConnectionError("Not connected to NATS server")
        
        try:
            # Sign the message if authenticator is available
            if self.authenticator and self.agent_id:
                try:
                    message = await self.authenticator.sign_message(message, self.agent_id)
                except Exception as e:
                    raise BrokerAuthError(f"Failed to sign message: {str(e)}") from e
            
            # Determine the subject
            if not subject:
                message_type = message.header.message_type.value
                target = message.header.target_agent_id or "broadcast"
                subject = f"a2a.{message_type}.{target}"
            
            # Prepare headers
            headers = {
                "message_id": message.header.message_id,
                "correlation_id": message.header.correlation_id or "",
                "source_agent_id": message.header.source_agent_id or "",
                "target_agent_id": message.header.target_agent_id or "",
            }
            
            # Add metadata as headers if present
            if message.header.metadata:
                for k, v in message.header.metadata.items():
                    if isinstance(v, (str, int, float, bool)):
                        headers[f"a2a_metadata_{k}"] = str(v)
            
            # Publish the message
            data = message.json().encode()
            
            # For request/response pattern
            if message.header.message_type == MessageType.REQUEST:
                try:
                    reply = await self.nc.request(
                        subject=subject,
                        payload=data,
                        timeout=message.header.ttl,
                        headers=headers
                    )
                    response = A2AMessage.parse_raw(reply.data)
                    
                    # Verify the response if authenticator is available
                    if self.authenticator:
                        try:
                            await self.authenticator.verify_message(response)
                        except Exception as e:
                            raise BrokerAuthError(f"Invalid response signature: {str(e)}") from e
                    
                    return response
                    
                except nats.errors.TimeoutError as e:
                    raise BrokerPublishError("Request timed out") from e
                    
            else:
                # Publish the message
                await self.js.publish(
                    subject=subject,
                    payload=data,
                    headers=headers
                )
                return None
                
        except Exception as e:
            raise BrokerPublishError(f"Failed to publish message: {str(e)}")
    
    async def subscribe(
        self, 
        subject: str, 
        callback: Callable[[A2AMessage], None],
        queue_group: Optional[str] = None
    ) -> str:
        """Subscribe to messages on a subject.
        
        Args:
            subject: The subject to subscribe to
            callback: Function to call when a message is received
            queue_group: Optional queue group for load balancing
            
        Returns:
            Subscription ID that can be used to unsubscribe
        """
        if not self.nc or not self.js:
            raise BrokerConnectionError("Not connected to NATS server")
        
        try:
            # Store the callback
            sub_id = f"sub_{len(self._subscriptions) + 1}"
            self._message_handlers[sub_id] = callback
            
            # Create the subscription
            if queue_group:
                sub = await self.nc.subscribe(
                    subject=subject,
                    queue=queue_group,
                    cb=lambda msg: self._message_callback(sub_id, msg),
                )
            else:
                sub = await self.nc.subscribe(
                    subject=subject,
                    cb=lambda msg: self._message_callback(sub_id, msg),
                )
            
            self._subscriptions[sub_id] = sub
            return sub_id
            
        except Exception as e:
            raise BrokerSubscriptionError(f"Failed to subscribe to {subject}: {str(e)}")
    
    async def unsubscribe(self, subscription_id: str) -> None:
        """Unsubscribe from a subscription.
        
        Args:
            subscription_id: The subscription ID to unsubscribe from
        """
        if subscription_id in self._subscriptions:
            await self._subscriptions[subscription_id].unsubscribe()
            del self._subscriptions[subscription_id]
            del self._message_handlers[subscription_id]
    
    async def request(
        self, 
        message: A2AMessage, 
        subject: str, 
        timeout: float = 5.0
    ) -> A2AMessage:
        """Send a request and wait for a response.
        
        Args:
            message: The request message
            subject: The subject to send the request to
            timeout: Timeout in seconds to wait for a response
            
        Returns:
            The response message
        """
        if not self.nc:
            raise BrokerConnectionError("Not connected to NATS server")
        
        try:
            response = await self.nc.request(
                subject=subject,
                payload=message.json().encode(),
                timeout=timeout,
            )
            return A2AMessage.parse_raw(response.data)
        except Exception as e:
            raise BrokerPublishError(f"Request failed: {str(e)}")
    
    async def _message_callback(self, sub_id: str, msg) -> None:
        """Handle incoming messages.
        
        Args:
            sub_id: Subscription ID
            msg: Raw NATS message
        """
        try:
            # Parse the message
            data = json.loads(msg.data.decode())
            message = A2AMessage.parse_obj(data)
            
            # Verify the message if authenticator is available
            if self.authenticator:
                try:
                    claims = await self.authenticator.verify_message(message)
                    # Add claims to message metadata for handlers
                    if not message.header.metadata:
                        message.header.metadata = {}
                    message.header.metadata["auth_claims"] = claims.dict()
                except AuthError as e:
                    logger.warning(f"Message verification failed: {str(e)}")
                    # Still deliver the message but mark it as unverified
                    if not message.header.metadata:
                        message.header.metadata = {}
                    message.header.metadata["auth_error"] = str(e)
            
            # Call the registered handler
            if sub_id in self._message_handlers:
                try:
                    await self._message_handlers[sub_id](message)
                except Exception as e:
                    logger.error(f"Error in message handler: {str(e)}", exc_info=True)
                
        except Exception as e:
            print(f"Error processing message: {str(e)}")
    
    async def _error_cb(self, e):
        """Handle NATS error events."""
        print(f"NATS error: {str(e)}")
    
    async def _disconnected_cb(self):
        """Handle NATS disconnection events."""
        print("NATS disconnected")
    
    async def _reconnected_cb(self):
        """Handle NATS reconnection events."""
        print("NATS reconnected")
