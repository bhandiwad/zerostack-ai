from flask import Blueprint, request, jsonify, current_app, abort
from datetime import datetime
import uuid
import logging
from typing import Dict, Any, List, Optional, Union
from functools import wraps
from src.extensions import db
from src.models.agent_models import Agent as AgentModel, AgentConversation, AgentMessage, AgentActionLog
from src.features.agents.capabilities import (
    get_capability, list_capabilities, create_capability,
    ParameterSchema, ActionSchema, get_capability_instance
)
from src.services.openai_service import OpenAIService
from src.models.agent_models import AgentStatus

logger = logging.getLogger(__name__)

agents_bp = Blueprint('agents', __name__)

def capability_to_dict(capability) -> Dict[str, Any]:
    """Convert a capability instance to a dictionary with actions and parameters"""
    if not capability:
        return {}
        
    result = {
        'name': capability.__class__.__name__,
        'description': capability.__doc__ or "",
        'config': getattr(capability, 'config', {})
    }
    
    if hasattr(capability, 'actions'):
        result['actions'] = [
            {
                'name': name,
                'description': action.get('description', ''),
                'parameters': action.get('parameters', [])
            }
            for name, action in capability.actions.items()
        ]
    
    return result

def agent_to_dict(agent: AgentModel) -> Dict[str, Any]:
    """Convert an Agent model instance to a dictionary"""
    if not agent:
        return {}
    
    metadata = getattr(agent, 'metadata_', {}) or {}
    
    return {
        'id': agent.id,
        'name': agent.name,
        'description': agent.description or "",
        'type': getattr(agent, 'type', ''),
        'status': agent.status.value if agent.status else AgentStatus.OFFLINE.value,
        'capabilities': [
            {'name': cap, 'description': (get_capability(cap).__doc__ or '').strip().split('\n')[0]} 
            for cap in (getattr(agent, 'capabilities', []) or [])
        ],
        'created_at': agent.created_at.isoformat() if agent.created_at else None,
        'updated_at': agent.updated_at.isoformat() if agent.updated_at else None,
        'last_active': agent.last_active.isoformat() if hasattr(agent, 'last_active') and agent.last_active else None,
        'metadata': metadata
    }

@agents_bp.route('/agents', methods=['GET'])
def list_agents():
    """List all agents"""
    try:
        with db.session.no_autoflush:
            agents = db.session.query(AgentModel).all()
            agents_data = [agent_to_dict(agent) for agent in agents]
        
        return jsonify({
            'success': True,
            'data': agents_data
        }), 200
        
    except Exception as e:
        logger.error(f"Error listing agents: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': f'Failed to list agents: {str(e)}'
        }), 500

