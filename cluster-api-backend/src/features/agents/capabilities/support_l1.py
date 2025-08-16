import asyncio
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from .base import AgentCapability
from src.services.openai_service import OpenAIService
import logging
import json
import re
from enum import Enum

logger = logging.getLogger(__name__)

class TicketPriority(str, Enum):
    LOW = 'low'
    MEDIUM = 'medium'
    HIGH = 'high'
    CRITICAL = 'critical'

class TicketStatus(str, Enum):
    OPEN = 'open'
    IN_PROGRESS = 'in_progress'
    RESOLVED = 'resolved'
    ESCALATED = 'escalated'
    CLOSED = 'closed'

class SupportTicket:
    """Represents a support ticket"""
    
    def __init__(self, 
                 ticket_id: str,
                 user_id: str,
                 subject: str,
                 description: str,
                 priority: TicketPriority = TicketPriority.MEDIUM,
                 category: Optional[str] = None):
        self.ticket_id = ticket_id
        self.user_id = user_id
        self.subject = subject
        self.description = description
        self.priority = priority
        self.category = category
        self.status = TicketStatus.OPEN
        self.created_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
        self.resolved_at = None
        self.escalated_at = None
        self.resolution = None
        self.escalation_reason = None
        self.conversation_history: List[Dict[str, Any]] = []
        self.tags: List[str] = []
        self.assigned_agent = 'L1'
    
    def add_message(self, sender: str, message: str, message_type: str = 'text'):
        """Add a message to the conversation history"""
        self.conversation_history.append({
            'timestamp': datetime.utcnow().isoformat(),
            'sender': sender,
            'message': message,
            'type': message_type
        })
        self.updated_at = datetime.utcnow()
    
    def escalate(self, reason: str, target_level: str = 'L2'):
        """Escalate the ticket to the next level"""
        self.status = TicketStatus.ESCALATED
        self.escalated_at = datetime.utcnow()
        self.escalation_reason = reason
        self.assigned_agent = target_level
        self.updated_at = datetime.utcnow()
    
    def resolve(self, resolution: str):
        """Mark the ticket as resolved"""
        self.status = TicketStatus.RESOLVED
        self.resolved_at = datetime.utcnow()
        self.resolution = resolution
        self.updated_at = datetime.utcnow()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert ticket to dictionary"""
        return {
            'ticket_id': self.ticket_id,
            'user_id': self.user_id,
            'subject': self.subject,
            'description': self.description,
            'priority': self.priority.value,
            'category': self.category,
            'status': self.status.value,
            'assigned_agent': self.assigned_agent,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None,
            'escalated_at': self.escalated_at.isoformat() if self.escalated_at else None,
            'resolution': self.resolution,
            'escalation_reason': self.escalation_reason,
            'conversation_history': self.conversation_history,
            'tags': self.tags
        }

class SupportL1Capability(AgentCapability):
    """
    L1 Support Agent Capability - First line of support.
    Handles basic inquiries, FAQs, and simple troubleshooting using AI chatbot.
    Escalates complex issues to L2 support.
    """
    
    def __init__(self, agent_id: str, config: Optional[Dict[str, Any]] = None):
        super().__init__(agent_id, config)
        self.tickets: Dict[str, SupportTicket] = {}
        self.openai_service: Optional[OpenAIService] = None
        self.knowledge_base = self._load_knowledge_base()
        self.escalation_keywords = [
            'bug', 'error', 'crash', 'performance', 'slow', 'timeout',
            'security', 'vulnerability', 'breach', 'unauthorized',
            'data loss', 'corruption', 'integration', 'api'
        ]
        self.auto_resolve_confidence_threshold = 0.8
    
    async def _initialize(self):
        """Initialize the L1 support capability"""
        try:
            logger.info("Initializing SupportL1Capability")
            self.openai_service = OpenAIService()
            logger.info("SupportL1Capability initialized")
        except Exception as e:
            logger.error(f"Failed to initialize L1 support capability: {str(e)}")
            raise
    
    def _load_knowledge_base(self) -> Dict[str, Any]:
        """Load the knowledge base with common FAQs and solutions"""
        return {
            'faqs': [
                {
                    'question': 'How do I scale my Kubernetes deployment?',
                    'answer': 'You can scale deployments using the cluster management interface. Navigate to Deployments, select your deployment, and use the scale action to adjust replica count.',
                    'category': 'scaling',
                    'keywords': ['scale', 'deployment', 'replicas']
                },
                {
                    'question': 'Why is my pod not starting?',
                    'answer': 'Common reasons include: insufficient resources, image pull errors, configuration issues, or failed health checks. Check pod events and logs for specific error messages.',
                    'category': 'troubleshooting',
                    'keywords': ['pod', 'not starting', 'failed', 'pending']
                },
                {
                    'question': 'How do I add a Helm repository?',
                    'answer': 'Go to Helm Applications, click on the Repositories tab, then click "Add Repository". Enter the repository name and URL.',
                    'category': 'helm',
                    'keywords': ['helm', 'repository', 'add']
                },
                {
                    'question': 'What security scans are available?',
                    'answer': 'The platform provides automated security scanning including vulnerability detection, compliance checks, and configuration analysis. Scans run periodically and can be triggered manually.',
                    'category': 'security',
                    'keywords': ['security', 'scan', 'vulnerability']
                },
                {
                    'question': 'How do I monitor cluster health?',
                    'answer': 'Use the monitoring dashboard to view cluster metrics, node status, and resource utilization. Alerts can be configured for critical conditions.',
                    'category': 'monitoring',
                    'keywords': ['monitor', 'health', 'metrics', 'alerts']
                }
            ],
            'troubleshooting_guides': [
                {
                    'title': 'Pod Troubleshooting',
                    'steps': [
                        'Check pod status: kubectl get pods',
                        'View pod events: kubectl describe pod <pod-name>',
                        'Check logs: kubectl logs <pod-name>',
                        'Verify resource requests and limits',
                        'Check node capacity and scheduling'
                    ]
                },
                {
                    'title': 'Network Issues',
                    'steps': [
                        'Verify service endpoints',
                        'Check network policies',
                        'Test connectivity between pods',
                        'Validate DNS resolution',
                        'Review ingress configuration'
                    ]
                }
            ]
        }
    
    async def execute(self, action: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute an L1 support action"""
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
            'create_ticket', 'get_ticket', 'list_tickets', 'respond_to_ticket',
            'search_knowledge_base', 'get_faq', 'escalate_ticket', 'resolve_ticket'
        ]
    
    # --- Ticket Management ---
    
    async def _handle_create_ticket(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new support ticket"""
        user_id = parameters.get('user_id', 'anonymous')
        subject = parameters.get('subject', '')
        description = parameters.get('description', '')
        priority = parameters.get('priority', 'medium')
        
        if not subject or not description:
            return {'error': 'Subject and description are required'}
        
        # Generate ticket ID
        ticket_id = f"L1-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{len(self.tickets) + 1:03d}"
        
        # Categorize the ticket
        category = self._categorize_issue(subject + " " + description)
        
        # Create ticket
        ticket = SupportTicket(
            ticket_id=ticket_id,
            user_id=user_id,
            subject=subject,
            description=description,
            priority=TicketPriority(priority),
            category=category
        )
        
        # Add initial message
        ticket.add_message('user', description, 'initial_request')
        
        # Try to provide immediate assistance
        initial_response = await self._generate_initial_response(ticket)
        if initial_response:
            ticket.add_message('L1_agent', initial_response, 'automated_response')
        
        # Check if escalation is needed
        if self._should_escalate(ticket):
            ticket.escalate("Complex issue detected, requires L2 analysis", "L2")
            ticket.add_message('system', "Ticket escalated to L2 support for advanced analysis", 'escalation')
        
        self.tickets[ticket_id] = ticket
        
        return {
            'ticket_id': ticket_id,
            'status': ticket.status.value,
            'initial_response': initial_response,
            'escalated': ticket.status == TicketStatus.ESCALATED
        }
    
    async def _handle_get_ticket(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Get details for a specific ticket"""
        ticket_id = parameters.get('ticket_id')
        if not ticket_id:
            return {'error': 'ticket_id is required'}
        
        ticket = self.tickets.get(ticket_id)
        if not ticket:
            return {'error': f'Ticket not found: {ticket_id}'}
        
        return ticket.to_dict()
    
    async def _handle_list_tickets(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """List tickets with optional filters"""
        user_id = parameters.get('user_id')
        status = parameters.get('status')
        priority = parameters.get('priority')
        category = parameters.get('category')
        
        filtered_tickets = []
        for ticket in self.tickets.values():
            if user_id and ticket.user_id != user_id:
                continue
            if status and ticket.status.value != status:
                continue
            if priority and ticket.priority.value != priority:
                continue
            if category and ticket.category != category:
                continue
            
            filtered_tickets.append(ticket.to_dict())
        
        return {
            'tickets': filtered_tickets,
            'count': len(filtered_tickets),
            'total': len(self.tickets)
        }
    
    async def _handle_respond_to_ticket(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Respond to a ticket with AI-generated assistance"""
        ticket_id = parameters.get('ticket_id')
        user_message = parameters.get('message', '')
        
        if not ticket_id:
            return {'error': 'ticket_id is required'}
        
        ticket = self.tickets.get(ticket_id)
        if not ticket:
            return {'error': f'Ticket not found: {ticket_id}'}
        
        # Add user message to conversation
        if user_message:
            ticket.add_message('user', user_message, 'follow_up')
        
        # Generate AI response
        response = await self._generate_contextual_response(ticket)
        
        if response:
            ticket.add_message('L1_agent', response, 'ai_response')
        
        # Check if we should escalate or resolve
        if self._should_escalate(ticket):
            ticket.escalate("Issue requires advanced technical analysis", "L2")
            ticket.add_message('system', "Escalating to L2 support for specialized assistance", 'escalation')
        elif self._can_auto_resolve(ticket):
            ticket.resolve("Issue resolved through automated assistance")
            ticket.add_message('system', "Ticket automatically resolved", 'resolution')
        
        return {
            'response': response,
            'status': ticket.status.value,
            'escalated': ticket.status == TicketStatus.ESCALATED,
            'resolved': ticket.status == TicketStatus.RESOLVED
        }
    
    # --- Knowledge Base ---
    
    async def _handle_search_knowledge_base(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Search the knowledge base for relevant information"""
        query = parameters.get('query', '').lower()
        if not query:
            return {'error': 'query is required'}
        
        results = []
        
        # Search FAQs
        for faq in self.knowledge_base['faqs']:
            score = self._calculate_relevance_score(query, faq)
            if score > 0.3:  # Relevance threshold
                results.append({
                    'type': 'faq',
                    'score': score,
                    'question': faq['question'],
                    'answer': faq['answer'],
                    'category': faq['category']
                })
        
        # Search troubleshooting guides
        for guide in self.knowledge_base['troubleshooting_guides']:
            if any(keyword in query for keyword in guide['title'].lower().split()):
                results.append({
                    'type': 'guide',
                    'score': 0.8,
                    'title': guide['title'],
                    'steps': guide['steps']
                })
        
        # Sort by relevance score
        results.sort(key=lambda x: x['score'], reverse=True)
        
        return {
            'results': results[:5],  # Top 5 results
            'count': len(results)
        }
    
    async def _handle_get_faq(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Get all FAQs or filter by category"""
        category = parameters.get('category')
        
        faqs = self.knowledge_base['faqs']
        if category:
            faqs = [faq for faq in faqs if faq['category'] == category]
        
        return {
            'faqs': faqs,
            'categories': list(set(faq['category'] for faq in self.knowledge_base['faqs']))
        }
    
    # --- Escalation and Resolution ---
    
    async def _handle_escalate_ticket(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Manually escalate a ticket"""
        ticket_id = parameters.get('ticket_id')
        reason = parameters.get('reason', 'Manual escalation requested')
        target_level = parameters.get('target_level', 'L2')
        
        if not ticket_id:
            return {'error': 'ticket_id is required'}
        
        ticket = self.tickets.get(ticket_id)
        if not ticket:
            return {'error': f'Ticket not found: {ticket_id}'}
        
        ticket.escalate(reason, target_level)
        ticket.add_message('system', f"Ticket escalated to {target_level}: {reason}", 'escalation')
        
        return {
            'status': 'escalated',
            'target_level': target_level,
            'reason': reason
        }
    
    async def _handle_resolve_ticket(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Manually resolve a ticket"""
        ticket_id = parameters.get('ticket_id')
        resolution = parameters.get('resolution', 'Issue resolved')
        
        if not ticket_id:
            return {'error': 'ticket_id is required'}
        
        ticket = self.tickets.get(ticket_id)
        if not ticket:
            return {'error': f'Ticket not found: {ticket_id}'}
        
        ticket.resolve(resolution)
        ticket.add_message('system', f"Ticket resolved: {resolution}", 'resolution')
        
        return {
            'status': 'resolved',
            'resolution': resolution
        }
    
    # --- AI Response Generation ---
    
    async def _generate_initial_response(self, ticket: SupportTicket) -> Optional[str]:
        """Generate an initial response for a new ticket"""
        if not self.openai_service:
            return None
        
        # Search knowledge base first
        kb_results = await self._handle_search_knowledge_base({
            'query': ticket.subject + " " + ticket.description
        })
        
        context = ""
        if kb_results['data']['results']:
            context = "Relevant knowledge base entries:\n"
            for result in kb_results['data']['results'][:2]:
                if result['type'] == 'faq':
                    context += f"Q: {result['question']}\nA: {result['answer']}\n\n"
        
        prompt = f"""
        You are an L1 support agent for a Kubernetes cluster management platform. 
        A user has submitted the following support ticket:
        
        Subject: {ticket.subject}
        Description: {ticket.description}
        
        {context}
        
        Provide a helpful, concise response that:
        1. Acknowledges the issue
        2. Provides immediate guidance if possible
        3. References relevant documentation or steps
        4. Is friendly and professional
        
        Keep the response under 200 words.
        """
        
        try:
            response = self.openai_service.get_completion(prompt, max_tokens=300)
            return response.strip()
        except Exception as e:
            logger.error(f"Error generating initial response: {str(e)}")
            return "Thank you for contacting support. I've received your request and will assist you shortly."
    
    async def _generate_contextual_response(self, ticket: SupportTicket) -> Optional[str]:
        """Generate a contextual response based on conversation history"""
        if not self.openai_service:
            return None
        
        # Build conversation context
        conversation = ""
        for msg in ticket.conversation_history[-5:]:  # Last 5 messages
            sender = msg['sender'].replace('_', ' ').title()
            conversation += f"{sender}: {msg['message']}\n"
        
        prompt = f"""
        You are an L1 support agent continuing a conversation about a Kubernetes issue.
        
        Ticket: {ticket.subject}
        Priority: {ticket.priority.value}
        Category: {ticket.category}
        
        Conversation history:
        {conversation}
        
        Provide a helpful response that addresses the user's latest message. 
        If you cannot resolve the issue, suggest escalation to L2 support.
        Keep the response concise and actionable.
        """
        
        try:
            response = self.openai_service.get_completion(prompt, max_tokens=250)
            return response.strip()
        except Exception as e:
            logger.error(f"Error generating contextual response: {str(e)}")
            return "I'm having trouble processing your request right now. Let me escalate this to our L2 team for better assistance."
    
    # --- Helper Methods ---
    
    def _categorize_issue(self, text: str) -> str:
        """Categorize the issue based on text content"""
        text_lower = text.lower()
        
        if any(word in text_lower for word in ['scale', 'replica', 'deployment']):
            return 'scaling'
        elif any(word in text_lower for word in ['pod', 'container', 'image']):
            return 'workloads'
        elif any(word in text_lower for word in ['network', 'service', 'ingress']):
            return 'networking'
        elif any(word in text_lower for word in ['security', 'rbac', 'auth']):
            return 'security'
        elif any(word in text_lower for word in ['helm', 'chart', 'repository']):
            return 'helm'
        elif any(word in text_lower for word in ['monitor', 'metric', 'alert']):
            return 'monitoring'
        else:
            return 'general'
    
    def _should_escalate(self, ticket: SupportTicket) -> bool:
        """Determine if a ticket should be escalated to L2"""
        text = (ticket.subject + " " + ticket.description).lower()
        
        # Check for escalation keywords
        if any(keyword in text for keyword in self.escalation_keywords):
            return True
        
        # Check conversation length (if user keeps asking questions)
        user_messages = [msg for msg in ticket.conversation_history if msg['sender'] == 'user']
        if len(user_messages) > 3:
            return True
        
        # Check priority
        if ticket.priority in [TicketPriority.HIGH, TicketPriority.CRITICAL]:
            return True
        
        return False
    
    def _can_auto_resolve(self, ticket: SupportTicket) -> bool:
        """Determine if a ticket can be automatically resolved"""
        # Simple heuristic: if last user message contains positive feedback
        if ticket.conversation_history:
            last_user_msg = None
            for msg in reversed(ticket.conversation_history):
                if msg['sender'] == 'user':
                    last_user_msg = msg['message'].lower()
                    break
            
            if last_user_msg:
                positive_indicators = ['thanks', 'thank you', 'solved', 'fixed', 'working', 'resolved']
                if any(indicator in last_user_msg for indicator in positive_indicators):
                    return True
        
        return False
    
    def _calculate_relevance_score(self, query: str, faq: Dict[str, Any]) -> float:
        """Calculate relevance score between query and FAQ"""
        query_words = set(query.lower().split())
        faq_words = set((faq['question'] + " " + faq['answer']).lower().split())
        keyword_words = set(word.lower() for word in faq.get('keywords', []))
        
        # Calculate word overlap
        common_words = query_words.intersection(faq_words)
        keyword_matches = query_words.intersection(keyword_words)
        
        # Score based on overlap and keyword matches
        word_score = len(common_words) / max(len(query_words), 1)
        keyword_score = len(keyword_matches) / max(len(faq.get('keywords', [])), 1)
        
        return (word_score * 0.6) + (keyword_score * 0.4)
