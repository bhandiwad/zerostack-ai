import asyncio
import json
import hashlib
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from .base import AgentCapability
from src.services.openai_service import OpenAIService
import logging
import pickle
import os
from enum import Enum
from dataclasses import dataclass, asdict
import sqlite3
from pathlib import Path

logger = logging.getLogger(__name__)

class TrainingDataType(str, Enum):
    CONVERSATION = 'conversation'
    DOCUMENT = 'document'
    FAQ = 'faq'
    TROUBLESHOOTING_GUIDE = 'troubleshooting_guide'
    CODE_SNIPPET = 'code_snippet'
    CONFIGURATION = 'configuration'

class TrainingStatus(str, Enum):
    PENDING = 'pending'
    PROCESSING = 'processing'
    COMPLETED = 'completed'
    FAILED = 'failed'

@dataclass
class TrainingData:
    data_id: str
    user_id: str
    data_type: TrainingDataType
    title: str
    content: str
    metadata: Dict[str, Any]
    created_at: datetime
    processed_at: Optional[datetime] = None
    status: TrainingStatus = TrainingStatus.PENDING
    embeddings: Optional[List[float]] = None
    tags: List[str] = None
    
    def __post_init__(self):
        if self.tags is None:
            self.tags = []

@dataclass
class AgentPersonalization:
    agent_id: str
    user_id: str
    preferences: Dict[str, Any]
    custom_knowledge: List[str]  # List of training data IDs
    response_style: str
    specialized_domains: List[str]
    created_at: datetime
    updated_at: datetime

