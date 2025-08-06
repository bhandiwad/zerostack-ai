#!/usr/bin/env python3
"""
Initialize the database and create all tables.
"""
import os
import sys
from datetime import datetime

# Add the src directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

def init_database():
    """Initialize the database and create all tables."""
    from src.main import create_app
    from src.extensions import db
    
    # Create the Flask application - this will initialize the db through create_app
    app = create_app()
    
    with app.app_context():
        print("Dropping all tables...")
        db.drop_all()
        
        print("Importing models...")
        # Import all models to ensure they are registered with SQLAlchemy
        from src.models.cluster import Cluster, ClusterMetrics, Alert, CloudAccount, ProviderFlavor
        from src.models.spot_models import SpotInstanceConfig, SpotInstanceHistory, SpotInstanceSavings
        from src.models.agent_models import (
            AgentModel, AgentConversationModel, AgentMessageModel,
            AgentActionLogModel, AgentCapabilityModel
        )
        
        print("Creating database tables...")
        db.create_all()
        
        # Verify tables were created
        from sqlalchemy import inspect
        inspector = inspect(db.engine)
        tables = inspector.get_table_names()
        print(f"\nCreated tables: {', '.join(tables)}\n")
        
        print("Database initialized successfully!")

if __name__ == "__main__":
    init_database()
