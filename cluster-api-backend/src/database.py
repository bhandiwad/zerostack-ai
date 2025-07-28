from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

# Initialize SQLAlchemy
db = SQLAlchemy()

# Initialize Flask-Migrate
migrate = Migrate()

def init_db(app):
    """Initialize the database with the Flask app"""
    # Configure SQLAlchemy
    app.config.setdefault('SQLALCHEMY_DATABASE_URI', 'sqlite:///' + 
                         app.root_path + '/../instance/app.db')
    app.config.setdefault('SQLALCHEMY_TRACK_MODIFICATIONS', False)
    
    # Initialize extensions if not already done
    if 'sqlalchemy' not in app.extensions:
        db.init_app(app)
        migrate.init_app(app, db)
    
    # Create tables if they don't exist
    with app.app_context():
        db.create_all()
    
    return db
