"""
Cross-Agent Context Sharing and Memory Synchronization
Enables agents to share context and synchronize memory states
"""
import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Set
from dataclasses import dataclass, asdict
import hashlib
from .vector_memory import memory_system
from .secure_a2a_messaging import secure_messaging, MessagePriority
from .enhanced_models import AgentConfig

logger = logging.getLogger(__name__)

@dataclass
class SharedContext:
    """Represents shared context between agents"""
    context_id: str
    source_agent_id: str
    context_type: str  # 'knowledge', 'experience', 'pattern', 'solution'
    content: Dict[str, Any]
    metadata: Dict[str, Any]
    access_level: str  # 'public', 'restricted', 'private'
    expiry_time: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    version: int

@dataclass
class ContextSyncRequest:
    """Request for context synchronization"""
    request_id: str
    requesting_agent_id: str
    target_agent_ids: List[str]
    context_types: List[str]
    sync_mode: str  # 'pull', 'push', 'bidirectional'
    priority: MessagePriority
    created_at: datetime

class ContextSharingManager:
    """Manages cross-agent context sharing and memory synchronization"""
    
    def __init__(self):
        self.shared_contexts: Dict[str, SharedContext] = {}
        self.agent_subscriptions: Dict[str, Set[str]] = {}  # agent_id -> context_types
        self.sync_requests: Dict[str, ContextSyncRequest] = {}
        self.context_access_log: List[Dict[str, Any]] = []
        
    async def share_context(
        self, 
        source_agent_id: str, 
        context_type: str, 
        content: Dict[str, Any],
        access_level: str = 'public',
        target_agents: Optional[List[str]] = None,
        expiry_hours: Optional[int] = None
    ) -> str:
        """Share context from one agent to others"""
        try:
            # Generate context ID
            context_hash = hashlib.md5(
                f"{source_agent_id}_{context_type}_{json.dumps(content, sort_keys=True)}".encode()
            ).hexdigest()
            context_id = f"ctx_{context_hash}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
            
            # Set expiry time
            expiry_time = None
            if expiry_hours:
                expiry_time = datetime.utcnow() + timedelta(hours=expiry_hours)
            
            # Create shared context
            shared_context = SharedContext(
                context_id=context_id,
                source_agent_id=source_agent_id,
                context_type=context_type,
                content=content,
                metadata={
                    'size_bytes': len(json.dumps(content)),
                    'target_agents': target_agents or [],
                    'sharing_timestamp': datetime.utcnow().isoformat()
                },
                access_level=access_level,
                expiry_time=expiry_time,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                version=1
            )
            
            # Store context
            self.shared_contexts[context_id] = shared_context
            
            # Store in vector memory for semantic search
            await memory_system.store_agent_interaction(
                agent_id=source_agent_id,
                interaction_type='context_sharing',
                content=f"Shared {context_type} context: {json.dumps(content)[:200]}...",
                metadata={
                    'context_id': context_id,
                    'context_type': context_type,
                    'access_level': access_level,
                    'shared_at': datetime.utcnow().isoformat()
                }
            )
            
            # Notify subscribed agents
            await self._notify_subscribers(shared_context, target_agents)
            
            # Log access
            self.context_access_log.append({
                'action': 'share',
                'context_id': context_id,
                'agent_id': source_agent_id,
                'timestamp': datetime.utcnow().isoformat()
            })
            
            logger.info(f"Context {context_id} shared by agent {source_agent_id}")
            return context_id
            
        except Exception as e:
            logger.error(f"Failed to share context: {str(e)}")
            raise
    
    async def _notify_subscribers(
        self, 
        shared_context: SharedContext, 
        target_agents: Optional[List[str]] = None
    ):
        """Notify subscribed agents about new shared context"""
        try:
            # Determine which agents to notify
            agents_to_notify = set()
            
            if target_agents:
                agents_to_notify.update(target_agents)
            else:
                # Notify all agents subscribed to this context type
                for agent_id, subscribed_types in self.agent_subscriptions.items():
                    if shared_context.context_type in subscribed_types:
                        agents_to_notify.add(agent_id)
            
            # Don't notify the source agent
            agents_to_notify.discard(shared_context.source_agent_id)
            
            # Send notifications via A2A messaging
            for agent_id in agents_to_notify:
                try:
                    await secure_messaging.send_message(
                        sender_id='context_manager',
                        recipient_id=agent_id,
                        message_type='context_notification',
                        payload={
                            'context_id': shared_context.context_id,
                            'context_type': shared_context.context_type,
                            'source_agent': shared_context.source_agent_id,
                            'access_level': shared_context.access_level,
                            'created_at': shared_context.created_at.isoformat(),
                            'metadata': shared_context.metadata
                        },
                        priority=MessagePriority.NORMAL
                    )
                except Exception as e:
                    logger.warning(f"Failed to notify agent {agent_id}: {str(e)}")
            
        except Exception as e:
            logger.error(f"Failed to notify subscribers: {str(e)}")
    
    async def get_shared_context(
        self, 
        context_id: str, 
        requesting_agent_id: str
    ) -> Optional[SharedContext]:
        """Retrieve shared context by ID"""
        try:
            context = self.shared_contexts.get(context_id)
            
            if not context:
                return None
            
            # Check expiry
            if context.expiry_time and datetime.utcnow() > context.expiry_time:
                await self._cleanup_expired_context(context_id)
                return None
            
            # Check access permissions
            if not self._check_access_permission(context, requesting_agent_id):
                logger.warning(f"Agent {requesting_agent_id} denied access to context {context_id}")
                return None
            
            # Log access
            self.context_access_log.append({
                'action': 'access',
                'context_id': context_id,
                'agent_id': requesting_agent_id,
                'timestamp': datetime.utcnow().isoformat()
            })
            
            return context
            
        except Exception as e:
            logger.error(f"Failed to get shared context {context_id}: {str(e)}")
            return None
    
    def _check_access_permission(self, context: SharedContext, agent_id: str) -> bool:
        """Check if agent has permission to access context"""
        if context.access_level == 'public':
            return True
        elif context.access_level == 'private':
            return agent_id == context.source_agent_id
        elif context.access_level == 'restricted':
            target_agents = context.metadata.get('target_agents', [])
            return agent_id in target_agents or agent_id == context.source_agent_id
        return False
    
    async def search_shared_contexts(
        self, 
        requesting_agent_id: str,
        context_types: Optional[List[str]] = None,
        query: Optional[str] = None,
        limit: int = 20
    ) -> List[SharedContext]:
        """Search for shared contexts"""
        try:
            results = []
            
            for context in self.shared_contexts.values():
                # Check expiry
                if context.expiry_time and datetime.utcnow() > context.expiry_time:
                    continue
                
                # Check access permission
                if not self._check_access_permission(context, requesting_agent_id):
                    continue
                
                # Filter by context types
                if context_types and context.context_type not in context_types:
                    continue
                
                # Simple text search in content
                if query:
                    content_str = json.dumps(context.content).lower()
                    if query.lower() not in content_str:
                        continue
                
                results.append(context)
            
            # Sort by creation time (newest first) and limit
            results.sort(key=lambda x: x.created_at, reverse=True)
            return results[:limit]
            
        except Exception as e:
            logger.error(f"Failed to search shared contexts: {str(e)}")
            return []
    
    async def subscribe_to_context_types(
        self, 
        agent_id: str, 
        context_types: List[str]
    ):
        """Subscribe agent to specific context types"""
        try:
            if agent_id not in self.agent_subscriptions:
                self.agent_subscriptions[agent_id] = set()
            
            self.agent_subscriptions[agent_id].update(context_types)
            
            logger.info(f"Agent {agent_id} subscribed to context types: {context_types}")
            
        except Exception as e:
            logger.error(f"Failed to subscribe agent {agent_id}: {str(e)}")
    
    async def unsubscribe_from_context_types(
        self, 
        agent_id: str, 
        context_types: List[str]
    ):
        """Unsubscribe agent from specific context types"""
        try:
            if agent_id in self.agent_subscriptions:
                self.agent_subscriptions[agent_id].difference_update(context_types)
                
                # Remove agent if no subscriptions left
                if not self.agent_subscriptions[agent_id]:
                    del self.agent_subscriptions[agent_id]
            
            logger.info(f"Agent {agent_id} unsubscribed from context types: {context_types}")
            
        except Exception as e:
            logger.error(f"Failed to unsubscribe agent {agent_id}: {str(e)}")
    
    async def synchronize_agent_memory(
        self, 
        source_agent_id: str, 
        target_agent_id: str,
        sync_types: List[str] = None
    ) -> Dict[str, Any]:
        """Synchronize memory between two agents"""
        try:
            if not sync_types:
                sync_types = ['knowledge', 'experience', 'patterns']
            
            sync_results = {
                'source_agent': source_agent_id,
                'target_agent': target_agent_id,
                'sync_types': sync_types,
                'synced_contexts': [],
                'errors': []
            }
            
            # Get relevant contexts from source agent
            source_contexts = await memory_system.retrieve_relevant_context(
                query=f"agent {source_agent_id} knowledge experience",
                agent_id=source_agent_id,
                limit=50
            )
            
            # Filter and share relevant contexts
            for context in source_contexts:
                try:
                    context_type = context.get('metadata', {}).get('interaction_type', 'knowledge')
                    
                    if context_type in sync_types:
                        # Share context with target agent
                        context_id = await self.share_context(
                            source_agent_id=source_agent_id,
                            context_type=context_type,
                            content={
                                'original_content': context.get('content', ''),
                                'metadata': context.get('metadata', {}),
                                'sync_source': source_agent_id
                            },
                            access_level='restricted',
                            target_agents=[target_agent_id],
                            expiry_hours=24
                        )
                        
                        sync_results['synced_contexts'].append({
                            'context_id': context_id,
                            'type': context_type,
                            'content_preview': context.get('content', '')[:100]
                        })
                        
                except Exception as e:
                    sync_results['errors'].append(f"Failed to sync context: {str(e)}")
            
            # Store sync record in memory
            await memory_system.store_agent_interaction(
                agent_id=source_agent_id,
                interaction_type='memory_sync',
                content=f"Synchronized memory with agent {target_agent_id}",
                metadata={
                    'target_agent': target_agent_id,
                    'sync_types': sync_types,
                    'synced_count': len(sync_results['synced_contexts']),
                    'sync_timestamp': datetime.utcnow().isoformat()
                }
            )
            
            logger.info(f"Memory sync completed: {source_agent_id} -> {target_agent_id}")
            return sync_results
            
        except Exception as e:
            logger.error(f"Failed to synchronize agent memory: {str(e)}")
            return {'error': str(e)}
    
    async def _cleanup_expired_context(self, context_id: str):
        """Remove expired context"""
        try:
            if context_id in self.shared_contexts:
                del self.shared_contexts[context_id]
                logger.info(f"Cleaned up expired context {context_id}")
        except Exception as e:
            logger.error(f"Failed to cleanup context {context_id}: {str(e)}")
    
    async def cleanup_expired_contexts(self):
        """Clean up all expired contexts"""
        try:
            current_time = datetime.utcnow()
            expired_contexts = []
            
            for context_id, context in self.shared_contexts.items():
                if context.expiry_time and current_time > context.expiry_time:
                    expired_contexts.append(context_id)
            
            for context_id in expired_contexts:
                await self._cleanup_expired_context(context_id)
            
            logger.info(f"Cleaned up {len(expired_contexts)} expired contexts")
            return len(expired_contexts)
            
        except Exception as e:
            logger.error(f"Failed to cleanup expired contexts: {str(e)}")
            return 0
    
    def get_context_sharing_stats(self) -> Dict[str, Any]:
        """Get context sharing statistics"""
        try:
            total_contexts = len(self.shared_contexts)
            
            # Count by type
            type_distribution = {}
            access_level_distribution = {}
            
            for context in self.shared_contexts.values():
                context_type = context.context_type
                access_level = context.access_level
                
                type_distribution[context_type] = type_distribution.get(context_type, 0) + 1
                access_level_distribution[access_level] = access_level_distribution.get(access_level, 0) + 1
            
            # Recent activity
            recent_accesses = [
                log for log in self.context_access_log
                if (datetime.utcnow() - datetime.fromisoformat(log['timestamp'])).days <= 7
            ]
            
            return {
                'total_contexts': total_contexts,
                'active_subscriptions': len(self.agent_subscriptions),
                'type_distribution': type_distribution,
                'access_level_distribution': access_level_distribution,
                'recent_accesses': len(recent_accesses),
                'total_access_logs': len(self.context_access_log)
            }
            
        except Exception as e:
            logger.error(f"Failed to get context sharing stats: {str(e)}")
            return {'error': str(e)}

# Global context sharing manager instance
context_manager = ContextSharingManager()
