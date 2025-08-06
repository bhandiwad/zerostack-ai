import logging
import os
import sys
from datetime import datetime

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.main import app
from src.extensions import db
from src.models.agent_models import Agent as AgentModel, AgentStatus

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DEFAULT_AGENTS = [
    {
        'name': 'Debugging Agent',
        'description': 'An agent specialized in diagnosing and resolving issues within the cluster.',
        'type': 'specialist',
        'capabilities': ['logging', 'monitoring', 'audit']
    },
    {
        'name': 'Provisioning Agent',
        'description': 'Handles the setup and provisioning of new cluster resources.',
        'type': 'worker',
        'capabilities': ['cluster_management', 'automation']
    },
    {
        'name': 'App Deployment Agent',
        'description': 'Manages the deployment and lifecycle of applications.',
        'type': 'worker',
        'capabilities': ['cluster_management', 'automation', 'suggestions']
    },
    {
        'name': 'Security Agent',
        'description': 'Monitors the cluster for security vulnerabilities and policy violations.',
        'type': 'guardian',
        'capabilities': ['security_scanning', 'audit', 'monitoring']
    },
    {
        'name': 'Backup Agent',
        'description': 'Performs regular backups of cluster data and configurations.',
        'type': 'worker',
        'capabilities': ['backup', 'automation']
    },
    {
        'name': 'Monitoring Agent',
        'description': 'Collects and analyzes metrics and logs to monitor cluster health.',
        'type': 'observer',
        'capabilities': ['monitoring', 'logging']
    },
    {
        'name': 'Automation Agent',
        'description': 'Executes automated tasks and workflows.',
        'type': 'worker',
        'capabilities': ['automation', 'suggestions']
    },
    {
        'name': 'Cluster Auditor',
        'description': 'Audits cluster configurations and resource usage for compliance and efficiency.',
        'type': 'auditor',
        'capabilities': ['audit', 'cluster_management']
    }
]

def seed_database():
    """Seeds the database with default agents."""
    with app.app_context():
        logger.info('Starting database seeding...')

        existing_agents = {agent.name for agent in db.session.query(AgentModel).with_entities(AgentModel.name).all()}

        for agent_data in DEFAULT_AGENTS:
            if agent_data['name'] in existing_agents:
                logger.info(f"Agent '{agent_data['name']}' already exists. Skipping.")
                continue

            agent = AgentModel(
                name=agent_data['name'],
                description=agent_data['description'],
                type=agent_data['type'],
                capabilities=agent_data['capabilities'],
                status=AgentStatus.OFFLINE,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.session.add(agent)
            logger.info(f"Adding agent: {agent.name}")

        db.session.commit()
        logger.info('Database seeding complete.')

if __name__ == '__main__':
    seed_database()
