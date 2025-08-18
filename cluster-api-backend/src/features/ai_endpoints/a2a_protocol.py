import asyncio
import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List, Callable
from enum import Enum
from dataclasses import dataclass, field
import logging
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives.serialization import load_pem_private_key, load_pem_public_key
import base64
import os

logger = logging.getLogger(__name__)

class MessageType(Enum):
    REQUEST = "request"
    RESPONSE = "response"
    BROADCAST = "broadcast"
    ESCALATION = "escalation"
    NOTIFICATION = "notification"
    HEARTBEAT = "heartbeat"

class MessagePriority(Enum):
    LOW = 1
    NORMAL = 2
    HIGH = 3
    CRITICAL = 4

@dataclass
class A2AMessage:
    """Agent-to-Agent message structure"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    type: MessageType = MessageType.REQUEST
    priority: MessagePriority = MessagePriority.NORMAL
    sender_id: str = ""
    recipient_id: Optional[str] = None  # None for broadcast
    payload: Dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None
    correlation_id: Optional[str] = None
    encrypted: bool = False
    signature: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'type': self.type.value,
            'priority': self.priority.value,
            'sender_id': self.sender_id,
            'recipient_id': self.recipient_id,
            'payload': self.payload,
            'timestamp': self.timestamp.isoformat(),
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'correlation_id': self.correlation_id,
            'encrypted': self.encrypted,
            'signature': self.signature
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'A2AMessage':
        return cls(
            id=data['id'],
            type=MessageType(data['type']),
            priority=MessagePriority(data['priority']),
            sender_id=data['sender_id'],
            recipient_id=data.get('recipient_id'),
            payload=data['payload'],
            timestamp=datetime.fromisoformat(data['timestamp']),
            expires_at=datetime.fromisoformat(data['expires_at']) if data.get('expires_at') else None,
            correlation_id=data.get('correlation_id'),
            encrypted=data.get('encrypted', False),
            signature=data.get('signature')
        )

class A2AAgent:
    """Agent participant in A2A protocol"""
    
    def __init__(self, agent_id: str, agent_type: str = "generic"):
        self.agent_id = agent_id
        self.agent_type = agent_type
        self.public_key: Optional[rsa.RSAPublicKey] = None
        self.private_key: Optional[rsa.RSAPrivateKey] = None
        self.symmetric_key: Optional[bytes] = None
        self.is_authenticated = False
        self.last_heartbeat = datetime.utcnow()
        self.capabilities: List[str] = []
        self.status = "active"
        
        # Generate key pair
        self._generate_keys()
    
    def _generate_keys(self):
        """Generate RSA key pair for the agent"""
        self.private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048
        )
        self.public_key = self.private_key.public_key()
        
        # Generate symmetric key for faster encryption
        self.symmetric_key = Fernet.generate_key()
    
    def get_public_key_pem(self) -> str:
        """Get public key in PEM format"""
        if not self.public_key:
            return ""
        
        pem = self.public_key.public_key().public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )
        return pem.decode('utf-8')
    
    def encrypt_message(self, message: str, recipient_public_key: rsa.RSAPublicKey) -> str:
        """Encrypt message for recipient"""
        # Use hybrid encryption: RSA for symmetric key, AES for message
        fernet = Fernet(self.symmetric_key)
        encrypted_message = fernet.encrypt(message.encode())
        
        # Encrypt symmetric key with recipient's public key
        encrypted_key = recipient_public_key.encrypt(
            self.symmetric_key,
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None
            )
        )
        
        # Combine encrypted key and message
        combined = base64.b64encode(encrypted_key).decode() + ":" + base64.b64encode(encrypted_message).decode()
        return combined
    
    def decrypt_message(self, encrypted_data: str) -> str:
        """Decrypt message from sender"""
        try:
            parts = encrypted_data.split(":", 1)
            if len(parts) != 2:
                raise ValueError("Invalid encrypted message format")
            
            encrypted_key = base64.b64decode(parts[0])
            encrypted_message = base64.b64decode(parts[1])
            
            # Decrypt symmetric key
            symmetric_key = self.private_key.decrypt(
                encrypted_key,
                padding.OAEP(
                    mgf=padding.MGF1(algorithm=hashes.SHA256()),
                    algorithm=hashes.SHA256(),
                    label=None
                )
            )
            
            # Decrypt message
            fernet = Fernet(symmetric_key)
            message = fernet.decrypt(encrypted_message).decode()
            
            return message
        except Exception as e:
            logger.error(f"Failed to decrypt message: {str(e)}")
            raise
    
    def sign_message(self, message: str) -> str:
        """Sign message with private key"""
        signature = self.private_key.sign(
            message.encode(),
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.MAX_LENGTH
            ),
            hashes.SHA256()
        )
        return base64.b64encode(signature).decode()
    
    def verify_signature(self, message: str, signature: str, sender_public_key: rsa.RSAPublicKey) -> bool:
        """Verify message signature"""
        try:
            signature_bytes = base64.b64decode(signature)
            sender_public_key.verify(
                signature_bytes,
                message.encode(),
                padding.PSS(
                    mgf=padding.MGF1(hashes.SHA256()),
                    salt_length=padding.PSS.MAX_LENGTH
                ),
                hashes.SHA256()
            )
            return True
        except Exception:
            return False

class A2AMessageBus:
    """Message bus for Agent-to-Agent communication"""
    
    def __init__(self):
        self.agents: Dict[str, A2AAgent] = {}
        self.message_handlers: Dict[str, Dict[MessageType, Callable]] = {}
        self.message_queue: asyncio.Queue = asyncio.Queue()
        self.running = False
        self.stats = {
            'messages_sent': 0,
            'messages_received': 0,
            'messages_failed': 0,
            'agents_connected': 0
        }
    
    async def start(self):
        """Start the message bus"""
        self.running = True
        asyncio.create_task(self._process_messages())
        logger.info("A2A Message Bus started")
    
    async def stop(self):
        """Stop the message bus"""
        self.running = False
        logger.info("A2A Message Bus stopped")
    
    def register_agent(self, agent: A2AAgent) -> bool:
        """Register an agent with the message bus"""
        if agent.agent_id in self.agents:
            logger.warning(f"Agent {agent.agent_id} already registered")
            return False
        
        self.agents[agent.agent_id] = agent
        self.message_handlers[agent.agent_id] = {}
        self.stats['agents_connected'] += 1
        
        logger.info(f"Registered agent {agent.agent_id} ({agent.agent_type})")
        return True
    
    def unregister_agent(self, agent_id: str) -> bool:
        """Unregister an agent from the message bus"""
        if agent_id not in self.agents:
            return False
        
        del self.agents[agent_id]
        del self.message_handlers[agent_id]
        self.stats['agents_connected'] -= 1
        
        logger.info(f"Unregistered agent {agent_id}")
        return True
    
    def register_handler(self, agent_id: str, message_type: MessageType, handler: Callable):
        """Register a message handler for an agent"""
        if agent_id not in self.message_handlers:
            self.message_handlers[agent_id] = {}
        
        self.message_handlers[agent_id][message_type] = handler
        logger.debug(f"Registered {message_type.value} handler for agent {agent_id}")
    
    async def send_message(self, message: A2AMessage, encrypt: bool = True) -> bool:
        """Send a message through the bus"""
        try:
            # Validate sender
            if message.sender_id not in self.agents:
                logger.error(f"Unknown sender: {message.sender_id}")
                return False
            
            sender = self.agents[message.sender_id]
            
            # Set expiration if not set
            if not message.expires_at:
                message.expires_at = datetime.utcnow() + timedelta(minutes=30)
            
            # Encrypt message if requested and recipient specified
            if encrypt and message.recipient_id and message.recipient_id in self.agents:
                recipient = self.agents[message.recipient_id]
                payload_json = json.dumps(message.payload)
                encrypted_payload = sender.encrypt_message(payload_json, recipient.public_key)
                message.payload = {'encrypted_data': encrypted_payload}
                message.encrypted = True
            
            # Sign message
            message_json = json.dumps(message.payload)
            message.signature = sender.sign_message(message_json)
            
            # Queue message for processing
            await self.message_queue.put(message)
            self.stats['messages_sent'] += 1
            
            logger.debug(f"Queued message {message.id} from {message.sender_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send message: {str(e)}")
            self.stats['messages_failed'] += 1
            return False
    
    async def _process_messages(self):
        """Process messages from the queue"""
        while self.running:
            try:
                # Wait for message with timeout
                message = await asyncio.wait_for(self.message_queue.get(), timeout=1.0)
                await self._deliver_message(message)
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                logger.error(f"Error processing message: {str(e)}")
    
    async def _deliver_message(self, message: A2AMessage):
        """Deliver message to recipient(s)"""
        try:
            # Check if message has expired
            if message.expires_at and datetime.utcnow() > message.expires_at:
                logger.warning(f"Message {message.id} expired, dropping")
                return
            
            # Broadcast message
            if message.recipient_id is None:
                await self._broadcast_message(message)
                return
            
            # Deliver to specific recipient
            if message.recipient_id not in self.agents:
                logger.error(f"Unknown recipient: {message.recipient_id}")
                return
            
            recipient = self.agents[message.recipient_id]
            sender = self.agents[message.sender_id]
            
            # Verify signature
            if message.signature:
                payload_json = json.dumps(message.payload)
                if not recipient.verify_signature(payload_json, message.signature, sender.public_key):
                    logger.error(f"Invalid signature for message {message.id}")
                    return
            
            # Decrypt message if encrypted
            if message.encrypted and 'encrypted_data' in message.payload:
                try:
                    decrypted_data = recipient.decrypt_message(message.payload['encrypted_data'])
                    message.payload = json.loads(decrypted_data)
                    message.encrypted = False
                except Exception as e:
                    logger.error(f"Failed to decrypt message {message.id}: {str(e)}")
                    return
            
            # Call message handler
            if (message.recipient_id in self.message_handlers and 
                message.type in self.message_handlers[message.recipient_id]):
                
                handler = self.message_handlers[message.recipient_id][message.type]
                try:
                    await handler(message)
                    self.stats['messages_received'] += 1
                except Exception as e:
                    logger.error(f"Handler error for message {message.id}: {str(e)}")
            else:
                logger.warning(f"No handler for {message.type.value} message to {message.recipient_id}")
            
        except Exception as e:
            logger.error(f"Failed to deliver message {message.id}: {str(e)}")
            self.stats['messages_failed'] += 1
    
    async def _broadcast_message(self, message: A2AMessage):
        """Broadcast message to all agents except sender"""
        for agent_id, agent in self.agents.items():
            if agent_id == message.sender_id:
                continue
            
            # Create copy for each recipient
            recipient_message = A2AMessage(
                id=str(uuid.uuid4()),
                type=message.type,
                priority=message.priority,
                sender_id=message.sender_id,
                recipient_id=agent_id,
                payload=message.payload.copy(),
                timestamp=message.timestamp,
                expires_at=message.expires_at,
                correlation_id=message.correlation_id
            )
            
            await self.message_queue.put(recipient_message)
    
    def get_agent_status(self, agent_id: str) -> Optional[Dict[str, Any]]:
        """Get status of a specific agent"""
        if agent_id not in self.agents:
            return None
        
        agent = self.agents[agent_id]
        return {
            'agent_id': agent.agent_id,
            'agent_type': agent.agent_type,
            'status': agent.status,
            'is_authenticated': agent.is_authenticated,
            'last_heartbeat': agent.last_heartbeat.isoformat(),
            'capabilities': agent.capabilities
        }
    
    def get_all_agents_status(self) -> List[Dict[str, Any]]:
        """Get status of all agents"""
        return [self.get_agent_status(agent_id) for agent_id in self.agents.keys()]
    
    def get_stats(self) -> Dict[str, Any]:
        """Get message bus statistics"""
        return self.stats.copy()

# Global message bus instance
message_bus = A2AMessageBus()

def get_message_bus() -> A2AMessageBus:
    """Get the global message bus instance"""
    return message_bus

# Convenience functions
async def send_request(sender_id: str, recipient_id: str, payload: Dict[str, Any], 
                      priority: MessagePriority = MessagePriority.NORMAL) -> str:
    """Send a request message"""
    message = A2AMessage(
        type=MessageType.REQUEST,
        priority=priority,
        sender_id=sender_id,
        recipient_id=recipient_id,
        payload=payload
    )
    
    bus = get_message_bus()
    success = await bus.send_message(message)
    return message.id if success else None

async def send_response(sender_id: str, recipient_id: str, payload: Dict[str, Any], 
                       correlation_id: str) -> str:
    """Send a response message"""
    message = A2AMessage(
        type=MessageType.RESPONSE,
        sender_id=sender_id,
        recipient_id=recipient_id,
        payload=payload,
        correlation_id=correlation_id
    )
    
    bus = get_message_bus()
    success = await bus.send_message(message)
    return message.id if success else None

async def broadcast_notification(sender_id: str, payload: Dict[str, Any], 
                               priority: MessagePriority = MessagePriority.NORMAL) -> str:
    """Broadcast a notification to all agents"""
    message = A2AMessage(
        type=MessageType.NOTIFICATION,
        priority=priority,
        sender_id=sender_id,
        recipient_id=None,  # Broadcast
        payload=payload
    )
    
    bus = get_message_bus()
    success = await bus.send_message(message)
    return message.id if success else None
