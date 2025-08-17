"""
A2A Messaging API Routes
Provides REST endpoints for secure agent-to-agent communication
"""
from flask import Blueprint, request, jsonify
import logging
from typing import Dict, Any
from .secure_a2a_messaging import secure_messaging, MessagePriority
from .enhanced_models import AgentConfig
from datetime import datetime
import asyncio

logger = logging.getLogger(__name__)

a2a_bp = Blueprint('a2a_messaging', __name__, url_prefix='/api/a2a')

def run_async(coro):
    """Helper to run async functions in Flask routes"""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)

@a2a_bp.route('/agents/<agent_id>/initialize', methods=['POST'])
def initialize_agent(agent_id: str):
    """Initialize an agent in the messaging system"""
    try:
        data = request.get_json() or {}
        
        # Create basic agent config
        agent_config = AgentConfig(
            agent_id=agent_id,
            name=data.get('name', f'Agent {agent_id}'),
            capabilities=data.get('capabilities', []),
            ai_endpoint_id=data.get('ai_endpoint_id'),
            memory_config=data.get('memory_config', {}),
            collaboration_rules=data.get('collaboration_rules', {}),
            performance_thresholds=data.get('performance_thresholds', {})
        )
        
        result = run_async(secure_messaging.initialize_agent(agent_id, agent_config))
        
        return jsonify({
            "status": "success",
            "message": f"Agent {agent_id} initialized successfully",
            "data": result
        })
        
    except Exception as e:
        logger.error(f"Failed to initialize agent {agent_id}: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@a2a_bp.route('/messages/send', methods=['POST'])
def send_message():
    """Send a secure message between agents"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['sender_id', 'recipient_id', 'message_type', 'payload']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    "status": "error",
                    "message": f"Missing required field: {field}"
                }), 400
        
        # Parse priority
        priority_str = data.get('priority', 'normal').lower()
        try:
            priority = MessagePriority(priority_str)
        except ValueError:
            priority = MessagePriority.NORMAL
        
        # Send message
        message_id = run_async(secure_messaging.send_message(
            sender_id=data['sender_id'],
            recipient_id=data['recipient_id'],
            message_type=data['message_type'],
            payload=data['payload'],
            priority=priority,
            ttl_seconds=data.get('ttl_seconds', 300),
            requires_ack=data.get('requires_ack', True)
        ))
        
        return jsonify({
            "status": "success",
            "message": "Message sent successfully",
            "message_id": message_id
        })
        
    except Exception as e:
        logger.error(f"Failed to send message: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@a2a_bp.route('/agents/<agent_id>/messages', methods=['GET'])
def receive_messages(agent_id: str):
    """Receive messages for an agent"""
    try:
        max_messages = request.args.get('max_messages', 10, type=int)
        
        messages = run_async(secure_messaging.receive_messages(agent_id, max_messages))
        
        return jsonify({
            "status": "success",
            "agent_id": agent_id,
            "messages": messages,
            "count": len(messages)
        })
        
    except Exception as e:
        logger.error(f"Failed to receive messages for agent {agent_id}: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@a2a_bp.route('/agents/<agent_id>/status', methods=['GET'])
def get_agent_status(agent_id: str):
    """Get status information for an agent"""
    try:
        status = secure_messaging.get_agent_status(agent_id)
        
        return jsonify({
            "status": "success",
            "agent_status": status
        })
        
    except Exception as e:
        logger.error(f"Failed to get agent status for {agent_id}: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@a2a_bp.route('/stats', methods=['GET'])
def get_messaging_stats():
    """Get messaging system statistics"""
    try:
        stats = secure_messaging.get_messaging_stats()
        
        return jsonify({
            "status": "success",
            "stats": stats
        })
        
    except Exception as e:
        logger.error(f"Failed to get messaging stats: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@a2a_bp.route('/cleanup', methods=['POST'])
def cleanup_expired_messages():
    """Clean up expired messages"""
    try:
        run_async(secure_messaging.cleanup_expired_messages())
        
        return jsonify({
            "status": "success",
            "message": "Expired messages cleaned up successfully"
        })
        
    except Exception as e:
        logger.error(f"Failed to cleanup expired messages: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@a2a_bp.route('/agents', methods=['GET'])
def list_active_agents():
    """List all active agents in the messaging system"""
    try:
        agents = []
        for agent_id in secure_messaging.active_agents:
            status = secure_messaging.get_agent_status(agent_id)
            agents.append(status)
        
        return jsonify({
            "status": "success",
            "agents": agents,
            "count": len(agents)
        })
        
    except Exception as e:
        logger.error(f"Failed to list active agents: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@a2a_bp.route('/test', methods=['POST'])
def test_messaging_system():
    """Test the messaging system with sample agents"""
    try:
        # Initialize test agents
        test_agents = ['agent_1', 'agent_2']
        
        for agent_id in test_agents:
            agent_config = AgentConfig(
                agent_id=agent_id,
                name=f'Test Agent {agent_id}',
                capabilities=['test_capability'],
                ai_endpoint_id='test_endpoint',
                memory_config={},
                collaboration_rules={},
                performance_thresholds={}
            )
            run_async(secure_messaging.initialize_agent(agent_id, agent_config))
        
        # Send test message
        test_payload = {
            'test_data': 'Hello from agent_1',
            'timestamp': datetime.utcnow().isoformat(),
            'test_number': 42
        }
        
        message_id = run_async(secure_messaging.send_message(
            sender_id='agent_1',
            recipient_id='agent_2',
            message_type='test_message',
            payload=test_payload,
            priority=MessagePriority.NORMAL
        ))
        
        # Receive messages
        messages = run_async(secure_messaging.receive_messages('agent_2', 1))
        
        # Get stats
        stats = secure_messaging.get_messaging_stats()
        
        return jsonify({
            "status": "success",
            "message": "Messaging system test completed successfully",
            "test_results": {
                "message_sent": message_id,
                "messages_received": len(messages),
                "message_content": messages[0] if messages else None,
                "system_stats": stats
            }
        })
        
    except Exception as e:
        logger.error(f"Messaging system test failed: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@a2a_bp.route('/health', methods=['GET'])
def health_check():
    """Health check for A2A messaging system"""
    try:
        stats = secure_messaging.get_messaging_stats()
        
        return jsonify({
            "status": "healthy",
            "message": "A2A messaging system is operational",
            "active_agents": stats.get('active_agents', 0),
            "total_messages": stats.get('total_messages', 0),
            "average_queue_size": stats.get('average_queue_size', 0)
        })
        
    except Exception as e:
        logger.error(f"A2A messaging health check failed: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
