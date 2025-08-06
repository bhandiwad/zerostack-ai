import asyncio
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from .base import AgentCapability
from src.services.openai_service import OpenAIService
import logging
import json
from enum import Enum

logger = logging.getLogger(__name__)

class SuggestionSeverity(str, Enum):
    INFO = 'info'
    WARNING = 'warning'
    CRITICAL = 'critical'

class SuggestionCategory(str, Enum):
    COST_OPTIMIZATION = 'cost_optimization'
    PERFORMANCE = 'performance'
    SECURITY = 'security'
    RELIABILITY = 'reliability'
    BEST_PRACTICES = 'best_practices'

class Suggestion:
    """Represents a suggestion or recommendation"""
    
    def __init__(self, 
                 suggestion_id: str,
                 title: str,
                 description: str,
                 category: SuggestionCategory,
                 severity: SuggestionSeverity = SuggestionSeverity.INFO,
                 resource_type: Optional[str] = None,
                 resource_name: Optional[str] = None,
                 namespace: Optional[str] = None,
                 details: Optional[Dict[str, Any]] = None,
                 actions: Optional[List[Dict[str, Any]]] = None):
        self.suggestion_id = suggestion_id
        self.title = title
        self.description = description
        self.category = category
        self.severity = severity
        self.resource_type = resource_type
        self.resource_name = resource_name
        self.namespace = namespace
        self.details = details or {}
        self.actions = actions or []
        self.created_at = datetime.utcnow()
        self.acknowledged = False
        self.acknowledged_at = None
        self.acknowledged_by = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert suggestion to dictionary"""
        return {
            'suggestion_id': self.suggestion_id,
            'title': self.title,
            'description': self.description,
            'category': self.category.value,
            'severity': self.severity.value,
            'resource_type': self.resource_type,
            'resource_name': self.resource_name,
            'namespace': self.namespace,
            'details': self.details,
            'actions': self.actions,
            'created_at': self.created_at.isoformat(),
            'acknowledged': self.acknowledged,
            'acknowledged_at': self.acknowledged_at.isoformat() if self.acknowledged_at else None,
            'acknowledged_by': self.acknowledged_by
        }
    
    def acknowledge(self, user: str = 'system', note: Optional[str] = None):
        """Mark the suggestion as acknowledged"""
        self.acknowledged = True
        self.acknowledged_at = datetime.utcnow()
        self.acknowledged_by = user
        if note:
            self.details['acknowledgement_note'] = note

class SuggestionsCapability(AgentCapability):
    """
    Capability for providing intelligent suggestions and recommendations.
    Analyzes cluster state and usage patterns to provide actionable insights.
    """
    
    def __init__(self, agent_id: str, config: Optional[Dict[str, Any]] = None):
        super().__init__(agent_id, config)
        self.suggestions: Dict[str, Suggestion] = {}
        self.openai_service: Optional[OpenAIService] = None
        self.analysis_interval = self.config.get('analysis_interval', 300)  # 5 minutes
        self.analysis_task = None
        self.running = False
    
    async def _initialize(self):
        """Initialize the suggestions capability"""
        try:
            logger.info("Initializing SuggestionsCapability")
            
            self.openai_service = OpenAIService()
            
            # Start the periodic analysis
            self.running = True
            self.analysis_task = asyncio.create_task(self._periodic_analysis())
            
            logger.info("SuggestionsCapability initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize suggestions capability: {str(e)}")
            raise
    
    async def cleanup(self):
        """Clean up resources"""
        self.running = False
        if self.analysis_task:
            self.analysis_task.cancel()
            try:
                await self.analysis_task
            except asyncio.CancelledError:
                pass
    

    
    async def execute(self, action: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a suggestions action"""
        try:
            if not self._initialized:
                await self.initialize()
            
            # Route to appropriate handler based on action
            handler = getattr(self, f"_handle_{action}", None)
            if not handler or not callable(handler):
                return {
                    'success': False,
                    'error': f"Unsupported action: {action}",
                    'available_actions': self._list_actions()
                }
            
            # Execute the handler
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
            'get_suggestions', 'acknowledge_suggestion', 'dismiss_suggestion',
            'run_analysis', 'get_analysis_status'
        ]
    
    # --- Suggestion Management ---
    
    async def _handle_get_suggestions(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Get suggestions matching the given filters"""
        category = parameters.get('category')
        severity = parameters.get('severity')
        acknowledged = parameters.get('acknowledged')
        resource_type = parameters.get('resource_type')
        namespace = parameters.get('namespace')
        
        filtered = []
        for suggestion in self.suggestions.values():
            if category and suggestion.category.value != category:
                continue
            if severity and suggestion.severity.value != severity:
                continue
            if acknowledged is not None and suggestion.acknowledged != acknowledged:
                continue
            if resource_type and suggestion.resource_type != resource_type:
                continue
            if namespace and suggestion.namespace != namespace:
                continue
                
            filtered.append(suggestion.to_dict())
        
        return {
            'suggestions': filtered,
            'count': len(filtered),
            'total': len(self.suggestions)
        }
    
    async def _handle_acknowledge_suggestion(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Acknowledge a suggestion"""
        suggestion_id = parameters.get('suggestion_id')
        user = parameters.get('user', 'system')
        note = parameters.get('note')
        
        if not suggestion_id:
            return {'error': 'suggestion_id is required'}
        
        suggestion = self.suggestions.get(suggestion_id)
        if not suggestion:
            return {'error': f'Suggestion not found: {suggestion_id}'}
        
        suggestion.acknowledge(user=user, note=note)
        
        return {'status': 'acknowledged'}
    
    async def _handle_dismiss_suggestion(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Dismiss a suggestion (remove it from the list)"""
        suggestion_id = parameters.get('suggestion_id')
        
        if not suggestion_id:
            return {'error': 'suggestion_id is required'}
        
        if suggestion_id not in self.suggestions:
            return {'error': f'Suggestion not found: {suggestion_id}'}
        
        del self.suggestions[suggestion_id]
        
        return {'status': 'dismissed'}
    
    # --- Analysis ---
    
    async def _handle_run_analysis(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Run analysis to generate new suggestions"""
        force = parameters.get('force', False)
        
        if not self.running and not force:
            return {'status': 'analysis_already_running'}
        
        # If analysis is already running and we're not forcing, return current status
        if self.analysis_task and not self.analysis_task.done() and not force:
            return {'status': 'analysis_in_progress'}
        
        # Run analysis in the background
        self.analysis_task = asyncio.create_task(self._analyze_cluster())
        
        return {'status': 'analysis_started'}
    
    async def _handle_get_analysis_status(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Get the status of the current analysis"""
        if not self.analysis_task:
            return {'status': 'not_running'}
        
        if self.analysis_task.done():
            try:
                await self.analysis_task
                return {'status': 'completed', 'error': None}
            except Exception as e:
                return {'status': 'failed', 'error': str(e)}
        else:
            return {'status': 'in_progress'}
    
    async def _periodic_analysis(self):
        """Run analysis periodically"""
        while self.running:
            try:
                await self._analyze_cluster()
            except Exception as e:
                logger.error(f"Error in periodic analysis: {str(e)}", exc_info=True)
            
            # Wait for the next interval
            try:
                await asyncio.sleep(self.analysis_interval)
            except asyncio.CancelledError:
                break
    
    async def _analyze_cluster(self):
        """Run all registered analyzers to generate suggestions"""
        logger.info("Starting cluster analysis")
        
        # Clear existing suggestions (except acknowledged ones)
        self.suggestions = {
            sid: s for sid, s in self.suggestions.items()
            if s.acknowledged
        }
        
        # Generate suggestions using the LLM
        await self._generate_llm_suggestions()
        
        logger.info(f"Cluster analysis complete. Generated {len([s for s in self.suggestions.values() if not s.acknowledged])} new suggestions")
    async def _generate_llm_suggestions(self):
        """Generate suggestions using the OpenAI LLM."""
        if not self.openai_service:
            logger.error("OpenAI service is not initialized.")
            return

        prompt = """
        As an expert Kubernetes operations assistant, analyze a hypothetical cluster and provide 3-5 actionable suggestions to improve its cost-optimization, performance, security, and reliability.
        For each suggestion, provide the following information in a JSON array format. Each object in the array should have these keys: "suggestion_id", "title", "description", "category", "severity".

        - suggestion_id: A unique snake_case string identifier.
        - title: A brief, descriptive title.
        - description: A detailed explanation of the issue and the recommended action.
        - category: One of 'cost_optimization', 'performance', 'security', 'reliability', 'best_practices'.
        - severity: One of 'info', 'warning', 'critical'.

        Return only the JSON array.
        """

        try:
            response_str = self.openai_service.get_completion(prompt, max_tokens=1000)
            suggestions_data = json.loads(response_str)

            for item in suggestions_data:
                self._add_suggestion(
                    suggestion_id=item.get('suggestion_id', f"llm_suggestion_{datetime.utcnow().timestamp()}"),
                    title=item.get('title', 'LLM Suggestion'),
                    description=item.get('description', 'No description provided.'),
                    category=SuggestionCategory(item.get('category', 'best_practices')),
                    severity=SuggestionSeverity(item.get('severity', 'info'))
                )
        except json.JSONDecodeError as e:
            logger.error(f"Failed to decode LLM response as JSON: {e}\nResponse was: {response_str}")
        except Exception as e:
            logger.error(f"Error generating LLM suggestions: {e}", exc_info=True)

    # --- Helper Methods ---

    def _add_suggestion(self, 
                        suggestion_id: str, 
                        title: str, 
                        description: str, 
                        category: SuggestionCategory, 
                        severity: SuggestionSeverity = SuggestionSeverity.INFO, 
                        resource_type: Optional[str] = None, 
                        resource_name: Optional[str] = None, 
                        namespace: Optional[str] = None, 
                        details: Optional[Dict[str, Any]] = None, 
                        actions: Optional[List[Dict[str, Any]]] = None):
        """Add a new suggestion to the list"""
        
        if suggestion_id in self.suggestions:
            logger.warning(f"Suggestion {suggestion_id} already exists. Skipping.")
            return
        
        suggestion = Suggestion(
            suggestion_id=suggestion_id,
            title=title,
            description=description,
            category=category,
            severity=severity,
            resource_type=resource_type,
            resource_name=resource_name,
            namespace=namespace,
            details=details,
            actions=actions
        )
        
        self.suggestions[suggestion_id] = suggestion
    # Removed hardcoded suggestion analyzers

    # --- Helper Methods ---
    
    def _add_suggestion(self, 
                       suggestion_id: str,
                       title: str,
                       description: str,
                       category: SuggestionCategory,
                       severity: SuggestionSeverity = SuggestionSeverity.INFO,
                       resource_type: Optional[str] = None,
                       resource_name: Optional[str] = None,
                       namespace: Optional[str] = None,
                       details: Optional[Dict[str, Any]] = None,
                       actions: Optional[List[Dict[str, Any]]] = None):
        """Add a new suggestion"""
        # Check if we already have this suggestion
        if suggestion_id in self.suggestions:
            return
        
        # Create and store the suggestion
        suggestion = Suggestion(
            suggestion_id=suggestion_id,
            title=title,
            description=description,
            category=category,
            severity=severity,
            resource_type=resource_type,
            resource_name=resource_name,
            namespace=namespace,
            details=details or {},
            actions=actions or []
        )
        
        self.suggestions[suggestion_id] = suggestion
        
        # Log the suggestion
        logger.info(f"New suggestion: {title} ({severity.value})")
