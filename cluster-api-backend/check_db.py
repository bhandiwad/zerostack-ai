#!/usr/bin/env python3
"""
Check database connection and metadata.
"""
import os
import sys

# Add the src directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

def check_database():
    """Check database connection and metadata."""
    from src.main import create_app
    from src.extensions import db
    
    # Create the Flask application
    app = create_app()
    
    with app.app_context():
        # Print database URI
        print(f"Database URI: {app.config['SQLALCHEMY_DATABASE_URI']}")
        print(f"Database file exists: {os.path.exists(app.config['SQLALCHEMY_DATABASE_URI'].replace('sqlite:///', ''))}")
        
        # Get database engine
        engine = db.get_engine()
        print(f"Database engine: {engine}")
        
        # Get metadata
        metadata = db.metadata
        print("\nTables in metadata:")
        for table in metadata.sorted_tables:
            print(f"- {table.name}")
        
        # Check if tables exist in the database
        from sqlalchemy import inspect
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        print(f"\nTables in database: {tables}")
        
        # Try to create tables
        print("\nCreating tables...")
        db.create_all()
        
        # Check tables again
        tables_after = inspect(engine).get_table_names()
        print(f"Tables after create_all: {tables_after}")
        
        # Print SQL for table creation
        print("\nSQL for table creation:")
        from sqlalchemy.schema import CreateTable
        for table in metadata.sorted_tables:
            print(f"\n-- {table.name} --")
            print(CreateTable(table).compile(engine))

if __name__ == "__main__":
    check_database()
