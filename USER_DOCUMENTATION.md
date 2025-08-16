# ZeroStack AI – Zero Ops. Full Stack.
## User Documentation

### Overview
ZeroStack AI is an intelligent Kubernetes management platform that provides zero-operations, full-stack automation for container orchestration. The platform combines AI-powered agents with intuitive user interfaces to simplify cluster management, monitoring, and operations.

### Key Features
- **AI-Powered Automation**: Intelligent agents handle routine operations automatically
- **Multi-Cloud Support**: Manage clusters across AWS, Azure, GCP, and other providers
- **Zero-Ops Philosophy**: Minimal manual intervention required
- **Full-Stack Management**: Complete lifecycle management from creation to monitoring

---

## Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn
- Python 3.9+ for backend services
- Access to cloud provider accounts (AWS, Azure, GCP)
- Kubernetes CLI tools (kubectl, helm)

### Installation

#### Frontend Setup
```bash
cd cluster-api-ui
npm install
npm run dev
```
The frontend will be available at `http://localhost:3000`

#### Backend Setup
```bash
cd cluster-api-backend
pip install -r requirements.txt
python -m flask run --host=0.0.0.0 --port=5002
```
The backend API will be available at `http://localhost:5002`

#### Quick Start Scripts
Use the provided convenience scripts:
```bash
# Start frontend
./restart_frontend.sh

# Start backend
./restart_backend.sh

# Start backend with logs
./restart_backend_with_logs.sh
```

---

## User Interface Guide

### Navigation
The left sidebar provides access to all platform features:

- **🏠 Home**: Dashboard with overview and quick actions
- **🤖 AI Agents**: Manage and monitor AI automation agents
- **⚙️ Clusters**: Kubernetes cluster management
- **🔍 Explorer**: Browse and manage cluster resources
- **📱 Apps**: Application catalog and Helm charts
- **📊 Metrics**: Performance monitoring and insights
- **👥 Accounts**: User and organization management

### Dashboard
The main dashboard provides:
- **ZeroStack AI Agent Hub**: Quick access to AI automation features
- **Cluster Statistics**: Real-time cluster health and metrics
- **Agent Activity**: Overview of automated operations
- **Provider Distribution**: Multi-cloud cluster distribution
- **Recent Activity**: Latest cluster operations and events

### Cluster Management
Comprehensive cluster lifecycle management:

#### Creating Clusters
1. Navigate to **Clusters** section
2. Click **Create Cluster** button
3. Select cloud provider (AWS, Azure, GCP)
4. Configure cluster specifications:
   - Kubernetes version
   - Node count and instance types
   - Network configuration
   - Security settings
5. Review and deploy

#### Managing Existing Clusters
- **Scaling**: Adjust node count up or down
- **Upgrading**: Update Kubernetes versions
- **Maintenance**: Enable/disable maintenance mode
- **Monitoring**: View cluster health and metrics
- **Node Management**: Drain, cordon, and manage individual nodes

### Cluster Explorer
Deep dive into cluster resources:

#### Resource Types
- **Pods**: Running containers and their status
- **Deployments**: Application deployments and replicas
- **Services**: Network services and load balancers
- **ConfigMaps**: Configuration data
- **Secrets**: Sensitive information storage
- **PVCs**: Persistent volume claims
- **Ingresses**: HTTP/HTTPS routing rules
- **Jobs/CronJobs**: Batch processing tasks
- **DaemonSets**: Node-level services
- **StatefulSets**: Stateful applications

#### Explorer Features
- **Namespace Filtering**: View resources by namespace
- **Real-time Updates**: Live resource status monitoring
- **Resource Actions**: Scale, delete, and modify resources
- **YAML Editing**: Direct resource configuration editing
- **Search and Filter**: Find resources quickly

---

## AI Agent System

### Agent Types
ZeroStack AI includes multiple specialized agents:

#### Support Agents
- **L1 Support**: Basic troubleshooting and FAQ responses
- **L2 Support**: Advanced technical analysis and log investigation
- **L3 Support**: Expert-level code fixes and automated remediation

#### Infrastructure Agents
- **Cluster Management**: Automated cluster operations
- **Auto Scaling**: Dynamic resource scaling based on demand
- **Monitoring**: Proactive issue detection and alerting
- **Security Scanning**: Vulnerability assessment and compliance

