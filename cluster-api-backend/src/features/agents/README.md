# Agent System

This module implements a flexible and extensible agent system with secure Agent-to-Agent (A2A) communication, capability management, and a REST API for monitoring and control.

## Features

- **Agent Management**: Create and manage agents with unique identities
- **Capability System**: Dynamically load and execute agent capabilities
- **A2A Communication**: Secure agent-to-agent messaging using NATS
- **REST API**: Monitor and control agents via HTTP
- **Metrics & Health**: Built-in system metrics and health monitoring
- **Lifecycle Management**: Graceful startup and shutdown

## Quick Start

### Prerequisites

- Python 3.8+
- NATS server (for A2A communication)
- Required Python packages (install with `pip install -r requirements.txt`)

### Running an Agent with API

1. Start a NATS server:
   ```bash
   docker run -p 4222:4222 -p 8222:8222 nats:latest
   ```

2. Run an agent with the API server:
   ```bash
   python -m src.features.agents.examples.run_agent_with_api \
       --host 0.0.0.0 \
       --port 8080 \
       --nats-servers nats://localhost:4222
   ```

3. Access the API at `http://localhost:8080/api/v1/agent/`

## API Reference

### Base URL
```
http://<host>:<port>/api/v1/agent
```

### Endpoints

#### GET /status
Get the current status of the agent.

**Response**
```json
{
  "agent_id": "agent-123",
  "status": "running",
  "started_at": "2023-07-20T12:00:00Z",
  "capabilities": ["example_a2a"],
  "connected_agents": ["agent-456", "agent-789"]
}
```

#### GET /metrics
Get the current metrics from the agent.

**Response**
```json
{
  "system": {
    "cpu_percent": 23.5,
    "memory_percent": 45.2,
    "disk_usage": 30.1
  },
  "agent": {
    "messages_sent": 142,
    "messages_received": 156,
    "message_errors": 3,
    "capabilities_count": 2
  },
  "timestamp": "2023-07-20T12:05:00Z"
}
```

#### GET /health
Get the current health status of the agent.

**Response**
```json
{
  "status": "healthy",
  "checks": [
    {
      "name": "nats_connection",
      "status": "healthy",
      "details": "Connected to NATS server"
    },
    {
      "name": "capabilities",
      "status": "healthy",
      "details": "2/2 capabilities initialized"
    }
  ],
  "timestamp": "2023-07-20T12:05:00Z"
}
```

#### GET /capabilities
List all available capabilities on the agent.

**Response**
```json
[
  {
    "name": "example_a2a",
    "description": "Example A2A capability for demonstration",
    "actions": [
      {
        "name": "echo",
        "description": "Echo a message back to the sender",
        "parameters": {
          "message": {
            "type": "string",
            "required": true,
            "description": "Message to echo back"
          }
        }
      },
      {
        "name": "get_info",
        "description": "Get information about the agent",
        "parameters": {}
      }
    ]
  }
]
```

#### POST /capabilities/{capability_name}/{action}
Execute an action on a specific capability.

**Path Parameters**
- `capability_name`: Name of the capability
- `action`: Name of the action to execute

**Request Body**
```json
{
  "message": "Hello, world!"
}
```

**Response**
```json
{
  "status": "success",
  "capability": "example_a2a",
  "action": "echo",
  "result": {
    "message": "Hello, world!"
  }
}
```

#### POST /shutdown
Gracefully shut down the agent.

**Response**
```json
{
  "status": "shutting_down",
  "message": "Agent shutdown initiated"
}
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AGENT_ID` | Auto-generated | Unique identifier for the agent |
| `NATS_SERVERS` | `nats://localhost:4222` | Comma-separated list of NATS server URLs |
| `AGENT_API_HOST` | `0.0.0.0` | Host to bind the API server to |
| `AGENT_API_PORT` | `8080` | Port to bind the API server to |
| `AGENT_API_PREFIX` | `/api/v1/agent` | URL prefix for API endpoints |
| `AGENT_API_CORS` | `true` | Enable CORS for the API |
| `AGENT_API_DEBUG` | `false` | Enable debug mode |
| `METRICS_INTERVAL_SECONDS` | `5` | Metrics collection interval in seconds |
| `HEALTH_CHECK_INTERVAL_SECONDS` | `30` | Health check interval in seconds |

## Development

### Adding a New Capability

1. Create a new Python module in `capabilities/`
2. Define a class that inherits from `AgentCapability`
3. Implement the required methods:
   - `get_actions()`: Return a list of actions the capability supports
   - `execute(action, params)`: Execute the specified action with the given parameters

Example:
```python
from ..agent_capability import AgentCapability

class MyCapability(AgentCapability):
    """My custom capability"""
    
    def get_actions(self):
        return [
            {
                "name": "my_action",
                "description": "Do something interesting",
                "parameters": {
                    "param1": {"type": "string", "required": True},
                    "param2": {"type": "int", "required": False, "default": 42}
                }
            }
        ]
    
    async def execute(self, action: str, params: dict):
        if action == "my_action":
            return {"result": f"You said: {params['param1']} and {params['param2']}"}
        raise ValueError(f"Unknown action: {action}")
```

### Running Tests

```bash
pytest tests/
```

## License

[MIT](LICENSE)
