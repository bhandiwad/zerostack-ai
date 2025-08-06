import logging
import os
import sys

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.main import app
from src.extensions import db
from src.models.agent_models import Agent as AgentModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def list_agents():
    """Lists all agents in the database."""
    with app.app_context():
        logger.info('Fetching all agents...')
        all_agents = db.session.query(AgentModel).all()

        if not all_agents:
            logger.info("No agents found in the database.")
            return

        print("--- List of Agents ---")
        for agent in all_agents:
            print(f"ID: {agent.id}, Name: {agent.name}")
        print("----------------------")
        
        logger.info('Finished listing agents.')

if __name__ == '__main__':
    list_agents()
