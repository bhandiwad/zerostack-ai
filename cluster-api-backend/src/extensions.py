import os
from flask import current_app
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from sqlalchemy.ext.declarative import declarative_base

# Create a base class for declarative models
Base = declarative_base()

# Initialize extensions without binding to an app
db = SQLAlchemy(model_class=Base)
migrate = Migrate()

# This will be set when the app is initialized
app = None

def init_app(flask_app):
    """Initialize the Flask application with extensions."""
    global app, db, migrate
    
    # Store the app reference
    app = flask_app
    
    # Configure SQLAlchemy
    flask_app.config.setdefault('SQLALCHEMY_DATABASE_URI', 
                              f'sqlite:///{os.path.join(flask_app.instance_path, "app.db")}')
    flask_app.config.setdefault('SQLALCHEMY_TRACK_MODIFICATIONS', False)
    
    # Initialize extensions with the app
    db.init_app(flask_app)
    migrate.init_app(flask_app, db, directory=os.path.join(flask_app.root_path, 'migrations'))
    
    # Import models in the correct order to avoid circular dependencies
    with flask_app.app_context():
        print("\n=== Initializing Database ===")
        print("Importing models in order...")
        
        # 1. Import base models first (no foreign key dependencies)
        print("\n[1/3] Importing base models...")
        from src.models.cluster import Cluster, ClusterMetrics, Alert, CloudAccount, ProviderFlavor
        print("  ✓ Imported Cluster, ClusterMetrics, Alert, CloudAccount, ProviderFlavor")
        
        # 2. Import models that depend on the base models
        print("\n[2/3] Importing spot instance models...")
        from src.models.spot_models import SpotInstanceConfig, SpotInstanceHistory, SpotInstanceSavings
        print("  ✓ Imported SpotInstanceConfig, SpotInstanceHistory, SpotInstanceSavings")
        
        # 3. Import agent models (they might depend on base models)
        print("\n[3/3] Importing agent models...")
        from src.models.agent_models import (
            AgentModel, AgentConversationModel, AgentMessageModel,
            AgentActionLogModel, AgentCapabilityModel
        )
        print("  ✓ Imported AgentModel, AgentConversationModel, AgentMessageModel, AgentActionLogModel, AgentCapabilityModel")
        
        # Create tables if they don't exist
        print("\n=== Creating Database Tables ===")
        print("Checking for existing tables...")
        
        # Get the metadata from the base class
        metadata = Base.metadata
        
        # Print all tables that should be created
        print("\nModels registered with SQLAlchemy:")
        for table_name, table in metadata.tables.items():
            print(f"  - {table_name} (columns: {', '.join([c.name for c in table.columns])})")
        
        # Create all tables
        print("\nCreating database tables...")
        metadata.create_all(bind=db.engine)
        
        # Verify tables were created
        print("\nDatabase tables after creation:")
        inspector = db.inspect(db.engine)
        table_names = inspector.get_table_names()
        for table_name in table_names:
            print(f"  - {table_name}")
        
        if not table_names:
            print("  No tables found in the database!")
        
        # Verify agent tables specifically
        agent_tables = [
            'agents', 'agent_capabilities', 
            'agent_conversations', 'agent_messages',
            'agent_action_logs'
        ]
        
        print("\nVerifying agent tables:")
        for table in agent_tables:
            exists = table in table_names
            status = "✓" if exists else "✗"
            print(f"  {status} {table}")
        
        if not all(t in table_names for t in agent_tables):
            print("\n⚠️  WARNING: Not all agent tables were created!")
        else:
            print("\n✓ All agent tables created successfully!")
        table_names = inspector.get_table_names()
        print("\nTables in database:")
        for table_name in table_names:
            print(f"- {table_name}")
    
    return flask_app

def get_db():
    """Get the database instance."""
    if 'sqlalchemy' not in current_app.extensions:
        raise RuntimeError("Database not initialized. Call init_app() first.")
    return db
    
    return db

def init_extensions(app):
    """Initialize Flask extensions with the given app."""
    global db
    
    # Ensure the instance folder exists
    os.makedirs(app.instance_path, exist_ok=True)
    
    # Configure SQLAlchemy
    app.config.setdefault('SQLALCHEMY_DATABASE_URI', 
                         f'sqlite:///{os.path.join(app.instance_path, "app.db")}')
    app.config.setdefault('SQLALCHEMY_TRACK_MODIFICATIONS', False)
    
    # Initialize extensions
    if db is None:
        db = SQLAlchemy(app)
    else:
        db.init_app(app)
        
    migrate.init_app(app, db, directory=os.path.join(app.root_path, 'migrations'))
    
    # Import models to ensure they're registered with SQLAlchemy
    from src.models import (
        Cluster, ClusterMetrics, Alert, CloudAccount, ProviderFlavor,
        SpotInstanceConfig, SpotInstanceHistory, SpotInstanceSavings,
        AgentModel, AgentConversationModel, AgentMessageModel,
        AgentActionLogModel, AgentCapabilityModel,
        Agent, AgentConversation, AgentMessage, AgentActionLog
    )
    
    # Make models available in the app context
    app.extensions['models'] = {
        # Core models
        'Cluster': Cluster,
        'ClusterMetrics': ClusterMetrics,
        'Alert': Alert,
        'CloudAccount': CloudAccount,
        'ProviderFlavor': ProviderFlavor,
        
        # Agent models
        'Agent': AgentModel,
        'AgentConversation': AgentConversationModel,
        'AgentMessage': AgentMessageModel,
        'AgentActionLog': AgentActionLogModel,
        'AgentCapability': AgentCapabilityModel,
        
        # Spot instance models
        'SpotInstanceConfig': SpotInstanceConfig,
        'SpotInstanceHistory': SpotInstanceHistory,
        'SpotInstanceSavings': SpotInstanceSavings
    }
    
    # Create tables if they don't exist
    with app.app_context():
        db.create_all()
    
    return db
