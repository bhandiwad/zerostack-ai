#!/bin/bash

# Set the Python path to include the src directory
export PYTHONPATH="$PYTHONPATH:$(pwd)/src"

# Set Flask environment variables
export FLASK_APP=src/main.py
export FLASK_ENV=development

# Create the instance directory if it doesn't exist
mkdir -p instance

# Run the Flask application
python -m flask run --port 5002
