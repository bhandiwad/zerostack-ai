"""
Initialize the database with all required tables.
This is a one-time setup script.
"""
import os
import sys
from datetime import datetime
import uuid

# Add the src directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.extensions import db, AgentModel, AgentConversationModel, AgentMessageModel, AgentActionLogModel

def init_db():
    """Initialize the database with all required tables."""
    # Create the database and tables
    db.create_all()
    
    # Create a default agent if none exists
    if not AgentModel.query.first():
        agent = AgentModel(
            id=str(uuid.uuid4()),
            name="Default Agent",
            description="Default system agent",
            version="1.0.0",
            is_active=True
        )
        db.session.add(agent)
        db.session.commit()
        print("Created default agent")
    
    print("Database initialized successfully!")

if __name__ == "__main__":
    from src.main import create_app
    
    # Create the Flask application
    app = create_app()
    
    with app.app_context():
        init_db()
