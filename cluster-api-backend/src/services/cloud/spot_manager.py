import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from abc import ABC, abstractmethod

from ...models import CloudAccount, Cluster, SpotInstanceConfig, SpotInstanceHistory
from ...schemas.spot_instances import (
    SpotInstanceConfigCreate,
    SpotInstanceConfigUpdate,
    SpotInstanceSavingsResponse,
    SpotInstanceInterruption,
    SpotInstanceRecommendation,
)

logger = logging.getLogger(__name__)

class SpotInstanceManager(ABC):
    """
    Abstract base class for spot instance management across cloud providers
    """
    
    def __init__(self, account: CloudAccount, cluster: Cluster):
        self.account = account
        self.cluster = cluster
        self.provider = account.provider
        self.credentials = account.get_decrypted_credentials()
    
    @abstractmethod
    async def apply_config(self, config: SpotInstanceConfig) -> bool:
        """Apply spot instance configuration to the cloud provider"""
        pass
    
    @abstractmethod
    async def get_savings_report(
        self,
        start_date: datetime,
        end_date: datetime,
        granularity: str = "daily"
    ) -> SpotInstanceSavingsResponse:
        """Get spot instance savings report"""
        pass
    
    @abstractmethod
    async def get_interruption_history(
        self,
        start_date: datetime,
        end_date: datetime,
        instance_type: Optional[str] = None
    ) -> List[SpotInstanceInterruption]:
        """Get spot instance interruption history"""
        pass
    
    @abstractmethod
    async def get_recommendations(self) -> List[SpotInstanceRecommendation]:
        """Get spot instance optimization recommendations"""
        pass
    
    @abstractmethod
    async def apply_recommendation(self, recommendation_id: str) -> Dict[str, Any]:
        """Apply a spot instance recommendation"""
        pass
    
    # Common utility methods
    def _get_default_config(self) -> Dict[str, Any]:
        """Get default spot instance configuration"""
        return {
            "enabled": False,
            "allocation_strategy": "lowest-price",
            "interruption_behavior": "terminate",
            "max_price": None,
            "instance_types": [],
        }
    
    def _validate_config(self, config: Dict[str, Any]) -> bool:
        """Validate spot instance configuration"""
        if not isinstance(config, dict):
            raise ValueError("Configuration must be a dictionary")
        
        if "enabled" not in config:
            raise ValueError("Configuration must specify 'enabled' status")
        
        if config.get("enabled"):
            if "allocation_strategy" not in config:
                raise ValueError("Configuration must specify 'allocation_strategy' when enabled")
            
            if config["allocation_strategy"] not in ["lowest-price", "diversified", "capacity-optimized"]:
                raise ValueError("Invalid allocation strategy")
            
            if "interruption_behavior" not in config:
                raise ValueError("Configuration must specify 'interruption_behavior' when enabled")
            
            if config["interruption_behavior"] not in ["terminate", "stop", "hibernate"]:
                raise ValueError("Invalid interruption behavior")
            
            if "max_price" in config and config["max_price"] is not None:
                try:
                    float(config["max_price"])
                except (ValueError, TypeError):
                    raise ValueError("Max price must be a valid number or null")
            
            if "instance_types" in config and not isinstance(config["instance_types"], list):
                raise ValueError("Instance types must be a list")
        
        return True


