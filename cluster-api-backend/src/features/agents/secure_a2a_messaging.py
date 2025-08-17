"""
Secure Agent-to-Agent (A2A) Messaging System
Provides encrypted, authenticated communication between AI agents
"""
import asyncio
import json
import logging
import time
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Callable
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.serialization import load_pem_private_key, load_pem_public_key
from cryptography.fernet import Fernet
import base64
import os
from enum import Enum
from dataclasses import dataclass, asdict
from .enhanced_models import A2AMessage, MessageType, AgentConfig

logger = logging.getLogger(__name__)

class MessagePriority(Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    CRITICAL = "critical"

class MessageStatus(Enum):
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    ACKNOWLEDGED = "acknowledged"
    FAILED = "failed"
    EXPIRED = "expired"

@dataclass
class SecureMessage:
    """Secure message structure for A2A communication"""
    message_id: str
    sender_id: str
    recipient_id: str
    message_type: str
    payload: Dict[str, Any]
    timestamp: datetime
    priority: MessagePriority
    ttl_seconds: int = 300  # 5 minutes default TTL
    requires_ack: bool = True
    encrypted_payload: Optional[str] = None
    signature: Optional[str] = None
    status: MessageStatus = MessageStatus.PENDING

class AgentKeyManager:
    """Manages RSA key pairs for agents"""
    
    def __init__(self, key_storage_path: str = "./agent_keys"):
        self.key_storage_path = key_storage_path
        os.makedirs(key_storage_path, exist_ok=True)
        self.agent_keys: Dict[str, Dict[str, Any]] = {}
        
    def generate_agent_keypair(self, agent_id: str) -> Dict[str, bytes]:
        """Generate RSA key pair for an agent"""
        try:
            # Generate private key
            private_key = rsa.generate_private_key(
                public_exponent=65537,
                key_size=2048,
            )
            
            # Get public key
            public_key = private_key.public_key()
            
            # Serialize keys
            private_pem = private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption()
            )
            
            public_pem = public_key.public_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PublicFormat.SubjectPublicKeyInfo
            )
            
            # Store keys
            self.agent_keys[agent_id] = {
                'private_key': private_key,
                'public_key': public_key,
                'private_pem': private_pem,
                'public_pem': public_pem,
                'created_at': datetime.utcnow()
            }
            
            # Save to disk
            self._save_agent_keys(agent_id, private_pem, public_pem)
            
            logger.info(f"Generated key pair for agent {agent_id}")
            return {
                'private_key': private_pem,
                'public_key': public_pem
            }
            
        except Exception as e:
            logger.error(f"Failed to generate key pair for agent {agent_id}: {str(e)}")
            raise
    
    def _save_agent_keys(self, agent_id: str, private_pem: bytes, public_pem: bytes):
        """Save agent keys to disk"""
        try:
            private_path = os.path.join(self.key_storage_path, f"{agent_id}_private.pem")
            public_path = os.path.join(self.key_storage_path, f"{agent_id}_public.pem")
            
            with open(private_path, 'wb') as f:
                f.write(private_pem)
            
            with open(public_path, 'wb') as f:
                f.write(public_pem)
                
            # Set restrictive permissions
            os.chmod(private_path, 0o600)
            os.chmod(public_path, 0o644)
            
        except Exception as e:
            logger.error(f"Failed to save keys for agent {agent_id}: {str(e)}")
            raise
    
    def load_agent_keys(self, agent_id: str) -> Optional[Dict[str, Any]]:
        """Load agent keys from disk"""
        try:
            private_path = os.path.join(self.key_storage_path, f"{agent_id}_private.pem")
            public_path = os.path.join(self.key_storage_path, f"{agent_id}_public.pem")
            
            if not (os.path.exists(private_path) and os.path.exists(public_path)):
                return None
            
            with open(private_path, 'rb') as f:
                private_pem = f.read()
            
            with open(public_path, 'rb') as f:
                public_pem = f.read()
            
            private_key = load_pem_private_key(private_pem, password=None)
            public_key = load_pem_public_key(public_pem)
            
            self.agent_keys[agent_id] = {
                'private_key': private_key,
                'public_key': public_key,
                'private_pem': private_pem,
                'public_pem': public_pem,
                'created_at': datetime.utcnow()
            }
            
            return self.agent_keys[agent_id]
            
        except Exception as e:
            logger.error(f"Failed to load keys for agent {agent_id}: {str(e)}")
            return None
    
    def get_agent_public_key(self, agent_id: str):
        """Get public key for an agent"""
        if agent_id not in self.agent_keys:
            self.load_agent_keys(agent_id)
        
        if agent_id in self.agent_keys:
            return self.agent_keys[agent_id]['public_key']
        
        return None
    
    def get_agent_private_key(self, agent_id: str):
        """Get private key for an agent"""
        if agent_id not in self.agent_keys:
            self.load_agent_keys(agent_id)
        
        if agent_id in self.agent_keys:
            return self.agent_keys[agent_id]['private_key']
        
        return None