#### Operational Agents
- **Backup**: Automated backup and disaster recovery
- **Logging**: Centralized log management and analysis
- **Automation**: Custom workflow automation
- **Agent Training**: Continuous learning and improvement

### Agent Configuration
1. Navigate to **AI Agents** section
2. Select agent type to configure
3. Set parameters and thresholds
4. Enable/disable specific capabilities
5. Monitor agent performance and effectiveness

---

## Advanced Features

### Multi-Tenant Support
- **Organization Management**: Separate environments per organization
- **Role-Based Access**: Granular permissions and access control
- **Resource Isolation**: Secure separation of resources
- **Billing Integration**: Usage tracking and cost allocation

### API Integration
- **REST API**: Complete programmatic access
- **Webhook Support**: Event-driven integrations
- **CLI Tools**: Command-line interface for automation
- **SDK Support**: Language-specific development kits

### Monitoring and Observability
- **Real-time Metrics**: Live performance monitoring
- **Custom Dashboards**: Personalized metric views
- **Alerting**: Proactive issue notification
- **Audit Logging**: Complete operation history

---

## Troubleshooting

### Common Issues

#### Frontend Not Loading
```bash
# Check if frontend is running
curl http://localhost:3000

# Restart frontend
./restart_frontend.sh

# Check for port conflicts
lsof -i :3000
```

#### Backend API Errors
```bash
# Check backend status
curl http://localhost:5002/api/health

# Restart backend with logs
./restart_backend_with_logs.sh

# Check database connectivity
python -c "from src.database import db; print('DB OK')"
```

#### Cluster Connection Issues
1. Verify cloud provider credentials
2. Check network connectivity
3. Validate Kubernetes configuration
4. Review firewall and security group settings

### Log Locations
- **Frontend Logs**: Browser developer console
- **Backend Logs**: `cluster-api-backend/logs/`
- **Agent Logs**: `cluster-api-backend/logs/agents/`
- **Database Logs**: Check database configuration

### Support Channels
- **Documentation**: This user guide and design documentation
- **Issue Tracking**: GitHub repository issues
- **Community**: Platform discussion forums
- **Enterprise Support**: Contact for dedicated support

---

## Best Practices

### Security
- **Regular Updates**: Keep platform and dependencies updated
- **Access Control**: Use principle of least privilege
- **Secret Management**: Secure handling of credentials
- **Network Security**: Proper firewall and VPC configuration

### Performance
- **Resource Monitoring**: Regular performance reviews
- **Scaling Strategies**: Proactive capacity planning
- **Optimization**: Regular performance tuning
- **Caching**: Effective use of caching layers

### Operations
- **Backup Strategy**: Regular backup and disaster recovery testing
- **Monitoring Setup**: Comprehensive observability
- **Automation**: Maximize use of AI agents
- **Documentation**: Keep operational procedures updated

---

## API Reference

### Authentication
```bash
# Get access token
curl -X POST http://localhost:5002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "user", "password": "pass"}'
```

### Cluster Operations
```bash
# List clusters
curl -H "Authorization: Bearer <token>" \
  http://localhost:5002/api/mt/clusters

# Create cluster
curl -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "my-cluster", "provider": "aws"}' \
  http://localhost:5002/api/clusters

# Scale cluster
curl -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"target_node_count": 5}' \
  http://localhost:5002/api/clusters/{id}/scale
```

### Resource Management
```bash
# Get cluster resources
curl -H "Authorization: Bearer <token>" \
  http://localhost:5002/api/clusters/{id}/resources

# Get specific resource
curl -H "Authorization: Bearer <token>" \
  http://localhost:5002/api/clusters/{id}/namespaces/{ns}/pods/{name}
```

---

## Changelog

### Version 8.0 (Current)
- Complete UI/UX redesign with modern styling
- ZeroStack AI branding and positioning
- Enhanced AI agent integration
- Improved cluster management workflows
- Advanced resource explorer
- Multi-tenant architecture improvements

### Previous Versions
- v7.0: Enhanced testing and reliability
- v6.0: Multi-tenant support
- v5.0: Complete platform release
- v4.0: AI agent system introduction

---

## License
This project is licensed under the terms specified in the LICENSE file.

## Contributing
Please refer to the design documentation for architecture details and contribution guidelines.
