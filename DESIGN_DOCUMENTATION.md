# ZeroStack AI – Zero Ops. Full Stack.
## Design Documentation

### Architecture Overview
ZeroStack AI is built as a modern, scalable platform with a React frontend, Python Flask backend, and AI-powered agent system. The architecture follows microservices principles with clear separation of concerns.

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React Frontend │    │   Flask Backend  │    │  AI Agent System│
│   (Port 3000)    │◄──►│   (Port 5002)    │◄──►│   (Background)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Static Assets │    │    Database      │    │  External APIs  │
│   CSS/JS/Images │    │   PostgreSQL     │    │  K8s/Cloud APIs │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

---

## Frontend Architecture

### Technology Stack
- **Framework**: React 18 with Hooks
- **Build Tool**: Vite for fast development and building
- **Routing**: React Router v6 for client-side navigation
- **Styling**: CSS Modules with modern CSS features
- **State Management**: React Context + useState/useReducer
- **HTTP Client**: Fetch API with custom wrapper

### Component Structure
```
src/
├── components/           # Reusable UI components
│   ├── layout/          # Navigation, Header, Layout components
│   ├── dashboard/       # Dashboard-specific components
│   ├── clusters/        # Cluster management components
│   ├── common/          # Shared components (Notification, etc.)
│   └── ClusterExplorer.jsx # Resource browser component
├── features/            # Feature-specific modules
│   ├── ai/             # AI agent management
│   ├── agents/         # Agent configuration and monitoring
│   └── cluster-explorer/ # Advanced cluster exploration
├── pages/              # Page-level components
├── lib/                # Utility libraries and API client
├── assets/             # Static assets
└── App.jsx             # Main application component
```

### Design System

#### Color Palette
```css
/* Primary Colors */
--primary-blue: #667eea;
--primary-purple: #764ba2;
--gradient-primary: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

/* Semantic Colors */
--success: #10b981;
--warning: #f59e0b;
--error: #ef4444;
--info: #3b82f6;

/* Neutral Colors */
--gray-50: #f8fafc;
--gray-100: #f1f5f9;
--gray-200: #e2e8f0;
--gray-500: #64748b;
--gray-900: #0f172a;
```

#### Typography
- **Primary Font**: System fonts (San Francisco, Segoe UI, Roboto)
- **Monospace Font**: Monaco, Menlo, Ubuntu Mono for code
- **Scale**: 0.75rem, 0.875rem, 1rem, 1.125rem, 1.25rem, 1.5rem, 2rem

#### Component Patterns
- **Cards**: Consistent border-radius (8px-12px), subtle shadows
- **Buttons**: Gradient backgrounds, hover effects, disabled states
- **Forms**: Clean inputs with focus states and validation
- **Navigation**: Collapsible sidebar with active states

### State Management Strategy
```javascript
// Global state using Context
const AppContext = createContext();

// Local state for components
const [state, setState] = useState(initialState);

// API state management
const [loading, setLoading] = useState(false);
const [data, setData] = useState(null);
const [error, setError] = useState(null);
```

---

## Backend Architecture

### Technology Stack
- **Framework**: Flask with extensions
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Migration**: Alembic for database schema management
- **Authentication**: JWT tokens with role-based access
- **API**: RESTful endpoints with JSON responses
- **Background Tasks**: Celery with Redis

### Project Structure
```
cluster-api-backend/
├── src/
│   ├── database/        # Database models and configuration
│   ├── features/        # Feature modules (agents, clusters, etc.)
│   ├── auth/           # Authentication and authorization
│   ├── api/            # API route handlers
│   └── utils/          # Utility functions
├── migrations/         # Database migration files
├── tests/             # Test suites
├── requirements.txt   # Python dependencies
└── app.py            # Application entry point
```

### Database Schema

#### Core Tables
```sql
-- Organizations (Multi-tenant support)
CREATE TABLE organizations (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subscription_tier VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    organization_id UUID REFERENCES organizations(id),
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Clusters
CREATE TABLE clusters (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    region VARCHAR(100),
    kubernetes_version VARCHAR(20),
    node_count INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'pending',
    organization_id UUID REFERENCES organizations(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- AI Agents
CREATE TABLE agents (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'inactive',
    configuration JSONB,
    organization_id UUID REFERENCES organizations(id),
    created_at TIMESTAMP DEFAULT NOW()
);
```

### API Design

