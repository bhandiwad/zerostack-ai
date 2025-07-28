from flask import Blueprint, request, jsonify, current_app
from datetime import datetime
import uuid
import logging
from typing import Dict, Any, List, Optional, Union
from functools import wraps
from src.extensions import db
from src.models.agent import Agent, AgentConversation, AgentMessage, AgentActionLog
from src.features.agents.capabilities import (
    get_capability, list_capabilities, create_capability,
    ParameterSchema, ActionSchema, get_capability_instance
)

logger = logging.getLogger(__name__)

agents_bp = Blueprint('agents', __name__)

def capability_to_dict(capability) -> Dict[str, Any]:
    """Convert a capability instance to a dictionary with actions and parameters"""
    if not capability:
        return {}
        
    # Get the basic capability info
    result = {
        'name': capability.__class__.__name__,
        'description': capability.__doc__ or "",
        'config': getattr(capability, 'config', {})
    }
    
    # Add actions if available
    if hasattr(capability, 'get_actions'):
        try:
            actions = capability.get_actions()
            if actions:
                result['actions'] = [
                    {
                        'name': action['name'],
                        'description': action.get('description', ''),
                        'parameters': action.get('parameters', {})
                    }
                    for action in actions
                ]
        except Exception as e:
            logger.error(f"Error getting actions for capability {capability.__class__.__name__}: {str(e)}")
    
    return result

# Helper function to handle API responses
def api_response(data=None, status_code=200, message=None, error=None):
    """Helper function to standardize API responses"""
    response = {
        'success': status_code < 400,
        'data': data,
        'message': message,
        'error': error
    }
    return jsonify(response), status_code

# Authentication decorator (placeholder - implement your auth system)
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # TODO: Implement proper authentication
        return f(*args, **kwargs)
    return decorated_function

# Agent Management
@agents_bp.route('/api/agents', methods=['GET'])
@login_required
def get_agents():
    """
    Get all available agents
    ---
    tags:
      - Agents
    responses:
      200:
        description: List of agents
        schema:
          type: object
          properties:
            success:
              type: boolean
            data:
              type: array
              items:
                $ref: '#/definitions/Agent'
    """
    try:
        agents = Agent.query.all()
        return api_response(data=[agent.to_dict() for agent in agents])
    except Exception as e:
        logger.error(f"Error getting agents: {str(e)}")
        return api_response(error=str(e), status_code=500)

