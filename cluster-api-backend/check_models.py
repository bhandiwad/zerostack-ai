#!/usr/bin/env python3
"""
Check if all models are properly registered with SQLAlchemy.
"""
import os
import sys
from datetime import datetime

# Add the src directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

def check_models():
    """Check if all models are properly registered with SQLAlchemy."""
    from flask import Flask
    from flask_sqlalchemy import SQLAlchemy
    
    # Create a minimal Flask app
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Initialize SQLAlchemy
    db = SQLAlchemy()
    db.init_app(app)
    
    # Import all models
    print("Importing models...")
    from src.models.cluster import Cluster, ClusterMetrics, Alert, CloudAccount, ProviderFlavor
    from src.models.spot_models import SpotInstanceConfig, SpotInstanceHistory, SpotInstanceSavings
    from src.models.agent_models import (
        AgentModel, AgentConversationModel, AgentMessageModel,
        AgentActionLogModel, AgentCapabilityModel,
        Agent, AgentConversation, AgentMessage, AgentActionLog
    )
    
    # Create all tables in an in-memory database
    with app.app_context():
        print("Creating database tables...")
        db.create_all()
        print("Database tables created successfully!")
        
        # List all tables using inspect
        inspector = db.inspect(db.engine)
        table_names = inspector.get_table_names()
        
        print("\nTables created:")
        for table_name in table_names:
            print(f"- {table_name}")
        
        # Check if all expected tables are created
        expected_tables = {
            'agents', 'agent_conversations', 'agent_messages',
            'agent_action_logs', 'agent_capabilities',
            'clusters', 'cluster_metrics', 'alerts',
            'cloud_accounts', 'provider_flavors',
            'spot_instance_configs', 'spot_instance_history', 'spot_instance_savings'
        }
        
        created_tables = set(table_names)
        missing_tables = expected_tables - created_tables
        
        if missing_tables:
            print("\nMissing tables:")
            for table in sorted(missing_tables):
                print(f"- {table}")
        else:
            print("\nAll expected tables were created successfully!")

if __name__ == "__main__":
    check_models()
