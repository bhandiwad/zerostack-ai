#!/usr/bin/env python3
"""
Script to update the agents table schema by creating a new table with the correct
schema, migrating data, and then renaming tables.
"""
import os
import sys
from datetime import datetime

# Add the src directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

def update_agents_schema():
    """Update the agents table schema by creating a new table with timestamps."""
    # Import the Flask app and database
    from src.main import create_app
    from src.extensions import db
    from sqlalchemy import text
    
    # Create the Flask application
    app = create_app()
    
    with app.app_context():
        try:
            # Check if we need to do anything
            result = db.session.execute(
                text("PRAGMA table_info(agents)")
            ).fetchall()
            
            columns = [row[1].lower() for row in result]
            
            if 'created_at' in columns and 'updated_at' in columns:
                print("Schema is already up to date.")
                return True
                
            print("Starting schema update...")
            
            # Step 1: Create a new table with the correct schema
            print("Creating new agents table with updated schema...")
            db.session.execute(text("""
                CREATE TABLE agents_new (
                    id VARCHAR(64) NOT NULL, 
                    name VARCHAR(128) NOT NULL, 
                    description TEXT, 
                    type VARCHAR(64) NOT NULL, 
                    config JSON, 
                    status JSON, 
                    capabilities JSON, 
                    last_active DATETIME, 
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
                    PRIMARY KEY (id)
                )
            """))
            
            # Commit the creation of the new table
            db.session.commit()
            
            # Step 2: Copy data from old table to new table
            print("Migrating data to new table...")
            db.session.execute(text("""
                INSERT INTO agents_new (id, name, description, type, config, status, capabilities, last_active)
                SELECT id, name, description, type, config, status, capabilities, last_active
                FROM agents
            """))
            
            # Commit the data migration
            db.session.commit()
            
            # Step 3: Drop the old table
            print("Dropping old table...")
            db.session.execute(text("DROP TABLE agents"))
            
            # Commit the drop
            db.session.commit()
            
            # Step 4: Rename new table to original name
            print("Renaming new table...")
            db.session.execute(text("ALTER TABLE agents_new RENAME TO agents"))
            
            # Commit the final changes
            db.session.commit()
            print("Schema update completed successfully!")
            
            # Verify the schema
            result = db.session.execute(
                text("PRAGMA table_info(agents)")
            ).fetchall()
            
            columns = [row[1] for row in result]
            print("Current columns in agents table:", columns)
            
            return True
            
        except Exception as e:
            print(f"Error updating schema: {str(e)}")
            db.session.rollback()
            return False

if __name__ == "__main__":
    print("Starting agents table schema update...")
    if update_agents_schema():
        print("Schema update completed successfully!")
        sys.exit(0)
    else:
        print("Schema update failed.")
        sys.exit(1)
