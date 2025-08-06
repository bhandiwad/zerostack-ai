"""
Agent API Application

This module provides the FastAPI application for the agent API.
"""
import os
import logging
import signal
import asyncio
from typing import Dict, Any, Optional

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from ..agent_manager import AgentManager
from ..dependencies import set_agent_manager
from .router import router as agent_router

logger = logging.getLogger(__name__)

class AgentAPI:
    """
    Agent API Application
    
    This class manages the FastAPI application for the agent API.
    """
    
    def __init__(
        self,
        agent_manager: AgentManager,
        host: str = "0.0.0.0",
        port: int = 8080,
        api_prefix: str = "/api/v1/agent",
        enable_cors: bool = True,
        debug: bool = False
    ):
        """
        Initialize the Agent API.
        
        Args:
            agent_manager: The AgentManager instance to use.
            host: Host to bind the API server to.
            port: Port to bind the API server to.
            api_prefix: URL prefix for all API endpoints.
            enable_cors: Whether to enable CORS middleware.
            debug: Whether to enable debug mode.
        """
        self.agent_manager = agent_manager
        self.host = host
        self.port = port
        self.api_prefix = api_prefix.rstrip('/')
        self.enable_cors = enable_cors
        self.debug = debug
        self._server = None
        
        # Create FastAPI app
        self.app = FastAPI(
            title="Agent API",
            description="REST API for managing and monitoring agents",
            version="1.0.0",
            debug=debug
        )
        
        # Set up middleware
        self._setup_middleware()
        
        # Set up exception handlers
        self._setup_exception_handlers()
        
        # Set up routes
        self.app.include_router(agent_router, prefix=api_prefix)
        
        # Set up health check endpoint
        @self.app.get("/health")
        async def health_check() -> Dict[str, str]:
            return {"status": "ok"}
        
        # Set global agent manager instance
        set_agent_manager(agent_manager)
    
    def _setup_middleware(self) -> None:
        """Set up middleware for the FastAPI application"""
        # Add CORS middleware if enabled
        if self.enable_cors:
            self.app.add_middleware(
                CORSMiddleware,
                allow_origins=["*"],
                allow_credentials=True,
                allow_methods=["*"],
                allow_headers=["*"],
            )
        
        # Add request logging middleware
        @self.app.middleware("http")
        async def log_requests(request: Request, call_next):
            logger.debug(f"Request: {request.method} {request.url}")
            response = await call_next(request)
            logger.debug(f"Response: {response.status_code}")
            return response
    
    def _setup_exception_handlers(self) -> None:
        """Set up exception handlers for the FastAPI application"""
        @self.app.exception_handler(Exception)
        async def global_exception_handler(request: Request, exc: Exception):
            logger.error(f"Unhandled exception: {exc}", exc_info=True)
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={
                    "detail": "Internal server error",
                    "error": str(exc)
                }
            )
    
    async def start(self) -> None:
        """Start the API server"""
        config = uvicorn.Config(
            app=self.app,
            host=self.host,
            port=self.port,
            log_level="info",
            reload=self.debug
        )
        
        self._server = uvicorn.Server(config)
        
        # Handle shutdown signals
        loop = asyncio.get_running_loop()
        for sig in (signal.SIGINT, signal.SIGTERM):
            loop.add_signal_handler(
                sig, 
                lambda s=sig: asyncio.create_task(self._shutdown(s))
            )
        
        logger.info(f"Starting Agent API server on {self.host}:{self.port}{self.api_prefix}")
        await self._server.serve()
    
    async def _shutdown(self, signal: signal.Signals) -> None:
        """Handle shutdown signals"""
        logger.info(f"Received exit signal {signal.name}...")
        
        # Stop the server
        if self._server:
            self._server.should_exit = True
        
        # Shut down the agent manager
        await self.agent_manager.close()
        
        logger.info("Agent API server shut down successfully")

def create_agent_api(
    agent_manager: AgentManager,
    host: Optional[str] = None,
    port: Optional[int] = None,
    api_prefix: str = "/api/v1/agent",
    enable_cors: Optional[bool] = None,
    debug: Optional[bool] = None
) -> AgentAPI:
    """
    Create a new AgentAPI instance with configuration from environment variables.
    
    Args:
        agent_manager: The AgentManager instance to use.
        host: Host to bind the API server to. Defaults to AGENT_API_HOST or "0.0.0.0".
        port: Port to bind the API server to. Defaults to AGENT_API_PORT or 8080.
        api_prefix: URL prefix for all API endpoints.
        enable_cors: Whether to enable CORS. Defaults to AGENT_API_CORS or True.
        debug: Whether to enable debug mode. Defaults to AGENT_API_DEBUG or False.
        
    Returns:
        A configured AgentAPI instance.
    """
    # Get configuration from environment variables with defaults
    host = host or os.getenv("AGENT_API_HOST", "0.0.0.0")
    port = int(port or os.getenv("AGENT_API_PORT", "8080"))
    enable_cors = enable_cors if enable_cors is not None else os.getenv("AGENT_API_CORS", "true").lower() == "true"
    debug = debug if debug is not None else os.getenv("AGENT_API_DEBUG", "false").lower() == "true"
    
    return AgentAPI(
        agent_manager=agent_manager,
        host=host,
        port=port,
        api_prefix=api_prefix,
        enable_cors=enable_cors,
        debug=debug
    )

def run_agent_api(agent_manager: AgentManager, **kwargs) -> None:
    """
    Run the Agent API server.
    
    This is a convenience function that creates and starts the API server.
    
    Args:
        agent_manager: The AgentManager instance to use.
        **kwargs: Additional arguments to pass to create_agent_api().
    """
    api = create_agent_api(agent_manager, **kwargs)
    
    try:
        asyncio.run(api.start())
    except KeyboardInterrupt:
        logger.info("Shutting down...")
    except Exception as e:
        logger.error(f"Error running Agent API: {e}", exc_info=True)
        raise
