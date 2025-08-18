# ZeroStack AI – Zero Ops. Full Stack.

**The Future of Kubernetes Management is Here**

ZeroStack AI is an intelligent, AI-powered Kubernetes management platform that delivers true "Zero Ops" experience. Built for modern cloud-native teams, it combines advanced automation, intelligent insights, and seamless multi-cloud orchestration to eliminate operational overhead.

## 🚀 Latest Features (v8.0)

### 🔮 Predictive Analytics & AI Debugging
- **Predictive Issue Detection**: AI predicts cluster issues 2-4 hours before they occur
- **Anomaly Detection**: Real-time statistical analysis identifies unusual patterns
- **Intelligent Alerting**: Smart filtering reduces alert noise by up to 70%
- **Health Trend Analysis**: CPU, memory, and performance projections with confidence scoring
- **Root Cause Analysis**: AI-powered investigation with actionable recommendations

### 🔧 Automated Maintenance Workflows
- **Self-Healing Clusters**: Automated patching, upgrades, and maintenance
- **Configuration Drift Detection**: Real-time scanning and auto-correction
- **Predictive Maintenance**: AI schedules maintenance during optimal windows
- **Rollback Protection**: Automatic rollback on failure with comprehensive logging
- **Maintenance Windows**: Smart scheduling with minimal service disruption

### 📋 One-Click Deployment Templates
- **Cluster Templates**: Pre-configured templates for development, production, ML/AI, edge computing
- **Application Templates**: Ready-to-deploy applications with cost estimation
- **Security Hardened**: Templates with built-in security best practices
- **Auto-Scaling Ready**: Templates with intelligent scaling configurations
- **Multi-Cloud Support**: Templates optimized for AWS, GCP, Azure, and hybrid deployments

### 🎨 Enhanced Workflow Management
- **Visual Workflow Designer**: Drag-and-drop workflow creation with 12+ node types
- **Pre-built Templates**: Maintenance, deployment, security, and scaling workflows
- **Real-time Execution**: Live progress monitoring with step-by-step visibility
- **Workflow Testing**: Interactive testing environment with JSON context input
- **Template Hub**: Centralized repository of deployment and workflow templates

## 🤖 AI-Powered Features

### Multi-Agent Intelligence
- **🧠 LangGraph Orchestration**: Advanced multi-agent workflow engine with state management
- **🤖 Multi-Provider AI**: Support for OpenAI, Anthropic, Azure, Google, Cohere, and custom endpoints
- **🔮 Vector Memory System**: ChromaDB-powered semantic memory with contextual intelligence
- **🚨 Intelligent Support**: Multi-tier AI support system (L1/L2/L3) with automated escalation
- **⚡ Workflow Testing**: Interactive workflow execution and monitoring interface

### Enterprise AI Security
- **🔐 Encrypted API Keys**: Fernet-based encryption for secure AI endpoint management
- **🛡️ Zero-Trust Architecture**: PKI-based agent authentication and secure communication
- **📊 Performance Analytics**: Real-time agent performance monitoring and insights
- **🔄 Continuous Learning**: Automated learning from interactions and user feedback

### Zero Ops Experience
- **⚡ Auto-Healing**: Self-healing clusters with intelligent failure recovery
- **🎯 Smart Deployments**: AI-optimized application deployment strategies
- **🔄 Autonomous Updates**: Intelligent Kubernetes version management
- **📈 Dynamic Scaling**: Context-aware auto-scaling based on workload patterns
- **🌐 Multi-Cloud Intelligence**: Unified management across AWS, GCP, Azure, and on-premises

### Advanced Operations
- **🔧 Maintenance Orchestration**: AI-scheduled maintenance with minimal disruption
- **🔌 Intelligent Node Management**: Smart node lifecycle management
- **📊 Real-time Observability**: Comprehensive monitoring with AI-powered anomaly detection
- **🏗️ Infrastructure as Code**: Automated infrastructure provisioning and management

## 🏗️ Architecture

