"""
Agent Capabilities Module

This module provides a registry of available agent capabilities and utilities
for managing and executing them.
"""
from typing import Dict, Type, Any, Optional, List, Union
from .base import AgentCapability, ParameterSchema, ActionSchema
from .cluster_management import ClusterManagementCapability
from .monitoring import MonitoringCapability
from .automation import AutomationCapability
from .suggestions import SuggestionsCapability
from .security_scanning import SecurityScanningCapability
from .logging import LoggingCapability
from .backup import BackupCapability
from .audit import AuditCapability
import logging

logger = logging.getLogger(__name__)

# Registry of all available capabilities
CAPABILITY_REGISTRY: Dict[str, Type[AgentCapability]] = {
    'cluster_management': ClusterManagementCapability,
    'monitoring': MonitoringCapability,
    'automation': AutomationCapability,
    'suggestions': SuggestionsCapability,
    'security_scanning': SecurityScanningCapability,
    'logging': LoggingCapability,
    'backup': BackupCapability,
    'audit': AuditCapability,
    # Add more capabilities here
}

# Re-export types for convenience
__all__ = [
    'AgentCapability',
    'ClusterManagementCapability',
    'MonitoringCapability',
    'AutomationCapability',
    'SuggestionsCapability',
    'SecurityScanningCapability',
    'LoggingCapability',
    'BackupCapability',
    'AuditCapability',
    'ParameterSchema',
    'ActionSchema',
    'get_capability',
    'list_capabilities',
    'create_capability',
]

def get_capability(name: str) -> Optional[Type[AgentCapability]]:
    """Get a capability class by name"""
    return CAPABILITY_REGISTRY.get(name)

def list_capabilities() -> Dict[str, str]:
    """List all available capabilities with their descriptions"""
    return {
        name: cls.__doc__.strip().split('\n')[0] if cls.__doc__ else "No description"
        for name, cls in CAPABILITY_REGISTRY.items()
    }

def create_capability(name: str, agent_id: str, config: Optional[Dict[str, Any]] = None) -> Optional[AgentCapability]:
    """Create a new capability instance"""
    capability_cls = get_capability(name)
    if not capability_cls:
        logger.warning(f"Unknown capability: {name}")
        return None
    
    try:
        return capability_cls(agent_id=agent_id, config=config or {})
    except Exception as e:
        logger.error(f"Failed to initialize capability {name}: {str(e)}", exc_info=True)
        return None

__all__ = [
    'AgentCapability',
    'ClusterManagementCapability',
    'MonitoringCapability',
    'AutomationCapability',
    'SuggestionsCapability',
    'SecurityScanningCapability',
    'get_capability',
    'list_capabilities',
    'create_capability',
]
