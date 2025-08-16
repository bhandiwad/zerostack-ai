# ZeroStack AI – Zero Ops. Full Stack.

**The Future of Kubernetes Management is Here**

ZeroStack AI is an intelligent, AI-powered Kubernetes management platform that delivers true "Zero Ops" experience. Built for modern cloud-native teams, it combines advanced automation, intelligent insights, and seamless multi-cloud orchestration to eliminate operational overhead.

## 🤖 AI-Powered Features

### Intelligent Automation
- **🧠 AI Agent System**: Autonomous cluster management with intelligent decision-making
- **🔮 Predictive Scaling**: AI-driven resource optimization and cost management
- **🛡️ Smart Security**: Automated threat detection and policy enforcement
- **📊 Intelligent Insights**: AI-powered analytics and recommendations
- **🚨 Proactive Support**: Multi-tier AI support system (L1/L2/L3) with automated issue resolution

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
- **AI Engine**: OpenAI integration for intelligent automation
- **Database**: PostgreSQL with SQLAlchemy ORM and Redis caching
- **Authentication**: JWT tokens with multi-tenant RBAC
- **Kubernetes Integration**: Advanced kubernetes-client with custom operators
- **API Design**: RESTful APIs with GraphQL support for complex queries

### AI Agent System
- **Multi-Tier Support**: L1/L2/L3 automated support agents
- **Predictive Analytics**: Machine learning models for resource optimization
- **Auto-Scaling**: Intelligent workload-based scaling algorithms
- **Security Automation**: AI-powered threat detection and response
- **PagerDuty Integration**: Automated incident management and escalation

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

#### Maintenance Mode
1. Navigate to Cluster Management
2. Click "🔧 Maintenance" button on any cluster
3. Configure maintenance settings (reason, duration)
4. Review effects and confirm

#### Cluster Scaling
1. Click "📈 Scale" button on a cluster
2. Set target node count
3. Choose scaling options (graceful/force)
4. Confirm scaling operation

#### Node Management
1. Click "🔧 Manage Nodes" on a cluster
2. View all nodes and their status
3. Drain or uncordon nodes as needed
4. Monitor node status changes

## 🧪 Testing

### API Testing
```bash
# Test maintenance mode API
curl -X POST http://localhost:5002/api/clusters/1/maintenance-mode \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true, "reason": "Test maintenance", "duration_minutes": 60}'
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

### Phase 1: AI Foundation (Current)
- [x] Multi-tier AI support system (L1/L2/L3)
- [x] Intelligent cluster management
- [x] Modern React UI with ZeroStack branding
- [ ] Advanced AI agent training system
- [ ] Predictive analytics dashboard

### Phase 2: Zero Ops Automation
- [ ] Autonomous healing and recovery
- [ ] AI-driven cost optimization
- [ ] Smart deployment strategies
- [ ] Intelligent monitoring and alerting

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