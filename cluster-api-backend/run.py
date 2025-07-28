#!/usr/bin/env python3
"""
Main entry point for the Cluster API Backend application.
"""
import os
import sys

# Add the src directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

def main():
    """Run the Flask application."""
    # Set up the Flask application
    from src.main import create_app
    
    # Create the Flask application
    app = create_app()
    
    # Run the application
    app.run(host='0.0.0.0', port=5002, debug=True)

if __name__ == "__main__":
    main()
