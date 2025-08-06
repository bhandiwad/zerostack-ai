"""
This package contains SQLAlchemy model definitions for the application.

This module provides a way to import models while avoiding circular imports.
"""

# Use lazy imports to avoid circular dependencies
import importlib

# Dictionary to store model classes
_models = {}

def _import_models():
    """Import all models in the correct order to avoid circular imports."""
    if not _models:
        # Import base models first
        from .cluster import Cluster, ClusterMetrics, Alert, CloudAccount, ProviderFlavor
        from .spot_models import SpotInstanceConfig, SpotInstanceHistory, SpotInstanceSavings
        
        # Import agent models last
        from .agent_models import (
            AgentModel, AgentConversationModel, AgentMessageModel, 
            AgentActionLogModel, AgentCapabilityModel,
            Agent, AgentConversation, AgentMessage, AgentActionLog
        )
        
        # Store models in dictionary
        _models.update({
            # Cluster models
            'Cluster': Cluster,
            'ClusterMetrics': ClusterMetrics,
            'Alert': Alert,
            'CloudAccount': CloudAccount,
            'ProviderFlavor': ProviderFlavor,
            
            # Spot instance models
            'SpotInstanceConfig': SpotInstanceConfig,
            'SpotInstanceHistory': SpotInstanceHistory,
            'SpotInstanceSavings': SpotInstanceSavings,
            
            # Agent models
            'AgentModel': AgentModel,
            'AgentConversationModel': AgentConversationModel,
            'AgentMessageModel': AgentMessageModel,
            'AgentActionLogModel': AgentActionLogModel,
            'AgentCapabilityModel': AgentCapabilityModel,
            'Agent': Agent,
            'AgentConversation': AgentConversation,
            'AgentMessage': AgentMessage,
            'AgentActionLog': AgentActionLog,
        })
    return _models

def __getattr__(name):
    """Lazily import models when accessed as attributes."""
    models = _import_models()
    if name in models:
        return models[name]
    raise AttributeError(f"module '{__name__}' has no attribute '{name}'")

# Export all model names for easier imports
__all__ = [
    # Cluster models
    'Cluster', 'ClusterMetrics', 'Alert', 'CloudAccount', 'ProviderFlavor',
    
    # Spot instance models
    'SpotInstanceConfig', 'SpotInstanceHistory', 'SpotInstanceSavings',
    
    # Agent models
    'AgentModel', 'AgentConversationModel', 'AgentMessageModel', 
    'AgentActionLogModel', 'AgentCapabilityModel',
    'Agent', 'AgentConversation', 'AgentMessage', 'AgentActionLog'
]
