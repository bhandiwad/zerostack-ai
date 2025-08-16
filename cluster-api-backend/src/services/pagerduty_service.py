import asyncio
import aiohttp
import json
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
from enum import Enum

logger = logging.getLogger(__name__)

class PagerDutyEventAction(str, Enum):
    TRIGGER = 'trigger'
    ACKNOWLEDGE = 'acknowledge'
    RESOLVE = 'resolve'

class PagerDutySeverity(str, Enum):
    CRITICAL = 'critical'
    ERROR = 'error'
    WARNING = 'warning'
    INFO = 'info'

class PagerDutyService:
    """
    Service for integrating with PagerDuty for incident management and escalations.
    Handles creating, updating, and resolving incidents.
    """
    
    def __init__(self, integration_key: Optional[str] = None, api_token: Optional[str] = None):
        self.integration_key = integration_key
        self.api_token = api_token
        self.events_url = "https://events.pagerduty.com/v2/enqueue"
        self.api_url = "https://api.pagerduty.com"
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def __aenter__(self):
        """Async context manager entry"""
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()
    
    async def create_incident(self, 
                            title: str,
                            description: str,
                            severity: PagerDutySeverity = PagerDutySeverity.ERROR,
                            source: str = "Kubernetes Cluster",
                            component: Optional[str] = None,
                            group: Optional[str] = None,
                            class_name: Optional[str] = None,
                            custom_details: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Create a new PagerDuty incident
        
        Args:
            title: Brief description of the incident
            description: Detailed description
            severity: Incident severity level
            source: Source system generating the incident
            component: Component affected
            group: Group/service affected
            class_name: Classification of the incident
            custom_details: Additional custom details
            
        Returns:
            Dict containing incident details and dedup_key
        """
        if not self.integration_key:
            logger.warning("PagerDuty integration key not configured")
            return {'success': False, 'error': 'Integration key not configured'}
        
        # Generate dedup key for incident deduplication
        dedup_key = f"{source}_{component}_{datetime.utcnow().strftime('%Y%m%d%H%M')}"
        
        payload = {
            "routing_key": self.integration_key,
            "event_action": PagerDutyEventAction.TRIGGER.value,
            "dedup_key": dedup_key,
            "payload": {
                "summary": title,
                "source": source,
                "severity": severity.value,
                "timestamp": datetime.utcnow().isoformat(),
                "component": component,
                "group": group,
                "class": class_name,
                "custom_details": custom_details or {}
            }
        }
        
        # Add description to custom details
        if description:
            payload["payload"]["custom_details"]["description"] = description
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.events_url,
                    json=payload,
                    headers={'Content-Type': 'application/json'}
                ) as response:
                    response_data = await response.json()
                    
                    if response.status == 202:
                        logger.info(f"PagerDuty incident created: {dedup_key}")
                        return {
                            'success': True,
                            'dedup_key': dedup_key,
                            'status': response_data.get('status'),
                            'message': response_data.get('message')
                        }
                    else:
                        logger.error(f"Failed to create PagerDuty incident: {response_data}")
                        return {
                            'success': False,
                            'error': response_data.get('message', 'Unknown error'),
                            'status_code': response.status
                        }
                        
        except Exception as e:
            logger.error(f"Error creating PagerDuty incident: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def acknowledge_incident(self, dedup_key: str, note: Optional[str] = None) -> Dict[str, Any]:
        """
        Acknowledge a PagerDuty incident
        
        Args:
            dedup_key: Deduplication key of the incident
            note: Optional acknowledgment note
            
        Returns:
            Dict containing operation result
        """
        if not self.integration_key:
            return {'success': False, 'error': 'Integration key not configured'}
        
        payload = {
            "routing_key": self.integration_key,
            "event_action": PagerDutyEventAction.ACKNOWLEDGE.value,
            "dedup_key": dedup_key
        }
        
        if note:
            payload["payload"] = {"custom_details": {"acknowledgment_note": note}}
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.events_url,
                    json=payload,
                    headers={'Content-Type': 'application/json'}
                ) as response:
                    response_data = await response.json()
                    
                    if response.status == 202:
                        logger.info(f"PagerDuty incident acknowledged: {dedup_key}")
                        return {
                            'success': True,
                            'status': response_data.get('status'),
                            'message': response_data.get('message')
                        }
                    else:
                        logger.error(f"Failed to acknowledge PagerDuty incident: {response_data}")
                        return {
                            'success': False,
                            'error': response_data.get('message', 'Unknown error')
                        }
                        
        except Exception as e:
            logger.error(f"Error acknowledging PagerDuty incident: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def resolve_incident(self, dedup_key: str, resolution_note: Optional[str] = None) -> Dict[str, Any]:
        """
        Resolve a PagerDuty incident
        
        Args:
            dedup_key: Deduplication key of the incident
            resolution_note: Optional resolution note
            
        Returns:
            Dict containing operation result
        """
        if not self.integration_key:
            return {'success': False, 'error': 'Integration key not configured'}
        
        payload = {
            "routing_key": self.integration_key,
            "event_action": PagerDutyEventAction.RESOLVE.value,
            "dedup_key": dedup_key
        }
        
        if resolution_note:
            payload["payload"] = {"custom_details": {"resolution_note": resolution_note}}
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.events_url,
                    json=payload,
                    headers={'Content-Type': 'application/json'}
                ) as response:
                    response_data = await response.json()
                    
                    if response.status == 202:
                        logger.info(f"PagerDuty incident resolved: {dedup_key}")
                        return {
                            'success': True,
                            'status': response_data.get('status'),
                            'message': response_data.get('message')
                        }
                    else:
                        logger.error(f"Failed to resolve PagerDuty incident: {response_data}")
                        return {
                            'success': False,
                            'error': response_data.get('message', 'Unknown error')
                        }
                        
        except Exception as e:
            logger.error(f"Error resolving PagerDuty incident: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def create_support_escalation(self, 
                                      ticket_id: str,
                                      issue_summary: str,
                                      severity: str,
                                      assigned_agent: str,
                                      escalation_reason: str,
                                      technical_details: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Create a PagerDuty incident for support ticket escalation
        
        Args:
            ticket_id: Support ticket ID
            issue_summary: Brief summary of the issue
            severity: Issue severity (critical, high, medium, low)
            assigned_agent: Current agent level (L1, L2, L3)
            escalation_reason: Reason for escalation
            technical_details: Additional technical information
            
        Returns:
            Dict containing incident creation result
        """
        # Map support severity to PagerDuty severity
        severity_mapping = {
            'critical': PagerDutySeverity.CRITICAL,
            'high': PagerDutySeverity.ERROR,
            'medium': PagerDutySeverity.WARNING,
            'low': PagerDutySeverity.INFO
        }
        
        pd_severity = severity_mapping.get(severity.lower(), PagerDutySeverity.WARNING)
        
        title = f"Support Escalation: {issue_summary}"
        description = f"""
Support Ticket Escalation

Ticket ID: {ticket_id}
Current Agent: {assigned_agent}
Severity: {severity}
Escalation Reason: {escalation_reason}

Issue Summary: {issue_summary}
"""
        
        custom_details = {
            'ticket_id': ticket_id,
            'assigned_agent': assigned_agent,
            'escalation_reason': escalation_reason,
            'escalation_timestamp': datetime.utcnow().isoformat()
        }
        
        if technical_details:
            custom_details.update(technical_details)
        
        return await self.create_incident(
            title=title,
            description=description,
            severity=pd_severity,
            source="Support System",
            component=f"Support-{assigned_agent}",
            group="Support Team",
            class_name="Support Escalation",
            custom_details=custom_details
        )
    
    async def get_incidents(self, 
                          service_ids: Optional[List[str]] = None,
                          statuses: Optional[List[str]] = None,
                          limit: int = 25) -> Dict[str, Any]:
        """
        Get incidents from PagerDuty (requires API token)
        
        Args:
            service_ids: List of service IDs to filter by
            statuses: List of statuses to filter by
            limit: Maximum number of incidents to return
            
        Returns:
            Dict containing incidents list
        """
        if not self.api_token:
            return {'success': False, 'error': 'API token not configured'}
        
        params = {
            'limit': limit,
            'sort_by': 'created_at:desc'
        }
        
        if service_ids:
            params['service_ids[]'] = service_ids
        
        if statuses:
            params['statuses[]'] = statuses
        
        headers = {
            'Authorization': f'Token token={self.api_token}',
            'Accept': 'application/vnd.pagerduty+json;version=2',
            'Content-Type': 'application/json'
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.api_url}/incidents",
                    params=params,
                    headers=headers
                ) as response:
                    response_data = await response.json()
                    
                    if response.status == 200:
                        return {
                            'success': True,
                            'incidents': response_data.get('incidents', []),
                            'total': response_data.get('total', 0)
                        }
                    else:
                        logger.error(f"Failed to get PagerDuty incidents: {response_data}")
                        return {
                            'success': False,
                            'error': response_data.get('error', {}).get('message', 'Unknown error')
                        }
                        
        except Exception as e:
            logger.error(f"Error getting PagerDuty incidents: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def is_configured(self) -> bool:
        """Check if PagerDuty service is properly configured"""
        return bool(self.integration_key)
    
    def is_api_configured(self) -> bool:
        """Check if PagerDuty API is properly configured"""
        return bool(self.api_token)

# Global PagerDuty service instance
pagerduty_service: Optional[PagerDutyService] = None

def get_pagerduty_service() -> Optional[PagerDutyService]:
    """Get the global PagerDuty service instance"""
    global pagerduty_service
    if pagerduty_service is None:
        # Initialize with environment variables or config
        import os
        integration_key = os.getenv('PAGERDUTY_INTEGRATION_KEY')
        api_token = os.getenv('PAGERDUTY_API_TOKEN')
        
        if integration_key:
            pagerduty_service = PagerDutyService(
                integration_key=integration_key,
                api_token=api_token
            )
    
    return pagerduty_service

def configure_pagerduty(integration_key: str, api_token: Optional[str] = None):
    """Configure the global PagerDuty service"""
    global pagerduty_service
    pagerduty_service = PagerDutyService(
        integration_key=integration_key,
        api_token=api_token
    )