@agents_bp.route('/api/agents', methods=['POST'])
@login_required
def create_agent():
    """
    Create a new agent
    ---
    tags:
      - Agents
    parameters:
      - in: body
        name: body
        required: true
        schema:
          $ref: '#/definitions/Agent'
    responses:
      201:
        description: Created agent
        schema:
          $ref: '#/definitions/Agent'
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'type']
        for field in required_fields:
            if field not in data:
                return api_response(
                    error=f"Missing required field: {field}",
                    status_code=400
                )
        
        # Create new agent
        agent = Agent(
            name=data['name'],
            type=data['type'],
            description=data.get('description'),
            config=data.get('config', {}),
            status={
                'is_active': False,
                'health': 'unknown',
                'last_checked': None
            },
            capabilities=data.get('capabilities', []),
            metadata_=data.get('metadata', {})
        )
        
        db.session.add(agent)
        db.session.commit()
        
        return api_response(
            data=agent.to_dict(),
            status_code=201,
            message="Agent created successfully"
        )
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating agent: {str(e)}")
        return api_response(
            error=f"Failed to create agent: {str(e)}",
            status_code=500
        )

@agents_bp.route('/api/agents/<string:agent_id>', methods=['GET'])
@login_required
def get_agent(agent_id):
    """
    Get details for a specific agent
    ---
    tags:
      - Agents
    parameters:
      - name: agent_id
        in: path
        type: string
        required: true
        description: ID of the agent to retrieve
    responses:
      200:
        description: Agent details
        schema:
          $ref: '#/definitions/Agent'
      404:
        description: Agent not found
    """
    try:
        agent = Agent.query.get(agent_id)
        if not agent:
            return api_response(
                error="Agent not found",
                status_code=404
            )
            
        return api_response(data=agent.to_dict())
    except Exception as e:
        logger.error(f"Error getting agent: {str(e)}")
        return api_response(error=str(e), status_code=500)

@agents_bp.route('/api/agents/<string:agent_id>', methods=['PUT'])
@login_required
def update_agent(agent_id):
    """
    Update an existing agent
    ---
    tags:
      - Agents
    parameters:
      - name: agent_id
        in: path
        type: string
        required: true
        description: ID of the agent to update
      - in: body
        name: body
        required: true
        schema:
          $ref: '#/definitions/Agent'
    responses:
      200:
        description: Updated agent
        schema:
          $ref: '#/definitions/Agent'
      404:
        description: Agent not found
    """
    try:
        agent = Agent.query.get(agent_id)
        if not agent:
            return api_response(
                error="Agent not found",
                status_code=404
            )
            
        data = request.get_json()
        
        # Update fields if provided
        if 'name' in data:
            agent.name = data['name']
        if 'description' in data:
            agent.description = data['description']
        if 'type' in data:
            agent.type = data['type']
        if 'config' in data:
            agent.config = data['config']
        if 'status' in data:
            agent.status = data['status']
        if 'capabilities' in data:
            agent.capabilities = data['capabilities']
        if 'metadata' in data:
            agent.metadata_ = data['metadata']
            
        agent.updated_at = datetime.utcnow()
        db.session.commit()
        
        return api_response(
            data=agent.to_dict(),
            message="Agent updated successfully"
        )
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating agent {agent_id}: {str(e)}")
        return api_response(
            error=f"Failed to update agent: {str(e)}",
            status_code=500
        )

@agents_bp.route('/api/agents/<string:agent_id>', methods=['DELETE'])
@login_required
def delete_agent(agent_id):
    """
    Delete an agent
    ---
    tags:
      - Agents
    parameters:
      - name: agent_id
        in: path
        type: string
        required: true
        description: ID of the agent to delete
    responses:
      204:
        description: Agent deleted successfully
      404:
        description: Agent not found
    """
    try:
        agent = Agent.query.get(agent_id)
        if not agent:
            return api_response(
                error="Agent not found",
                status_code=404
            )
            
        db.session.delete(agent)
        db.session.commit()
        
        return api_response(
            status_code=204,
            message="Agent deleted successfully"
        )
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting agent {agent_id}: {str(e)}")
        return api_response(
            error=f"Failed to delete agent: {str(e)}",
            status_code=500
        )

@agents_bp.route('/api/agents/<string:agent_id>/status', methods=['POST'])
@login_required
def update_agent_status(agent_id):
    """
    Update agent status
    ---
    tags:
      - Agents
    parameters:
      - name: agent_id
        in: path
        type: string
        required: true
        description: ID of the agent
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            is_active:
              type: boolean
            health:
              type: string
              enum: [healthy, degraded, unhealthy, unknown]
            message:
              type: string
    responses:
      200:
        description: Status updated
        schema:
          $ref: '#/definitions/Agent'
      404:
        description: Agent not found
    """
    try:
        agent = Agent.query.get(agent_id)
        if not agent:
            return api_response(
                error="Agent not found",
                status_code=404
            )
            
        data = request.get_json()
        status_update = {}
        
        if 'is_active' in data:
            status_update['is_active'] = data['is_active']
        if 'health' in data:
            status_update['health'] = data['health']
        if 'message' in data:
            status_update['message'] = data['message']
            
        # Update last_active if the agent is being activated
        if data.get('is_active', False):
            agent.last_active = datetime.utcnow()
            
        agent.status = {**agent.status, **status_update}
        agent.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return api_response(
            data=agent.to_dict(),
            message="Agent status updated successfully"
        )
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating agent {agent_id} status: {str(e)}")
        return api_response(
            error=f"Failed to update agent status: {str(e)}",
            status_code=500
        )

# Helper function to log agent actions
def log_agent_action(agent_id, action, parameters=None, status='pending', result=None, error=None):
    """Log an agent action"""
    try:
        action_log = AgentActionLog(
            agent_id=agent_id,
            action=action,
            parameters=parameters or {},
            status=status,
            result=result,
            error=error,
            metadata={
                'ip_address': request.remote_addr,
                'user_agent': request.user_agent.string if request.user_agent else None
            }
        )
        
        db.session.add(action_log)
        db.session.commit()
        return action_log
        
    except Exception as e:
        logger.error(f"Error logging agent action: {str(e)}")
        return None

# Conversation Management
@agents_bp.route('/api/conversations', methods=['GET'])
@login_required
def get_conversations():
    """
    Get all conversations for the current user
    ---
    tags:
      - Conversations
    parameters:
      - name: agent_id
        in: query
        type: string
        required: false
        description: Filter conversations by agent ID
    responses:
      200:
        description: List of conversations
        schema:
          type: object
          properties:
            success:
              type: boolean
            data:
              type: array
              items:
                $ref: '#/definitions/Conversation'
    """
    try:
        agent_id = request.args.get('agent_id')
        query = AgentConversation.query
        
        if agent_id:
            query = query.filter_by(agent_id=agent_id)
            
        conversations = query.order_by(AgentConversation.updated_at.desc()).all()
        
        return api_response(data=[conv.to_dict() for conv in conversations])
        
    except Exception as e:
        logger.error(f"Error getting conversations: {str(e)}")
        return api_response(error=str(e), status_code=500)

@agents_bp.route('/api/conversations', methods=['POST'])
@login_required
def create_conversation():
    """
    Create a new conversation
    ---
    tags:
      - Conversations
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - title
            - agent_id
          properties:
            title:
              type: string
              description: Title of the conversation
            agent_id:
              type: string
              description: ID of the agent for this conversation
            metadata:
              type: object
              description: Additional metadata for the conversation
    responses:
      201:
        description: Created conversation
        schema:
          $ref: '#/definitions/Conversation'
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('title'):
            return api_response(
                error="Title is required",
                status_code=400
            )
            
        if not data.get('agent_id'):
            return api_response(
                error="Agent ID is required",
                status_code=400
            )
            
        # Verify agent exists
        agent = Agent.query.get(data['agent_id'])
        if not agent:
            return api_response(
                error=f"Agent {data['agent_id']} not found",
                status_code=404
            )
        
        # Create new conversation
        conversation = AgentConversation(
            title=data['title'],
            agent_id=data['agent_id'],
            metadata_=data.get('metadata', {})
        )
        
        db.session.add(conversation)
        db.session.commit()
        
        # Log the action
        log_agent_action(
            agent_id=data['agent_id'],
            action='conversation_created',
            parameters={'conversation_id': conversation.id},
            status='completed'
        )
        
        return api_response(
            data=conversation.to_dict(),
            status_code=201,
            message="Conversation created successfully"
        )
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating conversation: {str(e)}")
        return api_response(
            error=f"Failed to create conversation: {str(e)}",
            status_code=500
        )

