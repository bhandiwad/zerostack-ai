from flask import Blueprint, request, jsonify
from typing import Dict, Any, List, Optional
import uuid
from datetime import datetime
import logging
from src.features.agents.capabilities import get_capability_instance

logger = logging.getLogger(__name__)

support_bp = Blueprint('support', __name__)

# In-memory storage for demo (in production, use a database)
tickets_storage: Dict[str, Dict[str, Any]] = {}
messages_storage: Dict[str, List[Dict[str, Any]]] = {}

@support_bp.route('/tickets', methods=['GET'])
def get_tickets():
    """Get all support tickets"""
    try:
        user_id = request.args.get('user_id', 'current_user')
        
        # Filter tickets by user (in production, implement proper auth)
        user_tickets = []
        for ticket_id, ticket in tickets_storage.items():
            if ticket.get('user_id') == user_id:
                # Add message count
                ticket_copy = ticket.copy()
                ticket_copy['message_count'] = len(messages_storage.get(ticket_id, []))
                user_tickets.append(ticket_copy)
        
        # Sort by updated_at descending
        user_tickets.sort(key=lambda x: x['updated_at'], reverse=True)
        
        return jsonify({
            'success': True,
            'tickets': user_tickets,
            'count': len(user_tickets)
        })
        
    except Exception as e:
        logger.error(f"Error getting tickets: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@support_bp.route('/tickets', methods=['POST'])
def create_ticket():
    """Create a new support ticket"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['title', 'description', 'user_id']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400
        
        # Create ticket
        ticket_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        
        ticket = {
            'id': ticket_id,
            'title': data['title'],
            'description': data['description'],
            'status': 'open',
            'priority': data.get('priority', 'medium'),
            'current_tier': 'L1',
            'user_id': data['user_id'],
            'created_at': now,
            'updated_at': now,
            'assigned_agent': None,
            'pagerduty_incident': None
        }
        
        tickets_storage[ticket_id] = ticket
        messages_storage[ticket_id] = []
        
        # Create initial message from user
        initial_message = {
            'id': str(uuid.uuid4()),
            'content': data['description'],
            'sender': 'user',
            'timestamp': now,
            'metadata': {}
        }
        messages_storage[ticket_id].append(initial_message)
        
        # Get L1 agent response
        l1_capability = get_capability_instance('support_l1', 'support_agent_l1')
        if l1_capability:
            try:
                # Note: In a real implementation, these would be async calls
                # For now, we'll simulate the response
                response = {
                    'success': True,
                    'data': {
                        'response': 'Thank you for contacting support. I will help you with your issue.',
                        'metadata': {}
                    }
                }
                
                if response.get('success'):
                    agent_response = {
                        'id': str(uuid.uuid4()),
                        'content': response['data'].get('response', 'Thank you for contacting support. I will help you with your issue.'),
                        'sender': 'agent',
                        'agent_tier': 'L1',
                        'timestamp': datetime.utcnow().isoformat(),
                        'metadata': response['data'].get('metadata', {})
                    }
                    messages_storage[ticket_id].append(agent_response)
                    
                    # Update ticket status
                    ticket['status'] = 'in_progress'
                    ticket['assigned_agent'] = 'L1 Support Agent'
                    ticket['updated_at'] = datetime.utcnow().isoformat()
                
            except Exception as e:
                logger.error(f"Error getting L1 response: {str(e)}")
        
        return jsonify({
            'success': True,
            'ticket_id': ticket_id,
            'message': 'Ticket created successfully'
        })
        
    except Exception as e:
        logger.error(f"Error creating ticket: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@support_bp.route('/tickets/<ticket_id>', methods=['GET'])
def get_ticket(ticket_id: str):
    """Get a specific ticket with messages"""
    try:
        if ticket_id not in tickets_storage:
            return jsonify({
                'success': False,
                'error': 'Ticket not found'
            }), 404
        
        ticket = tickets_storage[ticket_id].copy()
        ticket['messages'] = messages_storage.get(ticket_id, [])
        
        return jsonify({
            'success': True,
            'ticket': ticket
        })
        
    except Exception as e:
        logger.error(f"Error getting ticket {ticket_id}: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@support_bp.route('/tickets/<ticket_id>/messages', methods=['POST'])
def add_message(ticket_id: str):
    """Add a message to a ticket"""
    try:
        if ticket_id not in tickets_storage:
            return jsonify({
                'success': False,
                'error': 'Ticket not found'
            }), 404
        
        data = request.get_json()
        message_content = data.get('message', '').strip()
        user_id = data.get('user_id')
        
        if not message_content:
            return jsonify({
                'success': False,
                'error': 'Message content is required'
            }), 400
        
        ticket = tickets_storage[ticket_id]
        now = datetime.utcnow().isoformat()
        
        # Add user message
        user_message = {
            'id': str(uuid.uuid4()),
            'content': message_content,
            'sender': 'user',
            'timestamp': now,
            'metadata': {}
        }
        messages_storage[ticket_id].append(user_message)
        
        # Get agent response based on current tier
        current_tier = ticket['current_tier']
        capability_name = f'support_{current_tier.lower()}'
        
        agent_response = None
        capability = get_capability_instance(capability_name, f'support_agent_{current_tier.lower()}')
        
        if capability:
            try:
                # Simulate agent response for demo
                response = {
                    'success': True,
                    'data': {
                        'response': 'I understand your concern. Let me help you with that.',
                        'metadata': {},
                        'escalate': False
                    }
                }
                
                # Mock parameters for reference:
                # {
                #     'ticket_id': ticket_id,
                #     'user_message': message_content,
                #     'conversation_history': messages_storage[ticket_id],
                #     'ticket_priority': ticket['priority']
                # }
                
                if response.get('success'):
                    agent_response = {
                        'id': str(uuid.uuid4()),
                        'content': response['data'].get('response', 'I understand your concern. Let me help you with that.'),
                        'sender': 'agent',
                        'agent_tier': current_tier,
                        'timestamp': datetime.utcnow().isoformat(),
                        'metadata': response['data'].get('metadata', {})
                    }
                    messages_storage[ticket_id].append(agent_response)
                    
                    # Check if escalation is needed
                    if response['data'].get('escalate'):
                        escalate_ticket_internal(ticket_id, response['data'].get('escalation_reason'))
                
            except Exception as e:
                logger.error(f"Error getting agent response: {str(e)}")
                # Fallback response
                agent_response = {
                    'id': str(uuid.uuid4()),
                    'content': 'I received your message and am working on a response. Please give me a moment.',
                    'sender': 'agent',
                    'agent_tier': current_tier,
                    'timestamp': datetime.utcnow().isoformat(),
                    'metadata': {}
                }
                messages_storage[ticket_id].append(agent_response)
        
        # Update ticket
        ticket['updated_at'] = datetime.utcnow().isoformat()
        ticket['status'] = 'in_progress'
        
        return jsonify({
            'success': True,
            'user_message': user_message,
            'agent_response': agent_response
        })
        
    except Exception as e:
        logger.error(f"Error adding message to ticket {ticket_id}: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@support_bp.route('/tickets/<ticket_id>/escalate', methods=['POST'])
def escalate_ticket(ticket_id: str):
    """Escalate a ticket to the next tier"""
    try:
        if ticket_id not in tickets_storage:
            return jsonify({
                'success': False,
                'error': 'Ticket not found'
            }), 404
        
        result = escalate_ticket_internal(ticket_id)
        
        if result['success']:
            return jsonify({
                'success': True,
                'message': f'Ticket escalated to {result["new_tier"]}'
            })
        else:
            return jsonify({
                'success': False,
                'error': result['error']
            }), 400
        
    except Exception as e:
        logger.error(f"Error escalating ticket {ticket_id}: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

def escalate_ticket_internal(ticket_id: str, reason: str = "Manual escalation") -> Dict[str, Any]:
    """Internal function to escalate a ticket"""
    try:
        ticket = tickets_storage[ticket_id]
        current_tier = ticket['current_tier']
        
        # Determine next tier
        if current_tier == 'L1':
            new_tier = 'L2'
        elif current_tier == 'L2':
            new_tier = 'L3'
        else:
            return {
                'success': False,
                'error': 'Ticket is already at highest tier (L3)'
            }
        
        # Update ticket
        ticket['current_tier'] = new_tier
        ticket['status'] = 'escalated'
        ticket['assigned_agent'] = f'{new_tier} Support Agent'
        ticket['updated_at'] = datetime.utcnow().isoformat()
        
        # Add escalation message
        escalation_message = {
            'id': str(uuid.uuid4()),
            'content': f'This ticket has been escalated to {new_tier} support. {reason}',
            'sender': 'agent',
            'agent_tier': current_tier,
            'timestamp': datetime.utcnow().isoformat(),
            'metadata': {
                'escalation_reason': reason,
                'escalated_from': current_tier,
                'escalated_to': new_tier
            }
        }
        messages_storage[ticket_id].append(escalation_message)
        
        # Get initial response from new tier agent
        capability_name = f'support_{new_tier.lower()}'
        capability = get_capability_instance(capability_name, f'support_agent_{new_tier.lower()}')
        
        if capability:
            try:
                # Simulate escalation response for demo
                response = {
                    'success': True,
                    'data': {
                        'response': f'Hello, I am the {new_tier} support agent. I will take over this case and provide advanced assistance.',
                        'metadata': {},
                        'pagerduty_incident': f'PD-{ticket_id[:8]}' if new_tier == 'L3' else None
                    }
                }
                
                # Mock parameters for reference:
                # {
                #     'ticket_id': ticket_id,
                #     'escalation_reason': reason,
                #     'conversation_history': messages_storage[ticket_id],
                #     'ticket_priority': ticket['priority']
                # }
                
                if response.get('success'):
                    agent_response = {
                        'id': str(uuid.uuid4()),
                        'content': response['data'].get('response', f'Hello, I am the {new_tier} support agent. I will take over this case and provide advanced assistance.'),
                        'sender': 'agent',
                        'agent_tier': new_tier,
                        'timestamp': datetime.utcnow().isoformat(),
                        'metadata': response['data'].get('metadata', {})
                    }
                    messages_storage[ticket_id].append(agent_response)
                    
                    # Handle PagerDuty incident creation for L3
                    if new_tier == 'L3' and response['data'].get('pagerduty_incident'):
                        ticket['pagerduty_incident'] = response['data']['pagerduty_incident']
                
            except Exception as e:
                logger.error(f"Error getting {new_tier} escalation response: {str(e)}")
        
        return {
            'success': True,
            'new_tier': new_tier,
            'previous_tier': current_tier
        }
        
    except Exception as e:
        logger.error(f"Error in escalate_ticket_internal: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }

@support_bp.route('/tickets/<ticket_id>/close', methods=['POST'])
def close_ticket(ticket_id: str):
    """Close a support ticket"""
    try:
        if ticket_id not in tickets_storage:
            return jsonify({
                'success': False,
                'error': 'Ticket not found'
            }), 404
        
        data = request.get_json()
        resolution_note = data.get('resolution_note', 'Ticket resolved')
        
        ticket = tickets_storage[ticket_id]
        ticket['status'] = 'closed'
        ticket['updated_at'] = datetime.utcnow().isoformat()
        
        # Add closure message
        closure_message = {
            'id': str(uuid.uuid4()),
            'content': f'This ticket has been closed. Resolution: {resolution_note}',
            'sender': 'agent',
            'agent_tier': ticket['current_tier'],
            'timestamp': datetime.utcnow().isoformat(),
            'metadata': {
                'resolution_note': resolution_note,
                'closed_by': ticket['assigned_agent']
            }
        }
        messages_storage[ticket_id].append(closure_message)
        
        return jsonify({
            'success': True,
            'message': 'Ticket closed successfully'
        })
        
    except Exception as e:
        logger.error(f"Error closing ticket {ticket_id}: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@support_bp.route('/stats', methods=['GET'])
def get_support_stats():
    """Get support statistics"""
    try:
        total_tickets = len(tickets_storage)
        
        # Count by status
        status_counts = {}
        tier_counts = {}
        priority_counts = {}
        
        for ticket in tickets_storage.values():
            status = ticket['status']
            tier = ticket['current_tier']
            priority = ticket['priority']
            
            status_counts[status] = status_counts.get(status, 0) + 1
            tier_counts[tier] = tier_counts.get(tier, 0) + 1
            priority_counts[priority] = priority_counts.get(priority, 0) + 1
        
        return jsonify({
            'success': True,
            'stats': {
                'total_tickets': total_tickets,
                'status_breakdown': status_counts,
                'tier_breakdown': tier_counts,
                'priority_breakdown': priority_counts
            }
        })
        
    except Exception as e:
        logger.error(f"Error getting support stats: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
