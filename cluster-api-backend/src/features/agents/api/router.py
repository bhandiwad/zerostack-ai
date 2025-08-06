"""
Agent API Router

This module provides REST API endpoints for agent management.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from typing import Dict, Any, Optional, List
import logging

from ..agent_manager import AgentManager
from ...dependencies import get_agent_manager

logger = logging.getLogger(__name__)
router = APIRouter(tags=["agents"])

@router.get("/status", response_model=Dict[str, Any])
async def get_agent_status(
    manager: AgentManager = Depends(get_agent_manager)
) -> Dict[str, Any]:
    """
    Get the current status of the agent.
    
    Returns:
        Dict containing agent status information.
    """
    try:
        return await manager.get_status()
    except Exception as e:
        logger.error(f"Error getting agent status: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get agent status: {str(e)}"
        )

@router.get("/metrics", response_model=Dict[str, Any])
async def get_agent_metrics(
    manager: AgentManager = Depends(get_agent_manager)
) -> Dict[str, Any]:
    """
    Get the current metrics from the agent.
    
    Returns:
        Dict containing agent metrics.
    """
    try:
        return await manager.get_metrics()
    except Exception as e:
        logger.error(f"Error getting agent metrics: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get agent metrics: {str(e)}"
        )

@router.get("/health", response_model=Dict[str, Any])
async def get_agent_health(
    manager: AgentManager = Depends(get_agent_manager)
) -> Dict[str, Any]:
    """
    Get the current health status of the agent.
    
    Returns:
        Dict containing agent health information.
    """
    try:
        return await manager.get_health()
    except Exception as e:
        logger.error(f"Error getting agent health: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get agent health: {str(e)}"
        )

@router.get("/capabilities", response_model=List[Dict[str, Any]])
async def list_agent_capabilities(
    manager: AgentManager = Depends(get_agent_manager)
) -> List[Dict[str, Any]]:
    """
    List all available capabilities on the agent.
    
    Returns:
        List of capability information dictionaries.
    """
    try:
        return [
            {
                'name': name,
                'description': capability.__doc__ or "",
                'actions': [
                    {
                        'name': action['name'],
                        'description': action['description'],
                        'parameters': action['parameters']
                    }
                    for action in capability.get_actions()
                ]
            }
            for name, capability in manager.capabilities.items()
        ]
    except Exception as e:
        logger.error(f"Error listing agent capabilities: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list agent capabilities: {str(e)}"
        )

@router.post("/capabilities/{capability_name}/{action}", response_model=Dict[str, Any])
async def execute_capability_action(
    capability_name: str,
    action: str,
    parameters: Dict[str, Any],
    manager: AgentManager = Depends(get_agent_manager)
) -> Dict[str, Any]:
    """
    Execute an action on a specific capability.
    
    Args:
        capability_name: Name of the capability.
        action: Name of the action to execute.
        parameters: Parameters for the action.
        
    Returns:
        Result of the action.
    """
    try:
        capability = await manager.get_capability(capability_name)
        if not capability:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Capability '{capability_name}' not found"
            )
            
        # Get the action schema to validate parameters
        action_schemas = {
            a['name']: a
            for a in capability.get_actions()
        }
        
        if action not in action_schemas:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Action '{action}' not found in capability '{capability_name}'"
            )
            
        # TODO: Add parameter validation based on schema
        
        # Execute the action
        result = await capability.execute(action, parameters)
        return {
            'status': 'success',
            'capability': capability_name,
            'action': action,
            'result': result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error executing action '{action}' on capability '{capability_name}': {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to execute action: {str(e)}"
        )

@router.post("/shutdown", status_code=status.HTTP_202_ACCEPTED)
async def shutdown_agent(
    manager: AgentManager = Depends(get_agent_manager)
) -> Dict[str, str]:
    """
    Shut down the agent gracefully.
    
    This will initiate a graceful shutdown of the agent.
    """
    try:
        # Schedule the shutdown to run in the background
        # This allows us to return a response before shutting down
        import asyncio
        asyncio.create_task(_shutdown_agent_async(manager))
        
        return {
            'status': 'shutting_down',
            'message': 'Agent shutdown initiated'
        }
    except Exception as e:
        logger.error(f"Error during agent shutdown: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initiate shutdown: {str(e)}"
        )

async def _shutdown_agent_async(manager: AgentManager) -> None:
    """Background task to shut down the agent"""
    try:
        logger.info("Initiating agent shutdown...")
        await manager.close()
        logger.info("Agent shutdown complete")
        
        # Exit the application after a short delay
        import asyncio
        await asyncio.sleep(1)
        import os
        import signal
        os.kill(os.getpid(), signal.SIGTERM)
    except Exception as e:
        logger.error(f"Error during async agent shutdown: {e}", exc_info=True)
