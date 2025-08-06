#!/usr/bin/env python3
"""
Explicitly initialize the database by importing all models first.
"""
import os
import sys
from datetime import datetime

# Add the src directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

def init_database():
    """Initialize the database with all models explicitly imported."""
    from flask import Flask
    from flask_sqlalchemy import SQLAlchemy
    
    # Create a minimal Flask app
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(
        os.path.abspath(os.path.dirname(__file__)), 'instance', 'app.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Initialize SQLAlchemy
    db = SQLAlchemy()
    
    # Import all models explicitly
    print("Importing models...")
    
    # Import base models first
    from src.models.cluster import Cluster, ClusterMetrics, Alert, CloudAccount, ProviderFlavor
    from src.models.spot_models import SpotInstanceConfig, SpotInstanceHistory, SpotInstanceSavings
    from src.models.agent_models import (
        AgentModel, AgentConversationModel, AgentMessageModel,
        AgentActionLogModel, AgentCapabilityModel,
        Agent, AgentConversation, AgentMessage, AgentActionLog
    )
    
    # Initialize the app with the database
    db.init_app(app)
    
    # Create all tables
    with app.app_context():
        print("Creating database tables...")
        
        # Reflect all models
        db.reflect()
        
        # Create all tables
        db.create_all()
        print("Database tables created successfully!")
        
        # List all tables
        inspector = db.inspect(db.engine)
        table_names = inspector.get_table_names()
        print("\nTables in database:")
        for table_name in table_names:
            print(f"- {table_name}")
        
        # Check if our tables were created
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
    init_database()