class AWSSpotInstanceManager(SpotInstanceManager):
    """AWS implementation of SpotInstanceManager"""
    
    async def apply_config(self, config: SpotInstanceConfig) -> bool:
        logger.info(f"Applying AWS spot instance config for cluster {self.cluster.id}")
        self._validate_config(config)
        
        # TODO: Implement AWS-specific spot instance configuration
        # This would use boto3 to configure AWS Spot Fleet or EC2 Spot Instances
        
        return True
    
    async def get_savings_report(
        self,
        start_date: datetime,
        end_date: datetime,
        granularity: str = "daily"
    ) -> SpotInstanceSavingsResponse:
        logger.info(f"Getting AWS spot savings report for cluster {self.cluster.id}")
        
        # TODO: Implement AWS Cost Explorer API integration
        # This is a mock implementation
        
        # Generate mock data for the date range
        days = (end_date - start_date).days + 1
        dates = [start_date + timedelta(days=i) for i in range(days)]
        
        savings_data = {
            "start_date": start_date,
            "end_date": end_date,
            "total_savings": 1245.67,
            "on_demand_cost": 3456.78,
            "spot_cost": 2211.11,
            "savings_percentage": 35.7,
            "granularity": granularity,
            "data_points": [
                {
                    "date": date,
                    "on_demand_cost": 100 + (i * 10),
                    "spot_cost": 30 + (i * 5),
                    "savings": 70 + (i * 5),
                    "savings_percentage": 70 - (i * 0.5),
                }
                for i, date in enumerate(dates)
            ]
        }
        
        return SpotInstanceSavingsResponse(**savings_data)
    
    async def get_interruption_history(
        self,
        start_date: datetime,
        end_date: datetime,
        instance_type: Optional[str] = None
    ) -> List[SpotInstanceInterruption]:
        logger.info(f"Getting AWS spot interruption history for cluster {self.cluster.id}")
        
        # TODO: Implement AWS CloudTrail/CloudWatch integration
        # This is a mock implementation
        
        mock_interruptions = [
            {
                "timestamp": datetime.utcnow() - timedelta(days=7, hours=3),
                "instance_id": f"i-{i:012x}",
                "instance_type": "m5.large",
                "availability_zone": f"us-east-{chr(97 + i)}",  # a, b, c, etc.
                "action": "terminate",
                "reason": "instance-terminated-by-price",
            }
            for i in range(5)
        ]
        
        return [SpotInstanceInterruption(**item) for item in mock_interruptions]
    
    async def get_recommendations(self) -> List[SpotInstanceRecommendation]:
        logger.info(f"Getting AWS spot recommendations for cluster {self.cluster.id}")
        
        # TODO: Implement AWS Compute Optimizer integration
        # This is a mock implementation
        
        mock_recommendations = [
            {
                "id": "rec-001",
                "type": "instance-type",
                "title": "Switch to spot instances",
                "description": "Save up to 70% by using spot instances for stateless workloads",
                "potential_savings": 450.0,
                "risk_level": "medium",
                "implementation_effort": "low",
                "details": {
                    "current_instance_type": "m5.large",
                    "recommended_instance_type": "m5.large (Spot)",
                    "estimated_savings_percentage": 70,
                }
            },
            {
                "id": "rec-002",
                "type": "schedule",
                "title": "Schedule non-production instances",
                "description": "Stop non-production instances during off-hours",
                "potential_savings": 280.0,
                "risk_level": "low",
                "implementation_effort": "low",
                "details": {
                    "schedule": "Mon-Fri 18:00-08:00, All day Sat-Sun",
                    "affected_instances": 8,
                }
            }
        ]
        
        return [SpotInstanceRecommendation(**item) for item in mock_recommendations]
    
    async def apply_recommendation(self, recommendation_id: str) -> Dict[str, Any]:
        logger.info(f"Applying AWS spot recommendation {recommendation_id} for cluster {self.cluster.id}")
        
        # TODO: Implement actual recommendation application
        # This is a mock implementation
        
        return {
            "status": "success",
            "message": f"Successfully applied recommendation {recommendation_id}",
            "recommendation_id": recommendation_id,
            "timestamp": datetime.utcnow()
        }


class AzureSpotInstanceManager(SpotInstanceManager):
    """Azure implementation of SpotInstanceManager"""
    # Implementation for Azure spot instances
    pass


class GCPSpotInstanceManager(SpotInstanceManager):
    """GCP implementation of SpotInstanceManager"""
    # Implementation for GCP spot instances (preemptible VMs)
    pass


def get_spot_instance_manager(account: CloudAccount, cluster: Cluster) -> SpotInstanceManager:
    """Factory function to get the appropriate spot instance manager for the cloud provider"""
    provider = account.provider.lower()
    
    if provider == "aws":
        return AWSSpotInstanceManager(account, cluster)
    elif provider == "azure":
        return AzureSpotInstanceManager(account, cluster)
    elif provider == "gcp":
        return GCPSpotInstanceManager(account, cluster)
    else:
        raise ValueError(f"Unsupported cloud provider: {provider}")