@agents_bp.route('/api/conversations/<string:conversation_id>', methods=['GET'])
@login_required
def get_conversation(conversation_id):
    """
    Get a specific conversation with its messages
    ---
    tags:
      - Conversations
    parameters:
      - name: conversation_id
        in: path
        type: string
        required: true
        description: ID of the conversation to retrieve
    responses:
      200:
        description: Conversation with messages
        schema:
          $ref: '#/definitions/ConversationWithMessages'
      404:
        description: Conversation not found
    """
    try:
        # Get conversation with messages
        conversation = AgentConversation.query.get(conversation_id)
        if not conversation:
            return api_response(
                error="Conversation not found",
                status_code=404
            )
        
        # Get messages ordered by timestamp
        messages = AgentMessage.query.filter_by(
            conversation_id=conversation_id
        ).order_by(AgentMessage.timestamp.asc()).all()
        
        result = conversation.to_dict()
        result['messages'] = [msg.to_dict() for msg in messages]
        
        return api_response(data=result)
        
    except Exception as e:
        logger.error(f"Error getting conversation {conversation_id}: {str(e)}")
        return api_response(
            error=f"Failed to get conversation: {str(e)}",
            status_code=500
        )

# Message Handling
@agents_bp.route('/api/messages', methods=['POST'])
@login_required
def send_message():
    """
    Send a message to an agent
    ---
    tags:
      - Messages
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - conversation_id
            - content
            - sender
          properties:
            conversation_id:
              type: string
              description: ID of the conversation
            content:
              type: string
              description: Message content
            sender:
              type: string
              enum: [user, agent, system]
              description: Sender type
            metadata:
              type: object
              description: Additional metadata for the message
    responses:
      201:
        description: Created message
        schema:
          $ref: '#/definitions/Message'
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['conversation_id', 'content', 'sender']
        for field in required_fields:
            if not data.get(field):
                return api_response(
                    error=f"{field} is required",
                    status_code=400
                )
                
        # Verify conversation exists
        conversation = AgentConversation.query.get(data['conversation_id'])
        if not conversation:
            return api_response(
                error="Conversation not found",
                status_code=404
            )
            
        # Verify sender is valid
        valid_senders = ['user', 'agent', 'system']
        if data['sender'] not in valid_senders:
            return api_response(
                error=f"Invalid sender. Must be one of: {', '.join(valid_senders)}",
                status_code=400
            )
            
        # Create new message
        message = AgentMessage(
            conversation_id=data['conversation_id'],
            content=data['content'],
            sender=data['sender'],
            metadata_=data.get('metadata', {})
        )
        
        db.session.add(message)
        
        # Update conversation's updated_at timestamp
        conversation.updated_at = datetime.utcnow()
        
        # If this is a user message, log the action
        if data['sender'] == 'user':
            log_agent_action(
                agent_id=conversation.agent_id,
                action='message_received',
                parameters={
                    'conversation_id': conversation.id,
                    'message_id': message.id
                },
                status='completed'
            )
        
        db.session.commit()
        
        # Get the full message with ID and timestamps
        message_data = message.to_dict()
        
        return api_response(
            data=message_data,
            status_code=201,
            message="Message sent successfully"
        )
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error sending message: {str(e)}")
        return api_response(
            error=f"Failed to send message: {str(e)}",
            status_code=500
        )

@agents_bp.route('/api/conversations/<string:conversation_id>/messages', methods=['GET'])
@login_required
def get_messages(conversation_id):
    """
    Get messages for a conversation
    ---
    tags:
      - Messages
    parameters:
      - name: conversation_id
        in: path
        type: string
        required: true
        description: ID of the conversation
      - name: limit
        in: query
        type: integer
        required: false
        description: Maximum number of messages to return
      - name: offset
        in: query
        type: integer
        required: false
        description: Number of messages to skip
    responses:
      200:
        description: List of messages
        schema:
          type: object
          properties:
            success:
              type: boolean
            data:
              type: array
              items:
                $ref: '#/definitions/Message'
    """
    try:
        # Verify conversation exists
        conversation = AgentConversation.query.get(conversation_id)
        if not conversation:
            return api_response(
                error="Conversation not found",
                status_code=404
            )
        
        # Get pagination parameters
        limit = min(int(request.args.get('limit', 50)), 100)  # Max 100 messages per request
        offset = int(request.args.get('offset', 0))
        
        # Get messages with pagination
        query = AgentMessage.query.filter_by(conversation_id=conversation_id)
        total = query.count()
        messages = query.order_by(AgentMessage.timestamp.asc()).offset(offset).limit(limit).all()
        
        return api_response({
            'items': [msg.to_dict() for msg in messages],
            'total': total,
            'offset': offset,
            'limit': limit
        })
        
    except Exception as e:
        logger.error(f"Error getting messages for conversation {conversation_id}: {str(e)}")
        return api_response(
            error=f"Failed to get messages: {str(e)}",
            status_code=500
        )
            content=data['content'],
            sender='user',
            metadata=data.get('metadata', {})
        )
        
        db.session.add(user_message)
        
        # Get agent response (placeholder - implement actual agent logic)
        agent_response = models['AgentMessage'](
            id=str(uuid.uuid4()),
            conversation_id=data['conversation_id'],
            content=f"Received your message: {data['content']}",
            sender='agent',
            metadata={"type": "text"}
        )
        
        db.session.add(agent_response)
        db.session.commit()
        
        # Update conversation timestamp
        conversation = models['AgentConversation'].query.get(data['conversation_id'])
        if conversation:
            conversation.updated_at = datetime.utcnow()
            db.session.commit()
        
        return jsonify({
            'success': True,
            'data': {
                'user_message': user_message.to_dict(),
                'agent_response': agent_response.to_dict()
            }
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Agent Capabilities
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
        })
    except Exception as e:
        logger.error(f"Error listing capabilities: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Agent Capability Management
@agents_bp.route('/agents/<string:agent_id>/capabilities', methods=['GET'])
def get_agent_capabilities(agent_id):
    """Get all capabilities for an agent with their actions and parameters"""
    try:
        # Get models from app context
        models = current_app.extensions['models']
        
        # Get the agent
        agent = models['Agent'].query.get_or_404(agent_id)
        
        # Get all available capabilities
        capabilities = list_capabilities()
        
        # Create capability instances with agent config
        capability_instances = []
        for name, capability_cls in getattr(current_app, 'capability_registry', {}).items():
            try:
                # Create a new instance of the capability
                capability = capability_cls(agent_id=agent_id, config={})
                # Initialize it
                capability.initialize()
                # Convert to dict with actions and parameters
                capability_dict = capability_to_dict(capability)
                if capability_dict:
                    capability_instances.append(capability_dict)
            except Exception as e:
                logger.error(f"Error initializing capability {name}: {str(e)}")
                # Return basic info if initialization fails
                capability_instances.append({
                    'name': name,
                    'description': capabilities.get(name, "No description available"),
                    'error': f"Failed to initialize: {str(e)}"
                })
        
        return jsonify({
            'success': True,
            'data': capability_instances
        })
    except Exception as e:
        logger.error(f"Error getting agent capabilities: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@agents_bp.route('/agents/<string:agent_id>/capabilities/<string:capability_name>', methods=['GET'])
def get_agent_capability(agent_id, capability_name):
    """Get details for a specific agent capability including actions and parameters"""
    try:
        # Get models from app context
        models = current_app.extensions['models']
        
        # Get the agent
        agent = models['Agent'].query.get_or_404(agent_id)
        
        # Get the capability class
        capability_cls = get_capability(capability_name)
        if not capability_cls:
            return jsonify({
                'success': False,
                'error': f'Capability {capability_name} not found'
            }), 404
        
        try:
            # Create an instance of the capability
            capability = capability_cls(agent_id=agent_id, config={})
            # Initialize it
            capability.initialize()
            # Convert to dict with actions and parameters
            capability_dict = capability_to_dict(capability)
            
            if not capability_dict:
                raise ValueError("Failed to get capability details")
                
            return jsonify({
                'success': True,
                'data': capability_dict
            })
            
        except Exception as e:
            logger.error(f"Error initializing capability {capability_name}: {str(e)}")
            # Return basic info if initialization fails
            return jsonify({
                'success': True,
                'data': {
                    'name': capability_name,
                    'description': capability_cls.__doc__ or "No description available",
                    'error': f"Failed to initialize: {str(e)}"
                }
            })
            
    except Exception as e:
        logger.error(f"Error getting agent capability: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Capability Actions
@agents_bp.route('/agents/<string:agent_id>/capabilities/<string:capability_name>/<string:action>', 
                methods=['POST'])
def execute_capability_action(agent_id, capability_name, action):
    """Execute an action on an agent capability"""
    try:
        # Get models from app context
        models = current_app.extensions['models']
        
        # Get the agent
        agent = models['Agent'].query.get_or_404(agent_id)
        
        # Get the capability
        capability_cls = get_capability(capability_name)
        if not capability_cls:
            return jsonify({
                'success': False,
                'error': f'Capability not found: {capability_name}'
            }), 404
        
        # Get action parameters from request
        parameters = request.get_json() or {}
        
        # Create a new instance of the capability
        capability = capability_cls(agent_id=agent_id, config={})
        
        # Execute the action
        result = capability.execute(action, parameters)
        
        return jsonify({
            'success': True,
            'data': result
        })
        
    except Exception as e:
        logger.error(f"Error executing capability action: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Agent Actions
@agents_bp.route('/agents/<string:agent_id>/actions', methods=['POST'])
def execute_agent_action(agent_id):
    """Execute an agent action (legacy endpoint)"""
    try:
        # Get models from app context
        models = current_app.extensions['models']
        
        # Get the agent
        agent = models['Agent'].query.get_or_404(agent_id)
        
        # Get action data from request
        data = request.get_json()
        action = data.get('action')
        parameters = data.get('parameters', {})
        
        if not action:
            return jsonify({
                'success': False,
                'error': 'Action is required'
            }), 400
        
        # Check if this is a capability action
        if '.' in action:
            capability_name, action_name = action.split('.', 1)
            return execute_capability_action(agent_id, capability_name, action_name)
        
        # Legacy action handling
        logger.info(f"Executing legacy action '{action}' on agent {agent_id}")
        
        return jsonify({
            'success': True,
            'data': {
                'action': action,
                'status': 'completed',
                'result': f"Action '{action}' executed successfully"
            }
        })
        
    except Exception as e:
        logger.error(f"Error executing agent action: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
