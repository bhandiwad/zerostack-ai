#!/usr/bin/env python3
"""
Minimal test case for SQLAlchemy model registration.
"""
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import uuid

# Create a minimal Flask app
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///test.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize SQLAlchemy
db = SQLAlchemy()

# Minimal Agent model
class Agent(db.Model):
    __tablename__ = 'agents'
    
    id = db.Column(db.String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(128), nullable=False)
    status = db.Column(db.String(32), nullable=False, default='offline')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Initialize the app with the database
db.init_app(app)

# Create all tables
with app.app_context():
    print("Creating database tables...")
    db.create_all()
    print("Database tables created successfully!")
    
    # List all tables
    inspector = db.inspect(db.engine)
    table_names = inspector.get_table_names()
    print("\nTables in database:")
    for table_name in table_names:
        print(f"- {table_name}")
    
    # Check if our table was created
    if 'agents' in table_names:
        print("\nSuccess! The 'agents' table was created.")
    else:
        print("\nError: The 'agents' table was NOT created.")
