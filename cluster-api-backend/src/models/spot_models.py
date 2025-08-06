from datetime import datetime
from sqlalchemy import Column, String, Boolean, Float, JSON, ForeignKey, DateTime, Integer, Text
from sqlalchemy.orm import relationship

# Import the base model
from .base_model import Base, BaseModel

class SpotInstanceConfig(Base):
    """Spot instance configuration for a cluster"""
    __tablename__ = "spot_instance_configs"
    
    id = Column(String(36), primary_key=True, index=True)
    cluster_id = Column(String(36), ForeignKey('clusters.id', ondelete='CASCADE'), unique=True, nullable=False)
    
    # Spot instance settings
    enabled = Column(Boolean, default=False, nullable=False)
    allocation_strategy = Column(String(50), default="lowest-price", nullable=False)
    interruption_behavior = Column(String(50), default="terminate", nullable=False)
    max_price = Column(Float, nullable=True)
    instance_types = Column(JSON, default=list, nullable=False)
    
    # Relationships - use string-based references to avoid circular imports
    cluster = relationship("Cluster", back_populates="spot_config")
    history = relationship("SpotInstanceHistory", back_populates="config", cascade="all, delete-orphan")
    
    def to_dict(self):
        return {
            "id": self.id,
            "cluster_id": self.cluster_id,
            "enabled": self.enabled,
            "allocation_strategy": self.allocation_strategy,
            "interruption_behavior": self.interruption_behavior,
            "max_price": self.max_price,
            "instance_types": self.instance_types,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class SpotInstanceHistory(Base):
    """Historical data for spot instance events"""
    __tablename__ = "spot_instance_history"
    
    id = Column(String(36), primary_key=True, index=True)
    config_id = Column(String(36), ForeignKey('spot_instance_configs.id', ondelete='CASCADE'), nullable=False)
    
    # Event details
    event_type = Column(String(50), nullable=False)  # e.g., 'launch', 'terminate', 'interruption', 'price_change'
    event_data = Column(JSON, default=dict, nullable=False)  # Raw event data
    
    # Instance details
    instance_id = Column(String(100), nullable=True)
    instance_type = Column(String(50), nullable=True)
    availability_zone = Column(String(50), nullable=True)
    
    # Pricing
    spot_price = Column(Float, nullable=True)  # Price per hour at time of event
    on_demand_price = Column(Float, nullable=True)  # On-demand price for comparison
    
    # Timestamps
    event_time = Column(DateTime, nullable=False, index=True)  # When the event occurred
    recorded_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    config = relationship("SpotInstanceConfig", back_populates="history")
    
    def to_dict(self):
        return {
            "id": self.id,
            "config_id": self.config_id,
            "event_type": self.event_type,
            "event_data": self.event_data,
            "instance_id": self.instance_id,
            "instance_type": self.instance_type,
            "availability_zone": self.availability_zone,
            "spot_price": self.spot_price,
            "on_demand_price": self.on_demand_price,
            "event_time": self.event_time.isoformat() if self.event_time else None,
            "recorded_at": self.recorded_at.isoformat() if self.recorded_at else None,
        }


class SpotInstanceSavings(Base):
    """Aggregated spot instance savings data"""
    __tablename__ = "spot_instance_savings"
    
    id = Column(String(36), primary_key=True, index=True)
    cluster_id = Column(String(36), ForeignKey('clusters.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Time period
    period_start = Column(DateTime, nullable=False, index=True)
    period_end = Column(DateTime, nullable=False, index=True)
    granularity = Column(String(20), nullable=False)  # 'hourly', 'daily', 'weekly', 'monthly'
    
    # Cost data
    on_demand_cost = Column(Float, nullable=False)  # What it would have cost on-demand
    spot_cost = Column(Float, nullable=False)  # What it actually cost on spot
    savings_amount = Column(Float, nullable=False)  # on_demand_cost - spot_cost
    savings_percentage = Column(Float, nullable=False)  # (savings_amount / on_demand_cost) * 100
    
    # Usage metrics
    instance_count = Column(Integer, default=0, nullable=False)  # Number of spot instances
    instance_hours = Column(Float, default=0.0, nullable=False)  # Total instance hours
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    cluster = relationship("Cluster", backref="spot_savings")
    
    def to_dict(self):
        return {
            "id": self.id,
            "cluster_id": self.cluster_id,
            "period_start": self.period_start.isoformat() if self.period_start else None,
            "period_end": self.period_end.isoformat() if self.period_end else None,
            "granularity": self.granularity,
            "on_demand_cost": self.on_demand_cost,
            "spot_cost": self.spot_cost,
            "savings_amount": self.savings_amount,
            "savings_percentage": self.savings_percentage,
            "instance_count": self.instance_count,
            "instance_hours": self.instance_hours,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
