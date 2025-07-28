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
    from src.main import create_app
    from src.extensions import db
    
    # Create the Flask application
    app = create_app()
    
    # Configure the migrations directory - use the same directory as Flask-Migrate
    migrations_dir = os.path.join(os.path.dirname(__file__), 'src', 'migrations')
    
    # Ensure the directory exists
    os.makedirs(migrations_dir, exist_ok=True)
    
    # Initialize Flask-Migrate
    migrate_obj = Migrate()
    migrate_obj.init_app(app, db, directory=migrations_dir)
    
    with app.app_context():
        # Initialize migrations if needed
        if not os.path.exists(migrations_dir):
            print("Initializing migrations...")
            init()
        
        try:
            # Create a new migration
            print("Creating migration...")
            migrate(message="Initial migration")
            
            # Apply the migration
            print("Applying migration...")
            upgrade()
            
            print("Database migration completed successfully!")
        except Exception as e:
            print(f"Error during migration: {e}")
            raise

if __name__ == "__main__":
    # Set environment variables
    os.environ['FLASK_APP'] = 'src.main:create_app()'
    os.environ['FLASK_ENV'] = 'development'
    
    # Run migrations
    run_migrations()
