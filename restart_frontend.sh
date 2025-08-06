#!/bin/bash

# Source the user's profile to get the correct PATH
if [ -f ~/.zshrc ]; then
  source ~/.zshrc
fi
# Script to restart the frontend server

PORT=3000
FRONTEND_DIR="/Users/pb/capi_gui/cluster-api-ui"

echo "Attempting to restart frontend server on port $PORT..."

# Find and kill the process using the port
PID=$(lsof -ti :$PORT)
if [ -n "$PID" ]; then
  echo "Found process $PID on port $PORT. Killing it..."
  kill -9 $PID
  sleep 1 # Give it a moment to die
else
  echo "No process found on port $PORT."
fi

echo "Starting frontend server in $FRONTEND_DIR..."
cd $FRONTEND_DIR || exit

# Start the server using npm
npm run dev
