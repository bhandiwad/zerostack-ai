# Sify Cluster-API Management Console

A production-grade React application for managing Kubernetes clusters across multiple cloud providers with professional Sify branding.

![Sify Cluster-API Console](https://img.shields.io/badge/Sify-Cluster--API%20Console-brightgreen)
![React](https://img.shields.io/badge/React-18+-blue)
![Production Ready](https://img.shields.io/badge/Production-Ready-success)

## 🚀 Features

### Core Functionality
- **📊 Dashboard**: Comprehensive cluster overview and resource monitoring
- **🛠️ Cluster Creation**: Advanced multi-step wizard with provider-specific configurations
- **🖥️ Cluster Management**: Complete listing, filtering, and management interface
- **📈 Monitoring**: Real-time metrics, alerts, and performance dashboards

### Multi-Cloud Support
- ☁️ **Amazon Web Services (AWS)**: EC2, EKS, VPC configurations
- ☁️ **Google Cloud Platform (GCP)**: GKE, Compute Engine integration
- ☁️ **Microsoft Azure**: AKS, Virtual Machine configurations
- 🖥️ **VMWare**: vSphere and vCenter integration
- 🏢 **On-Premises**: Bare metal and private cloud support

### Advanced Configuration
- **Cluster Topologies**: Single Master, Multi-Master HA, All-in-One, Custom
- **Kubernetes Versions**: Latest, Stable, LTS with automatic updates
- **Networking**: Network policies, service mesh, ingress controllers
- **Security**: RBAC, Pod Security Standards, OPA Gatekeeper
- **Monitoring**: Prometheus, Grafana, Jaeger tracing
- **Storage**: Dynamic provisioning, backup solutions, CSI drivers

### Professional UI/UX
- 🎨 **Sify Branding**: Consistent brand colors and styling
- 📱 **Responsive Design**: Optimized for desktop, tablet, and mobile
- ⚡ **Performance**: Optimized builds with 70%+ compression
- 🔒 **Security**: CSP-ready, input validation, secure API integration

## 🏗️ Architecture

### Technology Stack
- **Frontend**: React 18 with modern hooks
- **Styling**: Custom CSS with Sify brand guidelines
- **Build Tool**: Vite for optimized production builds
- **Package Manager**: pnpm for efficient dependency management

### Component Structure
```
src/
├── App.jsx                 # Main application component
├── App.css                 # Comprehensive Sify styling
└── components/
    ├── layout/             # Layout components
    ├── pages/              # Page components
    └── common/             # Shared components
```

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- pnpm (recommended) or npm

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd cluster-api-ui

# Install dependencies
pnpm install

# Start development server
pnpm run dev
```

### Development
```bash
# Start development server with hot reload
pnpm run dev

# Build for production
pnpm run build

# Preview production build
pnpm run preview
```

### Production Deployment
```bash
# Build optimized production bundle
pnpm run build

# Deploy static files from dist/ directory
# to your preferred hosting platform
```

## 📖 Documentation

### Complete Documentation Set
- 📋 **[System Architecture](../cluster-api-ui-architecture.md)**: Detailed system design and architecture
- 🧩 **[Component Structure](../component-structure.md)**: Component organization and design patterns
- 🧪 **[Testing Report](../cluster-api-ui-testing-report.md)**: Comprehensive testing results and performance metrics
- 🔧 **[Integration Guide](../cluster-api-ui-integration-guide.md)**: Developer integration instructions
- 📦 **[Deployment Package](../cluster-api-ui-deployment-package.md)**: Production deployment guide

### Quick Reference
- **Dashboard**: Overview of cluster statistics and resource usage
- **Create Cluster**: Multi-step wizard for cluster configuration
- **Clusters**: Comprehensive cluster listing and management
- **Monitoring**: Real-time metrics and alerting dashboard

## 🔧 Configuration

### Environment Variables
```bash
# API Configuration
VITE_API_BASE_URL=https://api.your-domain.com/v1
VITE_WEBSOCKET_URL=wss://ws.your-domain.com

# Authentication
VITE_AUTH_PROVIDER=oidc
VITE_OIDC_AUTHORITY=https://auth.your-domain.com
VITE_OIDC_CLIENT_ID=cluster-api-ui

# Feature Flags
VITE_ENABLE_REAL_TIME_UPDATES=true
VITE_ENABLE_ADVANCED_MONITORING=true
```

### Customization
The application uses CSS custom properties for easy theming:

```css
:root {
  --sify-primary: #bdd70c;
  --sify-secondary: #8bc34a;
  /* Customize colors for your organization */
}
```

## 🔌 API Integration

### Required Endpoints
```javascript
// Cluster Management
GET    /api/v1/clusters                    # List clusters
POST   /api/v1/clusters                    # Create cluster
GET    /api/v1/clusters/{id}               # Get cluster details
PUT    /api/v1/clusters/{id}               # Update cluster
DELETE /api/v1/clusters/{id}               # Delete cluster

// Monitoring
GET    /api/v1/metrics/clusters            # Overall metrics
GET    /api/v1/alerts                      # Active alerts

// Provider Configuration
GET    /api/v1/providers                   # Available providers
GET    /api/v1/providers/{provider}/regions # Provider regions
```

### Authentication
Supports multiple authentication methods:
- JWT Bearer tokens
- OIDC/OAuth2 integration
- SAML enterprise SSO
- API key authentication

## 📊 Performance

### Build Optimization
- **CSS**: 29.06 kB → 4.58 kB (84% compression)
- **JavaScript**: 219.50 kB → 64.80 kB (70% compression)
- **Build Time**: 1.18 seconds
- **Bundle Analysis**: Optimized for production

### Runtime Performance
- **First Contentful Paint**: < 1.5 seconds
- **Largest Contentful Paint**: < 2.5 seconds
- **Lighthouse Score**: 90+ across all metrics
- **Core Web Vitals**: All metrics in "Good" range

## 🔒 Security

### Security Features
- Content Security Policy (CSP) ready
- Input validation and sanitization
- Secure API communication (HTTPS only)
- XSS and CSRF protection
- Secure token storage

### Best Practices
- Regular security audits
- Dependency vulnerability scanning
- Secure coding standards
- Authentication best practices

## 🧪 Testing

### Testing Coverage
- ✅ **Functionality Testing**: All features tested across browsers
- ✅ **Performance Testing**: Optimized builds and runtime performance
- ✅ **Responsive Design**: Desktop, tablet, and mobile compatibility
- ✅ **Security Testing**: Security best practices implemented
- ✅ **Integration Testing**: API integration structure validated

### Browser Compatibility
- ✅ Chrome/Chromium (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (Chromium-based)

## 🚀 Deployment Options

### 1. Static Hosting (Recommended)
```bash
# Deploy to AWS S3 + CloudFront
aws s3 sync dist/ s3://your-bucket
aws cloudfront create-invalidation --distribution-id ID --paths "/*"

# Deploy to Netlify
netlify deploy --prod --dir=dist

# Deploy to Vercel
vercel --prod
```

### 2. Container Deployment
```bash
# Build and deploy with Docker
docker build -t sify/cluster-api-ui:1.0.0 .
docker run -p 80:80 sify/cluster-api-ui:1.0.0
```

### 3. Kubernetes Deployment
```bash
# Deploy to Kubernetes cluster
kubectl apply -f kubernetes/
```

## 📈 Monitoring

### Application Monitoring
- Error tracking with Sentry integration
- Performance monitoring with Web Vitals
- User analytics and behavior tracking
- Health checks and uptime monitoring

### Metrics Dashboard
- Real-time cluster metrics
- Resource utilization tracking
- Alert management system
- Performance analytics

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

### Code Standards
- ESLint for JavaScript linting
- Prettier for code formatting
- Consistent component structure
- Comprehensive documentation

## 📞 Support

### Getting Help
- 📖 **Documentation**: Comprehensive guides and API documentation
- 🐛 **Issues**: Report bugs and feature requests
- 💬 **Discussions**: Community discussions and Q&A
- 📧 **Contact**: development-team@sify.com

### Maintenance
- Regular updates and security patches
- Performance optimization
- Feature enhancements
- Bug fixes and improvements

## 📄 License

Proprietary - Sify Technologies. All rights reserved.

## 🏆 Acknowledgments

Built with modern web technologies and best practices:
- React 18 for component architecture
- Vite for build optimization
- CSS Grid and Flexbox for responsive layouts
- Modern JavaScript (ES6+) features

---

**Version**: 1.0.0  
**Last Updated**: January 18, 2025  
**Status**: Production Ready ✅

For more information, see the [complete documentation set](../cluster-api-ui-deployment-package.md).

