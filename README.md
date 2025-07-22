# Cluster-API Management Console

A comprehensive web-based management interface for Kubernetes clusters across multiple cloud providers, built with React and Flask.

## 🚀 Features

### Core Functionality
- **Multi-Cloud Support**: AWS, GCP, Azure, VMWare, and on-premises clusters
- **Cluster Management**: Create, monitor, and manage Kubernetes clusters
- **Advanced Operations**: Scale, drain nodes, and maintenance mode
- **Real-time Monitoring**: Live cluster status and resource utilization
- **User Management**: Role-based access control and organization management

### Advanced Cluster Operations
- **🔧 Maintenance Mode**: Toggle maintenance state with reason and duration
- **📈 Cluster Scaling**: Scale clusters up/down with graceful options
- **🔌 Node Management**: Drain and uncordon nodes safely
- **🔄 Version Management**: Upgrade Kubernetes versions (planned)
- **🛡️ Security Policies**: OPA policies and security configurations

## 🏗️ Architecture

### Frontend (React)
- **Framework**: React 18+ with TypeScript
- **UI Library**: Material-UI (MUI) v5 with custom Sify design system
- **State Management**: React Hooks and Context API
- **HTTP Client**: Axios with JWT authentication
- **Build Tool**: Vite for fast development

### Backend (Flask)
- **Framework**: Flask with Python 3.12+
- **Database**: SQLite with SQLAlchemy ORM
- **Authentication**: JWT tokens with role-based access
- **Kubernetes Integration**: kubernetes-client for cluster operations
- **API Design**: RESTful APIs with consistent response formats

## 📦 Installation

### Prerequisites
- Node.js 18+ and npm
- Python 3.12+
- Git

### Frontend Setup
```bash
# Clone the repository
git clone https://github.com/bhandiwad/capi-ui.git
cd capi-ui

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
- **Email**: `admin@sifytechnologies.com`
- **Password**: `SifyAdmin123!`

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

- [ ] Kubernetes Version Upgrade UI
- [ ] Advanced Monitoring Dashboard
- [ ] Maintenance Scheduling
- [ ] Integration APIs
- [ ] Mobile Application
- [ ] Multi-language Support

---

**Built with ❤️ by the Sify Technologies Team** 