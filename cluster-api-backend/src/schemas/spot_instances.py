from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, validator
from enum import Enum

class AllocationStrategy(str, Enum):
    LOWEST_PRICE = "lowest-price"
    DIVERSIFIED = "diversified"
    CAPACITY_OPTIMIZED = "capacity-optimized"
    PRICE_CAPACITY_OPTIMIZED = "price-capacity-optimized"

class InterruptionBehavior(str, Enum):
    TERMINATE = "terminate"
    STOP = "stop"
    HIBERNATE = "hibernate"

class SpotInstanceConfigBase(BaseModel):
    enabled: bool = Field(False, description="Whether spot instances are enabled")
    allocation_strategy: AllocationStrategy = Field(
        default=AllocationStrategy.LOWEST_PRICE,
        description="Strategy for allocating spot instances"
    )
    interruption_behavior: InterruptionBehavior = Field(
        default=InterruptionBehavior.TERMINATE,
        description="Behavior when spot instances are interrupted"
    )
    max_price: Optional[float] = Field(
        None,
        description="Maximum price to pay for spot instances (leave empty for on-demand price)",
        ge=0
    )
    instance_types: List[str] = Field(
        default_factory=list,
        description="List of allowed instance types (empty for all)"
    )

    @validator('instance_types', each_item=True)
    def validate_instance_types(cls, v):
        if not isinstance(v, str):
            raise ValueError("Instance type must be a string")
        return v.strip().lower()

class SpotInstanceConfigCreate(SpotInstanceConfigBase):
    pass

class SpotInstanceConfigUpdate(SpotInstanceConfigBase):
    pass

class SpotInstanceConfigResponse(SpotInstanceConfigBase):
    id: str
    cluster_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

class SpotInstanceSavingsDataPoint(BaseModel):
    date: datetime
    on_demand_cost: float = Field(..., ge=0)
    spot_cost: float = Field(..., ge=0)
    savings: float = Field(..., ge=0)
    savings_percentage: float = Field(..., ge=0, le=100)

class SpotInstanceSavingsResponse(BaseModel):
    start_date: datetime
    end_date: datetime
    total_savings: float = Field(..., ge=0)
    on_demand_cost: float = Field(..., ge=0)
    spot_cost: float = Field(..., ge=0)
    savings_percentage: float = Field(..., ge=0, le=100)
    granularity: str
    data_points: List[SpotInstanceSavingsDataPoint]

class SpotInstanceInterruption(BaseModel):
    timestamp: datetime
    instance_id: str
    instance_type: str
    availability_zone: str
    action: str
    reason: str
    spot_price: Optional[float] = None
    on_demand_price: Optional[float] = None

class RecommendationType(str, Enum):
    INSTANCE_TYPE = "instance-type"
    SCHEDULE = "schedule"
    CAPACITY = "capacity"
    OTHER = "other"

class RecommendationRiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class RecommendationEffort(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class SpotInstanceRecommendation(BaseModel):
    id: str
    type: RecommendationType
    title: str
    description: str
    potential_savings: float = Field(..., ge=0)
    risk_level: RecommendationRiskLevel
    implementation_effort: RecommendationEffort
    details: Dict[str, Any]

class SpotInstanceRecommendationApply(BaseModel):
    recommendation_id: str
    parameters: Optional[Dict[str, Any]] = None
