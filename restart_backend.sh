#!/bin/bash
# Script to restart the backend server

PORT=5002
BACKEND_DIR="/Users/pb/capi_gui/cluster-api-backend"

echo "Attempting to restart backend server on port $PORT..."

# Find and kill the process using the port
PID=$(lsof -ti :$PORT)
if [ -n "$PID" ]; then
  echo "Found process $PID on port $PORT. Killing it..."
  kill -9 $PID
  sleep 2 # Give it a moment to die
else
  echo "No process found on port $PORT."
fi

echo "Starting backend server in $BACKEND_DIR..."
cd $BACKEND_DIR || exit

# Activate virtual environment
if [ -d ".venv" ]; then
  echo "Activating virtual environment..."
  source .venv/bin/activate
else
  echo "Creating virtual environment..."
  python3 -m venv .venv
  source .venv/bin/activate
  echo "Installing dependencies..."
  pip install -r requirements.txt
fi

echo "Starting Flask server..."
python src/main.py
