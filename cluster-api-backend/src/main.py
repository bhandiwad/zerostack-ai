import os
import sys
from datetime import datetime
import uuid

# Add the parent directory to the path so we can import src
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy

# Import extensions and blueprints
from src.extensions import db, init_extensions, init_app
from src.config import config_by_name
from src.routes.user import user_bp
from src.routes.clusters import clusters_bp
from src.routes.providers import providers_bp
from src.routes.cloud_accounts import cloud_accounts_bp
from src.routes.cluster_operations import cluster_ops_bp
from src.routes.cost_estimation import cost_bp
from src.routes.auth import auth_bp
from src.routes.organization import org_bp
from src.routes.advanced_cluster_routes import advanced_cluster_bp
from src.routes.clusters_multitenant import clusters_mt_bp
from src.routes.agents import agents_bp
from src.routes.cluster_explorer import cluster_explorer_bp
from src.routes.helm_charts import helm_charts_bp
from src.features.support.support_routes import support_bp
from src.features.agents.training_routes import training_bp
from src.features.agents.management_routes import management_bp
from src.features.ai_endpoints.ai_endpoints_routes import ai_endpoints_bp
from src.features.debugging.debugging_routes import debugging_bp
from src.features.workflows.workflow_routes import workflows_bp
from src.features.maintenance.maintenance_routes import maintenance_bp
from src.features.debugging.debugging_routes import debugging_bp
from src.features.agents.memory_routes import memory_bp
from src.features.agents.a2a_messaging_routes import a2a_bp
from src.features.agents.learning_routes import learning_bp
from src.features.agents.context_sharing_routes import context_bp
from src.features.agents.workflow_designer_routes import workflow_designer_bp
from src.features.deployments.deployment_routes import deployment_bp

def create_app(config_name='dev'):
    """Create and configure the Flask application"""
    app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))
    
    # Configure the app
    app.config.from_object(config_by_name[config_name])
    
    # Initialize extensions
    db = init_extensions(app)
    
    # Enable CORS before blueprint registration
    CORS(app, 
         resources={
             r"/api/*": {
                 "origins": ["http://localhost:3000", "http://127.0.0.1:3000"],
                 "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
                 "allow_headers": ["Content-Type", "Authorization"],
                 "supports_credentials": True
             }
         })

    # Register blueprints
    app.register_blueprint(user_bp, url_prefix='/api')
    app.register_blueprint(clusters_bp, url_prefix='/api/clusters')
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(org_bp, url_prefix='/api/organizations')
    app.register_blueprint(advanced_cluster_bp, url_prefix='/api/advanced')
    app.register_blueprint(clusters_mt_bp, url_prefix='/api/multitenant')
    app.register_blueprint(agents_bp, url_prefix='/api/agents')
    app.register_blueprint(cluster_explorer_bp, url_prefix='/api/explorer')
    app.register_blueprint(helm_charts_bp, url_prefix='/api/helm')
    app.register_blueprint(support_bp, url_prefix='/api/support')
    app.register_blueprint(training_bp, url_prefix='/api/training')
    app.register_blueprint(management_bp, url_prefix='/api/management')
    app.register_blueprint(ai_endpoints_bp, url_prefix='/api/ai-endpoints')
    app.register_blueprint(debugging_bp, url_prefix='/api/debugging')
    app.register_blueprint(workflows_bp, url_prefix='/api/workflows')
    app.register_blueprint(maintenance_bp, url_prefix='/api/maintenance')
    app.register_blueprint(memory_bp, url_prefix='/api/memory')
    app.register_blueprint(a2a_bp, url_prefix='/api/a2a')
    app.register_blueprint(learning_bp, url_prefix='/api/learning')
    app.register_blueprint(context_bp, url_prefix='/api/context')
    app.register_blueprint(workflow_designer_bp, url_prefix='/api/workflow-designer')
    app.register_blueprint(deployment_bp, url_prefix='/api/deployments')
    
    # Health check endpoint
    @app.route('/api/health')
    def health_check():
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'database': 'connected' if db.session.bind is not None else 'disconnected'
        })
    
    # Ensure the instance folder exists
    os.makedirs(os.path.join(app.instance_path), exist_ok=True)
    
    return app

# Create the Flask application
config_name = os.getenv('FLASK_CONFIG', 'dev')
app = create_app(config_name)

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    # Don't intercept API routes - let the API blueprints handle those
    if path.startswith('api/'):
        return "Not found", 404
        
    static_folder_path = app.static_folder
    if static_folder_path is None:
        return "Static folder not configured", 404

    if path != "" and os.path.exists(os.path.join(static_folder_path, path)):
        return send_from_directory(static_folder_path, path)
    else:
        index_path = os.path.join(static_folder_path, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(static_folder_path, 'index.html')
        else:
            return "index.html not found", 404


if __name__ == '__main__':
    # Run the Flask app
    app.run(host='0.0.0.0', port=5002, debug=True, use_reloader=False)