class AgentTrainingCapability(AgentCapability):
    """
    Agent Training and Customization Capability.
    Allows users to train agents on their specific data and customize behavior.
    """
    
    def __init__(self, agent_id: str, config: Optional[Dict[str, Any]] = None):
        super().__init__(agent_id, config)
        self.openai_service: Optional[OpenAIService] = None
        self.training_data: Dict[str, TrainingData] = {}
        self.personalizations: Dict[str, AgentPersonalization] = {}
        self.db_path = self.config.get('db_path', 'instance/agent_training.db')
        self.embeddings_cache: Dict[str, List[float]] = {}
        self.processing_queue: asyncio.Queue = asyncio.Queue()
        self.processing_task = None
        self.running = False
    
    async def _initialize(self):
        """Initialize the agent training capability"""
        try:
            logger.info("Initializing AgentTrainingCapability")
            self.openai_service = OpenAIService()
            
            # Initialize database
            await self._init_database()
            
            # Load existing data
            await self._load_training_data()
            await self._load_personalizations()
            
            # Start processing queue
            self.running = True
            self.processing_task = asyncio.create_task(self._process_training_queue())
            
            logger.info("AgentTrainingCapability initialized")
        except Exception as e:
            logger.error(f"Failed to initialize agent training capability: {str(e)}")
            raise
    
    async def cleanup(self):
        """Clean up resources"""
        self.running = False
        if self.processing_task:
            self.processing_task.cancel()
            try:
                await self.processing_task
            except asyncio.CancelledError:
                pass
    
    async def _init_database(self):
        """Initialize SQLite database for persistent storage"""
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Create training_data table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS training_data (
                data_id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                data_type TEXT NOT NULL,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                metadata TEXT,
                created_at TEXT NOT NULL,
                processed_at TEXT,
                status TEXT NOT NULL,
                embeddings BLOB,
                tags TEXT
            )
        ''')
        
        # Create personalizations table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS personalizations (
                agent_id TEXT,
                user_id TEXT,
                preferences TEXT,
                custom_knowledge TEXT,
                response_style TEXT,
                specialized_domains TEXT,
                created_at TEXT,
                updated_at TEXT,
                PRIMARY KEY (agent_id, user_id)
            )
        ''')
        
        conn.commit()
        conn.close()
    
    async def execute(self, action: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute an agent training action"""
        try:
            if not self._initialized:
                await self.initialize()
            
            handler = getattr(self, f"_handle_{action}", None)
            if not handler or not callable(handler):
                return {
                    'success': False,
                    'error': f"Unsupported action: {action}",
                    'available_actions': self._list_actions()
                }
            
            result = await handler(parameters)
            return {
                'success': True,
                'data': result
            }
            
        except Exception as e:
            logger.error(f"Error in {action}: {str(e)}", exc_info=True)
            return {
                'success': False,
                'error': f"Error executing {action}: {str(e)}"
            }
    
    def _list_actions(self) -> List[str]:
        """List all available actions in this capability"""
        return [
            'upload_training_data', 'list_training_data', 'delete_training_data',
            'create_personalization', 'update_personalization', 'get_personalization',
            'train_agent', 'get_training_status', 'search_knowledge', 'get_personalized_response'
        ]
    
    # --- Training Data Management ---
    
    async def _handle_upload_training_data(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Upload training data for an agent"""
        required_fields = ['user_id', 'data_type', 'title', 'content']
        for field in required_fields:
            if field not in parameters:
                return {'error': f'Missing required field: {field}'}
        
        # Generate unique data ID
        content_hash = hashlib.md5(parameters['content'].encode()).hexdigest()
        data_id = f"{parameters['user_id']}_{content_hash[:8]}"
        
        # Create training data object
        training_data = TrainingData(
            data_id=data_id,
            user_id=parameters['user_id'],
            data_type=TrainingDataType(parameters['data_type']),
            title=parameters['title'],
            content=parameters['content'],
            metadata=parameters.get('metadata', {}),
            created_at=datetime.utcnow(),
            tags=parameters.get('tags', [])
        )
        
        # Store in memory and database
        self.training_data[data_id] = training_data
        await self._save_training_data(training_data)
        
        # Queue for processing
        await self.processing_queue.put(data_id)
        
        return {
            'data_id': data_id,
            'status': 'uploaded',
            'message': 'Training data uploaded and queued for processing'
        }
    
    async def _handle_list_training_data(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """List training data for a user"""
        user_id = parameters.get('user_id')
        data_type = parameters.get('data_type')
        status = parameters.get('status')
        
        filtered_data = []
        for data in self.training_data.values():
            if user_id and data.user_id != user_id:
                continue
            if data_type and data.data_type.value != data_type:
                continue
            if status and data.status.value != status:
                continue
            
            filtered_data.append({
                'data_id': data.data_id,
                'title': data.title,
                'data_type': data.data_type.value,
                'status': data.status.value,
                'created_at': data.created_at.isoformat(),
                'processed_at': data.processed_at.isoformat() if data.processed_at else None,
                'tags': data.tags
            })
        
        return {
            'training_data': filtered_data,
            'count': len(filtered_data)
        }
    
    async def _handle_delete_training_data(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Delete training data"""
        data_id = parameters.get('data_id')
        user_id = parameters.get('user_id')
        
        if not data_id:
            return {'error': 'data_id is required'}
        
        if data_id not in self.training_data:
            return {'error': f'Training data not found: {data_id}'}
        
        # Check ownership
        if user_id and self.training_data[data_id].user_id != user_id:
            return {'error': 'Access denied'}
        
        # Remove from memory and database
        del self.training_data[data_id]
        await self._delete_training_data_from_db(data_id)
        
        return {'status': 'deleted'}
    
    # --- Agent Personalization ---
    
    async def _handle_create_personalization(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Create agent personalization for a user"""
        required_fields = ['agent_id', 'user_id']
        for field in required_fields:
            if field not in parameters:
                return {'error': f'Missing required field: {field}'}
        
        agent_id = parameters['agent_id']
        user_id = parameters['user_id']
        
        personalization = AgentPersonalization(
            agent_id=agent_id,
            user_id=user_id,
            preferences=parameters.get('preferences', {}),
            custom_knowledge=parameters.get('custom_knowledge', []),
            response_style=parameters.get('response_style', 'professional'),
            specialized_domains=parameters.get('specialized_domains', []),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        key = f"{agent_id}_{user_id}"
        self.personalizations[key] = personalization
        await self._save_personalization(personalization)
        
        return {
            'personalization_id': key,
            'status': 'created',
            'message': f'Personalization created for agent {agent_id}'
        }
    
    async def _handle_update_personalization(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Update agent personalization"""
        agent_id = parameters.get('agent_id')
        user_id = parameters.get('user_id')
        
        if not agent_id or not user_id:
            return {'error': 'agent_id and user_id are required'}
        
        key = f"{agent_id}_{user_id}"
        if key not in self.personalizations:
            return {'error': 'Personalization not found'}
        
        personalization = self.personalizations[key]
        
        # Update fields
        if 'preferences' in parameters:
            personalization.preferences.update(parameters['preferences'])
        if 'custom_knowledge' in parameters:
            personalization.custom_knowledge = parameters['custom_knowledge']
        if 'response_style' in parameters:
            personalization.response_style = parameters['response_style']
        if 'specialized_domains' in parameters:
            personalization.specialized_domains = parameters['specialized_domains']
        
        personalization.updated_at = datetime.utcnow()
        
        await self._save_personalization(personalization)
        
        return {
            'status': 'updated',
            'updated_at': personalization.updated_at.isoformat()
        }
    
    async def _handle_get_personalization(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Get agent personalization for a user"""
        agent_id = parameters.get('agent_id')
        user_id = parameters.get('user_id')
        
        if not agent_id or not user_id:
            return {'error': 'agent_id and user_id are required'}
        
        key = f"{agent_id}_{user_id}"
        if key not in self.personalizations:
            return {'error': 'Personalization not found'}
        
        personalization = self.personalizations[key]
        
        return {
            'agent_id': personalization.agent_id,
            'user_id': personalization.user_id,
            'preferences': personalization.preferences,
            'custom_knowledge': personalization.custom_knowledge,
            'response_style': personalization.response_style,
            'specialized_domains': personalization.specialized_domains,
            'created_at': personalization.created_at.isoformat(),
            'updated_at': personalization.updated_at.isoformat()
        }
    
    # --- Training and Knowledge Search ---
    
    async def _handle_train_agent(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Train an agent with user's custom data"""
        user_id = parameters.get('user_id')
        agent_id = parameters.get('agent_id')
        
        if not user_id or not agent_id:
            return {'error': 'user_id and agent_id are required'}
        
        # Get user's training data
        user_data = [
            data for data in self.training_data.values()
            if data.user_id == user_id and data.status == TrainingStatus.COMPLETED
        ]
        
        if not user_data:
            return {'error': 'No processed training data found for user'}
        
        # Create or update personalization with training data
        key = f"{agent_id}_{user_id}"
        if key not in self.personalizations:
            await self._handle_create_personalization({
                'agent_id': agent_id,
                'user_id': user_id,
                'custom_knowledge': [data.data_id for data in user_data]
            })
        else:
            personalization = self.personalizations[key]
            personalization.custom_knowledge = [data.data_id for data in user_data]
            personalization.updated_at = datetime.utcnow()
            await self._save_personalization(personalization)
        
        return {
            'status': 'trained',
            'data_points_used': len(user_data),
            'message': f'Agent {agent_id} trained with {len(user_data)} data points'
        }
    
    async def _handle_search_knowledge(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Search through user's custom knowledge base"""
        user_id = parameters.get('user_id')
        query = parameters.get('query')
        limit = parameters.get('limit', 5)
        
        if not user_id or not query:
            return {'error': 'user_id and query are required'}
        
        # Get user's training data
        user_data = [
            data for data in self.training_data.values()
            if data.user_id == user_id and data.status == TrainingStatus.COMPLETED
        ]
        
        if not user_data:
            return {'results': [], 'count': 0}
        
        # Simple text-based search (in production, use embeddings)
        query_lower = query.lower()
        scored_results = []
        
        for data in user_data:
            score = 0
            content_lower = data.content.lower()
            title_lower = data.title.lower()
            
            # Simple scoring based on keyword matches
            query_words = query_lower.split()
            for word in query_words:
                if word in title_lower:
                    score += 3
                if word in content_lower:
                    score += 1
            
            if score > 0:
                scored_results.append((score, data))
        
        # Sort by score and limit results
        scored_results.sort(key=lambda x: x[0], reverse=True)
        results = []
        
        for score, data in scored_results[:limit]:
            results.append({
                'data_id': data.data_id,
                'title': data.title,
                'content': data.content[:200] + '...' if len(data.content) > 200 else data.content,
                'data_type': data.data_type.value,
                'relevance_score': score,
                'tags': data.tags
            })
        
        return {
            'results': results,
            'count': len(results),
            'total_searched': len(user_data)
        }
    
    async def _handle_get_personalized_response(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Generate a personalized response using user's training data"""
        user_id = parameters.get('user_id')
        agent_id = parameters.get('agent_id')
        query = parameters.get('query')
        
        if not user_id or not agent_id or not query:
            return {'error': 'user_id, agent_id, and query are required'}
        
        # Get personalization
        key = f"{agent_id}_{user_id}"
        if key not in self.personalizations:
            return {'error': 'No personalization found for this user and agent'}
        
        personalization = self.personalizations[key]
        
        # Search relevant knowledge
        search_result = await self._handle_search_knowledge({
            'user_id': user_id,
            'query': query,
            'limit': 3
        })
        
        # Generate personalized response
        if not self.openai_service:
            return {'error': 'OpenAI service not available'}
        
        context = ""
        if search_result['data']['results']:
            context = "Relevant information from user's knowledge base:\n"
            for result in search_result['data']['results']:
                context += f"- {result['title']}: {result['content']}\n"
        
        prompt = f"""
        You are an AI assistant personalized for this user. 
        
        User's preferences: {json.dumps(personalization.preferences)}
        Response style: {personalization.response_style}
        Specialized domains: {', '.join(personalization.specialized_domains)}
        
        {context}
        
        User query: {query}
        
        Provide a personalized response that:
        1. Uses the user's preferred response style
        2. Incorporates relevant information from their knowledge base
        3. Focuses on their specialized domains when applicable
        4. Matches their preferences for detail level and tone
        """
        
        try:
            response = self.openai_service.get_completion(prompt, max_tokens=400)
            return {
                'response': response.strip(),
                'personalization_applied': True,
                'knowledge_sources_used': len(search_result['data']['results'])
            }
        except Exception as e:
            logger.error(f"Error generating personalized response: {str(e)}")
            return {'error': f'Failed to generate response: {str(e)}'}
    
    # --- Processing Queue ---
    
    async def _process_training_queue(self):
        """Process training data queue"""
        while self.running:
            try:
                # Wait for data to process
                data_id = await asyncio.wait_for(self.processing_queue.get(), timeout=1.0)
                
                if data_id in self.training_data:
                    await self._process_training_data(data_id)
                
            except asyncio.TimeoutError:
                continue
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in processing queue: {str(e)}")
    
    async def _process_training_data(self, data_id: str):
        """Process a single training data item"""
        try:
            data = self.training_data[data_id]
            data.status = TrainingStatus.PROCESSING
            
            # Generate embeddings (simulated - in production use OpenAI embeddings)
            embeddings = await self._generate_embeddings(data.content)
            data.embeddings = embeddings
            
            # Extract tags if not provided
            if not data.tags:
                data.tags = await self._extract_tags(data.content)
            
            data.status = TrainingStatus.COMPLETED
            data.processed_at = datetime.utcnow()
            
            # Save to database
            await self._save_training_data(data)
            
            logger.info(f"Successfully processed training data: {data_id}")
            
        except Exception as e:
            logger.error(f"Error processing training data {data_id}: {str(e)}")
            if data_id in self.training_data:
                self.training_data[data_id].status = TrainingStatus.FAILED
    
    async def _generate_embeddings(self, content: str) -> List[float]:
        """Generate embeddings for content (simulated)"""
        # In production, use OpenAI embeddings API
        # For now, return dummy embeddings
        import random
        return [random.random() for _ in range(1536)]  # OpenAI embedding dimension
    
    async def _extract_tags(self, content: str) -> List[str]:
        """Extract tags from content using AI"""
        if not self.openai_service:
            return []
        
        prompt = f"""
        Extract 3-5 relevant tags from the following content. 
        Return only the tags as a comma-separated list.
        
        Content: {content[:500]}...
        """
        
        try:
            response = self.openai_service.get_completion(prompt, max_tokens=50)
            tags = [tag.strip() for tag in response.split(',')]
            return tags[:5]  # Limit to 5 tags
        except Exception as e:
            logger.error(f"Error extracting tags: {str(e)}")
            return []
    
    # --- Database Operations ---
    
    async def _save_training_data(self, data: TrainingData):
        """Save training data to database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        embeddings_blob = pickle.dumps(data.embeddings) if data.embeddings else None
        
        cursor.execute('''
            INSERT OR REPLACE INTO training_data 
            (data_id, user_id, data_type, title, content, metadata, created_at, 
             processed_at, status, embeddings, tags)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            data.data_id, data.user_id, data.data_type.value, data.title, data.content,
            json.dumps(data.metadata), data.created_at.isoformat(),
            data.processed_at.isoformat() if data.processed_at else None,
            data.status.value, embeddings_blob, json.dumps(data.tags)
        ))
        
        conn.commit()
        conn.close()
    
    async def _save_personalization(self, personalization: AgentPersonalization):
        """Save personalization to database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO personalizations 
            (agent_id, user_id, preferences, custom_knowledge, response_style, 
             specialized_domains, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            personalization.agent_id, personalization.user_id,
            json.dumps(personalization.preferences),
            json.dumps(personalization.custom_knowledge),
            personalization.response_style,
            json.dumps(personalization.specialized_domains),
            personalization.created_at.isoformat(),
            personalization.updated_at.isoformat()
        ))
        
        conn.commit()
        conn.close()
    
    async def _load_training_data(self):
        """Load training data from database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM training_data')
        rows = cursor.fetchall()
        
        for row in rows:
            embeddings = pickle.loads(row[9]) if row[9] else None
            
            data = TrainingData(
                data_id=row[0],
                user_id=row[1],
                data_type=TrainingDataType(row[2]),
                title=row[3],
                content=row[4],
                metadata=json.loads(row[5]) if row[5] else {},
                created_at=datetime.fromisoformat(row[6]),
                processed_at=datetime.fromisoformat(row[7]) if row[7] else None,
                status=TrainingStatus(row[8]),
                embeddings=embeddings,
                tags=json.loads(row[10]) if row[10] else []
            )
            
            self.training_data[data.data_id] = data
        
        conn.close()
    
    async def _load_personalizations(self):
        """Load personalizations from database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM personalizations')
        rows = cursor.fetchall()
        
        for row in rows:
            personalization = AgentPersonalization(
                agent_id=row[0],
                user_id=row[1],
                preferences=json.loads(row[2]) if row[2] else {},
                custom_knowledge=json.loads(row[3]) if row[3] else [],
                response_style=row[4],
                specialized_domains=json.loads(row[5]) if row[5] else [],
                created_at=datetime.fromisoformat(row[6]),
                updated_at=datetime.fromisoformat(row[7])
            )
            
            key = f"{personalization.agent_id}_{personalization.user_id}"
            self.personalizations[key] = personalization
        
        conn.close()
    
    async def _delete_training_data_from_db(self, data_id: str):
        """Delete training data from database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('DELETE FROM training_data WHERE data_id = ?', (data_id,))
        conn.commit()
        conn.close()
