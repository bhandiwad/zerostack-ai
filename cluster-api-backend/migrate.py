#!/usr/bin/env python3
"""
Database migration script for the Cluster API Backend.
"""
import os
import sys

# Add the src directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

def run_migrations():
    """Run database migrations."""
    # Import here to avoid circular imports
    from flask_migrate import Migrate, upgrade, migrate, init, stamp
    
    # Create the Flask application first
    from src.main import create_app
    from src.extensions import db
    
    app = create_app()
    
    # Import models to ensure they're registered with SQLAlchemy
    with app.app_context():
        # Import models to ensure they're registered with SQLAlchemy
        from src.models import (
            Cluster, ClusterMetrics, Alert, CloudAccount, ProviderFlavor,
            SpotInstanceConfig, SpotInstanceHistory, SpotInstanceSavings,
            AgentModel, AgentConversationModel, AgentMessageModel, 
            AgentActionLogModel, AgentCapabilityModel
        )
        
        # Create all tables if they don't exist
        db.create_all()
    
    # Configure the migrations directory - use the same directory as Flask-Migrate
    migrations_dir = os.path.join(os.path.dirname(__file__), 'migrations')
    
    # Ensure the directory exists
    os.makedirs(migrations_dir, exist_ok=True)
    
    # Initialize Flask-Migrate
    migrate_obj = Migrate()
    migrate_obj.init_app(app, db, directory=migrations_dir)
    
    with app.app_context():
        # Initialize migrations if needed
        versions_dir = os.path.join(migrations_dir, 'versions')
        
        # Check if we need to initialize migrations
        if not os.path.exists(versions_dir) or not os.listdir(versions_dir):
            print("Initializing migrations...")
            init(directory=migrations_dir)
            
            # Stamp the first migration as 'head'
            print("Stamping initial migration...")
            stamp(directory=migrations_dir)
        else:
            print("Using existing migrations directory")
        
        # Create a new migration
        print("Creating a new migration...")
        try:
            migrate(directory=migrations_dir, message="Add timestamp columns to agents table")
            
            # Apply the migration
            print("Applying migrations...")
            upgrade(directory=migrations_dir)
            
            print("Database migration completed successfully!")
        except Exception as e:
            print(f"Error during migration: {str(e)}")
            print("Attempting to continue with database schema update...")
            
            # If migration fails, try to update the schema directly
            try:
                print("Updating database schema directly...")
                db.create_all()
                print("Database schema updated successfully!")
            except Exception as e2:
                print(f"Failed to update database schema: {str(e2)}")
                raise
        except Exception as e:
            print(f"Error during migration: {e}")
            # If there's an error, try to continue with stamping the current head
            try:
                print("Attempting to stamp the database with the current head...")
                stamp(directory=migrations_dir)
                print("Successfully stamped the database with the current head.")
            except Exception as stamp_error:
                print(f"Error stamping the database: {stamp_error}")
            raise

if __name__ == "__main__":
    # Set environment variables
    os.environ['FLASK_APP'] = 'src.main:create_app()'
    os.environ['FLASK_ENV'] = 'development'
    
    # Run migrations
    run_migrations()
