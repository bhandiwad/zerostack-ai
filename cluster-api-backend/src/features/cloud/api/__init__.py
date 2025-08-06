"""
Cloud Account API Package

This package contains the API endpoints for managing cloud accounts and resources.
"""
from fastapi import APIRouter
from .router import router as cloud_router

# Create a router for all cloud-related endpoints
router = APIRouter()
router.include_router(cloud_router, prefix="/cloud/accounts", tags=["cloud-accounts"])

__all__ = ["router"]
