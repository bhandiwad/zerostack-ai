#!/bin/bash
# Script to restart the backend server and log output

PORT=5002
BACKEND_DIR="/Users/pb/capi_gui/cluster-api-backend"
LOG_FILE="$BACKEND_DIR/backend.log"

echo "Attempting to restart backend server on port $PORT..."

# Find and kill the process using the port
PID=$(lsof -ti :$PORT)
if [ -n "$PID" ]; then
  echo "Found process $PID on port $PORT. Killing it..."
  kill -9 $PID
  sleep 1 # Give it a moment to die
else
  echo "No process found on port $PORT."
fi

echo "Starting backend server in $BACKEND_DIR..."
echo "Logs will be written to $LOG_FILE"
cd "$BACKEND_DIR" || exit

# Truncate log file
> "$LOG_FILE"

# Start server in the background and redirect output
FLASK_APP=src/main.py python3 -m flask run --host=0.0.0.0 --port=$PORT > "$LOG_FILE" 2>&1 &

echo "Backend server started. Tailing logs..."
sleep 2 # Give the server a moment to start
tail -f "$LOG_FILE"
