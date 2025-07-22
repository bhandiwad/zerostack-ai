# Cluster-API UI Integration Guide

## Overview

This guide provides comprehensive instructions for integrating the Sify Cluster-API Management Console with your existing infrastructure and frameworks.

## Architecture Overview

### Frontend Architecture
```
cluster-api-ui/
├── src/
│   ├── App.jsx                 # Main application component
│   ├── App.css                 # Comprehensive styling
│   └── components/
│       ├── layout/             # Layout components
│       ├── pages/              # Page components
│       └── common/             # Shared components
├── dist/                       # Production build output
├── package.json               # Dependencies and scripts
└── vite.config.js             # Build configuration
```

### Component Structure
- **App.jsx**: Main application with routing and state management
- **Dashboard**: Overview and statistics
- **ClusterCreationWizard**: Multi-step cluster configuration
- **ClusterManagement**: Cluster listing and management
- **MonitoringDashboard**: Real-time metrics and alerts

## Integration Options

### Option 1: Standalone Deployment
Deploy as a separate React application with API integration.

**Pros:**
- Independent deployment and scaling
- Easy to maintain and update
- Full control over the application lifecycle

**Cons:**
- Requires separate authentication integration
- Additional infrastructure overhead

### Option 2: Embedded Integration
Integrate as a component within existing React applications.

**Pros:**
- Shared authentication and session management
- Consistent user experience
- Reduced infrastructure complexity

**Cons:**
- Potential styling conflicts
- Dependency on parent application updates

### Option 3: Micro-frontend Architecture
Deploy as a micro-frontend with module federation.

**Pros:**
- Independent development and deployment
- Shared runtime and resources
- Scalable team structure

**Cons:**
- Complex initial setup
- Requires micro-frontend infrastructure

## API Integration Requirements

### 1. Cluster Management API

#### Endpoints Required
```javascript
// Cluster CRUD operations
GET    /api/v1/clusters                    // List clusters
POST   /api/v1/clusters                    // Create cluster
GET    /api/v1/clusters/{id}               // Get cluster details
PUT    /api/v1/clusters/{id}               // Update cluster
DELETE /api/v1/clusters/{id}               // Delete cluster

// Cluster operations
POST   /api/v1/clusters/{id}/start         // Start cluster
POST   /api/v1/clusters/{id}/stop          // Stop cluster
POST   /api/v1/clusters/{id}/scale         // Scale cluster
```

#### Data Models
```typescript
interface Cluster {
  id: string;
  name: string;
  provider: 'aws' | 'gcp' | 'azure' | 'vmware' | 'on-premises';
  region: string;
  status: 'running' | 'pending' | 'failed' | 'stopped';
  version: string;
  nodeCount: number;
  createdAt: string;
  resources: {
    cpu: number;
    memory: number;
    storage: number;
  };
  configuration: ClusterConfiguration;
}

interface ClusterConfiguration {
  topology: 'single-master' | 'multi-master' | 'all-in-one' | 'custom';
  networking: NetworkingConfig;
  security: SecurityConfig;
  monitoring: MonitoringConfig;
  storage: StorageConfig;
}
```

### 2. Monitoring API

#### Endpoints Required
```javascript
// Metrics and monitoring
GET /api/v1/metrics/clusters              // Overall cluster metrics
GET /api/v1/metrics/clusters/{id}         // Specific cluster metrics
GET /api/v1/alerts                        // Active alerts
GET /api/v1/alerts/{id}/dismiss           // Dismiss alert
```

#### Data Models
```typescript
interface ClusterMetrics {
  clusterId: string;
  timestamp: string;
  cpu: MetricValue;
  memory: MetricValue;
  network: MetricValue;
  storage: MetricValue;
}

interface Alert {
  id: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
  clusterId: string;
  timestamp: string;
  dismissed: boolean;
}
```

### 3. Provider Configuration API

#### Endpoints Required
```javascript
// Provider-specific configurations
GET /api/v1/providers                     // List available providers
GET /api/v1/providers/{provider}/regions  // Get provider regions
GET /api/v1/providers/{provider}/sizes    // Get instance sizes
GET /api/v1/providers/{provider}/images   // Get available images
```

## Authentication Integration

