"""
Agent Manager for A2A Communication

Handles agent registration, discovery, and secure communication using the A2A protocol.
"""
import asyncio
import json
import logging
import os
import time
from typing import Any, Callable, Dict, List, Optional, Set, Tuple, Union
from uuid import uuid4

from .message import A2AMessage, MessageType, MessageHeader, MessagePayload
from .broker import MessageBroker, BrokerAuthError
from .brokers.nats_broker import NATSBroker
from .auth import Authenticator, AuthConfig, AgentClaims, AuthError

logger = logging.getLogger(__name__)

class AgentManager:
    """Manages agent registration, discovery, and communication."""
    
    def __init__(
        self, 
        broker: Optional[MessageBroker] = None,
        broker_servers: str = "nats://localhost:4222",
        auth_config: Optional[Union[AuthConfig, Dict[str, Any]]] = None,
        agent_id: Optional[str] = None,
        agent_secret: Optional[str] = None
    ):
        """Initialize the AgentManager.
        
        Args:
            broker: Optional pre-configured message broker
            broker_servers: Comma-separated list of broker server URLs
            auth_config: Authentication configuration or dict with config
            agent_id: Optional agent ID (will be generated if not provided)
            agent_secret: Optional secret for agent authentication
        """
        # Generate agent ID if not provided
        self.agent_id = agent_id or f"agent-{os.urandom(8).hex()}"
        self.agent_secret = agent_secret or os.urandom(32).hex()
        
        # Initialize authentication if config is provided
        self.authenticator: Optional[Authenticator] = None
        if auth_config:
            if isinstance(auth_config, dict):
                # Generate a secure secret if not provided
                if "secret_key" not in auth_config:
                    auth_config["secret_key"] = os.urandom(32).hex()
                auth_config = AuthConfig(**auth_config)
            self.authenticator = Authenticator(auth_config)
        
        # Initialize the broker
        if broker is None:
            broker_config = {}
            if self.authenticator:
                broker_config["auth_config"] = self.authenticator.config
                broker_config["agent_id"] = self.agent_id
            
            self.broker = NATSBroker(
                servers=broker_servers,
                **broker_config
            )
        else:
            self.broker = broker
        
        # Initialize agent state
        self.agents: Dict[str, Dict[str, Any]] = {}  # agent_id -> agent_info
        self.message_handlers: Dict[str, Callable[[A2AMessage], None]] = {}
        self.agent_capabilities: Dict[str, Set[str]] = {}  # agent_id -> set of capabilities
        self.connected = False
        self.agent_info: Dict[str, Any] = {}
        self._subscription_ids: List[str] = []
        self._auth_tokens: Dict[str, str] = {}  # agent_id -> auth_token
    
    async def connect(self, agent_info: Optional[Dict[str, Any]] = None) -> None:
        """Connect to the message broker and register the agent.
        
        Args:
            agent_info: Additional information about the agent
            
        Raises:
            BrokerConnectionError: If connection to the broker fails
            AuthError: If authentication with the broker fails
        """
        if self.connected:
            return
            
        self.agent_info = agent_info or {}
        
        try:
            # Connect to the message broker
            await self.broker.connect()
            
            # Authenticate with the broker if authenticator is configured
            if self.authenticator:
                try:
                    # Generate a token for this agent
                    token = await self.authenticator.create_token(
                        agent_id=self.agent_id,
                        capabilities=list(self.agent_capabilities.get(self.agent_id, set())),
                        audience="a2a_broker",
                        metadata={
                            "purpose": "agent_authentication",
                            "capabilities": list(self.agent_capabilities.get(self.agent_id, set()))
                        }
                    )
                    self._auth_tokens[self.agent_id] = token
                    
                except Exception as e:
                    raise AuthError(f"Failed to generate authentication token: {str(e)}") from e
            
            # Subscribe to agent discovery
            await self._subscribe_to_agent_discovery()
            
            # Register this agent
            await self._register_agent()
            
            self.connected = True
            logger.info(f"Agent {self.agent_id} connected to the A2A network")
            
        except Exception as e:
            logger.error(f"Failed to connect agent {self.agent_id}: {str(e)}")
            if self.connected:
                try:
                    await self.disconnect()
                except Exception as disconnect_error:
                    logger.error(f"Error during disconnect after connection failure: {str(disconnect_error)}")
            raise
    
    async def disconnect(self) -> None:
        """Disconnect from the message broker and unregister the agent."""
        if not self.connected or not self.agent_id:
            return
            
        try:
            # Unsubscribe from all subscriptions
            for sub_id in self._subscription_ids:
                await self.broker.unsubscribe(sub_id)
            self._subscription_ids = []
            
            # Unregister this agent
            await self._unregister_agent()
            
            # Disconnect from the broker
            await self.broker.disconnect()
            
            self.connected = False
            logger.info(f"Agent {self.agent_id} disconnected from the A2A network")
            
        except Exception as e:
            logger.error(f"Error disconnecting agent {self.agent_id}: {str(e)}")
            raise
    
    async def register_capability(self, capability: str, description: str = "") -> None:
        """Register a capability that this agent provides.
        
        Args:
            capability: Name of the capability
            description: Optional description of the capability
        """
        if not self.connected or not self.agent_id:
            raise RuntimeError("Agent is not connected")
            
        if self.agent_id not in self.agent_capabilities:
            self.agent_capabilities[self.agent_id] = set()
            
        self.agent_capabilities[self.agent_id].add(capability)
        
        # Update agent info with capabilities
        self.agent_info["capabilities"] = list(self.agent_capabilities[self.agent_id])
        
        # Notify other agents of the updated capabilities
        await self._publish_agent_update()
    
    async def discover_agents(
        self, 
        capability: Optional[str] = None, 
        timeout: float = 2.0
    ) -> List[Dict[str, Any]]:
        """Discover other agents, optionally filtering by capability.
        
        Args:
            capability: Optional capability to filter agents by
            timeout: Time in seconds to wait for responses
            
        Returns:
            List of agent information dictionaries
        """
        if not self.connected:
            raise RuntimeError("Agent is not connected")
            
        # Create a future to collect responses
        responses: List[Dict[str, Any]] = []
        
        # Send a discovery request
        message = A2AMessage.create(
            message_type=MessageType.REQUEST,
            source_agent_id=self.agent_id or "",
            target_agent_id=None,  # Broadcast to all
            action="discover_agents",
            parameters={"capability": capability} if capability else {}
        )
        
        # Send the request and collect responses
        try:
            response = await self.broker.request(
                message=message,
                subject=f"a2a.discovery.agents",
                timeout=timeout
            )
            
            if response.payload.action == "discover_agents_response":
                agents = response.payload.parameters.get("agents", [])
                responses.extend(agents)
                
        except Exception as e:
            logger.warning(f"Error during agent discovery: {str(e)}")
        
        return responses
    
    async def send_message(
        self, 
        target_agent_id: str, 
        action: str, 
        parameters: Optional[Dict[str, Any]] = None,
        content: Optional[Any] = None,
        expect_response: bool = False,
        timeout: float = 5.0,
        require_secure: bool = True
    ) -> Optional[A2AMessage]:
        """Send a message to another agent.
        
        Args:
            target_agent_id: ID of the target agent
            action: Action to perform
            parameters: Optional parameters for the action
            content: Optional message content
            expect_response: Whether to wait for a response
            timeout: Time in seconds to wait for a response
            require_secure: Whether to require secure (authenticated) communication
            
        Returns:
            The response message if expect_response is True, None otherwise
            
        Raises:
            RuntimeError: If agent is not connected
            AuthError: If secure communication is required but not available
            BrokerPublishError: If message publishing fails
        """
        if not self.connected or not self.agent_id:
            raise RuntimeError("Agent is not connected")
            
        # Prepare message metadata
        metadata = {}
        
        # Add authentication if available and required
        if require_secure and self.authenticator and self.agent_id in self._auth_tokens:
            metadata["auth_token"] = self._auth_tokens[self.agent_id]
        elif require_secure and self.authenticator:
            raise AuthError("Secure communication is required but no auth token is available")
        
        # Create the message
        message = A2AMessage.create(
            message_type=MessageType.REQUEST if expect_response else MessageType.EVENT,
            source_agent_id=self.agent_id,
            target_agent_id=target_agent_id,
            action=action,
            parameters=parameters or {},
            content=content,
            metadata=metadata
        )
        
        try:
            if expect_response:
                response = await self.broker.request(
                    message=message,
                    subject=f"a2a.agent.{target_agent_id}",
                    timeout=timeout
                )
                
                # Verify the response if it's authenticated
                if self.authenticator and response.header.metadata and "auth_token" in response.header.metadata:
                    try:
                        claims = await self.authenticator.verify_message(response)
                        logger.debug(f"Verified response from {claims.iss} with capabilities: {claims.capabilities}")
                    except AuthError as e:
                        logger.warning(f"Failed to verify response signature: {str(e)}")
                        if require_secure:
                            raise
                
                return response
                
            else:
                await self.broker.publish(
                    message=message,
                    subject=f"a2a.agent.{target_agent_id}"
                )
                return None
                
        except BrokerAuthError as e:
            logger.error(f"Authentication error while sending message: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Failed to send message: {str(e)}")
            raise BrokerPublishError(f"Failed to send message: {str(e)}") from e
    
    def add_message_handler(
        self, 
        action: str, 
        handler: Callable[[A2AMessage], None]
    ) -> None:
        """Register a handler for a specific message action.
        
        Args:
            action: The action to handle
            handler: Function to call when a message with this action is received
        """
        self.message_handlers[action] = handler
    
    async def _subscribe_to_agent_discovery(self) -> None:
        """Subscribe to agent discovery messages."""
        if not self.agent_id:
            raise RuntimeError("Agent ID not set")
            
        # Subscribe to discovery requests
        sub_id = await self.broker.subscribe(
            subject=f"a2a.discovery.agents",
            callback=self._handle_discovery_request,
            queue_group="agent_discovery"
        )
        self._subscription_ids.append(sub_id)
        
        # Subscribe to agent updates
        sub_id = await self.broker.subscribe(
            subject=f"a2a.agent_updates",
            callback=self._handle_agent_update
        )
        self._subscription_ids.append(sub_id)
        
        # Subscribe to direct messages for this agent
        sub_id = await self.broker.subscribe(
            subject=f"a2a.agent.{self.agent_id}",
            callback=self._handle_message
        )
        self._subscription_ids.append(sub_id)
    
    async def _handle_discovery_request(self, message: A2AMessage) -> None:
        """Handle agent discovery requests."""
        if not self.agent_id or message.header.source_agent_id == self.agent_id:
            return
            
        # Check if we have the requested capability
        requested_capability = message.payload.parameters.get("capability")
        if requested_capability and requested_capability not in self.agent_capabilities.get(self.agent_id, set()):
            return
            
        # Respond with our agent info
        response = message.create_response(
            response_action="discover_agents_response",
            parameters={
                "agents": [
                    {
                        "agent_id": self.agent_id,
                        "capabilities": list(self.agent_capabilities.get(self.agent_id, set())),
                        **self.agent_info
                    }
                ]
            }
        )
        
        await self.broker.publish(
            message=response,
            subject=f"a2a.agent.{message.header.source_agent_id}"
        )
    
    async def _handle_agent_update(self, message: A2AMessage) -> None:
        """Handle agent update messages."""
        agent_id = message.payload.parameters.get("agent_id")
        if not agent_id or agent_id == self.agent_id:
            return
            
        # Update our local registry
        if message.payload.action == "agent_register":
            self.agents[agent_id] = message.payload.parameters
            logger.info(f"Agent registered: {agent_id}")
        elif message.payload.action == "agent_unregister":
            self.agents.pop(agent_id, None)
            logger.info(f"Agent unregistered: {agent_id}")
        elif message.payload.action == "agent_update":
            self.agents[agent_id] = message.payload.parameters
    
    async def _handle_message(self, message: A2AMessage) -> None:
        """Handle incoming messages.
        
        Args:
            message: The incoming message
            
        This method verifies the message signature if authentication is enabled,
        then dispatches it to the appropriate handler.
        """
        if not self.agent_id or not message.header.source_agent_id:
            logger.warning("Received message with missing source or agent ID")
            return
            
        # Skip our own messages
        if message.header.source_agent_id == self.agent_id:
            return
            
        # Verify message authentication if required and authenticator is available
        if self.authenticator and message.header.metadata and "auth_token" in message.header.metadata:
            try:
                # Verify the token and extract claims
                token = message.header.metadata["auth_token"]
                claims = await self.authenticator.validate_token(
                    token,
                    audience=self.agent_id
                )
                
                # Store claims in message metadata for handlers
                if not message.header.metadata:
                    message.header.metadata = {}
                message.header.metadata["auth_claims"] = claims.dict()
                
                logger.debug(f"Verified message from {claims.iss} with capabilities: {claims.capabilities}")
                
            except Exception as e:
                logger.warning(f"Message authentication failed: {str(e)}")
                # We still process the message but mark it as unverified
                if not message.header.metadata:
                    message.header.metadata = {}
                message.header.metadata["auth_error"] = str(e)
        
        # Call the appropriate handler if one is registered
        action = message.payload.action
        if action in self.message_handlers:
            try:
                await self.message_handlers[action](message)
            except Exception as e:
                logger.error(f"Error in message handler for action {action}: {str(e)}", exc_info=True)
    
    async def _register_agent(self) -> None:
        """Register this agent with the network."""
        if not self.agent_id:
            raise RuntimeError("Agent ID not set")
            
        # Add capabilities to agent info
        self.agent_info["capabilities"] = list(self.agent_capabilities.get(self.agent_id, set()))
        
        # Publish agent registration
        message = A2AMessage.create(
            message_type=MessageType.EVENT,
            source_agent_id=self.agent_id,
            target_agent_id=None,  # Broadcast to all
            action="agent_register",
            parameters={
                "agent_id": self.agent_id,
                **self.agent_info
            }
        )
        
        await self.broker.publish(
            message=message,
            subject="a2a.agent_updates"
        )
    
    async def _unregister_agent(self) -> None:
        """Unregister this agent from the network."""
        if not self.agent_id:
            return
            
        # Publish agent unregistration
        message = A2AMessage.create(
            message_type=MessageType.EVENT,
            source_agent_id=self.agent_id,
            target_agent_id=None,  # Broadcast to all
            action="agent_unregister",
            parameters={"agent_id": self.agent_id}
        )
        
        try:
            await self.broker.publish(
                message=message,
                subject="a2a.agent_updates"
            )
        except Exception as e:
            logger.warning(f"Error unregistering agent: {str(e)}")
    
    async def _publish_agent_update(self) -> None:
        """Publish an agent update to the network."""
        if not self.agent_id:
            return
            
        # Publish agent update
        message = A2AMessage.create(
            message_type=MessageType.EVENT,
            source_agent_id=self.agent_id,
            target_agent_id=None,  # Broadcast to all
            action="agent_update",
            parameters={
                "agent_id": self.agent_id,
                **self.agent_info
            }
        )
        
        await self.broker.publish(
            message=message,
            subject="a2a.agent_updates"
        )
