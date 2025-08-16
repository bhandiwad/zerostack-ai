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
from .support_l1 import SupportL1Capability
from .support_l2 import SupportL2Capability
from .support_l3 import SupportL3Capability
from .auto_scaling import AutoScalingCapability
from .agent_training import AgentTrainingCapability
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
    'support_l1': SupportL1Capability,
    'support_l2': SupportL2Capability,
    'support_l3': SupportL3Capability,
    'auto_scaling': AutoScalingCapability,
    'agent_training': AgentTrainingCapability,
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
    'get_capability_instance',
    'list_capabilities',
    'create_capability',
]

def get_capability(name: str) -> Optional[Type[AgentCapability]]:
    """Get a capability class by name"""
    return CAPABILITY_REGISTRY.get(name)

def get_capability_instance(name: str, agent_id: str, config: Optional[Dict[str, Any]] = None) -> Optional[AgentCapability]:
    """
    Get a capability instance by name
    
    Args:
        name: Name of the capability to get
        agent_id: ID of the agent this capability is for
        config: Optional configuration for the capability
        
    Returns:
        An instance of the requested capability, or None if not found
    """
    capability_class = get_capability(name)
    if capability_class is None:
        return None
    return capability_class(agent_id, config or {})

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
    'LoggingCapability',
    'BackupCapability',
    'AuditCapability',
    'SupportL1Capability',
    'SupportL2Capability',
    'SupportL3Capability',
    'AutoScalingCapability',
    'AgentTrainingCapability',
    'get_capability',
    'list_capabilities',
    'create_capability',
]
