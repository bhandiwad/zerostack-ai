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

AGENTS_TO_REMOVE = [
    'Test Agent'
]

def cleanup_test_agents():
    """Removes the specified test agents from the database."""
    with app.app_context():
        logger.info('Starting test agent cleanup...')

        agents_to_delete = db.session.query(AgentModel).filter(AgentModel.name.in_(AGENTS_TO_REMOVE)).all()

        if not agents_to_delete:
            logger.info("No test agents found to delete.")
            return

        for agent in agents_to_delete:
            logger.info(f"Deleting agent: {agent.name} (ID: {agent.id})")
            db.session.delete(agent)

        db.session.commit()
        logger.info('Test agent cleanup complete.')

if __name__ == '__main__':
    cleanup_test_agents()
