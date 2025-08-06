"""
Base Cloud Provider Interface

This module defines the base interface for all cloud provider implementations.
"""
from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional
from datetime import datetime

class CloudProviderClient(ABC):
    """Abstract base class for cloud provider clients"""
    
    def __init__(self, credentials: Dict[str, Any], region: Optional[str] = None):
        """Initialize the cloud provider client with credentials"""
        self.credentials = credentials
        self.region = region
        self._client = None
    
    @abstractmethod
    async def connect(self) -> None:
        """Establish connection to the cloud provider"""
        pass
    
    @abstractmethod
    async def validate_connection(self) -> bool:
        """
        Validate that the connection and credentials work
        
        Returns:
            bool: True if the connection is valid, False otherwise
        """
        pass
    
    @abstractmethod
    async def discover_resources(self, resource_types: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """
        Discover resources in the cloud account
        
        Args:
            resource_types: Optional list of resource types to discover.
                          If None, discover all supported resources.
                          
        Returns:
            List of discovered resources with their details
        """
        pass
    
    @abstractmethod
    async def get_cost_estimate(
        self, 
        start_date: datetime, 
        end_date: datetime, 
        granularity: str = "DAILY"
    ) -> Dict[str, Any]:
        """
        Get cost estimate for the specified time period
        
        Args:
            start_date: Start of the time period
            end_date: End of the time period
            granularity: Time granularity (DAILY, MONTHLY, etc.)
            
        Returns:
            Dictionary with cost estimate details
        """
        pass
    
    @abstractmethod
    async def run_compliance_checks(self, check_names: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """
        Run compliance checks on the cloud account
        
        Args:
            check_names: Optional list of specific checks to run.
                       If None, run all available checks.
                       
        Returns:
            List of compliance check results
        """
        pass
    
    @abstractmethod
    async def get_resource_metrics(
        self, 
        resource_id: str, 
        metric_names: List[str],
        start_time: datetime,
        end_time: datetime,
        period: int = 300
    ) -> Dict[str, List[Dict[str, Any]]]:
        """
        Get metrics for a specific resource
        
        Args:
            resource_id: ID of the resource
            metric_names: List of metric names to retrieve
            start_time: Start time for the metrics
            end_time: End time for the metrics
            period: Time period in seconds for data points
            
        Returns:
            Dictionary mapping metric names to their data points
        """
        pass
    
    @abstractmethod
    async def get_available_regions(self) -> List[Dict[str, Any]]:
        """
        Get list of available regions for the cloud provider
        
        Returns:
            List of region details
        """
        pass
    
    @abstractmethod
    async def get_resource_types(self) -> List[Dict[str, Any]]:
        """
        Get list of supported resource types for discovery
        
        Returns:
            List of resource type details
        """
        pass
    
    @abstractmethod
    async def get_compliance_checks(self) -> List[Dict[str, Any]]:
        """
        Get list of available compliance checks
        
        Returns:
            List of compliance check details
        """
        pass
    
    @abstractmethod
    async def close(self) -> None:
        """Clean up resources and close connections"""
        pass
