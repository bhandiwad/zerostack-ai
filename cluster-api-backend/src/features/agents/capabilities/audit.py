"""
Audit Capability for Agents - Minimal Version

Provides basic audit logging functionality.
"""
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Union

from .base import AgentCapability

logger = logging.getLogger(__name__)

class AuditCapability(AgentCapability):
    """Minimal audit capability implementation"""
    
    def __init__(self, agent_id: str, config: Optional[Dict[str, Any]] = None):
        super().__init__(agent_id, config or {})
        self.audit_logs = []
    
    async def log_event(
        self, 
        action: str, 
        resource_type: str, 
        resource_id: str, 
        status: str = "success",
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Log an audit event"""
        event = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "action": action,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "status": status,
            "metadata": metadata or {}
        }
        self.audit_logs.append(event)
        return event
    
    async def get_events(
        self, 
        action: Optional[str] = None, 
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> Dict[str, Any]:
        """Get audit events with optional filtering"""
        filtered = self.audit_logs
        
        if action:
            filtered = [e for e in filtered if e['action'] == action]
        if resource_type:
            filtered = [e for e in filtered if e['resource_type'] == resource_type]
        if resource_id:
            filtered = [e for e in filtered if e['resource_id'] == resource_id]
        
        # Sort by timestamp (newest first)
        filtered.sort(key=lambda x: x['timestamp'], reverse=True)
        
        # Apply pagination
        total = len(filtered)
        paginated = filtered[offset:offset + limit]
        
        return {
            'items': paginated,
            'total': total,
            'limit': limit,
            'offset': offset
        }
    
    async def execute(self, action: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute an audit action"""
        if action == 'log':
            return await self.log_event(
                action=parameters.get('action', ''),
                resource_type=parameters.get('resource_type', ''),
                resource_id=parameters.get('resource_id', ''),
                status=parameters.get('status', 'success'),
                metadata=parameters.get('metadata')
            )
        elif action == 'query':
            return await self.get_events(
                action=parameters.get('action'),
                resource_type=parameters.get('resource_type'),
                resource_id=parameters.get('resource_id'),
                limit=int(parameters.get('limit', 100)),
                offset=int(parameters.get('offset', 0))
            )
        else:
            return {"status": "error", "message": f"Unknown action: {action}"}
    
    def get_actions(self) -> List[str]:
        """Get available actions"""
        return ["log", "query"]
