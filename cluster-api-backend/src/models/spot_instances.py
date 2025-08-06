from datetime import datetime
from sqlalchemy import Column, String, Boolean, Float, JSON, ForeignKey, DateTime, Integer
from sqlalchemy.orm import relationship

from .base import Base

class SpotInstanceConfig(Base):
    """Spot instance configuration for a cluster"""
    __tablename__ = "spot_instance_configs"
    
    id = Column(String(36), primary_key=True, index=True)
    cluster_id = Column(String(36), ForeignKey("clusters.id"), unique=True, nullable=False)
    
    # Spot instance settings
    enabled = Column(Boolean, default=False, nullable=False)
    allocation_strategy = Column(String(50), default="lowest-price", nullable=False)
    interruption_behavior = Column(String(50), default="terminate", nullable=False)
    max_price = Column(Float, nullable=True)
    instance_types = Column(JSON, default=list, nullable=False)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
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
    config_id = Column(String(36), ForeignKey("spot_instance_configs.id"), nullable=False)
    
    # Event details
    event_type = Column(String(50), nullable=False)  # e.g., "interruption", "price_change", "config_update"
    event_data = Column(JSON, default=dict, nullable=False)
    
    # Resource details
    instance_id = Column(String(100), nullable=True)
    instance_type = Column(String(50), nullable=True)
    availability_zone = Column(String(50), nullable=True)
    
    # Pricing
    spot_price = Column(Float, nullable=True)
    on_demand_price = Column(Float, nullable=True)
    
    # Timestamps
    event_time = Column(DateTime, nullable=False, index=True)
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
    cluster_id = Column(String(36), ForeignKey("clusters.id"), nullable=False, index=True)
    
    # Time period
    period_start = Column(DateTime, nullable=False, index=True)
    period_end = Column(DateTime, nullable=False, index=True)
    granularity = Column(String(20), nullable=False)  # "hourly", "daily", "weekly", "monthly"
    
    # Cost data
    on_demand_cost = Column(Float, nullable=False)
    spot_cost = Column(Float, nullable=False)
    savings = Column(Float, nullable=False)
    savings_percentage = Column(Float, nullable=False)
    
    # Resource usage
    instance_hours = Column(Float, nullable=False)
    spot_instance_hours = Column(Float, nullable=False)
    
    # Metadata
    recorded_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    def to_dict(self):
        return {
            "id": self.id,
            "cluster_id": self.cluster_id,
            "period_start": self.period_start.isoformat() if self.period_start else None,
            "period_end": self.period_end.isoformat() if self.period_end else None,
            "granularity": self.granularity,
            "on_demand_cost": self.on_demand_cost,
            "spot_cost": self.spot_cost,
            "savings": self.savings,
            "savings_percentage": self.savings_percentage,
            "instance_hours": self.instance_hours,
            "spot_instance_hours": self.spot_instance_hours,
            "recorded_at": self.recorded_at.isoformat() if self.recorded_at else None,
        }