### 1. JWT Token Integration
```javascript
// Add to App.jsx
const [authToken, setAuthToken] = useState(localStorage.getItem('authToken'));

// API request interceptor
const apiRequest = async (url, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`,
    ...options.headers
  };
  
  const response = await fetch(url, { ...options, headers });
  
  if (response.status === 401) {
    // Handle token expiration
    setAuthToken(null);
    localStorage.removeItem('authToken');
    // Redirect to login
  }
  
  return response;
};
```

### 2. OIDC/SAML Integration
```javascript
// Integration with existing identity providers
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    // Initialize OIDC client
    const oidcClient = new OidcClient({
      authority: 'https://your-identity-provider.com',
      client_id: 'cluster-api-ui',
      redirect_uri: window.location.origin + '/callback'
    });
    
    // Handle authentication
    oidcClient.getUser().then(setUser);
  }, []);
  
  return (
    <AuthContext.Provider value={{ user, oidcClient }}>
      {children}
    </AuthContext.Provider>
  );
};
```

## Styling Integration

### 1. CSS Custom Properties
The application uses CSS custom properties for easy theming:

```css
:root {
  /* Sify Brand Colors */
  --sify-primary: #bdd70c;
  --sify-secondary: #8bc34a;
  --sify-dark: #689f38;
  
  /* Semantic Colors */
  --color-success: #4caf50;
  --color-warning: #ff9800;
  --color-error: #f44336;
  --color-info: #2196f3;
  
  /* Spacing */
  --spacing-1: 0.25rem;
  --spacing-2: 0.5rem;
  --spacing-3: 0.75rem;
  --spacing-4: 1rem;
  --spacing-6: 1.5rem;
  --spacing-8: 2rem;
}
```

### 2. Theme Customization
To customize the theme for your organization:

```css
/* Override CSS custom properties */
:root {
  --sify-primary: #your-primary-color;
  --sify-secondary: #your-secondary-color;
  /* Add your brand colors */
}
```

### 3. CSS Isolation
For embedded integration, use CSS modules or styled-components:

```javascript
// CSS Modules approach
import styles from './ClusterUI.module.css';

const ClusterUI = () => (
  <div className={styles.container}>
    {/* Component content */}
  </div>
);
```

## Environment Configuration

### 1. Environment Variables
```javascript
// .env.production
VITE_API_BASE_URL=https://api.your-domain.com
VITE_AUTH_PROVIDER=oidc
VITE_OIDC_AUTHORITY=https://auth.your-domain.com
VITE_WEBSOCKET_URL=wss://ws.your-domain.com
```

### 2. Configuration Object
```javascript
// config.js
export const config = {
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
    timeout: 30000,
    retries: 3
  },
  auth: {
    provider: import.meta.env.VITE_AUTH_PROVIDER || 'jwt',
    oidc: {
      authority: import.meta.env.VITE_OIDC_AUTHORITY,
      clientId: import.meta.env.VITE_OIDC_CLIENT_ID
    }
  },
  features: {
    realTimeUpdates: true,
    advancedMonitoring: true,
    clusterTemplates: true
  }
};
```

## Deployment Strategies

### 1. Static Hosting (Recommended)
```bash
# Build for production
pnpm run build

# Deploy to CDN/Static hosting
aws s3 sync dist/ s3://your-bucket-name
# or
netlify deploy --prod --dir=dist
# or
vercel --prod
```

### 2. Container Deployment
```dockerfile
# Dockerfile
FROM nginx:alpine

COPY dist/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```yaml
# kubernetes.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cluster-api-ui
spec:
  replicas: 3
  selector:
    matchLabels:
      app: cluster-api-ui
  template:
    metadata:
      labels:
        app: cluster-api-ui
    spec:
      containers:
      - name: cluster-api-ui
        image: your-registry/cluster-api-ui:latest
        ports:
        - containerPort: 80
```

### 3. Reverse Proxy Integration
```nginx
# nginx.conf
server {
    listen 80;
    server_name your-domain.com;
    
    location /cluster-ui/ {
        alias /path/to/dist/;
        try_files $uri $uri/ /index.html;
    }
    
    location /api/ {
        proxy_pass http://your-api-server;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Real-time Updates Integration

### 1. WebSocket Integration
```javascript
// websocket.js
export class ClusterWebSocket {
  constructor(url, authToken) {
    this.url = url;
    this.authToken = authToken;
    this.listeners = new Map();
  }
  