@agents_bp.route('/agents', methods=['POST'])
def create_agent():
    """Create a new agent"""
    try:
        data = request.get_json()
        if not data or 'name' not in data or 'type' not in data:
            return jsonify({'success': False, 'error': 'Name and type are required'}), 400

        status_str = str(data.get('status', 'OFFLINE')).strip('"').upper()
        try:
            status_enum = AgentStatus[status_str]
        except KeyError:
            return jsonify({'success': False, 'error': f'Invalid status: {status_str}'}), 400

        new_agent = AgentModel(
            id=str(uuid.uuid4()),
            name=data['name'],
            description=data.get('description', ''),
            type=data['type'],
            config=data.get('config', {}),
            status=status_enum,
            capabilities=data.get('capabilities', [])
        )
        
        db.session.add(new_agent)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': agent_to_dict(new_agent)
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating agent: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@agents_bp.route('/agents/<string:agent_id>', methods=['GET'])
def get_agent(agent_id):
    """Get details for a specific agent"""
    try:
        agent = db.session.query(AgentModel).get(agent_id)
        if not agent:
            return jsonify({'success': False, 'error': 'Agent not found'}), 404
        
        return jsonify({
            'success': True,
            'data': agent_to_dict(agent)
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting agent {agent_id}: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@agents_bp.route('/agents/capabilities', methods=['GET'])
def list_available_capabilities():
    """List all available agent capabilities"""
    try:
        capabilities = list_capabilities()
        return jsonify({
            'success': True,
            'data': [
                {'name': name, 'description': desc}
                for name, desc in capabilities.items()
            ]
        }), 200
        
    except Exception as e:
        logger.error(f"Error listing capabilities: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@agents_bp.route('/agents/<string:agent_id>/capabilities', methods=['POST'])
def add_agent_capability(agent_id):
    """Add a capability to a specific agent"""
    try:
        agent = db.session.query(AgentModel).get(agent_id)
        if not agent:
            return jsonify({'success': False, 'error': 'Agent not found'}), 404

        data = request.get_json()
        if not data or 'name' not in data:
            return jsonify({'success': False, 'error': 'Capability name is required'}), 400

        capability_name = data['name']
        
        if not get_capability(capability_name):
            return jsonify({'success': False, 'error': f'Invalid capability: {capability_name}'}), 400

        current_capabilities_list = agent.capabilities or []
        if capability_name in current_capabilities_list:
            return jsonify({'success': False, 'error': f'Capability {capability_name} already exists for this agent'}), 400

        new_capabilities = sorted(current_capabilities_list + [capability_name])
        agent.capabilities = new_capabilities
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': agent_to_dict(agent)
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error adding capability to agent {agent_id}: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@agents_bp.route('/agents/<string:agent_id>/capabilities/<string:capability_name>', methods=['DELETE'])
def remove_agent_capability(agent_id, capability_name):
    """Remove a capability from a specific agent"""
    try:
        agent = db.session.query(AgentModel).get(agent_id)
        if not agent:
            return jsonify({'success': False, 'error': 'Agent not found'}), 404

        current_capabilities_list = agent.capabilities or []
        if capability_name not in current_capabilities_list:
            return jsonify({'success': False, 'error': f'Capability {capability_name} not found for this agent'}), 400

        new_capabilities = [cap for cap in current_capabilities_list if cap != capability_name]
        agent.capabilities = new_capabilities
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': agent_to_dict(agent)
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error removing capability from agent {agent_id}: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@agents_bp.route('/conversations', methods=['POST'])
def create_conversation():
    """Create a new conversation for an agent."""
    data = request.get_json()
    if not data or 'agentId' not in data:
        return jsonify({'success': False, 'error': 'agentId is required'}), 400

    agent = db.session.query(AgentModel).get(data['agentId'])
    if not agent:
        return jsonify({'success': False, 'error': 'Agent not found'}), 404

    conversation = AgentConversation(
        id=str(uuid.uuid4()),
        agent_id=agent.id,
        title=data.get('title', 'New Conversation')
    )
    db.session.add(conversation)
    db.session.commit()

    return jsonify({'success': True, 'data': conversation.to_dict()}), 201


@agents_bp.route('/conversations/<string:conversation_id>/messages', methods=['POST'])
def send_message(conversation_id):
    """Send a message in a conversation and get a reply from the agent."""
    data = request.get_json()
    if not data or 'content' not in data:
        return jsonify({'success': False, 'error': 'Message content is required'}), 400

    conversation = db.session.query(AgentConversation).get(conversation_id)
    if not conversation:
        return jsonify({'success': False, 'error': 'Conversation not found'}), 404

    # Save user message
    user_message = AgentMessage(
        id=str(uuid.uuid4()),
        conversation_id=conversation.id,
        sender='user',
        content=data['content']
    )
    db.session.add(user_message)

    # Get AI response
    try:
        openai_service = OpenAIService()
        prompt = data['content']
        ai_response_content = openai_service.get_completion(prompt)
    except Exception as e:
        logger.error(f"Error getting completion from OpenAI: {e}", exc_info=True)
        return jsonify({'success': False, 'error': 'Failed to get response from AI agent.'}), 500

    # Save agent message
    agent_message = AgentMessage(
        id=str(uuid.uuid4()),
        conversation_id=conversation.id,
        sender='agent',
        content=ai_response_content
    )
    db.session.add(agent_message)
    db.session.commit()

    return jsonify({'success': True, 'data': agent_message.to_dict()}), 201


@agents_bp.route('/agents/<string:agent_id>/conversations', methods=['GET'])
def get_agent_conversations(agent_id):
    """Get all conversations for a specific agent."""
    agent = db.session.query(AgentModel).get(agent_id)
    if not agent:
        return jsonify({'success': False, 'error': 'Agent not found'}), 404

    conversations = db.session.query(AgentConversation).filter_by(agent_id=agent_id).all()
    return jsonify({'success': True, 'data': [c.to_dict() for c in conversations]})


@agents_bp.route('/conversations/<string:conversation_id>', methods=['GET'])
def get_conversation_messages(conversation_id):
    """Get all messages for a specific conversation."""
    conversation = db.session.query(AgentConversation).get(conversation_id)
    if not conversation:
        return jsonify({'success': False, 'error': 'Conversation not found'}), 404

    return jsonify({'success': True, 'data': conversation.to_dict(include_messages=True)})
