#!/usr/bin/env python3
"""
Test script to verify database initialization with the new model structure.
"""
import os
import sys
from datetime import datetime

# Add the src directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

def test_database_initialization():
    """Test database initialization and table creation."""
    from flask import Flask
    from src.extensions import init_app, get_db
    
    # Create a test Flask app
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///test.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Initialize the application
    print("Initializing application...")
    app = init_app(app)
    
    # Get a database session
    with app.app_context():
        db = get_db()
        # Check if tables were created
        inspector = db.inspect(db.engine)
        table_names = inspector.get_table_names()
        
        print("\nTables in database:")
        for table_name in table_names:
            print(f"- {table_name}")
        
        # Expected tables
        expected_tables = {
            'agent_action_logs', 'agent_capabilities', 'agent_conversations',
            'agent_messages', 'agents', 'alembic_version', 'alerts',
            'cloud_accounts', 'cluster_metrics', 'clusters', 'provider_flavors',
            'spot_instance_configs', 'spot_instance_history', 'spot_instance_savings'
        }
        
        # Check for missing tables
        missing_tables = expected_tables - set(table_names)
        if missing_tables:
            print("\nMissing tables:")
            for table in sorted(missing_tables):
                print(f"- {table}")
            return False
        
        print("\nAll tables created successfully!")
        return True

if __name__ == "__main__":
    # Remove existing test database if it exists
    if os.path.exists('test.db'):
        os.remove('test.db')
    
    # Run the test
    success = test_database_initialization()
    
    # Clean up
    if os.path.exists('test.db'):
        os.remove('test.db')
    
    # Exit with appropriate status code
    sys.exit(0 if success else 1)
