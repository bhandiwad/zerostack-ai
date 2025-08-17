"""
Context Sharing API Routes
Provides REST endpoints for cross-agent context sharing and memory synchronization
"""
from flask import Blueprint, request, jsonify
import logging
from typing import Dict, Any
from .context_sharing import context_manager
from .secure_a2a_messaging import MessagePriority
import asyncio
from datetime import datetime

logger = logging.getLogger(__name__)

context_bp = Blueprint('context_sharing', __name__, url_prefix='/api/context')

def run_async(coro):
    """Helper to run async functions in Flask routes"""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)

@context_bp.route('/share', methods=['POST'])
def share_context():
    """Share context from one agent to others"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['source_agent_id', 'context_type', 'content']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    "status": "error",
                    "message": f"Missing required field: {field}"
                }), 400
        
        context_id = run_async(context_manager.share_context(
            source_agent_id=data['source_agent_id'],
            context_type=data['context_type'],
            content=data['content'],
            access_level=data.get('access_level', 'public'),
            target_agents=data.get('target_agents'),
            expiry_hours=data.get('expiry_hours')
        ))
        
        return jsonify({
            "status": "success",
            "message": "Context shared successfully",
            "context_id": context_id
        })
        
    except Exception as e:
        logger.error(f"Failed to share context: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@context_bp.route('/<context_id>', methods=['GET'])
def get_context(context_id: str):
    """Retrieve shared context by ID"""
    try:
        requesting_agent_id = request.args.get('agent_id')
        
        if not requesting_agent_id:
            return jsonify({
                "status": "error",
                "message": "Missing agent_id parameter"
            }), 400
        
        context = run_async(context_manager.get_shared_context(context_id, requesting_agent_id))
        
        if not context:
            return jsonify({
                "status": "error",
                "message": "Context not found or access denied"
            }), 404
        
        return jsonify({
            "status": "success",
            "context": {
                "context_id": context.context_id,
                "source_agent_id": context.source_agent_id,
                "context_type": context.context_type,
                "content": context.content,
                "metadata": context.metadata,
                "access_level": context.access_level,
                "created_at": context.created_at.isoformat(),
                "updated_at": context.updated_at.isoformat(),
                "version": context.version
            }
        })
        
    except Exception as e:
        logger.error(f"Failed to get context {context_id}: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@context_bp.route('/search', methods=['GET'])
def search_contexts():
    """Search for shared contexts"""
    try:
        requesting_agent_id = request.args.get('agent_id')
        
        if not requesting_agent_id:
            return jsonify({
                "status": "error",
                "message": "Missing agent_id parameter"
            }), 400
        
        context_types = request.args.getlist('context_types')
        query = request.args.get('query')
        limit = request.args.get('limit', 20, type=int)
        
        contexts = run_async(context_manager.search_shared_contexts(
            requesting_agent_id=requesting_agent_id,
            context_types=context_types if context_types else None,
            query=query,
            limit=limit
        ))
        
        return jsonify({
            "status": "success",
            "contexts": [
                {
                    "context_id": context.context_id,
                    "source_agent_id": context.source_agent_id,
                    "context_type": context.context_type,
                    "content": context.content,
                    "metadata": context.metadata,
                    "access_level": context.access_level,
                    "created_at": context.created_at.isoformat(),
                    "updated_at": context.updated_at.isoformat()
                }
                for context in contexts
            ],
            "count": len(contexts)
        })
        
    except Exception as e:
        logger.error(f"Failed to search contexts: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@context_bp.route('/subscribe', methods=['POST'])
def subscribe_to_contexts():
    """Subscribe agent to specific context types"""
    try:
        data = request.get_json()
        
        agent_id = data.get('agent_id')
        context_types = data.get('context_types', [])
        
        if not agent_id or not context_types:
            return jsonify({
                "status": "error",
                "message": "Missing agent_id or context_types"
            }), 400
        
        run_async(context_manager.subscribe_to_context_types(agent_id, context_types))
        
        return jsonify({
            "status": "success",
            "message": f"Agent {agent_id} subscribed to context types: {context_types}"
        })
        
    except Exception as e:
        logger.error(f"Failed to subscribe to contexts: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@context_bp.route('/unsubscribe', methods=['POST'])
def unsubscribe_from_contexts():
    """Unsubscribe agent from specific context types"""
    try:
        data = request.get_json()
        
        agent_id = data.get('agent_id')
        context_types = data.get('context_types', [])
        
        if not agent_id or not context_types:
            return jsonify({
                "status": "error",
                "message": "Missing agent_id or context_types"
            }), 400
        
        run_async(context_manager.unsubscribe_from_context_types(agent_id, context_types))
        
        return jsonify({
            "status": "success",
            "message": f"Agent {agent_id} unsubscribed from context types: {context_types}"
        })
        
    except Exception as e:
        logger.error(f"Failed to unsubscribe from contexts: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@context_bp.route('/sync', methods=['POST'])
def synchronize_memory():
    """Synchronize memory between two agents"""
    try:
        data = request.get_json()
        
        source_agent_id = data.get('source_agent_id')
        target_agent_id = data.get('target_agent_id')
        sync_types = data.get('sync_types')
        
        if not source_agent_id or not target_agent_id:
            return jsonify({
                "status": "error",
                "message": "Missing source_agent_id or target_agent_id"
            }), 400
        
        results = run_async(context_manager.synchronize_agent_memory(
            source_agent_id=source_agent_id,
            target_agent_id=target_agent_id,
            sync_types=sync_types
        ))
        
        return jsonify({
            "status": "success",
            "message": "Memory synchronization completed",
            "results": results
        })
        
    except Exception as e:
        logger.error(f"Failed to synchronize memory: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@context_bp.route('/cleanup', methods=['POST'])
def cleanup_expired():
    """Clean up expired contexts"""
    try:
        cleaned_count = run_async(context_manager.cleanup_expired_contexts())
        
        return jsonify({
            "status": "success",
            "message": f"Cleaned up {cleaned_count} expired contexts",
            "cleaned_count": cleaned_count
        })
        
    except Exception as e:
        logger.error(f"Failed to cleanup expired contexts: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@context_bp.route('/stats', methods=['GET'])
def get_sharing_stats():
    """Get context sharing statistics"""
    try:
        stats = context_manager.get_context_sharing_stats()
        
        return jsonify({
            "status": "success",
            "stats": stats
        })
        
    except Exception as e:
        logger.error(f"Failed to get sharing stats: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@context_bp.route('/test', methods=['POST'])
def test_context_sharing():
    """Test context sharing system"""
    try:
        # Test sharing context
        test_context_id = run_async(context_manager.share_context(
            source_agent_id='test_agent_1',
            context_type='knowledge',
            content={
                'topic': 'kubernetes_troubleshooting',
                'solution': 'Check pod logs and resource limits',
                'confidence': 0.9,
                'test_data': True
            },
            access_level='public',
            expiry_hours=1
        ))
        
        # Test subscribing
        run_async(context_manager.subscribe_to_context_types(
            'test_agent_2', 
            ['knowledge', 'experience']
        ))
        
        # Test searching
        contexts = run_async(context_manager.search_shared_contexts(
            requesting_agent_id='test_agent_2',
            context_types=['knowledge'],
            limit=5
        ))
        
        # Test memory sync
        sync_results = run_async(context_manager.synchronize_agent_memory(
            source_agent_id='test_agent_1',
            target_agent_id='test_agent_2',
            sync_types=['knowledge']
        ))
        
        # Get stats
        stats = context_manager.get_context_sharing_stats()
        
        return jsonify({
            "status": "success",
            "message": "Context sharing test completed successfully",
            "test_results": {
                "context_shared": test_context_id,
                "contexts_found": len(contexts),
                "sync_results": sync_results,
                "system_stats": stats
            }
        })
        
    except Exception as e:
        logger.error(f"Context sharing test failed: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@context_bp.route('/health', methods=['GET'])
def health_check():
    """Health check for context sharing system"""
    try:
        stats = context_manager.get_context_sharing_stats()
        
        return jsonify({
            "status": "healthy",
            "message": "Context sharing system is operational",
            "total_contexts": stats.get('total_contexts', 0),
            "active_subscriptions": stats.get('active_subscriptions', 0),
            "recent_accesses": stats.get('recent_accesses', 0)
        })
        
    except Exception as e:
        logger.error(f"Context sharing health check failed: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