#### RESTful Endpoints
```
# Authentication
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/profile

# Multi-tenant Clusters
GET    /api/mt/clusters
POST   /api/clusters
GET    /api/clusters/{id}
PUT    /api/clusters/{id}
DELETE /api/clusters/{id}
POST   /api/clusters/{id}/scale
POST   /api/clusters/{id}/upgrade

# Cluster Resources
GET    /api/clusters/{id}/namespaces
GET    /api/clusters/{id}/namespaces/{ns}/pods
GET    /api/clusters/{id}/namespaces/{ns}/deployments
DELETE /api/clusters/{id}/namespaces/{ns}/pods/{name}

# AI Agents
GET    /api/agents
POST   /api/agents
GET    /api/agents/{id}
PUT    /api/agents/{id}
POST   /api/agents/{id}/execute
```

#### Response Format
```json
{
  "success": true,
  "data": {
    "clusters": [...],
    "total": 10,
    "page": 1
  },
  "message": "Clusters retrieved successfully",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

---

## AI Agent System

### Agent Architecture
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Agent Manager │    │   Agent Registry │    │  Agent Executor │
│   (Orchestrator)│◄──►│   (Capabilities) │◄──►│   (Runtime)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Task Queue    │    │   Agent Storage  │    │  External APIs  │
│   (Celery)      │    │   (Database)     │    │  (K8s, Cloud)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Agent Types and Capabilities

#### Support Agents
```python
class SupportL1Agent:
    """Level 1 Support - Basic troubleshooting"""
    capabilities = [
        'faq_responses',
        'basic_diagnostics',
        'ticket_management',
        'escalation_logic'
    ]
    
class SupportL2Agent:
    """Level 2 Support - Advanced technical analysis"""
    capabilities = [
        'log_analysis',
        'performance_diagnostics',
        'automated_fixes',
        'pattern_recognition'
    ]
```

#### Infrastructure Agents
```python
class ClusterManagementAgent:
    """Automated cluster operations"""
    capabilities = [
        'cluster_scaling',
        'node_management',
        'health_monitoring',
        'automated_remediation'
    ]
    
class AutoScalingAgent:
    """Dynamic resource scaling"""
    capabilities = [
        'metric_monitoring',
        'scaling_decisions',
        'cost_optimization',
        'performance_tuning'
    ]
```

### Agent Communication Protocol
```python
# Agent message format
{
    "agent_id": "cluster_management_001",
    "task_type": "scale_cluster",
    "parameters": {
        "cluster_id": "cluster-123",
        "target_nodes": 5,
        "scaling_strategy": "gradual"
    },
    "priority": "normal",
    "timeout": 300,
    "callback_url": "/api/agents/callbacks/scale_complete"
}
```

---

## Security Architecture

### Authentication & Authorization
- **JWT Tokens**: Stateless authentication with configurable expiration
- **Role-Based Access Control (RBAC)**: User, Admin, Super Admin roles
- **Multi-Tenant Isolation**: Organization-level data separation
- **API Rate Limiting**: Prevent abuse and ensure fair usage

### Security Measures
```python
# Input validation
from marshmallow import Schema, fields, validate

class ClusterSchema(Schema):
    name = fields.Str(required=True, validate=validate.Length(min=1, max=255))
    provider = fields.Str(required=True, validate=validate.OneOf(['aws', 'azure', 'gcp']))
    node_count = fields.Int(validate=validate.Range(min=1, max=100))

# SQL injection prevention
query = session.query(Cluster).filter(Cluster.id == cluster_id)

# XSS prevention
from markupsafe import escape
safe_output = escape(user_input)
```

---

## Performance Optimization

### Frontend Optimizations
- **Code Splitting**: Route-based lazy loading
- **Asset Optimization**: Minification and compression
- **Caching Strategy**: Browser caching for static assets
- **Bundle Analysis**: Regular bundle size monitoring

### Backend Optimizations
- **Database Indexing**: Strategic indexes on frequently queried columns
- **Query Optimization**: Efficient SQL queries with proper joins
- **Caching Layer**: Redis for frequently accessed data
- **Connection Pooling**: Efficient database connection management

### Monitoring and Observability
```python
# Performance monitoring
import time
from functools import wraps