### Frontend (React)
- **Framework**: React 18+ with modern hooks and context
- **UI Design**: Custom ZeroStack AI design system with gradient aesthetics
- **State Management**: React Hooks and Context API with real-time updates
- **HTTP Client**: Axios with JWT authentication and AI agent integration
- **Build Tool**: Vite for fast development and hot module replacement

### Backend (Python/Flask)
- **Framework**: Flask with Python 3.12+ and async support
- **AI Engine**: Multi-provider AI integration (OpenAI, Anthropic, Azure, Google, Cohere)
- **Vector Memory**: ChromaDB with sentence transformers for semantic search
- **Database**: PostgreSQL with SQLAlchemy ORM and Redis caching
- **Authentication**: JWT tokens with multi-tenant RBAC
- **Kubernetes Integration**: Advanced kubernetes-client with custom operators
- **API Design**: RESTful APIs with comprehensive AI agent endpoints

### AI Agent System
- **LangGraph Orchestration**: State-based multi-agent workflow engine
- **Vector Memory**: ChromaDB-powered semantic memory with 4 specialized collections
- **Multi-Provider Support**: Unified AI endpoint management with load balancing
- **Secure Communication**: Encrypted A2A messaging with digital signatures
- **Performance Analytics**: Real-time monitoring with success rate tracking
- **Workflow Testing**: Interactive UI for testing and monitoring agent workflows

## 📦 Installation

### Prerequisites
- Node.js 18+ and npm
- Python 3.12+
- Git

### Frontend Setup
```bash
# Clone the repository
git clone https://github.com/bhandiwad/zerostack-ai.git
cd zerostack-ai

# Install dependencies
cd cluster-api-ui
npm install

# Start development server
npm run dev
```

### Backend Setup
```bash
# Navigate to backend directory
cd cluster-api-backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Install AI dependencies
pip install -r requirements-ai.txt

# Initialize database
python src/database/init_db.py

# Start Flask server
python src/main.py
```

## 🔧 Configuration

### Environment Variables
Create `.env` files in respective directories:

**Frontend (.env)**
```env
VITE_API_BASE_URL=http://localhost:5002/api
```

**Backend (.env)**
```env
FLASK_ENV=development
SECRET_KEY=your-secret-key
DATABASE_URL=sqlite:///cluster_api.db
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
ENCRYPTION_KEY=your-fernet-encryption-key
```

### Default Credentials
After running `init_db.py`, you can login with:
- **Email**: `admin@zerostack.ai`
- **Password**: `ZeroStack123!`

## 🚀 Usage

