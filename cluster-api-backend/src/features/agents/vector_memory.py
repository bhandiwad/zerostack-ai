"""
Vector Memory System with ChromaDB Integration
Provides semantic memory and context retrieval for AI agents
"""
import chromadb
from chromadb.config import Settings
import json
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from sentence_transformers import SentenceTransformer
import uuid
import asyncio
from .enhanced_models import AgentLearningData
import numpy as np

logger = logging.getLogger(__name__)

class VectorMemorySystem:
    """Advanced vector-based memory system for AI agents"""
    
    def __init__(self, persist_directory: str = "./chromadb_data"):
        self.persist_directory = persist_directory
        self.client = None
        self.collections = {}
        self.embedder = None
        self.initialized = False
        
    async def initialize(self):
        """Initialize ChromaDB and embedding model"""
        try:
            # Initialize ChromaDB client
            self.client = chromadb.PersistentClient(
                path=self.persist_directory,
                settings=Settings(
                    anonymized_telemetry=False,
                    allow_reset=True
                )
            )
            
            # Initialize sentence transformer for embeddings
            self.embedder = SentenceTransformer('all-MiniLM-L6-v2')
            
            # Create default collections
            await self._create_default_collections()
            
            self.initialized = True
            logger.info("Vector memory system initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize vector memory system: {str(e)}")
            raise
    
    async def _create_default_collections(self):
        """Create default memory collections for different types of data"""
        
        collections_config = {
            "agent_interactions": {
                "metadata": {"description": "Agent interaction history and outcomes"},
                "embedding_function": chromadb.utils.embedding_functions.SentenceTransformerEmbeddingFunction(
                    model_name="all-MiniLM-L6-v2"
                )
            },
            "cluster_knowledge": {
                "metadata": {"description": "Kubernetes cluster knowledge and troubleshooting"},
                "embedding_function": chromadb.utils.embedding_functions.SentenceTransformerEmbeddingFunction(
                    model_name="all-MiniLM-L6-v2"
                )
            },
            "user_context": {
                "metadata": {"description": "User preferences and historical context"},
                "embedding_function": chromadb.utils.embedding_functions.SentenceTransformerEmbeddingFunction(
                    model_name="all-MiniLM-L6-v2"
                )
            },
            "agent_learnings": {
                "metadata": {"description": "Agent learning data and improvements"},
                "embedding_function": chromadb.utils.embedding_functions.SentenceTransformerEmbeddingFunction(
                    model_name="all-MiniLM-L6-v2"
                )
            }
        }
        
        for collection_name, config in collections_config.items():
            try:
                collection = self.client.get_or_create_collection(
                    name=collection_name,
                    metadata=config["metadata"],
                    embedding_function=config["embedding_function"]
                )
                self.collections[collection_name] = collection
                logger.info(f"Created/loaded collection: {collection_name}")
                
            except Exception as e:
                logger.error(f"Failed to create collection {collection_name}: {str(e)}")
    
    async def store_interaction(
        self, 
        agent_id: str, 
        interaction_data: Dict[str, Any],
        collection_name: str = "agent_interactions"
    ) -> str:
        """Store an agent interaction in vector memory"""
        
        if not self.initialized:
            await self.initialize()
        
        try:
            # Create searchable content from interaction
            content_parts = [
                interaction_data.get('user_input', ''),
                interaction_data.get('agent_response', ''),
                interaction_data.get('context', {}).get('task_type', ''),
                ' '.join(interaction_data.get('tags', []))
            ]
            searchable_content = ' '.join(filter(None, content_parts))
            
            # Generate unique ID
            interaction_id = f"{agent_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"
            
            # Prepare metadata
            metadata = {
                "agent_id": agent_id,
                "timestamp": datetime.utcnow().isoformat(),
                "success": interaction_data.get('success', True),
                "task_type": interaction_data.get('context', {}).get('task_type', 'unknown'),
                "escalation_level": interaction_data.get('escalation_level', 1),
                "response_time": interaction_data.get('response_time', 0.0),
                "user_feedback": interaction_data.get('user_feedback', ''),
                "tags": json.dumps(interaction_data.get('tags', []))
            }
            
            # Store in ChromaDB
            collection = self.collections[collection_name]
            collection.add(
                documents=[searchable_content],
                metadatas=[metadata],
                ids=[interaction_id]
            )
            
            logger.info(f"Stored interaction {interaction_id} for agent {agent_id}")
            return interaction_id
            
        except Exception as e:
            logger.error(f"Failed to store interaction: {str(e)}")
            raise
    
    async def retrieve_relevant_context(
        self,
        query: str,
        agent_id: Optional[str] = None,
        collection_name: str = "agent_interactions",
        limit: int = 5,
        similarity_threshold: float = 0.7
    ) -> List[Dict[str, Any]]:
        """Retrieve relevant context based on semantic similarity"""
        
        if not self.initialized:
            await self.initialize()
        
        try:
            collection = self.collections[collection_name]
            
            # Build query filters
            where_filter = {}
            if agent_id:
                where_filter["agent_id"] = agent_id
            
            # Perform semantic search
            results = collection.query(
                query_texts=[query],
                n_results=limit,
                where=where_filter if where_filter else None
            )
            
            # Process and filter results
            relevant_contexts = []
            
            if results['documents'] and results['documents'][0]:
                for i, (doc, metadata, distance) in enumerate(zip(
                    results['documents'][0],
                    results['metadatas'][0],
                    results['distances'][0] if results['distances'] else [0] * len(results['documents'][0])
                )):
                    # Calculate similarity score (ChromaDB returns distances, we want similarity)
                    similarity = 1 - distance if distance <= 1 else 0
                    
                    if similarity >= similarity_threshold:
                        context = {
                            "content": doc,
                            "metadata": metadata,
                            "similarity_score": similarity,
                            "timestamp": metadata.get("timestamp"),
                            "agent_id": metadata.get("agent_id"),
                            "success": metadata.get("success"),
                            "task_type": metadata.get("task_type")
                        }
                        relevant_contexts.append(context)
            
            logger.info(f"Retrieved {len(relevant_contexts)} relevant contexts for query")
            return relevant_contexts
            
        except Exception as e:
            logger.error(f"Failed to retrieve context: {str(e)}")
            return []
    
    async def store_cluster_knowledge(
        self,
        knowledge_data: Dict[str, Any],
        source: str = "system"
    ) -> str:
        """Store cluster-related knowledge and troubleshooting information"""
        
        try:
            # Create searchable content
            content_parts = [
                knowledge_data.get('title', ''),
                knowledge_data.get('description', ''),
                knowledge_data.get('solution', ''),
                knowledge_data.get('symptoms', ''),
                ' '.join(knowledge_data.get('keywords', []))
            ]
            searchable_content = ' '.join(filter(None, content_parts))
            
            knowledge_id = f"knowledge_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"
            
            metadata = {
                "source": source,
                "category": knowledge_data.get('category', 'general'),
                "severity": knowledge_data.get('severity', 'medium'),
                "timestamp": datetime.utcnow().isoformat(),
                "verified": knowledge_data.get('verified', False),
                "keywords": json.dumps(knowledge_data.get('keywords', [])),
                "cluster_version": knowledge_data.get('cluster_version', ''),
                "provider": knowledge_data.get('provider', '')
            }
            
            collection = self.collections["cluster_knowledge"]
            collection.add(
                documents=[searchable_content],
                metadatas=[metadata],
                ids=[knowledge_id]
            )
            
            return knowledge_id
            
        except Exception as e:
            logger.error(f"Failed to store cluster knowledge: {str(e)}")
            raise
    
    async def store_learning_data(self, learning_data: AgentLearningData) -> str:
        """Store agent learning data for continuous improvement"""
        
        try:
            # Create searchable content from learning data
            content_parts = [
                json.dumps(learning_data.input_data),
                json.dumps(learning_data.output_data),
                json.dumps(learning_data.context),
                learning_data.user_feedback or '',
                ' '.join(learning_data.tags)
            ]
            searchable_content = ' '.join(filter(None, content_parts))
            
            metadata = {
                "agent_id": learning_data.agent_id,
                "interaction_id": learning_data.interaction_id,
                "success": learning_data.success,
                "performance_score": learning_data.performance_score or 0.0,
                "timestamp": learning_data.timestamp.isoformat(),
                "tags": json.dumps(learning_data.tags),
                "has_feedback": bool(learning_data.user_feedback)
            }
            
            collection = self.collections["agent_learnings"]
            collection.add(
                documents=[searchable_content],
                metadatas=[metadata],
                ids=[learning_data.interaction_id]
            )
            
            return learning_data.interaction_id
            
        except Exception as e:
            logger.error(f"Failed to store learning data: {str(e)}")
            raise
    
    async def get_agent_performance_insights(
        self,
        agent_id: str,
        days_back: int = 30
    ) -> Dict[str, Any]:
        """Get performance insights for an agent based on stored interactions"""
        
        try:
            # Calculate date threshold
            threshold_date = datetime.utcnow() - timedelta(days=days_back)
            
            # Query recent interactions
            collection = self.collections["agent_interactions"]
            results = collection.query(
                query_texts=["performance analysis"],
                n_results=1000,  # Get many results for analysis
                where={"agent_id": agent_id}
            )
            
            if not results['metadatas'] or not results['metadatas'][0]:
                return {"error": "No interaction data found"}
            
            # Analyze interactions
            total_interactions = 0
            successful_interactions = 0
            total_response_time = 0.0
            escalation_counts = {"1": 0, "2": 0, "3": 0}
            task_types = {}
            
            for metadata in results['metadatas'][0]:
                interaction_time = datetime.fromisoformat(metadata['timestamp'])
                if interaction_time >= threshold_date:
                    total_interactions += 1
                    
                    if metadata.get('success', True):
                        successful_interactions += 1
                    
                    response_time = float(metadata.get('response_time', 0))
                    total_response_time += response_time
                    
                    escalation_level = str(metadata.get('escalation_level', 1))
                    escalation_counts[escalation_level] = escalation_counts.get(escalation_level, 0) + 1
                    
                    task_type = metadata.get('task_type', 'unknown')
                    task_types[task_type] = task_types.get(task_type, 0) + 1
            
            # Calculate metrics
            success_rate = (successful_interactions / total_interactions * 100) if total_interactions > 0 else 0
            avg_response_time = (total_response_time / total_interactions) if total_interactions > 0 else 0
            
            insights = {
                "agent_id": agent_id,
                "analysis_period_days": days_back,
                "total_interactions": total_interactions,
                "success_rate": round(success_rate, 2),
                "average_response_time": round(avg_response_time, 2),
                "escalation_distribution": escalation_counts,
                "task_type_distribution": task_types,
                "performance_trend": "stable",  # Could be enhanced with trend analysis
                "recommendations": self._generate_recommendations(success_rate, avg_response_time, escalation_counts)
            }
            
            return insights
            
        except Exception as e:
            logger.error(f"Failed to get performance insights: {str(e)}")
            return {"error": str(e)}
    
    def _generate_recommendations(
        self,
        success_rate: float,
        avg_response_time: float,
        escalation_counts: Dict[str, int]
    ) -> List[str]:
        """Generate performance improvement recommendations"""
        
        recommendations = []
        
        if success_rate < 85:
            recommendations.append("Consider additional training data for improved success rate")
        
        if avg_response_time > 5.0:
            recommendations.append("Optimize response time through caching or model optimization")
        
        total_escalations = sum(escalation_counts.values())
        if total_escalations > 0:
            l3_ratio = escalation_counts.get("3", 0) / total_escalations
            if l3_ratio > 0.2:
                recommendations.append("High L3 escalation rate - consider L1/L2 capability enhancement")
        
        if not recommendations:
            recommendations.append("Performance is within acceptable ranges")
        
        return recommendations
    
    async def cleanup_old_memories(self, days_to_keep: int = 90):
        """Clean up old memories to manage storage"""
        
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days_to_keep)
            cutoff_iso = cutoff_date.isoformat()
            
            for collection_name, collection in self.collections.items():
                # Get all documents
                all_docs = collection.get()
                
                # Find old documents
                old_doc_ids = []
                for i, metadata in enumerate(all_docs['metadatas']):
                    doc_timestamp = metadata.get('timestamp', '')
                    if doc_timestamp and doc_timestamp < cutoff_iso:
                        old_doc_ids.append(all_docs['ids'][i])
                
                # Delete old documents
                if old_doc_ids:
                    collection.delete(ids=old_doc_ids)
                    logger.info(f"Cleaned up {len(old_doc_ids)} old documents from {collection_name}")
            
        except Exception as e:
            logger.error(f"Failed to cleanup old memories: {str(e)}")
    
    async def get_memory_stats(self) -> Dict[str, Any]:
        """Get statistics about stored memories"""
        
        try:
            stats = {
                "collections": {},
                "total_documents": 0,
                "initialized": self.initialized
            }
            
            for collection_name, collection in self.collections.items():
                collection_data = collection.get()
                doc_count = len(collection_data['ids']) if collection_data['ids'] else 0
                
                stats["collections"][collection_name] = {
                    "document_count": doc_count,
                    "metadata": collection.metadata
                }
                stats["total_documents"] += doc_count
            
            return stats
            
        except Exception as e:
            logger.error(f"Failed to get memory stats: {str(e)}")
            return {"error": str(e)}

# Global memory system instance
memory_system = VectorMemorySystem()
