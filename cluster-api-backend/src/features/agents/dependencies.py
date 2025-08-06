"""
Agent Dependencies

This module provides FastAPI dependencies for the agent system.
"""
from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, status

from ..agent_manager import AgentManager

# Global agent manager instance
_agent_manager: Optional[AgentManager] = None

def get_agent_manager() -> AgentManager:
    """
    Get the global agent manager instance.
    
    Returns:
        The global AgentManager instance.
        
    Raises:
        HTTPException: If the agent manager is not initialized.
    """
    if _agent_manager is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Agent manager is not initialized"
        )
    return _agent_manager

def set_agent_manager(manager: AgentManager) -> None:
    """
    Set the global agent manager instance.
    
    Args:
        manager: The AgentManager instance to set as global.
    """
    global _agent_manager
    _agent_manager = manager