class SecureA2AMessaging:
    """Secure Agent-to-Agent messaging system"""
    
    def __init__(self):
        self.key_manager = AgentKeyManager()
        self.message_queue: Dict[str, List[SecureMessage]] = {}
        self.message_handlers: Dict[str, Callable] = {}
        self.delivery_confirmations: Dict[str, Dict[str, Any]] = {}
        self.active_agents: Dict[str, Dict[str, Any]] = {}
        self.message_history: List[SecureMessage] = []
        self.max_history_size = 10000
        
    async def initialize_agent(self, agent_id: str, agent_config: AgentConfig) -> Dict[str, Any]:
        """Initialize an agent in the messaging system"""
        try:
            # Load or generate keys
            keys = self.key_manager.load_agent_keys(agent_id)
            if not keys:
                key_pair = self.key_manager.generate_agent_keypair(agent_id)
                keys = self.key_manager.load_agent_keys(agent_id)
            
            # Initialize message queue
            if agent_id not in self.message_queue:
                self.message_queue[agent_id] = []
            
            # Register agent as active
            self.active_agents[agent_id] = {
                'config': agent_config,
                'last_seen': datetime.utcnow(),
                'message_count': 0,
                'status': 'active'
            }
            
            logger.info(f"Initialized agent {agent_id} in messaging system")
            return {
                'agent_id': agent_id,
                'public_key': base64.b64encode(keys['public_pem']).decode(),
                'status': 'initialized',
                'queue_size': len(self.message_queue[agent_id])
            }
            
        except Exception as e:
            logger.error(f"Failed to initialize agent {agent_id}: {str(e)}")
            raise
    
    def _encrypt_payload(self, payload: Dict[str, Any], recipient_public_key) -> str:
        """Encrypt message payload using recipient's public key"""
        try:
            # Convert payload to JSON
            payload_json = json.dumps(payload, default=str)
            payload_bytes = payload_json.encode('utf-8')
            
            # For large payloads, use hybrid encryption (RSA + AES)
            if len(payload_bytes) > 190:  # RSA 2048 can encrypt max ~245 bytes
                # Generate AES key
                aes_key = os.urandom(32)  # 256-bit key
                iv = os.urandom(16)  # 128-bit IV
                
                # Encrypt payload with AES
                cipher = Cipher(algorithms.AES(aes_key), modes.CBC(iv))
                encryptor = cipher.encryptor()
                
                # Pad payload to multiple of 16 bytes
                padding_length = 16 - (len(payload_bytes) % 16)
                padded_payload = payload_bytes + bytes([padding_length] * padding_length)
                
                encrypted_payload = encryptor.update(padded_payload) + encryptor.finalize()
                
                # Encrypt AES key with RSA
                encrypted_aes_key = recipient_public_key.encrypt(
                    aes_key,
                    padding.OAEP(
                        mgf=padding.MGF1(algorithm=hashes.SHA256()),
                        algorithm=hashes.SHA256(),
                        label=None
                    )
                )
                
                # Combine encrypted key, IV, and payload
                combined = encrypted_aes_key + iv + encrypted_payload
                return base64.b64encode(combined).decode()
            
            else:
                # Direct RSA encryption for small payloads
                encrypted_payload = recipient_public_key.encrypt(
                    payload_bytes,
                    padding.OAEP(
                        mgf=padding.MGF1(algorithm=hashes.SHA256()),
                        algorithm=hashes.SHA256(),
                        label=None
                    )
                )
                return base64.b64encode(encrypted_payload).decode()
                
        except Exception as e:
            logger.error(f"Failed to encrypt payload: {str(e)}")
            raise
    
    def _decrypt_payload(self, encrypted_payload: str, recipient_private_key) -> Dict[str, Any]:
        """Decrypt message payload using recipient's private key"""
        try:
            encrypted_data = base64.b64decode(encrypted_payload.encode())
            
            # Check if this is hybrid encryption (length > 256 bytes for RSA 2048)
            if len(encrypted_data) > 256:
                # Hybrid decryption
                encrypted_aes_key = encrypted_data[:256]  # First 256 bytes are encrypted AES key
                iv = encrypted_data[256:272]  # Next 16 bytes are IV
                encrypted_payload_data = encrypted_data[272:]  # Rest is encrypted payload
                
                # Decrypt AES key
                aes_key = recipient_private_key.decrypt(
                    encrypted_aes_key,
                    padding.OAEP(
                        mgf=padding.MGF1(algorithm=hashes.SHA256()),
                        algorithm=hashes.SHA256(),
                        label=None
                    )
                )
                
                # Decrypt payload
                cipher = Cipher(algorithms.AES(aes_key), modes.CBC(iv))
                decryptor = cipher.decryptor()
                padded_payload = decryptor.update(encrypted_payload_data) + decryptor.finalize()
                
                # Remove padding
                padding_length = padded_payload[-1]
                payload_bytes = padded_payload[:-padding_length]
                
            else:
                # Direct RSA decryption
                payload_bytes = recipient_private_key.decrypt(
                    encrypted_data,
                    padding.OAEP(
                        mgf=padding.MGF1(algorithm=hashes.SHA256()),
                        algorithm=hashes.SHA256(),
                        label=None
                    )
                )
            
            # Convert back to dict
            payload_json = payload_bytes.decode('utf-8')
            return json.loads(payload_json)
            
        except Exception as e:
            logger.error(f"Failed to decrypt payload: {str(e)}")
            raise
    
    def _sign_message(self, message_data: Dict[str, Any], sender_private_key) -> str:
        """Create digital signature for message"""
        try:
            message_json = json.dumps(message_data, sort_keys=True, default=str)
            message_bytes = message_json.encode('utf-8')
            
            signature = sender_private_key.sign(
                message_bytes,
                padding.PSS(
                    mgf=padding.MGF1(hashes.SHA256()),
                    salt_length=padding.PSS.MAX_LENGTH
                ),
                hashes.SHA256()
            )
            
            return base64.b64encode(signature).decode()
            
        except Exception as e:
            logger.error(f"Failed to sign message: {str(e)}")
            raise
    
    def _verify_signature(self, message_data: Dict[str, Any], signature: str, sender_public_key) -> bool:
        """Verify message digital signature"""
        try:
            message_json = json.dumps(message_data, sort_keys=True, default=str)
            message_bytes = message_json.encode('utf-8')
            signature_bytes = base64.b64decode(signature.encode())
            
            sender_public_key.verify(
                signature_bytes,
                message_bytes,
                padding.PSS(
                    mgf=padding.MGF1(hashes.SHA256()),
                    salt_length=padding.PSS.MAX_LENGTH
                ),
                hashes.SHA256()
            )
            return True
            
        except Exception as e:
            logger.warning(f"Signature verification failed: {str(e)}")
            return False
    
    async def send_message(
        self,
        sender_id: str,
        recipient_id: str,
        message_type: str,
        payload: Dict[str, Any],
        priority: MessagePriority = MessagePriority.NORMAL,
        ttl_seconds: int = 300,
        requires_ack: bool = True
    ) -> str:
        """Send secure message between agents"""
        try:
            # Validate agents
            if recipient_id not in self.active_agents:
                raise ValueError(f"Recipient agent {recipient_id} not found")
            
            # Get keys
            sender_private_key = self.key_manager.get_agent_private_key(sender_id)
            recipient_public_key = self.key_manager.get_agent_public_key(recipient_id)
            
            if not sender_private_key or not recipient_public_key:
                raise ValueError("Required keys not found")
            
            # Create message
            message = SecureMessage(
                message_id=str(uuid.uuid4()),
                sender_id=sender_id,
                recipient_id=recipient_id,
                message_type=message_type,
                payload=payload,
                timestamp=datetime.utcnow(),
                priority=priority,
                ttl_seconds=ttl_seconds,
                requires_ack=requires_ack
            )
            
            # Encrypt payload
            message.encrypted_payload = self._encrypt_payload(payload, recipient_public_key)
            
            # Create signature data (without encrypted payload to avoid circular reference)
            signature_data = {
                'message_id': message.message_id,
                'sender_id': message.sender_id,
                'recipient_id': message.recipient_id,
                'message_type': message.message_type,
                'timestamp': message.timestamp.isoformat(),
                'priority': message.priority.value
            }
            
            # Sign message
            message.signature = self._sign_message(signature_data, sender_private_key)
            
            # Add to recipient's queue
            if recipient_id not in self.message_queue:
                self.message_queue[recipient_id] = []
            
            self.message_queue[recipient_id].append(message)
            message.status = MessageStatus.SENT
            
            # Add to history
            self.message_history.append(message)
            if len(self.message_history) > self.max_history_size:
                self.message_history = self.message_history[-self.max_history_size:]
            
            # Update agent stats
            self.active_agents[sender_id]['message_count'] += 1
            self.active_agents[sender_id]['last_seen'] = datetime.utcnow()
            
            logger.info(f"Sent secure message {message.message_id} from {sender_id} to {recipient_id}")
            
            return message.message_id
            
        except Exception as e:
            logger.error(f"Failed to send message: {str(e)}")
            raise
    
    async def receive_messages(self, agent_id: str, max_messages: int = 10) -> List[Dict[str, Any]]:
        """Receive and decrypt messages for an agent"""
        try:
            if agent_id not in self.message_queue:
                return []
            
            messages = []
            agent_private_key = self.key_manager.get_agent_private_key(agent_id)
            
            if not agent_private_key:
                raise ValueError(f"Private key not found for agent {agent_id}")
            
            # Get messages from queue
            queue = self.message_queue[agent_id]
            current_time = datetime.utcnow()
            
            # Process messages (up to max_messages)
            processed_count = 0
            remaining_messages = []
            
            for message in queue:
                # Check TTL
                if (current_time - message.timestamp).total_seconds() > message.ttl_seconds:
                    message.status = MessageStatus.EXPIRED
                    continue
                
                if processed_count >= max_messages:
                    remaining_messages.append(message)
                    continue
                
                try:
                    # Verify signature
                    sender_public_key = self.key_manager.get_agent_public_key(message.sender_id)
                    if sender_public_key:
                        signature_data = {
                            'message_id': message.message_id,
                            'sender_id': message.sender_id,
                            'recipient_id': message.recipient_id,
                            'message_type': message.message_type,
                            'timestamp': message.timestamp.isoformat(),
                            'priority': message.priority.value
                        }
                        
                        if not self._verify_signature(signature_data, message.signature, sender_public_key):
                            logger.warning(f"Signature verification failed for message {message.message_id}")
                            message.status = MessageStatus.FAILED
                            continue
                    
                    # Decrypt payload
                    decrypted_payload = self._decrypt_payload(message.encrypted_payload, agent_private_key)
                    
                    # Create response message
                    message_dict = {
                        'message_id': message.message_id,
                        'sender_id': message.sender_id,
                        'recipient_id': message.recipient_id,
                        'message_type': message.message_type,
                        'payload': decrypted_payload,
                        'timestamp': message.timestamp.isoformat(),
                        'priority': message.priority.value,
                        'requires_ack': message.requires_ack
                    }
                    
                    messages.append(message_dict)
                    message.status = MessageStatus.DELIVERED
                    processed_count += 1
                    
                    # Send acknowledgment if required
                    if message.requires_ack:
                        await self._send_acknowledgment(agent_id, message.sender_id, message.message_id)
                    
                except Exception as e:
                    logger.error(f"Failed to process message {message.message_id}: {str(e)}")
                    message.status = MessageStatus.FAILED
                    remaining_messages.append(message)
            
            # Update queue with remaining messages
            self.message_queue[agent_id] = remaining_messages
            
            # Update agent stats
            if agent_id in self.active_agents:
                self.active_agents[agent_id]['last_seen'] = current_time
            
            return messages
            
        except Exception as e:
            logger.error(f"Failed to receive messages for agent {agent_id}: {str(e)}")
            raise
    
    async def _send_acknowledgment(self, sender_id: str, recipient_id: str, original_message_id: str):
        """Send acknowledgment message"""
        try:
            ack_payload = {
                'original_message_id': original_message_id,
                'status': 'acknowledged',
                'timestamp': datetime.utcnow().isoformat()
            }
            
            await self.send_message(
                sender_id=sender_id,
                recipient_id=recipient_id,
                message_type='acknowledgment',
                payload=ack_payload,
                priority=MessagePriority.LOW,
                requires_ack=False
            )
            
        except Exception as e:
            logger.error(f"Failed to send acknowledgment: {str(e)}")
    
    def get_agent_status(self, agent_id: str) -> Dict[str, Any]:
        """Get status information for an agent"""
        if agent_id not in self.active_agents:
            return {'status': 'not_found'}
        
        agent_info = self.active_agents[agent_id]
        queue_size = len(self.message_queue.get(agent_id, []))
        
        return {
            'agent_id': agent_id,
            'status': agent_info['status'],
            'last_seen': agent_info['last_seen'].isoformat(),
            'message_count': agent_info['message_count'],
            'queue_size': queue_size,
            'has_keys': self.key_manager.get_agent_public_key(agent_id) is not None
        }
    
    def get_messaging_stats(self) -> Dict[str, Any]:
        """Get overall messaging system statistics"""
        total_messages = len(self.message_history)
        active_agent_count = len(self.active_agents)
        
        # Count messages by status
        status_counts = {}
        for message in self.message_history[-1000:]:  # Last 1000 messages
            status = message.status.value
            status_counts[status] = status_counts.get(status, 0) + 1
        
        # Count messages by priority
        priority_counts = {}
        for message in self.message_history[-1000:]:
            priority = message.priority.value
            priority_counts[priority] = priority_counts.get(priority, 0) + 1
        
        return {
            'total_messages': total_messages,
            'active_agents': active_agent_count,
            'status_distribution': status_counts,
            'priority_distribution': priority_counts,
            'average_queue_size': sum(len(queue) for queue in self.message_queue.values()) / max(len(self.message_queue), 1)
        }
    
    async def cleanup_expired_messages(self):
        """Clean up expired messages from queues"""
        try:
            current_time = datetime.utcnow()
            cleaned_count = 0
            
            for agent_id, queue in self.message_queue.items():
                original_size = len(queue)
                self.message_queue[agent_id] = [
                    msg for msg in queue 
                    if (current_time - msg.timestamp).total_seconds() <= msg.ttl_seconds
                ]
                cleaned_count += original_size - len(self.message_queue[agent_id])
            
            if cleaned_count > 0:
                logger.info(f"Cleaned up {cleaned_count} expired messages")
            
        except Exception as e:
            logger.error(f"Failed to cleanup expired messages: {str(e)}")

# Global messaging system instance
secure_messaging = SecureA2AMessaging()
