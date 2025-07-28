#!/usr/bin/env python3
"""
Management script for the Cluster API Backend application.
"""
import os
import sys
from flask.cli import FlaskGroup
from flask_migrate import Migrate

# Add the current directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

def create_app():
    """Create and configure the Flask application"""
    from src.main import create_app as create_flask_app
    return create_flask_app()

app = create_app()
migrate = Migrate(app, app.db)
cli = FlaskGroup(app)

@cli.shell_context_processor
def make_shell_context():
    """
    Create a shell context that adds the database instance and models to
    the shell session.
    """
    from src.extensions import db
    from src.models.agent import AgentModel, AgentCapabilityModel
    
    return dict(
        app=app,
        db=db,
        Agent=AgentModel,
        AgentCapability=AgentCapabilityModel
    )

if __name__ == '__main__':
    cli()