def monitor_performance(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        result = func(*args, **kwargs)
        execution_time = time.time() - start_time
        logger.info(f"{func.__name__} executed in {execution_time:.2f}s")
        return result
    return wrapper
```

---

## Deployment Architecture

### Development Environment
```yaml
# docker-compose.yml
version: '3.8'
services:
  frontend:
    build: ./cluster-api-ui
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_API_URL=http://localhost:5002
      
  backend:
    build: ./cluster-api-backend
    ports:
      - "5002:5002"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/zerostack
      - REDIS_URL=redis://redis:6379
      
  database:
    image: postgres:15
    environment:
      - POSTGRES_DB=zerostack
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      
  redis:
    image: redis:7-alpine
```

### Production Considerations
- **Container Orchestration**: Kubernetes deployment
- **Load Balancing**: NGINX or cloud load balancers
- **SSL/TLS**: HTTPS encryption for all communications
- **Database**: Managed PostgreSQL with backups
- **Monitoring**: Prometheus + Grafana for metrics
- **Logging**: Centralized logging with ELK stack

---

## Testing Strategy

### Frontend Testing
```javascript
// Component testing with React Testing Library
import { render, screen, fireEvent } from '@testing-library/react';
import ClusterManagement from './ClusterManagement';

test('displays cluster list', async () => {
  render(<ClusterManagement />);
  expect(screen.getByText('Cluster Management')).toBeInTheDocument();
});

// Integration testing
test('creates new cluster', async () => {
  render(<ClusterManagement />);
  fireEvent.click(screen.getByText('Create Cluster'));
  // Test cluster creation flow
});
```

### Backend Testing
```python
# Unit testing with pytest
def test_create_cluster(client, auth_headers):
    response = client.post('/api/clusters', 
                          json={'name': 'test-cluster', 'provider': 'aws'},
                          headers=auth_headers)
    assert response.status_code == 201
    assert response.json['data']['name'] == 'test-cluster'

# Integration testing
def test_cluster_scaling_workflow(client, auth_headers, test_cluster):
    response = client.post(f'/api/clusters/{test_cluster.id}/scale',
                          json={'target_node_count': 5},
                          headers=auth_headers)
    assert response.status_code == 200
```

---

## Data Flow Diagrams

### Cluster Creation Flow
```
User → Frontend → API → Database → Cloud Provider → Kubernetes → Status Update
  ↓       ↓        ↓       ↓            ↓              ↓           ↓
  UI   → React  → Flask → PostgreSQL → AWS/Azure → K8s API → WebSocket
```

### AI Agent Execution Flow
```
Trigger → Agent Manager → Task Queue → Agent Executor → External API → Result
   ↓          ↓             ↓            ↓              ↓           ↓
Schedule → Orchestrator → Celery → Python Worker → K8s/Cloud → Database
```

---

## Configuration Management

### Environment Variables
```bash
# Frontend (.env)
REACT_APP_API_URL=http://localhost:5002
REACT_APP_ENVIRONMENT=development
REACT_APP_VERSION=8.0.0

# Backend (.env)
DATABASE_URL=postgresql://user:pass@localhost:5432/zerostack
REDIS_URL=redis://localhost:6379
JWT_SECRET_KEY=your-secret-key
OPENAI_API_KEY=your-openai-key
```

### Feature Flags
```python
# Feature flag system
FEATURE_FLAGS = {
    'ai_agents_enabled': True,
    'multi_tenant_mode': True,
    'advanced_monitoring': False,
    'beta_features': False
}
```

---

## Migration and Upgrade Strategy

### Database Migrations
```python
# Alembic migration example
def upgrade():
    op.add_column('clusters', sa.Column('maintenance_mode', sa.Boolean(), default=False))
    op.create_index('idx_clusters_status', 'clusters', ['status'])

def downgrade():
    op.drop_index('idx_clusters_status')
    op.drop_column('clusters', 'maintenance_mode')
```

### Version Compatibility
- **API Versioning**: Semantic versioning with backward compatibility
- **Database Schema**: Forward-compatible migrations
- **Configuration**: Environment-specific configurations

---

## Contributing Guidelines

### Code Standards
- **Frontend**: ESLint + Prettier for consistent formatting
- **Backend**: Black + Flake8 for Python code formatting
- **Git**: Conventional commits for clear history
- **Documentation**: Inline comments and README updates

### Development Workflow
1. **Feature Branch**: Create branch from main
2. **Development**: Implement feature with tests
3. **Code Review**: Pull request with peer review
4. **Testing**: Automated test suite execution
5. **Deployment**: Merge to main triggers deployment

### Architecture Decisions
All significant architectural decisions are documented with:
- **Context**: Why the decision was needed
- **Options**: Alternatives considered
- **Decision**: Chosen approach and rationale
- **Consequences**: Expected outcomes and trade-offs

---

This design documentation provides a comprehensive overview of the ZeroStack AI platform architecture, serving as a reference for developers, architects, and stakeholders involved in the project.
