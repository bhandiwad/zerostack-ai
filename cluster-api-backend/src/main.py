import os
import sys
# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory
from flask_cors import CORS
from src.models.user import db
from src.models.cluster import Cluster, ClusterMetrics, Alert, CloudAccount, ProviderFlavor
from src.models.cloud_account import CloudAccount as CloudAccountModel, CloudAccountTemplate
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

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))
app.config['SECRET_KEY'] = 'asdf#FGSgvasgf$5$WGT'

# Enable CORS for all routes
CORS(app, origins="*")

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

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(os.path.dirname(__file__), 'database', 'app.db')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

with app.app_context():
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