### Starting the Application
1. **Start Backend**: `python src/main.py` (runs on http://localhost:5002)
2. **Start Frontend**: `npm run dev` (runs on http://localhost:5174)
3. **Access UI**: Open http://localhost:5174 in your browser
4. **Login**: Use the default credentials above

### Key Features Walkthrough

#### AI Endpoint Configuration
1. Navigate to "AI Config" in the sidebar
2. Add AI providers (OpenAI, Anthropic, Azure, etc.)
3. Test endpoint connectivity
4. Set default endpoints for agent workflows

#### Automated Maintenance
1. Navigate to "Automated Maintenance" in the sidebar
2. View predictive maintenance insights and health analysis
3. Execute maintenance workflows (patching, upgrades, cleanup)
4. Schedule recurring maintenance windows
5. Monitor configuration drift and apply auto-corrections

#### Enhanced Debugging
1. Navigate to "Debugging" in the sidebar
2. **Cluster Analysis**: Run health checks and issue detection
3. **Predictive Insights**: View AI predictions for potential issues
4. **Anomaly Detection**: Monitor real-time anomaly scanning
5. **Intelligent Alerts**: Manage smart-filtered alerts with correlation

#### Template Hub & Deployment
1. Navigate to "Templates" in the sidebar
2. **Application Templates**: Deploy pre-configured applications
3. **Cluster Templates**: One-click cluster deployment for various use cases
4. Filter by category (development, production, ML/AI, edge, security)
5. View cost estimates and resource specifications

#### Workflow Management
1. Navigate to "Workflow Management" in the sidebar
2. **Workflow Designer**: Create visual workflows with drag-and-drop
3. **Workflow Orchestrator**: Execute and monitor workflow runs
4. **Workflow Tester**: Test workflows with custom JSON contexts
5. Use pre-built templates for maintenance, deployment, and scaling

#### Vector Memory System
1. Memory automatically stores agent interactions
2. Semantic search provides contextual intelligence
3. Performance analytics track agent success rates
4. Continuous learning improves agent responses

## 🧪 Testing

### API Testing
```bash
# Test AI endpoint management
curl -X GET http://localhost:5002/api/ai/endpoints

# Initialize vector memory system
curl -X POST http://localhost:5002/api/memory/initialize

# Initialize workflow orchestrator
curl -X POST http://localhost:5002/api/workflows/initialize

# Execute a workflow
curl -X POST http://localhost:5002/api/workflows/execute \
  -H "Content-Type: application/json" \
  -d '{"workflow_name": "support_escalation", "user_request": "Help troubleshoot cluster issues"}'

# Test maintenance workflows
curl -X GET http://localhost:5002/api/maintenance/workflows
curl -X POST http://localhost:5002/api/maintenance/execute \
  -H "Content-Type: application/json" \
  -d '{"workflow_id": "security_patching", "schedule_type": "immediate"}'

# Test predictive analytics
curl -X GET http://localhost:5002/api/debugging/predictive-analysis

# Test anomaly detection
curl -X POST http://localhost:5002/api/debugging/anomaly-detection \
  -H "Content-Type: application/json" \
  -d '{"metrics": {}}'

# Test intelligent alerts
curl -X GET http://localhost:5002/api/debugging/intelligent-alerts
```

### Frontend Testing
```bash
cd cluster-api-ui
npm test
```

## 📁 Project Structure

```
capi-ui/
├── cluster-api-ui/          # Frontend React application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── App.jsx         # Main application
│   │   └── App.css         # Styles
│   ├── package.json
│   └── README.md
├── cluster-api-backend/     # Backend Flask application
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # Business logic
│   │   ├── models/         # Database models
│   │   └── main.py         # Flask app entry point
│   ├── requirements.txt
│   └── README.md
├── docs/                   # Documentation
└── README.md
```

## 🔒 Security

- **Authentication**: JWT-based authentication
- **Authorization**: Role-based access control (super_admin, org_admin, cluster_admin)
- **Input Validation**: Comprehensive validation on all inputs
- **HTTPS**: Enforced in production environments
- **Audit Logging**: All operations are logged for compliance

## 🚀 Deployment

### Production Build
```bash
# Frontend
cd cluster-api-ui
npm run build

# Backend
cd cluster-api-backend
pip install -r requirements.txt
python src/main.py
```

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Contact the development team
- Check the documentation in the `docs/` directory

## 🗺️ Roadmap

### Phase 1: AI Foundation (COMPLETED ✅)
- [x] Multi-tier AI support system (L1/L2/L3)
- [x] LangGraph workflow orchestration
- [x] Vector memory system with ChromaDB
- [x] Multi-provider AI endpoint management
- [x] Workflow testing interface
- [x] Modern React UI with ZeroStack branding
- [x] Encrypted API key management

### Phase 2: Zero Ops Automation (COMPLETED ✅)
- [x] Automated maintenance workflows with scheduling
- [x] Predictive analytics and anomaly detection
- [x] Intelligent alerting with smart filtering
- [x] Configuration drift detection and correction
- [x] One-click deployment templates
- [x] Enhanced workflow management system
- [x] Template hub with cluster and application templates

### Phase 3: Enterprise Scale
- [ ] Multi-cloud federation
- [ ] Advanced security automation
- [ ] Compliance and governance
- [ ] Enterprise integrations (LDAP, SSO)

### Phase 4: Innovation
- [ ] Edge computing support
- [ ] GitOps integration
- [ ] Mobile application
- [ ] Advanced ML/AI features

For detailed roadmap and pending features, see [TODO.md](TODO.md)

---

**Built with ❤️ by the ZeroStack AI Team** 