"""
Vector Memory System API Routes
Provides REST endpoints for memory management and retrieval
"""
from flask import Blueprint, request, jsonify
import logging
from typing import Dict, Any
from .vector_memory import memory_system
from .enhanced_models import AgentLearningData
from datetime import datetime
import asyncio

logger = logging.getLogger(__name__)

memory_bp = Blueprint('memory', __name__, url_prefix='/api/memory')

def run_async(coro):
    """Helper to run async functions in Flask routes"""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)

@memory_bp.route('/initialize', methods=['POST'])
def initialize_memory_system():
    """Initialize the vector memory system"""
    try:
        run_async(memory_system.initialize())
        return jsonify({
            "status": "success",
            "message": "Memory system initialized successfully"
        })
    except Exception as e:
        logger.error(f"Failed to initialize memory system: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@memory_bp.route('/interactions', methods=['POST'])
def store_interaction():
    """Store an agent interaction in memory"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('agent_id'):
            return jsonify({
                "status": "error",
                "message": "agent_id is required"
            }), 400
        
        if not data.get('interaction_data'):
            return jsonify({
                "status": "error",
                "message": "interaction_data is required"
            }), 400
        
        # Store interaction
        interaction_id = run_async(
            memory_system.store_interaction(
                agent_id=data['agent_id'],
                interaction_data=data['interaction_data'],
                collection_name=data.get('collection_name', 'agent_interactions')
            )
        )
        
        return jsonify({
            "status": "success",
            "interaction_id": interaction_id,
            "message": "Interaction stored successfully"
        })
        
    except Exception as e:
        logger.error(f"Failed to store interaction: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@memory_bp.route('/context', methods=['POST'])
def retrieve_context():
    """Retrieve relevant context based on query"""
    try:
        data = request.get_json()
        
        if not data.get('query'):
            return jsonify({
                "status": "error",
                "message": "query is required"
            }), 400
        
        # Retrieve context
        contexts = run_async(
            memory_system.retrieve_relevant_context(
                query=data['query'],
                agent_id=data.get('agent_id'),
                collection_name=data.get('collection_name', 'agent_interactions'),
                limit=data.get('limit', 5),
                similarity_threshold=data.get('similarity_threshold', 0.7)
            )
        )
        
        return jsonify({
            "status": "success",
            "contexts": contexts,
            "count": len(contexts)
        })
        
    except Exception as e:
        logger.error(f"Failed to retrieve context: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@memory_bp.route('/knowledge', methods=['POST'])
def store_knowledge():
    """Store cluster knowledge"""
    try:
        data = request.get_json()
        
        if not data.get('knowledge_data'):
            return jsonify({
                "status": "error",
                "message": "knowledge_data is required"
            }), 400
        
        # Store knowledge
        knowledge_id = run_async(
            memory_system.store_cluster_knowledge(
                knowledge_data=data['knowledge_data'],
                source=data.get('source', 'api')
            )
        )
        
        return jsonify({
            "status": "success",
            "knowledge_id": knowledge_id,
            "message": "Knowledge stored successfully"
        })
        
    except Exception as e:
        logger.error(f"Failed to store knowledge: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@memory_bp.route('/learning', methods=['POST'])
def store_learning_data():
    """Store agent learning data"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['agent_id', 'interaction_id', 'input_data', 'output_data']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    "status": "error",
                    "message": f"{field} is required"
                }), 400
        
        # Create learning data object
        learning_data = AgentLearningData(
            agent_id=data['agent_id'],
            interaction_id=data['interaction_id'],
            input_data=data['input_data'],
            output_data=data['output_data'],
            success=data.get('success', True),
            performance_score=data.get('performance_score'),
            context=data.get('context', {}),
            user_feedback=data.get('user_feedback'),
            timestamp=datetime.utcnow(),
            tags=data.get('tags', [])
        )
        
        # Store learning data
        stored_id = run_async(memory_system.store_learning_data(learning_data))
        
        return jsonify({
            "status": "success",
            "learning_id": stored_id,
            "message": "Learning data stored successfully"
        })
        
    except Exception as e:
        logger.error(f"Failed to store learning data: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@memory_bp.route('/insights/<agent_id>', methods=['GET'])
def get_performance_insights(agent_id: str):
    """Get performance insights for an agent"""
    try:
        days_back = request.args.get('days_back', 30, type=int)
        
        insights = run_async(
            memory_system.get_agent_performance_insights(
                agent_id=agent_id,
                days_back=days_back
            )
        )
        
        return jsonify({
            "status": "success",
            "insights": insights
        })
        
    except Exception as e:
        logger.error(f"Failed to get performance insights: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@memory_bp.route('/stats', methods=['GET'])
def get_memory_stats():
    """Get memory system statistics"""
    try:
        stats = run_async(memory_system.get_memory_stats())
        
        return jsonify({
            "status": "success",
            "stats": stats
        })
        
    except Exception as e:
        logger.error(f"Failed to get memory stats: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@memory_bp.route('/cleanup', methods=['POST'])
def cleanup_old_memories():
    """Clean up old memories"""
    try:
        data = request.get_json() or {}
        days_to_keep = data.get('days_to_keep', 90)
        
        run_async(memory_system.cleanup_old_memories(days_to_keep))
        
        return jsonify({
            "status": "success",
            "message": f"Cleaned up memories older than {days_to_keep} days"
        })
        
    except Exception as e:
        logger.error(f"Failed to cleanup memories: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@memory_bp.route('/search', methods=['POST'])
def search_memories():
    """Advanced memory search across collections"""
    try:
        data = request.get_json()
        
        if not data.get('query'):
            return jsonify({
                "status": "error",
                "message": "query is required"
            }), 400
        
        query = data['query']
        collections = data.get('collections', ['agent_interactions', 'cluster_knowledge'])
        limit_per_collection = data.get('limit_per_collection', 3)
        
        # Search across multiple collections
        all_results = {}
        
        for collection_name in collections:
            if collection_name in memory_system.collections:
                contexts = run_async(
                    memory_system.retrieve_relevant_context(
                        query=query,
                        collection_name=collection_name,
                        limit=limit_per_collection,
                        similarity_threshold=data.get('similarity_threshold', 0.6)
                    )
                )
                all_results[collection_name] = contexts
        
        return jsonify({
            "status": "success",
            "results": all_results,
            "query": query
        })
        
    except Exception as e:
        logger.error(f"Failed to search memories: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@memory_bp.route('/health', methods=['GET'])
def health_check():
    """Health check for memory system"""
    try:
        if not memory_system.initialized:
            return jsonify({
                "status": "warning",
                "message": "Memory system not initialized",
                "initialized": False
            }), 200
        
        # Get basic stats
        stats = run_async(memory_system.get_memory_stats())
        
        return jsonify({
            "status": "healthy",
            "message": "Memory system is operational",
            "initialized": True,
            "collections": len(stats.get('collections', {})),
            "total_documents": stats.get('total_documents', 0)
        })
        
    except Exception as e:
        logger.error(f"Memory system health check failed: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e),
            "initialized": False
        }), 500
