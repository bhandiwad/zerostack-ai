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
from src.extensions import db, init_extensions
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

def create_app():
    """Create and configure the Flask application"""
    app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))
    
    # Configure the app
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-key-change-in-production')
    app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(os.path.dirname(__file__), '..', 'instance', 'app.db')}"
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Initialize extensions
    init_extensions(app)
    
    # Enable CORS for all routes
    CORS(app, resources={r"/*": {"origins": "*"}})
    
    # Register blueprints
    app.register_blueprint(user_bp, url_prefix='/api')
    app.register_blueprint(clusters_bp, url_prefix='/api')
    app.register_blueprint(providers_bp, url_prefix='/api')
    app.register_blueprint(cloud_accounts_bp, url_prefix='/api')
    app.register_blueprint(cluster_ops_bp, url_prefix='/api')
    app.register_blueprint(cost_bp, url_prefix='/api')
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(org_bp, url_prefix='/api')
    app.register_blueprint(advanced_cluster_bp, url_prefix='/api')
    app.register_blueprint(clusters_mt_bp, url_prefix='/api/mt')
    app.register_blueprint(agents_bp, url_prefix='/api')
    
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
app = create_app()

# Initialize the database
with app.app_context():
    db.create_all()
    db.create_all()

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
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
    app.run(host='0.0.0.0', port=5002, debug=True)
