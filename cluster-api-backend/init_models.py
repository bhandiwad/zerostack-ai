#!/usr/bin/env python3
"""
Initialize the database models and create all tables.
"""
import os
import sys

# Add the src directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

def init_models():
    """Initialize the database models and create all tables."""
    from sqlalchemy import create_engine, inspect
    from sqlalchemy.orm import sessionmaker
    
    # Configure database URI
    db_path = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'instance', 'app.db')
    db_uri = f'sqlite:///{db_path}'
    
    # Create database directory if it doesn't exist
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    
    # Create SQLAlchemy engine
    engine = create_engine(db_uri, echo=True)
    
    # Import all models to ensure they are registered with SQLAlchemy
    print("Importing models...")
    from src.models.agent_models import (
        AgentModel, AgentConversationModel, AgentMessageModel,
        AgentActionLogModel, AgentCapabilityModel
    )
    from src.models.cluster import Cluster, ClusterMetrics, Alert, CloudAccount, ProviderFlavor
    from src.models.spot_models import SpotInstanceConfig, SpotInstanceHistory, SpotInstanceSavings
    
    # Get the Base class from base_model
    from src.models.base_model import Base
    
    # Create all tables
    print("\nCreating tables...")
    Base.metadata.create_all(engine)
    
    # Verify tables were created
    print("\nVerifying tables...")
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    
    print("\nTables in database:")
    if tables:
        for table_name in tables:
            print(f"- {table_name}")
    else:
        print("No tables found in the database.")
    
    print("\nDatabase initialization complete!")
    print(f"Database file: {db_path}")

if __name__ == "__main__":
    init_models()