  connect() {
    this.ws = new WebSocket(`${this.url}?token=${this.authToken}`);
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.notifyListeners(data.type, data.payload);
    };
  }
  
  subscribe(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType).push(callback);
  }
  
  notifyListeners(eventType, data) {
    const callbacks = this.listeners.get(eventType) || [];
    callbacks.forEach(callback => callback(data));
  }
}
```

### 2. Server-Sent Events (SSE)
```javascript
// sse.js
export class ClusterEventSource {
  constructor(url, authToken) {
    this.eventSource = new EventSource(`${url}?token=${authToken}`);
    
    this.eventSource.addEventListener('cluster-update', (event) => {
      const data = JSON.parse(event.data);
      this.handleClusterUpdate(data);
    });
    
    this.eventSource.addEventListener('alert', (event) => {
      const data = JSON.parse(event.data);
      this.handleAlert(data);
    });
  }
}
```

## Testing Integration

### 1. Unit Testing Setup
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  moduleNameMapping: {
    '\\.(css|less|scss)$': 'identity-obj-proxy'
  }
};

// setupTests.js
import '@testing-library/jest-dom';
```

### 2. Integration Testing
```javascript
// ClusterManagement.test.js
import { render, screen, waitFor } from '@testing-library/react';
import { ClusterManagement } from './ClusterManagement';

// Mock API responses
jest.mock('../api/clusters', () => ({
  getClusters: jest.fn(() => Promise.resolve(mockClusters))
}));

test('displays cluster list', async () => {
  render(<ClusterManagement />);
  
  await waitFor(() => {
    expect(screen.getByText('production-web-cluster')).toBeInTheDocument();
  });
});
```

## Performance Optimization

### 1. Code Splitting
```javascript
// Lazy load components
const ClusterManagement = lazy(() => import('./components/ClusterManagement'));
const MonitoringDashboard = lazy(() => import('./components/MonitoringDashboard'));

// Use Suspense for loading states
<Suspense fallback={<LoadingSpinner />}>
  <ClusterManagement />
</Suspense>
```

### 2. Caching Strategy
```javascript
// API caching with React Query
import { useQuery } from 'react-query';

const useClusters = () => {
  return useQuery('clusters', fetchClusters, {
    staleTime: 30000, // 30 seconds
    cacheTime: 300000, // 5 minutes
    refetchOnWindowFocus: false
  });
};
```

## Security Considerations

### 1. Content Security Policy
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self'; 
               style-src 'self' 'unsafe-inline'; 
               img-src 'self' data: https:; 
               connect-src 'self' wss: https:;">
```

### 2. API Security
```javascript
// Request validation
const validateApiResponse = (response) => {
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }
  return response.json();
};

// Input sanitization
const sanitizeInput = (input) => {
  return input.replace(/[<>\"']/g, '');
};
```

## Monitoring and Observability

### 1. Application Monitoring
```javascript
// Error tracking
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: 'your-sentry-dsn',
  environment: process.env.NODE_ENV
});

// Performance monitoring
const trackUserAction = (action, metadata) => {
  analytics.track(action, {
    ...metadata,
    timestamp: new Date().toISOString(),
    userId: user.id
  });
};
```

### 2. Health Checks
```javascript
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: process.env.APP_VERSION,
    timestamp: new Date().toISOString()
  });
});
```

## Migration Guide

### 1. From Existing UI
1. **Assessment**: Evaluate current UI components and functionality
2. **Data Migration**: Map existing data structures to new API format
3. **User Training**: Provide training materials for new interface
4. **Gradual Rollout**: Implement feature flags for gradual migration

### 2. Backward Compatibility
```javascript
// Legacy API adapter
const legacyApiAdapter = {
  getClusters: async () => {
    const legacyData = await legacyApi.getClusters();
    return legacyData.map(transformLegacyCluster);
  }
};

const transformLegacyCluster = (legacyCluster) => ({
  id: legacyCluster.cluster_id,
  name: legacyCluster.cluster_name,
  // ... transform other fields
});
```

## Support and Maintenance

### 1. Documentation
- **API Documentation**: Maintain up-to-date API documentation
- **User Guide**: Provide comprehensive user documentation
- **Developer Guide**: Document customization and extension points

### 2. Update Strategy
- **Semantic Versioning**: Use semantic versioning for releases
- **Changelog**: Maintain detailed changelog for each release
- **Migration Guides**: Provide migration guides for breaking changes

## Conclusion

This integration guide provides comprehensive instructions for integrating the Sify Cluster-API Management Console with your existing infrastructure. The modular architecture and well-defined APIs ensure smooth integration while maintaining flexibility for future enhancements.

For additional support or questions, please refer to the project documentation or contact the development team.

---

**Integration Guide Version**: 1.0.0  
**Last Updated**: January 18, 2025  
**Compatibility**: React 18+, Node.js 16+

