import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import './App.css';
import ClusterExplorer from './components/ClusterExplorer';
import HelmApplications from './components/HelmApplications';
import './MaintenanceMode.css';
import ClusterCreation from './ClusterCreation.jsx';
import UpgradeKubernetesDialog from './components/UpgradeKubernetesDialog';
import ClusterDetail from './pages/ClusterDetail';
import { AgentProvider } from './features/agents';
import AgentsDashboard from './features/agents/AgentsDashboard';

// Authentication Context
const AuthContext = React.createContext();

// API Configuration
const API_BASE_URL = 'http://localhost:5002/api';

// API Helper Functions
const apiCall = async (endpoint, options = {}) => {
  const token = localStorage.getItem('jwt_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers
    });

    if (response.status === 401) {
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('user_data');
      window.location.reload();
      return null;
    }

    const data = await response.json();
    
    // For non-2xx responses, still return the parsed JSON so error handling works
    if (!response.ok && data) {
      return data;
    }
    
    return data;
  } catch (error) {
    console.error('API call failed:', error);
    return { success: false, error: error.message };
  }
};

// Notification Component
const Notification = ({ notification, onClose }) => {
  if (!notification.show) return null;

  const getNotificationStyle = () => {
    switch (notification.type) {
      case 'success':
        return 'notification-success';
      case 'error':
        return 'notification-error';
      case 'warning':
        return 'notification-warning';
      default:
        return 'notification-info';
    }
  };

  return (
    <div className={`notification ${getNotificationStyle()}`}>
      <div className="notification-content">
        <span className="notification-message">{notification.message}</span>
        <button onClick={onClose} className="notification-close">×</button>
      </div>
    </div>
  );
};

// Login Component
const LoginForm = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    email: 'admin@sifytechnologies.com',
    password: 'SifyAdmin123!'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify(formData)
    });

    if (result && result.success) {
      localStorage.setItem('jwt_token', result.data.token);
      localStorage.setItem('user_data', JSON.stringify(result.data.user));
      localStorage.setItem('organization_data', JSON.stringify(result.data.organization));
      onLogin(result.data);
    } else {
      setError(result?.error || 'Login failed');
    }

    setLoading(false);
  };

  const handleDemoLogin = (email, password) => {
    setFormData({ email, password });
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>🏢 Sify Cluster-API Console</h1>
          <p>Multi-Tenant Kubernetes Management Platform</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
              placeholder="Enter your email"
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required
              placeholder="Enter your password"
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading} className="login-button">
            {loading ? '🔄 Signing In...' : '🔐 Sign In'}
          </button>
        </form>

        <div className="demo-accounts">
          <h3>Demo Accounts</h3>
          <div className="demo-buttons">
            <button 
              onClick={() => handleDemoLogin('admin@sifytechnologies.com', 'SifyAdmin123!')}
              className="demo-button sify"
            >
              🏢 Sify Technologies (Enterprise)
            </button>
            <button 
              onClick={() => handleDemoLogin('admin@example.com', 'DemoAdmin123!')}
              className="demo-button demo"
            >
              🏢 Demo Company (Professional)
            </button>
            <button 
              onClick={() => handleDemoLogin('founder@techstartup.com', 'StartupFounder123!')}
              className="demo-button startup"
            >
              🏢 Tech Startup (Free)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Header Component
const Header = ({ user, organization, onLogout }) => {
  return (
    <header className="app-header">
      <div className="header-left">
        <h1>🏢 Cluster-API Console</h1>
        <span className="powered-by">Powered by Sify</span>
      </div>
      <div className="header-right">
        <div className="organization-info">
          <div className="org-name">{organization?.name}</div>
          <div className="org-tier">{organization?.subscription_tier}</div>
        </div>
        <div className="user-info">
          <div className="user-name">{user?.full_name}</div>
          <div className="user-role">{user?.role?.replace('_', ' ')}</div>
        </div>
        <button onClick={onLogout} className="logout-button">
          🚪 Logout
        </button>
      </div>
    </header>
  );
};

// Dashboard Component
const Dashboard = ({ organization }) => {
  const [dashboardData, setDashboardData] = useState({
    clusters: [],
    totalClusters: 0,
    activeNodes: 0,
    monthlyCost: 0,
    loading: true
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    const result = await apiCall('/mt/clusters');
    if (result && result.success) {
      const clusters = result.data;
      const totalNodes = clusters.reduce((sum, cluster) => sum + cluster.node_count, 0);
      const totalCost = clusters.reduce((sum, cluster) => sum + cluster.monthly_cost, 0);

      setDashboardData({
        clusters,
        totalClusters: clusters.length,
        activeNodes: totalNodes,
        monthlyCost: totalCost,
        loading: false
      });
    } else {
      setDashboardData(prev => ({ ...prev, loading: false }));
    }
  };

  const getProviderDistribution = () => {
    const providers = {};
    dashboardData.clusters.forEach(cluster => {
      providers[cluster.provider] = (providers[cluster.provider] || 0) + 1;
    });
    return providers;
  };

  if (dashboardData.loading) {
    return <div className="loading">🔄 Loading dashboard...</div>;
  }

  const providerDistribution = getProviderDistribution();

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>📊 Organization Dashboard</h2>
        <div className="org-limits">
          <span>Clusters: {dashboardData.totalClusters}/{organization?.max_clusters}</span>
          <span>Subscription: {organization?.subscription_tier}</span>
        </div>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <h3>Total Clusters</h3>
          <div className="stat-value">{dashboardData.totalClusters}</div>
          <div className="stat-change">📈 Active</div>
        </div>

        <div className="stat-card">
          <h3>Active Nodes</h3>
          <div className="stat-value">{dashboardData.activeNodes}</div>
          <div className="stat-change">⚡ Running</div>
        </div>

        <div className="stat-card">
          <h3>Cloud Providers</h3>
          <div className="stat-value">{Object.keys(providerDistribution).length}</div>
          <div className="stat-change">☁️ Multi-cloud</div>
        </div>

        <div className="stat-card">
          <h3>Monthly Cost</h3>
          <div className="stat-value">${dashboardData.monthlyCost.toFixed(0)}</div>
          <div className="stat-change">💰 Estimated</div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="provider-distribution">
          <h3>Provider Distribution</h3>
          <div className="provider-list">
            {Object.entries(providerDistribution).map(([provider, count]) => (
              <div key={provider} className="provider-item">
                <span className="provider-name">{provider.toUpperCase()}</span>
                <span className="provider-count">{count} clusters</span>
              </div>
            ))}
          </div>
        </div>

        <div className="recent-clusters">
          <h3>Recent Clusters</h3>
          <div className="cluster-list">
            {dashboardData.clusters.slice(0, 5).map(cluster => (
              <div key={cluster.id} className="cluster-item">
                <div className="cluster-info">
                  <div className="cluster-name">{cluster.name}</div>
                  <div className="cluster-details">
                    {cluster.provider} • {cluster.region} • {cluster.node_count} nodes
                  </div>
                </div>
                <div className="cluster-status">
                  <span className={`status ${cluster.status}`}>{cluster.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Node Management Dialog Component
const NodeManagementDialog = ({ cluster, nodes, loading, onClose, onDrainNode, onUncordonNode, onRefresh }) => {
  const getNodeStatusColor = (node) => {
    // Handle the actual API response structure
    if (node.ready === true) {
      return 'success';
    } else if (node.ready === false) {
      return 'error';
    } else {
      return 'warning';
    }
  };

  const getNodeStatusText = (node) => {
    if (node.ready === true) {
      return 'Ready';
    } else if (node.ready === false) {
      return 'NotReady';
    } else {
      return 'Unknown';
    }
  };

  const getNodeRole = (node) => {
    // Handle the actual API response structure
    if (node.is_master === true) {
      return 'Master';
    }
    return 'Worker';
  };

  const canDrainNode = (node) => {
    // Can't drain master nodes in single-master clusters
    const isMaster = getNodeRole(node) === 'Master';
    const isReady = node.ready === true;
    const isSchedulable = node.schedulable !== false; // Default to true if not specified
    return isReady && isSchedulable && (!isMaster || (cluster && cluster.node_count > 1));
  };

  const canUncordonNode = (node) => {
    // Can uncordon if node is not schedulable
    return node.schedulable === false;
  };

  return (
    <div className="modal-overlay">
      <div className="modal large-modal">
        <div className="modal-header">
          <h3>Node Management: {cluster?.name}</h3>
          <div className="header-actions">
            <button 
              onClick={onRefresh} 
              className="refresh-button"
              disabled={loading}
            >
              {loading ? '🔄' : '🔄'} Refresh
            </button>
            <button onClick={onClose} className="close-button">×</button>
          </div>
        </div>
        
        <div className="modal-content">
          {loading ? (
            <div className="loading">🔄 Loading nodes...</div>
          ) : nodes.length === 0 ? (
            <div className="empty-state">
              <p>No nodes found for this cluster.</p>
            </div>
          ) : (
            <div className="nodes-table">
              <table>
                <thead>
                  <tr>
                    <th>Node Name</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Version</th>
                    <th>Resources</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {nodes.map((node) => (
                    <tr key={node.name}>
                      <td>
                        <strong>{node.name}</strong>
                        {node.schedulable === false && (
                          <span className="badge cordoned">Cordoned</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge role-${getNodeRole(node).toLowerCase()}`}>
                          {getNodeRole(node)}
                        </span>
                      </td>
                      <td>
                        <span className={`status ${getNodeStatusColor(node)}`}>
                          {getNodeStatusText(node)}
                        </span>
                      </td>
                      <td>{node.kubernetes_version || 'N/A'}</td>
                      <td>
                        <div className="resources">
                          <div>CPU: {node.cpu_capacity || 'N/A'}</div>
                          <div>Memory: {node.memory_capacity || 'N/A'}</div>
                        </div>
                      </td>
                      <td>
                        <div className="node-actions">
                          {canDrainNode(node) && (
                            <button
                              onClick={() => onDrainNode(node)}
                              className="action-button drain"
                              title="Drain node (evict all pods)"
                            >
                              🚫 Drain
                            </button>
                          )}
                          {canUncordonNode(node) && (
                            <button
                              onClick={() => onUncordonNode(node)}
                              className="action-button uncordon"
                              title="Make node schedulable again"
                            >
                              ✅ Uncordon
                            </button>
                          )}
                          {!canDrainNode(node) && !canUncordonNode(node) && (
                            <span className="no-actions">No actions available</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        <div className="modal-footer">
          <button onClick={onClose} className="cancel-button">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Drain Node Dialog Component
const DrainNodeDialog = ({ node, cluster, onClose, onDrain, loading }) => {
  const [drainConfig, setDrainConfig] = useState({
    grace_period_seconds: 300,
    ignore_daemonsets: true,
    delete_emptydir_data: false,
    force: false,
    timeout_seconds: 600
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onDrain(drainConfig);
  };

  const handleConfigChange = (key, value) => {
    setDrainConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>Drain Node: {node?.name}</h3>
          <button onClick={onClose} className="close-button">×</button>
        </div>
        
        <div className="modal-content">
          <div className="warning-box">
            <h4>⚠️ Warning</h4>
            <p>
              Draining a node will evict all pods from the node, making it unavailable for scheduling. 
              This operation is typically used for maintenance or upgrades.
            </p>
            <ul>
              <li>All pods will be evicted from the node</li>
              <li>The node will be marked as unschedulable</li>
              <li>DaemonSet pods may be ignored (configurable)</li>
              <li>EmptyDir data may be lost (configurable)</li>
            </ul>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Grace Period (seconds):</label>
              <input
                type="number"
                min="0"
                max="3600"
                value={drainConfig.grace_period_seconds}
                onChange={(e) => handleConfigChange('grace_period_seconds', parseInt(e.target.value))}
                placeholder="300"
              />
              <small>Time to wait for pods to terminate gracefully</small>
            </div>

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={drainConfig.ignore_daemonsets}
                  onChange={(e) => handleConfigChange('ignore_daemonsets', e.target.checked)}
                />
                Ignore DaemonSets
              </label>
              <small>Ignore DaemonSet pods during drain (recommended)</small>
            </div>

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={drainConfig.delete_emptydir_data}
                  onChange={(e) => handleConfigChange('delete_emptydir_data', e.target.checked)}
                />
                Delete EmptyDir Data
              </label>
              <small>Delete EmptyDir volumes (may cause data loss)</small>
            </div>

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={drainConfig.force}
                  onChange={(e) => handleConfigChange('force', e.target.checked)}
                />
                Force Drain
              </label>
              <small>Force drain even if there are pods that cannot be evicted</small>
            </div>

            <div className="form-group">
              <label>Timeout (seconds):</label>
              <input
                type="number"
                min="60"
                max="3600"
                value={drainConfig.timeout_seconds}
                onChange={(e) => handleConfigChange('timeout_seconds', parseInt(e.target.value))}
                placeholder="600"
              />
              <small>Maximum time to wait for drain operation to complete</small>
            </div>
          </form>
        </div>
        
        <div className="modal-actions">
          <button onClick={onClose} className="cancel-button" disabled={loading}>
            Cancel
          </button>
          <button 
            onClick={handleSubmit} 
            className="confirm-button danger" 
            disabled={loading}
          >
            {loading ? '🔄 Draining...' : '🚫 Drain Node'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Enhanced Scale Dialog Component
const ScaleClusterDialog = ({ cluster, currentCount, targetCount, direction, options, validation, loading, onClose, onScale, onTargetChange, onOptionsChange }) => {
  const [tempTargetCount, setTempTargetCount] = useState(targetCount);
  const [tempOptions, setTempOptions] = useState(options);

  useEffect(() => {
    setTempTargetCount(targetCount);
    setTempOptions(options);
  }, [targetCount, options]);

  const handleTargetChange = (e) => {
    const newTarget = parseInt(e.target.value);
    setTempTargetCount(newTarget);
    onTargetChange(newTarget);
  };

  const handleOptionsChange = (key, value) => {
    const newOptions = { ...tempOptions, [key]: value };
    setTempOptions(newOptions);
    onOptionsChange(newOptions);
  };

  const handleScale = () => {
    onScale();
  };

  const getScaleDirection = () => {
    return tempTargetCount > currentCount ? 'up' : 'down';
  };

  const getScaleIcon = () => {
    return getScaleDirection() === 'up' ? '📈' : '📉';
  };

  const getScaleColor = () => {
    return getScaleDirection() === 'up' ? 'scale-up' : 'scale-down';
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>Scale Cluster: {cluster?.name}</h3>
          <button onClick={onClose} className="close-button">×</button>
        </div>
        
        <div className="modal-content">
          {/* Scale Overview */}
          <div className="scale-overview">
            <div className="scale-current">
              <span className="scale-label">Current Nodes:</span>
              <span className="node-count">{currentCount}</span>
            </div>
            <div className="scale-arrow">→</div>
            <div className="scale-target">
              <span className="scale-label">Target Nodes:</span>
              <span className={`node-count ${getScaleColor()}`}>{tempTargetCount}</span>
            </div>
            <div className={`scale-direction ${getScaleColor()}`}>
              {getScaleIcon()} {getScaleDirection().toUpperCase()}
            </div>
          </div>

          {/* Target Input */}
          <div className="form-group">
            <label>Target Node Count:</label>
            <input
              type="number"
              min="1"
              max="500"
              value={tempTargetCount}
              onChange={handleTargetChange}
              className={`scale-input ${getScaleColor()}`}
            />
            <small>Enter the desired number of nodes (1-500)</small>
          </div>

          {/* Quick Scale Presets */}
          <div className="scale-presets">
            <h4>Quick Scale</h4>
            <div className="preset-buttons">
              <button 
                onClick={() => handleTargetChange({ target: { value: currentCount + 1 } })}
                className="preset-button up"
              >
                +1
              </button>
              <button 
                onClick={() => handleTargetChange({ target: { value: currentCount + 5 } })}
                className="preset-button up"
              >
                +5
              </button>
              <button 
                onClick={() => handleTargetChange({ target: { value: Math.max(1, currentCount - 1) } })}
                className="preset-button down"
              >
                -1
              </button>
              <button 
                onClick={() => handleTargetChange({ target: { value: Math.max(1, currentCount - 5) } })}
                className="preset-button down"
              >
                -5
              </button>
            </div>
          </div>

          {/* Scaling Options */}
          <div className="scale-options">
            <h4>Scaling Options</h4>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={tempOptions.graceful}
                  onChange={(e) => handleOptionsChange('graceful', e.target.checked)}
                />
                Graceful Scaling
              </label>
              <small>Evict pods gracefully before terminating nodes (recommended)</small>
            </div>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={tempOptions.force}
                  onChange={(e) => handleOptionsChange('force', e.target.checked)}
                />
                Force Scaling
              </label>
              <small>Force scale even if it means losing data (use with caution)</small>
            </div>
          </div>

          {/* Warnings and Validation */}
          {validation.warning && (
            <div className="warning-box">
              <h4>⚠️ Warning</h4>
              <p>{validation.warning}</p>
            </div>
          )}

          {!validation.isValid && (
            <div className="error-box">
              <h4>❌ Error</h4>
              <p>{validation.message}</p>
            </div>
          )}

          {/* Scale Down Specific Warnings */}
          {getScaleDirection() === 'down' && (
            <div className="warning-box scale-down-warning">
              <h4>⚠️ Scale Down Warning</h4>
              <ul>
                <li>Scaling down will evict pods from the removed nodes</li>
                <li>Services may experience temporary disruption</li>
                <li>Data in EmptyDir volumes will be lost</li>
                <li>Consider using graceful scaling to minimize impact</li>
              </ul>
            </div>
          )}
        </div>
        
        <div className="modal-actions">
          <button onClick={onClose} className="cancel-button" disabled={loading}>
            Cancel
          </button>
          <button 
            onClick={handleScale} 
            className={`confirm-button ${getScaleColor()}`} 
            disabled={loading || !validation.isValid}
          >
            {loading ? '🔄 Scaling...' : `${getScaleIcon()} Scale Cluster`}
          </button>
        </div>
      </div>
    </div>
  );
};

// Maintenance Mode Dialog Component
const MaintenanceModeDialog = ({ cluster, onClose, onToggle, loading }) => {
  const [maintenanceConfig, setMaintenanceConfig] = useState({
    enabled: false,
    reason: '',
    duration_minutes: 60
  });

  useEffect(() => {
    // Initialize with current cluster maintenance status if available
    if (cluster) {
      setMaintenanceConfig({
        enabled: cluster.maintenance_mode || false,
        reason: cluster.maintenance_reason || '',
        duration_minutes: cluster.maintenance_duration || 60
      });
    }
  }, [cluster]);

  const handleConfigChange = (key, value) => {
    setMaintenanceConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onToggle(maintenanceConfig);
  };

  const getMaintenanceIcon = () => {
    return maintenanceConfig.enabled ? '🔧' : '✅';
  };

  const getMaintenanceTitle = () => {
    return maintenanceConfig.enabled 
      ? 'Maintenance Mode Active' 
      : 'Configure Maintenance Mode';
  };

  const getMaintenanceDescription = () => {
    return maintenanceConfig.enabled 
      ? 'Maintenance mode is active. This cluster is in a read-only state with no new deployments allowed.'
      : 'Enable maintenance mode to perform maintenance tasks. This will prevent new deployments and cordon all nodes.';
  };

  const getImpactDetails = () => {
    if (!maintenanceConfig.enabled) return null;
    
    const impacts = [
      { icon: '✅', text: 'Read Operations: All read operations continue to work' },
      { icon: '⛔', text: 'Write Operations: No new deployments or scaling operations' },
      { icon: '⏸️', text: 'Nodes: All nodes are cordoned (no new pods scheduled)' },
      { icon: '🔄', text: 'Workloads: Existing workloads continue running normally' }
    ];
    
    return (
      <div className="impact-details">
        <h4>Current Impact:</h4>
        <ul className="impact-list">
          {impacts.map((impact, index) => (
            <li key={index}>
              <span className="impact-icon">{impact.icon}</span>
              <span>{impact.text}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>{getMaintenanceIcon()} {getMaintenanceTitle()}</h3>
          <button onClick={onClose} className="close-button">×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-content">
            <div className="maintenance-overview">
              <div className="cluster-info">
                <h4>Cluster: {cluster?.name}</h4>
                <div className="cluster-details">
                  <div className="detail-item">
                    <span className="detail-label">Provider:</span>
                    <span className="detail-value">{cluster?.provider?.toUpperCase()}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Region:</span>
                    <span className="detail-value">{cluster?.region}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Version:</span>
                    <span className="detail-value">{cluster?.version}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Nodes:</span>
                    <span className="detail-value">{cluster?.node_count} nodes</span>
                  </div>
                </div>
                <p className="maintenance-description">{getMaintenanceDescription()}</p>
              </div>
              
              <div className="maintenance-status">
                <div className="status-indicator">
                  <span className={`status-badge ${maintenanceConfig.enabled ? 'maintenance' : 'active'}`}>
                    {maintenanceConfig.enabled ? 'Maintenance Mode' : 'Active Mode'}
                  </span>
                </div>
              </div>
            </div>

            <div className="maintenance-config">
              <div className="config-section toggle-section">
                <label className="toggle-container">
                  <span className="toggle-label">Maintenance Mode</span>
                  <div className="toggle-switch">
                    <input
                      type="checkbox"
                      id="maintenance-toggle"
                      checked={maintenanceConfig.enabled}
                      onChange={(e) => handleConfigChange('enabled', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </div>
                  <span className={`toggle-status ${maintenanceConfig.enabled ? 'active' : ''}`}>
                    {maintenanceConfig.enabled ? 'Active' : 'Inactive'}
                  </span>
                </label>
                <p className="toggle-description">
                  {maintenanceConfig.enabled 
                    ? 'Maintenance mode is active. This cluster is read-only.'
                    : 'Enable to prevent changes during maintenance.'}
                </p>
              </div>

              {maintenanceConfig.enabled && (
                <>
                  <div className="config-section">
                    <label>
                      Reason for Maintenance
                      <span className="required-indicator">*</span>
                    </label>
                    <div className="input-with-icon">
                      <span className="input-icon">💡</span>
                      <textarea
                        value={maintenanceConfig.reason}
                        onChange={(e) => handleConfigChange('reason', e.target.value)}
                        placeholder="e.g., Scheduled maintenance, Security updates, Infrastructure changes..."
                        rows={3}
                        required={maintenanceConfig.enabled}
                        className={!maintenanceConfig.reason && maintenanceConfig.enabled ? 'input-error' : ''}
                      />
                    </div>
                    {!maintenanceConfig.reason && maintenanceConfig.enabled && (
                      <p className="error-message">Please provide a reason for maintenance</p>
                    )}
                  </div>

                  <div className="config-section">
                    <label>Duration</label>
                    <div className="input-with-icon">
                      <span className="input-icon">⏱️</span>
                      <select
                        value={maintenanceConfig.duration_minutes}
                        onChange={(e) => handleConfigChange('duration_minutes', parseInt(e.target.value))}
                        className="duration-select"
                      >
                        <option value={30}>30 minutes</option>
                        <option value={60}>1 hour</option>
                        <option value={120}>2 hours</option>
                        <option value={240}>4 hours</option>
                        <option value={480}>8 hours</option>
                        <option value={1440}>24 hours</option>
                      </select>
                    </div>
                  </div>

                  <div className="impact-section">
                    <h4>What to Expect:</h4>
                    <div className="impact-grid">
                      <div className="impact-item">
                        <div className="impact-icon">⏸️</div>
                        <div className="impact-text">No new deployments</div>
                      </div>
                      <div className="impact-item">
                        <div className="impact-icon">🚫</div>
                        <div className="impact-text">Scaling disabled</div>
                      </div>
                      <div className="impact-item">
                        <div className="impact-icon">🔒</div>
                        <div className="impact-text">Read-only mode</div>
                      </div>
                      <div className="impact-item">
                        <div className="impact-icon">🔄</div>
                        <div className="impact-text">Workloads continue</div>
                      </div>
                    </div>
                    
                    <div className="maintenance-note">
                      <div className="note-icon">ℹ️</div>
                      <div className="note-content">
                        <strong>Note:</strong> This action will cordon all nodes. 
                        Existing workloads will continue to run, but no new pods will be scheduled 
                        until maintenance mode is disabled.
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="cancel-button">
              Cancel
            </button>
            <button 
              type="submit" 
              className={`confirm-button ${maintenanceConfig.enabled ? 'maintenance' : 'active'}`}
              disabled={loading || (maintenanceConfig.enabled && !maintenanceConfig.reason.trim())}
            >
              {loading ? '🔄 Processing...' : (maintenanceConfig.enabled ? 'Enable Maintenance Mode' : 'Apply Configuration')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Cluster Management Component
const ClusterManagement = () => {
  const navigate = useNavigate();
  const [clusters, setClusters] = useState([]);
  const [notification, setNotification] = useState({
    show: false,
    message: '',
    type: 'info'
  });
  const [loading, setLoading] = useState(true);
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [showScaleDialog, setShowScaleDialog] = useState(false);
  
  // Enhanced scaling state
  const [currentNodeCount, setCurrentNodeCount] = useState(0);
  const [targetNodeCount, setTargetNodeCount] = useState(0);
  const [scaleOptions, setScaleOptions] = useState({
    graceful: true,
    force: false,
    nodePool: 'default'
  });
  const [scalingInProgress, setScalingInProgress] = useState(false);
  const [scaleValidation, setScaleValidation] = useState({
    isValid: true,
    message: '',
    warning: ''
  });
  
  // Node management state
  const [showNodeManagementDialog, setShowNodeManagementDialog] = useState(false);
  const [showDrainNodeDialog, setShowDrainNodeDialog] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [clusterNodes, setClusterNodes] = useState([]);
  const [nodesLoading, setNodesLoading] = useState(false);
  const [drainOperationInProgress, setDrainOperationInProgress] = useState(false);

  // Maintenance mode state
  const [showMaintenanceDialog, setShowMaintenanceDialog] = useState(false);
  const [maintenanceOperationInProgress, setMaintenanceOperationInProgress] = useState(false);
  
  // Kubernetes upgrade state
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [upgradeInProgress, setUpgradeInProgress] = useState(false);

  // Search and filtering state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [expandedCluster, setExpandedCluster] = useState(null);
  const [showNodeDetails, setShowNodeDetails] = useState({});
  const [inlineScaleMode, setInlineScaleMode] = useState({});
  const [inlineScaleValues, setInlineScaleValues] = useState({});

  useEffect(() => {
    loadClusters();
  }, []);

  const showNotification = (message, type = 'info') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'info' }), 5000);
  };

  const loadClusters = async () => {
    setLoading(true);
    try {
      const result = await apiCall('/mt/clusters');
      if (result && result.success) {
        setClusters(result.data);
      } else {
        showNotification('Failed to load clusters', 'error');
      }
    } catch (error) {
      console.error('Error loading clusters:', error);
      showNotification('Error loading clusters', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadClusterNodes = async (clusterId) => {
    if (showNodeDetails[clusterId]) {
      setShowNodeDetails(prev => ({ ...prev, [clusterId]: false }));
      return;
    }
    
    setNodesLoading(true);
    try {
      const result = await apiCall(`/clusters/${clusterId}/nodes`);
      if (result && result.success) {
        setClusterNodes(result.data.nodes || []);
        setShowNodeDetails(prev => ({ ...prev, [clusterId]: true }));
      } else {
        setClusterNodes([]);
        showNotification('Failed to load cluster nodes', 'error');
      }
    } catch (error) {
      console.error('Error loading cluster nodes:', error);
      setClusterNodes([]);
      showNotification('Error loading cluster nodes', 'error');
    } finally {
      setNodesLoading(false);
    }
  };

  const validateScaleOperation = (current, target, direction) => {
    const validation = { isValid: true, message: '', warning: '' };
    
    // Basic validation
    if (target < 1) {
      validation.isValid = false;
      validation.message = 'Minimum node count is 1';
      return validation;
    }
    
    if (target > 500) {
      validation.isValid = false;
      validation.message = 'Maximum node count is 500';
      return validation;
    }
    
    // Scale down specific validations
    if (direction === 'down') {
      const reduction = current - target;
      const reductionPercent = (reduction / current) * 100;
      
      if (reductionPercent > 50) {
        validation.warning = 'Scaling down by more than 50% may cause significant service disruption';
      }
      
      if (target < 2 && current > 2) {
        validation.warning = 'Scaling to 1 node will remove high availability. Consider keeping at least 2 nodes.';
      }
    }
    
    // Scale up specific validations
    if (direction === 'up') {
      const increase = target - current;
      if (increase > 10) {
        validation.warning = 'Large scale-up operations may take several minutes to complete';
      }
    }
    
    return validation;
  };

  const handleScaleCluster = async () => {
    if (!selectedCluster || !scaleValidation.isValid) return;

    setScalingInProgress(true);
    try {
      const result = await apiCall(`/mt/clusters/${selectedCluster.id}/scale`, {
        method: 'POST',
        body: JSON.stringify({ 
          nodeCount: targetNodeCount,
          options: scaleOptions
        })
      });

      if (result && result.success) {
        setShowScaleDialog(false);
        
        // OPTIMISTIC UPDATE: Immediately update the UI with the new node count
        // This provides better UX while the backend operation is in progress
        const optimisticCluster = {
          ...selectedCluster,
          node_count: targetNodeCount
        };
        setSelectedCluster(optimisticCluster);
        
        // Update the clusters list with the optimistic change
        setClusters(prevClusters => 
          prevClusters.map(cluster => 
            cluster.id === selectedCluster.id 
              ? { ...cluster, node_count: targetNodeCount }
              : cluster
          )
        );
        
        // Refresh clusters list from backend (but don't wait for it)
        loadClusters().then(() => {
          console.log('Backend refresh completed');
        }).catch(error => {
          console.error('Backend refresh failed:', error);
        });
        
        // If node management dialog is open, refresh node data
        if (showNodeManagementDialog) {
          await loadClusterNodes(selectedCluster.id);
        }
        
        showNotification(`Cluster scaling initiated: ${selectedCluster.name} ${currentNodeCount} → ${targetNodeCount} nodes`);
      } else {
        showNotification(`Scaling failed: ${result?.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Error scaling cluster:', error);
      showNotification(`Scaling failed: ${error.message}`, 'error');
    } finally {
      setScalingInProgress(false);
    }
  };

  const handleDeleteCluster = async (cluster) => {
    if (!window.confirm(`Are you sure you want to delete the cluster ${cluster.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      const result = await apiCall(`/mt/clusters/${cluster.id}`, {
        method: 'DELETE'
      });

      if (result && result.success) {
        showNotification(`Cluster ${cluster.name} is being deleted`);
        loadClusters();
      } else {
        throw new Error(result?.error || 'Failed to delete cluster');
      }
    } catch (error) {
      console.error('Error deleting cluster:', error);
      showNotification(`Failed to delete cluster: ${error.message}`, 'error');
    }
  };
  
  const handleUpgradeKubernetes = async (targetVersion) => {
    if (!selectedCluster) return;
    
    setUpgradeInProgress(true);
    try {
      const result = await apiCall(`/clusters/${selectedCluster.id}/upgrade`, {
        method: 'POST',
        body: JSON.stringify({ version: targetVersion })
      });
      
      if (result && result.success) {
        showNotification(`Kubernetes version upgrade to ${targetVersion} has been initiated`);
        setShowUpgradeDialog(false);
        loadClusters(); // Refresh cluster list to show new version
      } else {
        throw new Error(result?.error || 'Failed to initiate upgrade');
      }
    } catch (error) {
      console.error('Error upgrading Kubernetes version:', error);
      showNotification(`Failed to upgrade Kubernetes: ${error.message}`, 'error');
    } finally {
      setUpgradeInProgress(false);
    }
  };

  const handleOpenNodeManagement = async (cluster) => {
    setSelectedCluster(cluster);
    setShowNodeManagementDialog(true);
    await loadClusterNodes(cluster.id);
  };

  const handleRefreshNodes = async () => {
    if (selectedCluster) {
      await loadClusterNodes(selectedCluster.id);
    }
  };

  const handleOpenScaleDialog = async (cluster) => {
    // Use the current cluster data directly for better UX
    setSelectedCluster(cluster);
    setCurrentNodeCount(cluster.node_count || 1);
    setTargetNodeCount(cluster.node_count || 1);
    
    setScaleOptions({ graceful: true, force: false, nodePool: 'default' });
    setScaleValidation({ isValid: true, message: '', warning: '' });
    setShowScaleDialog(true);
  };

  const handleTargetCountChange = (newTarget) => {
    setTargetNodeCount(newTarget);
    const direction = newTarget > currentNodeCount ? 'up' : 'down';
    const validation = validateScaleOperation(currentNodeCount, newTarget, direction);
    setScaleValidation(validation);
  };

  const handleDrainNode = async (drainConfig) => {
    setDrainOperationInProgress(true);
    try {
      const result = await apiCall(`/clusters/${drainConfig.clusterId || selectedCluster?.id}/nodes/drain`, {
        method: 'POST',
        body: JSON.stringify({
          node_name: drainConfig.node_name,
          grace_period_seconds: drainConfig.grace_period_seconds || 300,
          ignore_daemonsets: drainConfig.ignore_daemonsets !== false,
          delete_emptydir_data: drainConfig.delete_emptydir_data || false,
          force: drainConfig.force || false,
          timeout_seconds: drainConfig.timeout_seconds || 600
        })
      });

      if (result && result.success) {
        showNotification(`Node drain initiated successfully for ${drainConfig.node_name}`, 'success');
        
        // OPTIMISTIC UPDATE: Immediately update the node status in the UI
        setClusterNodes(prevNodes => 
          prevNodes.map(node => 
            node.name === drainConfig.node_name 
              ? { ...node, schedulable: false }
              : node
          )
        );
        
        // Refresh node list from backend
        if (drainConfig.clusterId) {
          loadClusterNodes(drainConfig.clusterId);
        } else if (selectedCluster) {
          loadClusterNodes(selectedCluster.id);
        }
        
      } else {
        showNotification(`Drain operation failed: ${result?.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Error draining node:', error);
      showNotification(`Drain operation failed: ${error.message}`, 'error');
    } finally {
      setDrainOperationInProgress(false);
    }
  };

  const handleUncordonNode = async (node, clusterId) => {
    if (!confirm(`Are you sure you want to uncordon node "${node.name}"? This will make it schedulable again.`)) return;

    try {
      const result = await apiCall(`/clusters/${clusterId || selectedCluster?.id}/nodes/uncordon`, {
        method: 'POST',
        body: JSON.stringify({ node_name: node.name })
      });

      if (result && result.success) {
        showNotification(`Node ${node.name} uncordoned successfully`, 'success');
        
        // OPTIMISTIC UPDATE: Immediately update the node status in the UI
        setClusterNodes(prevNodes => 
          prevNodes.map(n => 
            n.name === node.name 
              ? { ...n, schedulable: true }
              : n
          )
        );
        
        // Refresh node list from backend
        if (clusterId) {
          loadClusterNodes(clusterId);
        } else if (selectedCluster) {
          loadClusterNodes(selectedCluster.id);
        }
        
      } else {
        showNotification(`Uncordon operation failed: ${result?.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Error uncordoning node:', error);
      showNotification(`Uncordon operation failed: ${error.message}`, 'error');
    }
  };

  const handleToggleMaintenanceMode = async (config) => {
    if (!selectedCluster) return;

    // Validate required fields when enabling maintenance mode
    if (config.enabled && !config.reason?.trim()) {
      showNotification('Please provide a reason for enabling maintenance mode', 'error');
      return;
    }

    setMaintenanceOperationInProgress(true);
    
    try {
      const result = await apiCall(`/clusters/${selectedCluster.id}/maintenance-mode`, {
        method: 'POST',
        body: JSON.stringify({
          enabled: config.enabled,
          reason: config.reason,
          duration_minutes: config.duration_minutes,
          // Add audit information
          requested_by: 'current_user', // This should be replaced with actual user context
          timestamp: new Date().toISOString()
        })
      });

      if (result && result.success) {
        const action = config.enabled ? 'enabled' : 'disabled';
        showNotification(`Maintenance mode ${action} for ${selectedCluster.name}`, 'success');
        setShowMaintenanceDialog(false);
        
        // OPTIMISTIC UPDATE: Immediately update the cluster status in the UI
        const updatedCluster = {
          ...selectedCluster,
          maintenance_mode: config.enabled,
          maintenance_reason: config.reason,
          maintenance_duration: config.duration_minutes,
          maintenance_started_at: config.enabled ? new Date().toISOString() : null,
          maintenance_ends_at: config.enabled 
            ? new Date(Date.now() + (config.duration_minutes * 60 * 1000)).toISOString()
            : null
        };
        
        setClusters(prevClusters => 
          prevClusters.map(cluster => 
            cluster.id === selectedCluster.id ? updatedCluster : cluster
          )
        );
        
        // Refresh cluster data in the background
        loadClusters().catch(error => {
          console.error('Cluster data refresh failed:', error);
        });
        
      } else {
        const errorMessage = result?.error || 'Unknown error';
        showNotification(`Failed to update maintenance mode: ${errorMessage}`, 'error');
        
        // Revert the optimistic update if there was an error
        if (selectedCluster) {
          setClusters(prevClusters => 
            prevClusters.map(cluster => 
              cluster.id === selectedCluster.id 
                ? { 
                    ...cluster, 
                    maintenance_mode: !config.enabled,
                    maintenance_reason: config.enabled ? cluster.maintenance_reason : ''
                  } 
                : cluster
            )
          );
        }
      }
    } catch (error) {
      console.error('Error toggling maintenance mode:', error);
      showNotification(`Maintenance mode toggle failed: ${error.message}`, 'error');
    } finally {
      setMaintenanceOperationInProgress(false);
    }
  };

  const handleViewCluster = (cluster) => {
    navigate(`/clusters/${cluster.id}`);
  };

  const handleDeleteClick = (cluster, e) => {
    e.stopPropagation();
    
    if (!confirm(`Are you sure you want to delete the cluster "${cluster.name}"?\n\nThis action cannot be undone and will permanently remove the cluster and all its resources.`)) {
      return;
    }
    
    if (!confirm(`FINAL WARNING: This will permanently delete cluster "${cluster.name}" and all its data.\n\nType "DELETE" to confirm:`) || 
        prompt('Type "DELETE" to confirm:') !== 'DELETE') {
      return;
    }
    
    handleDeleteCluster(cluster);
  };

  const handleScaleClick = (cluster, e) => {
    e.stopPropagation();
    setSelectedCluster(cluster);
    setCurrentNodeCount(cluster.node_count || 0);
    setTargetNodeCount(cluster.node_count || 0);
    setShowScaleDialog(true);
  };

  // Inline action handlers
  const handleInlineScale = (cluster) => {
    setInlineScaleMode(prev => ({ ...prev, [cluster.id]: !prev[cluster.id] }));
    if (!inlineScaleValues[cluster.id]) {
      setInlineScaleValues(prev => ({ ...prev, [cluster.id]: cluster.node_count }));
    }
  };

  const handleInlineScaleChange = (clusterId, value) => {
    setInlineScaleValues(prev => ({ ...prev, [clusterId]: parseInt(value) || 0 }));
  };

  const handleInlineScaleSubmit = async (cluster) => {
    const targetCount = inlineScaleValues[cluster.id];
    const validation = validateScaleOperation(cluster.node_count, targetCount, targetCount > cluster.node_count ? 'up' : 'down');
    
    if (!validation.isValid) {
      showNotification(validation.message, 'error');
      return;
    }

    if (validation.warning) {
      if (!confirm(validation.warning + '\n\nDo you want to continue?')) {
        return;
      }
    }

    setScalingInProgress(true);
    try {
      const result = await apiCall(`/mt/clusters/${cluster.id}/scale`, {
        method: 'POST',
        body: JSON.stringify({
          nodeCount: targetCount,
          options: { graceful: true, force: false }
        })
      });

      if (result && result.success) {
        showNotification(`Cluster scaling initiated: ${cluster.node_count} → ${targetCount} nodes`, 'success');
        setInlineScaleMode(prev => ({ ...prev, [cluster.id]: false }));
        loadClusters(); // Refresh the list
      } else {
        showNotification('Failed to scale cluster', 'error');
      }
    } catch (error) {
      console.error('Error scaling cluster:', error);
      showNotification('Error scaling cluster', 'error');
    } finally {
      setScalingInProgress(false);
    }
  };

  const handleInlineMaintenance = async (cluster) => {
    const newMaintenanceMode = !cluster.maintenance_mode;
    
    if (newMaintenanceMode) {
      const reason = prompt('Enter maintenance reason (optional):');
      if (reason === null) return; // User cancelled
      
      const duration = prompt('Enter maintenance duration in minutes (default: 60):', '60');
      if (duration === null) return; // User cancelled
      
      const durationMinutes = parseInt(duration) || 60;
      
      if (!confirm(`Enable maintenance mode for ${durationMinutes} minutes?\nReason: ${reason || 'None'}\n\nThis will disable most cluster operations.`)) {
        return;
      }
    } else {
      if (!confirm('Disable maintenance mode? This will re-enable all cluster operations.')) {
        return;
      }
    }
    
    setMaintenanceOperationInProgress(true);
    
    try {
      const result = await apiCall(`/mt/clusters/${cluster.id}/maintenance`, {
        method: 'POST',
        body: JSON.stringify({
          enabled: newMaintenanceMode,
          reason: newMaintenanceMode ? (reason || 'Maintenance mode enabled via UI') : '',
          duration_minutes: newMaintenanceMode ? (parseInt(duration) || 60) : 0
        })
      });

      if (result && result.success) {
        showNotification(
          newMaintenanceMode ? 'Maintenance mode enabled' : 'Maintenance mode disabled', 
          'success'
        );
        loadClusters(); // Refresh the list
      } else {
        showNotification('Failed to toggle maintenance mode', 'error');
      }
    } catch (error) {
      console.error('Error toggling maintenance mode:', error);
      showNotification('Error toggling maintenance mode', 'error');
    } finally {
      setMaintenanceOperationInProgress(false);
    }
  };

  const handleInlineUpgrade = async (cluster) => {
    const currentVersion = cluster.version;
    const versionParts = currentVersion.split('.');
    const nextMinorVersion = `${versionParts[0]}.${parseInt(versionParts[1]) + 1}.0`;
    
    if (!confirm(`Upgrade Kubernetes from ${currentVersion} to ${nextMinorVersion}?\n\nThis operation may cause temporary service disruption.`)) {
      return;
    }
    
    setUpgradeInProgress(true);
    try {
      const result = await apiCall(`/mt/clusters/${cluster.id}/upgrade`, {
        method: 'POST',
        body: JSON.stringify({
          targetVersion: nextMinorVersion
        })
      });

      if (result && result.success) {
        showNotification(`Kubernetes upgrade initiated: ${currentVersion} → ${nextMinorVersion}`, 'success');
        loadClusters(); // Refresh the list
      } else {
        showNotification('Failed to upgrade Kubernetes', 'error');
      }
    } catch (error) {
      console.error('Error upgrading Kubernetes:', error);
      showNotification('Error upgrading Kubernetes', 'error');
    } finally {
      setUpgradeInProgress(false);
    }
  };

  // Sorting and filtering
  const getSortedAndFilteredClusters = () => {
    let filtered = clusters.filter(cluster => {
      const matchesSearch = cluster.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           cluster.region?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesProvider = selectedProvider === 'all' || cluster.provider === selectedProvider;
      const matchesStatus = selectedStatus === 'all' || cluster.status === selectedStatus;
      return matchesSearch && matchesProvider && matchesStatus;
    });

    // Sort clusters
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      if (sortBy === 'name' || sortBy === 'region' || sortBy === 'provider') {
        aValue = aValue?.toLowerCase() || '';
        bValue = bValue?.toLowerCase() || '';
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (column) => {
    if (sortBy !== column) return '↕️';
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  const getProviderIcon = (provider) => {
    switch (provider?.toLowerCase()) {
      case 'aws': return '☁️';
      case 'azure': return '🔷';
      case 'gcp': return '🌐';
      case 'sify': return '🏢';
      default: return '⚙️';
    }
  };

  const getStatusBadge = (status, maintenanceMode) => {
    const baseClass = 'status-badge';
    const statusClass = status?.toLowerCase() || 'unknown';
    const maintenanceClass = maintenanceMode ? 'maintenance' : '';
    
    return (
      <span className={`${baseClass} ${statusClass} ${maintenanceClass}`}>
        {maintenanceMode && '🛠️ '}
        {status || 'Unknown'}
      </span>
    );
  };

  if (loading) {
    return <div className="loading">🔄 Loading clusters...</div>;
  }



  // Add missing dialog components
  const renderDialogs = () => (
    <>
      {selectedCluster && showUpgradeDialog && (
        <UpgradeKubernetesDialog
          cluster={selectedCluster}
          onClose={() => setShowUpgradeDialog(false)}
          onUpgrade={handleUpgradeKubernetes}
          loading={upgradeInProgress}
        />
      )}
      
      {selectedCluster && showNodeManagementDialog && (
        <NodeManagementDialog
          cluster={selectedCluster}
          nodes={clusterNodes}
          loading={nodesLoading}
          onClose={() => setShowNodeManagementDialog(false)}
          onDrainNode={handleDrainNode}
          onUncordonNode={handleUncordonNode}
          onRefresh={handleRefreshNodes}
        />
      )}

      {selectedCluster && showScaleDialog && (
        <ScaleClusterDialog
          cluster={selectedCluster}
          currentCount={currentNodeCount}
          targetCount={targetNodeCount}
          direction={targetNodeCount > currentNodeCount ? 'up' : 'down'}
          options={scaleOptions}
          validation={scaleValidation}
          loading={scalingInProgress}
          onClose={() => setShowScaleDialog(false)}
          onScale={handleScaleCluster}
          onTargetChange={handleTargetCountChange}
          onOptionsChange={setScaleOptions}
        />
      )}

      {selectedCluster && showMaintenanceDialog && (
        <MaintenanceModeDialog
          cluster={selectedCluster}
          onClose={() => setShowMaintenanceDialog(false)}
          onToggle={handleToggleMaintenanceMode}
          loading={maintenanceOperationInProgress}
        />
      )}
    </>
  );



  // Get unique providers and statuses for filtering
  const providers = ['all', ...new Set(clusters.map(c => c.provider).filter(Boolean))];
  const statuses = ['all', ...new Set(clusters.map(c => c.status).filter(Boolean))];

  const filteredClusters = getSortedAndFilteredClusters();

  return (
    <div className="cluster-management">
      <Notification 
        notification={{
          show: notification.show,
          message: notification.message,
          type: notification.type
        }}
        onClose={() => setNotification(prev => ({...prev, show: false}))} 
      />
      
      {/* Header */}
      <div className="clusters-header">
        <div className="clusters-title">
          <h2>Cluster Management</h2>
          <span className="clusters-count">{clusters.length} clusters</span>
        </div>
        <div className="clusters-actions">
          <button 
            className="refresh-button"
            onClick={loadClusters}
            disabled={loading}
          >
            {loading ? '🔄' : '🔄'} Refresh
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="clusters-navigation">
        <div className="filter-tabs">
          <div className="filter-group">
            <label>Provider:</label>
            <select 
              value={selectedProvider} 
              onChange={(e) => setSelectedProvider(e.target.value)}
            >
              {providers.map(provider => (
                <option key={provider} value={provider}>
                  {provider === 'all' ? 'All Providers' : provider.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Status:</label>
            <select 
              value={selectedStatus} 
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              {statuses.map(status => (
                <option key={status} value={status}>
                  {status === 'all' ? 'All Statuses' : status}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="search-box">
          <input
            type="text"
            placeholder="Search clusters..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="clusters-content">
        <div className="clusters-table-container">
          {loading ? (
            <div className="loading-clusters">
              <div className="spinner"></div>
              <p>Loading clusters...</p>
            </div>
          ) : filteredClusters.length === 0 ? (
            <div className="empty-state">
              <h3>No clusters found</h3>
              <p>
                {searchTerm || selectedProvider !== 'all' || selectedStatus !== 'all' 
                  ? 'Try adjusting your search or filters' 
                  : 'No clusters available. Create your first cluster to get started.'}
              </p>
            </div>
          ) : (
            <div className="clusters-table-wrapper">
              <table className="clusters-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('name')} className="sortable">
                      Name {getSortIcon('name')}
                    </th>
                    <th onClick={() => handleSort('provider')} className="sortable">
                      Provider {getSortIcon('provider')}
                    </th>
                    <th onClick={() => handleSort('region')} className="sortable">
                      Region {getSortIcon('region')}
                    </th>
                    <th onClick={() => handleSort('version')} className="sortable">
                      Version {getSortIcon('version')}
                    </th>
                    <th onClick={() => handleSort('node_count')} className="sortable">
                      Nodes {getSortIcon('node_count')}
                    </th>
                    <th onClick={() => handleSort('status')} className="sortable">
                      Status {getSortIcon('status')}
                    </th>
                    <th>Cost</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClusters.map(cluster => (
                    <React.Fragment key={cluster.id}>
                      <tr className={`cluster-row ${cluster.maintenance_mode ? 'maintenance-mode' : ''}`}>
                        <td className="cluster-name">
                          <div className="name-cell">
                            <span className="provider-icon">{getProviderIcon(cluster.provider)}</span>
                            <div className="name-info">
                              <strong>{cluster.name}</strong>
                              {cluster.maintenance_mode && (
                                <span className="maintenance-indicator">🛠️ Maintenance</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>{cluster.provider ? cluster.provider.toUpperCase() : 'N/A'}</td>
                        <td>{cluster.region || 'N/A'}</td>
                        <td>{cluster.version || 'N/A'}</td>
                        <td>
                          <div className="nodes-cell">
                            {inlineScaleMode[cluster.id] ? (
                              <div className="inline-scale">
                                <input
                                  type="number"
                                  min="1"
                                  max="500"
                                  value={inlineScaleValues[cluster.id] || cluster.node_count}
                                  onChange={(e) => handleInlineScaleChange(cluster.id, e.target.value)}
                                  className="scale-input"
                                />
                                <button
                                  onClick={() => handleInlineScaleSubmit(cluster)}
                                  disabled={scalingInProgress}
                                  className="scale-submit-btn"
                                >
                                  {scalingInProgress ? '🔄' : '✓'}
                                </button>
                                <button
                                  onClick={() => setInlineScaleMode(prev => ({ ...prev, [cluster.id]: false }))}
                                  className="scale-cancel-btn"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <div className="nodes-display">
                                <span>{cluster.node_count || 0}</span>
                                <button
                                  onClick={() => handleInlineScale(cluster)}
                                  disabled={cluster.maintenance_mode}
                                  className="scale-edit-btn"
                                  title="Edit node count"
                                >
                                  ✏️
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                        <td>{getStatusBadge(cluster.status, cluster.maintenance_mode)}</td>
                        <td>
                          {cluster.monthly_cost ? `$${cluster.monthly_cost}/month` : 'N/A'}
                        </td>
                        <td>
                          <div className="actions-cell">
                            <button
                              onClick={() => loadClusterNodes(cluster.id)}
                              disabled={cluster.maintenance_mode}
                              className="action-btn manage"
                              title="View nodes"
                            >
                              🖥️
                            </button>
                            
                            <button
                              onClick={() => handleInlineUpgrade(cluster)}
                              disabled={cluster.maintenance_mode || upgradeInProgress}
                              className="action-btn upgrade"
                              title="Upgrade Kubernetes"
                            >
                              {upgradeInProgress ? '🔄' : '🔄'}
                            </button>
                            
                            <button
                              onClick={() => handleInlineMaintenance(cluster)}
                              disabled={maintenanceOperationInProgress}
                              className={`action-btn ${cluster.maintenance_mode ? 'maintenance' : 'maintenance-toggle'}`}
                              title={cluster.maintenance_mode ? 'Disable maintenance mode' : 'Enable maintenance mode'}
                            >
                              {cluster.maintenance_mode ? '🔓' : '🔒'}
                            </button>
                            
                            <button
                              onClick={() => handleDeleteClick(cluster, { stopPropagation: () => {} })}
                              disabled={cluster.maintenance_mode}
                              className="action-btn delete"
                              title="Delete cluster"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Node details row */}
                      {showNodeDetails[cluster.id] && (
                        <tr className="node-details-row">
                          <td colSpan="8">
                            <div className="node-details">
                              <div className="node-details-header">
                                <h4>Cluster Nodes</h4>
                                <button
                                  onClick={() => loadClusterNodes(cluster.id)}
                                  className="refresh-nodes-btn"
                                >
                                  🔄 Refresh
                                </button>
                              </div>
                              {nodesLoading ? (
                                <div className="loading-nodes">
                                  <div className="spinner"></div>
                                  <p>Loading nodes...</p>
                                </div>
                              ) : clusterNodes.length > 0 ? (
                                <div className="nodes-grid">
                                  {clusterNodes.map(node => (
                                    <div key={node.name} className="node-card">
                                      <div className="node-header">
                                        <span className="node-name">{node.name}</span>
                                        <span className={`node-role ${node.is_master ? 'master' : 'worker'}`}>
                                          {node.is_master ? '🖥️ Master' : '⚙️ Worker'}
                                        </span>
                                      </div>
                                      <div className="node-status">
                                        <span className={`status-badge ${node.ready ? 'ready' : 'not-ready'}`}>
                                          {node.ready ? '✅ Ready' : '❌ Not Ready'}
                                        </span>
                                        {!node.schedulable && (
                                          <span className="status-badge cordoned">🚫 Cordoned</span>
                                        )}
                                      </div>
                                      <div className="node-resources">
                                        <div className="resource-item">
                                          <span className="label">CPU:</span>
                                          <span className="value">{node.cpu_capacity}</span>
                                        </div>
                                        <div className="resource-item">
                                          <span className="label">Memory:</span>
                                          <span className="value">{node.memory_capacity}</span>
                                        </div>
                                        <div className="resource-item">
                                          <span className="label">Version:</span>
                                          <span className="value">{node.kubernetes_version}</span>
                                        </div>
                                      </div>
                                      <div className="node-actions">
                                        {node.schedulable ? (
                                          <button
                                            onClick={() => handleDrainNode({
                                              node_name: node.name,
                                              clusterId: cluster.id,
                                              grace_period_seconds: 300,
                                              ignore_daemonsets: true,
                                              delete_emptydir_data: false,
                                              force: false,
                                              timeout_seconds: 600
                                            })}
                                            disabled={drainOperationInProgress || node.is_master}
                                            className="action-btn drain"
                                            title="Drain node"
                                          >
                                            🚫 Drain
                                          </button>
                                        ) : (
                                          <button
                                            onClick={() => handleUncordonNode(node, cluster.id)}
                                            disabled={drainOperationInProgress}
                                            className="action-btn uncordon"
                                            title="Uncordon node"
                                          >
                                            ✅ Uncordon
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="no-nodes">
                                  <p>No nodes found for this cluster.</p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      
      {renderDialogs()}
    </div>
  );
};

// Cloud Account Manager Component
// Cluster Explorer Page Component
const ClusterExplorerPage = () => {
  const [clusters, setClusters] = useState([]);
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({
    show: false,
    message: '',
    type: 'info'
  });

  useEffect(() => {
    loadClusters();
  }, []);

  const loadClusters = async () => {
    setLoading(true);
    try {
      const result = await apiCall('/mt/clusters');
      if (result && result.success) {
        setClusters(result.data);
        // Auto-select first cluster if available
        if (result.data && result.data.length > 0 && !selectedCluster) {
          setSelectedCluster(result.data[0]);
        }
      } else {
        showNotification('Failed to load clusters', 'error');
      }
    } catch (error) {
      console.error('Error loading clusters:', error);
      showNotification('Error loading clusters', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'info' }), 5000);
  };

  if (loading) {
    return (
      <div className="cluster-explorer-page">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading clusters...</p>
        </div>
      </div>
    );
  }

  if (clusters.length === 0) {
    return (
      <div className="cluster-explorer-page">
        <div className="explorer-placeholder">
          <h3>No Clusters Available</h3>
          <p>Create a cluster first to explore Kubernetes resources.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cluster-explorer-page">
      <Notification 
        notification={notification}
        onClose={() => setNotification(prev => ({...prev, show: false}))} 
      />
      
      {selectedCluster ? (
        <ClusterExplorer 
          cluster={selectedCluster}
          apiCall={apiCall}
          showNotification={showNotification}
        />
      ) : (
        <div className="cluster-selector">
          <h2>Select a Cluster</h2>
          <p>Choose a cluster to explore its Kubernetes resources:</p>
          <div className="cluster-grid">
            {clusters.map(cluster => (
              <div 
                key={cluster.id}
                className="cluster-card clickable"
                onClick={() => setSelectedCluster(cluster)}
              >
                <div className="cluster-header">
                  <h3>{cluster.name}</h3>
                  <span className={`status ${cluster.status?.toLowerCase()}`}>
                    {cluster.status || 'Unknown'}
                  </span>
                </div>
                <div className="cluster-details">
                  <div className="detail-row">
                    <span>Provider:</span>
                    <span>{cluster.provider}</span>
                  </div>
                  <div className="detail-row">
                    <span>Region:</span>
                    <span>{cluster.region}</span>
                  </div>
                  <div className="detail-row">
                    <span>Nodes:</span>
                    <span>{cluster.node_count || 0}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Helm Applications Page Component
const HelmApplicationsPage = () => {
  const [clusters, setClusters] = useState([]);
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({
    show: false,
    message: '',
    type: 'info'
  });

  useEffect(() => {
    loadClusters();
  }, []);

  const loadClusters = async () => {
    setLoading(true);
    try {
      const result = await apiCall('/mt/clusters');
      if (result && result.success) {
        setClusters(result.data);
        // Auto-select first cluster if available
        if (result.data && result.data.length > 0 && !selectedCluster) {
          setSelectedCluster(result.data[0]);
        }
      } else {
        showNotification('Failed to load clusters', 'error');
      }
    } catch (error) {
      console.error('Error loading clusters:', error);
      showNotification('Error loading clusters', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'info' }), 5000);
  };

  if (loading) {
    return (
      <div className="helm-applications-page">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading clusters...</p>
        </div>
      </div>
    );
  }

  if (clusters.length === 0) {
    return (
      <div className="helm-applications-page">
        <div className="applications-placeholder">
          <h3>No Clusters Available</h3>
          <p>Create a cluster first to manage Helm applications.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="helm-applications-page">
      <Notification 
        notification={notification}
        onClose={() => setNotification(prev => ({...prev, show: false}))} 
      />
      
      {selectedCluster ? (
        <HelmApplications 
          cluster={selectedCluster}
          apiCall={apiCall}
          showNotification={showNotification}
        />
      ) : (
        <div className="cluster-selector">
          <h2>Select a Cluster</h2>
          <p>Choose a cluster to manage Helm applications:</p>
          <div className="cluster-grid">
            {clusters.map(cluster => (
              <div 
                key={cluster.id}
                className="cluster-card clickable"
                onClick={() => setSelectedCluster(cluster)}
              >
                <div className="cluster-header">
                  <h3>{cluster.name}</h3>
                  <span className={`status ${cluster.status?.toLowerCase()}`}>
                    {cluster.status || 'Unknown'}
                  </span>
                </div>
                <div className="cluster-details">
                  <div className="detail-row">
                    <span>Provider:</span>
                    <span>{cluster.provider}</span>
                  </div>
                  <div className="detail-row">
                    <span>Region:</span>
                    <span>{cluster.region}</span>
                  </div>
                  <div className="detail-row">
                    <span>Nodes:</span>
                    <span>{cluster.node_count || 0}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const CloudAccountManager = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    provider: 'aws',
    credentials: {
      aws_access_key_id: '',
      aws_secret_access_key: '',
      region: 'us-east-1'
    }
  });

  useEffect(() => {
    loadCloudAccounts();
  }, []);

  const loadCloudAccounts = async () => {
    setLoading(true);
    try {
      const result = await apiCall('/cloud-accounts');
      if (result && result.success) {
        setAccounts(result.data || []);
      }
    } catch (error) {
      console.error('Error loading cloud accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProviderChange = (provider) => {
    let defaultCredentials = {};
    switch (provider) {
      case 'aws':
        defaultCredentials = {
          aws_access_key_id: '',
          aws_secret_access_key: '',
          region: 'us-east-1'
        };
        break;
      case 'gcp':
        defaultCredentials = {
          project_id: '',
          service_account_key: '',
          region: 'us-central1'
        };
        break;
      case 'azure':
        defaultCredentials = {
          subscription_id: '',
          client_id: '',
          client_secret: '',
          tenant_id: '',
          region: 'East US'
        };
        break;
    }
    setFormData({ ...formData, provider, credentials: defaultCredentials });
  };

  const handleCredentialChange = (key, value) => {
    setFormData({
      ...formData,
      credentials: { ...formData.credentials, [key]: value }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await apiCall('/cloud-accounts', {
      method: 'POST',
      body: JSON.stringify(formData)
    });

    if (result && result.success) {
      showNotification(`✅ Cloud account "${formData.name}" added successfully!`);
      setShowAddForm(false);
      setFormData({
        name: '',
        provider: 'aws',
        credentials: {
          aws_access_key_id: '',
          aws_secret_access_key: '',
          region: 'us-east-1'
        }
      });
      loadCloudAccounts();
    } else {
      showNotification(`❌ Failed to add cloud account: ${result?.error || 'Unknown error'}`, 'error');
    }

    setLoading(false);
  };

  const deleteAccount = async (accountId) => {
    if (!confirm('Are you sure you want to delete this cloud account?')) return;

    const result = await apiCall(`/cloud-accounts/${accountId}`, {
      method: 'DELETE'
    });

    if (result && result.success) {
      showNotification('✅ Cloud account deleted successfully!');
      loadCloudAccounts();
    } else {
      showNotification(`❌ Failed to delete cloud account: ${result?.error || 'Unknown error'}`, 'error');
    }
  };

  const renderCredentialFields = () => {
    switch (formData.provider) {
      case 'aws':
        return (
          <>
            <div className="form-group">
              <label>AWS Access Key ID *</label>
              <input
                type="text"
                value={formData.credentials.aws_access_key_id}
                onChange={(e) => handleCredentialChange('aws_access_key_id', e.target.value)}
                placeholder="AKIA..."
                required
              />
            </div>
            <div className="form-group">
              <label>AWS Secret Access Key *</label>
              <input
                type="password"
                value={formData.credentials.aws_secret_access_key}
                onChange={(e) => handleCredentialChange('aws_secret_access_key', e.target.value)}
                placeholder="Enter secret access key"
                required
              />
            </div>
            <div className="form-group">
              <label>Default Region</label>
              <select
                value={formData.credentials.region}
                onChange={(e) => handleCredentialChange('region', e.target.value)}
              >
                <option value="us-east-1">US East (N. Virginia)</option>
                <option value="us-west-2">US West (Oregon)</option>
                <option value="eu-west-1">Europe (Ireland)</option>
                <option value="ap-south-1">Asia Pacific (Mumbai)</option>
                <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
              </select>
            </div>
          </>
        );
      case 'gcp':
        return (
          <>
            <div className="form-group">
              <label>Project ID *</label>
              <input
                type="text"
                value={formData.credentials.project_id}
                onChange={(e) => handleCredentialChange('project_id', e.target.value)}
                placeholder="my-gcp-project"
                required
              />
            </div>
            <div className="form-group">
              <label>Service Account Key (JSON) *</label>
              <textarea
                value={formData.credentials.service_account_key}
                onChange={(e) => handleCredentialChange('service_account_key', e.target.value)}
                placeholder="Paste your service account JSON key here"
                rows="4"
                required
              />
            </div>
            <div className="form-group">
              <label>Default Region</label>
              <select
                value={formData.credentials.region}
                onChange={(e) => handleCredentialChange('region', e.target.value)}
              >
                <option value="us-central1">US Central 1</option>
                <option value="us-east1">US East 1</option>
                <option value="europe-west1">Europe West 1</option>
                <option value="asia-south1">Asia South 1</option>
                <option value="asia-southeast1">Asia Southeast 1</option>
              </select>
            </div>
          </>
        );
      case 'azure':
        return (
          <>
            <div className="form-group">
              <label>Subscription ID *</label>
              <input
                type="text"
                value={formData.credentials.subscription_id}
                onChange={(e) => handleCredentialChange('subscription_id', e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                required
              />
            </div>
            <div className="form-group">
              <label>Client ID *</label>
              <input
                type="text"
                value={formData.credentials.client_id}
                onChange={(e) => handleCredentialChange('client_id', e.target.value)}
                placeholder="Application (client) ID"
                required
              />
            </div>
            <div className="form-group">
              <label>Client Secret *</label>
              <input
                type="password"
                value={formData.credentials.client_secret}
                onChange={(e) => handleCredentialChange('client_secret', e.target.value)}
                placeholder="Enter client secret"
                required
              />
            </div>
            <div className="form-group">
              <label>Tenant ID *</label>
              <input
                type="text"
                value={formData.credentials.tenant_id}
                onChange={(e) => handleCredentialChange('tenant_id', e.target.value)}
                placeholder="Directory (tenant) ID"
                required
              />
            </div>
            <div className="form-group">
              <label>Default Region</label>
              <select
                value={formData.credentials.region}
                onChange={(e) => handleCredentialChange('region', e.target.value)}
              >
                <option value="East US">East US</option>
                <option value="West US 2">West US 2</option>
                <option value="West Europe">West Europe</option>
                <option value="Southeast Asia">Southeast Asia</option>
                <option value="Central India">Central India</option>
              </select>
            </div>
          </>
        );
    }
  };

  if (loading && accounts.length === 0) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading cloud accounts...</p>
      </div>
    );
  }

  return (
    <div className="cloud-accounts-container">
      <div className="page-header">
        <h2>☁️ Cloud Account Management</h2>
        <p>Manage your cloud provider credentials for cluster provisioning</p>
        <button 
          className="btn-primary"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? '❌ Cancel' : '➕ Add Cloud Account'}
        </button>
      </div>

      {showAddForm && (
        <div className="add-account-form">
          <h3>Add New Cloud Account</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Account Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Production AWS Account"
                required
              />
            </div>

            <div className="form-group">
              <label>Cloud Provider *</label>
              <select
                value={formData.provider}
                onChange={(e) => handleProviderChange(e.target.value)}
              >
                <option value="aws">Amazon Web Services (AWS)</option>
                <option value="gcp">Google Cloud Platform (GCP)</option>
                <option value="azure">Microsoft Azure</option>
              </select>
            </div>

            {renderCredentialFields()}

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? '⏳ Adding...' : '✅ Add Account'}
              </button>
              <button 
                type="button" 
                className="btn-secondary"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="accounts-list">
        <h3>Configured Cloud Accounts ({accounts.length})</h3>
        
        {accounts.length === 0 ? (
          <div className="empty-state">
            <p>🔒 No cloud accounts configured yet.</p>
            <p>Add your first cloud account to start provisioning clusters.</p>
          </div>
        ) : (
          <div className="accounts-grid">
            {accounts.map((account) => (
              <div key={account.id} className="account-card">
                <div className="account-header">
                  <h4>{account.name}</h4>
                  <span className={`provider-badge ${account.provider}`}>
                    {account.provider.toUpperCase()}
                  </span>
                </div>
                
                <div className="account-details">
                  <p><strong>Region:</strong> {account.credentials?.region || 'Not specified'}</p>
                  <p><strong>Status:</strong> 
                    <span className={`status ${account.status || 'active'}`}>
                      {account.status === 'active' ? '✅ Active' : '⚠️ Inactive'}
                    </span>
                  </p>
                  <p><strong>Created:</strong> {new Date(account.created_at).toLocaleDateString()}</p>
                </div>

                <div className="account-actions">
                  <button 
                    className="btn-danger"
                    onClick={() => deleteAccount(account.id)}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Navigation Component
const Navigation = ({ user, organization, onLogout }) => {
  const location = window.location.pathname;
  
  const isActive = (path) => {
    if (path === '/') return location === '/';
    return location.startsWith(path);
  };

  return (
    <nav className="sidebar">
      <Link 
        to="/"
        className={isActive('/') ? 'active' : ''}
      >
        📊 Dashboard
      </Link>
      <Link 
        to="/clusters/create"
        className={isActive('/clusters/create') ? 'active' : ''}
      >
        ➕ Create Cluster
      </Link>
      <Link 
        to="/clusters"
        className={isActive('/clusters') && !isActive('/clusters/create') ? 'active' : ''}
      >
        ⚙️ Manage Clusters
      </Link>
      <Link 
        to="/explorer"
        className={isActive('/explorer') ? 'active' : ''}
      >
        🔍 Cluster Explorer
      </Link>
      <Link 
        to="/applications"
        className={isActive('/applications') ? 'active' : ''}
      >
        📦 Helm Applications
      </Link>
      <Link 
        to="/monitoring"
        className={isActive('/monitoring') ? 'active' : ''}
      >
        📈 Monitoring
      </Link>
      <Link 
        to="/accounts"
        className={isActive('/accounts') ? 'active' : ''}
      >
        ☁️ Cloud Accounts
      </Link>
      <Link 
        to="/agents"
        className={isActive('/agents') ? 'active' : ''}
      >
        🤖 AI Agents
      </Link>
    </nav>
  );
};

// Main App Component
const App = () => {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing authentication
    const token = localStorage.getItem('jwt_token');
    const userData = localStorage.getItem('user_data');
    const orgData = localStorage.getItem('organization_data');

    if (token && userData && orgData) {
      setUser(JSON.parse(userData));
      setOrganization(JSON.parse(orgData));
    }
    setLoading(false);
  }, []);

  const handleLogin = (loginData) => {
    setUser(loginData.user);
    setOrganization(loginData.organization);
  };

  const handleLogout = () => {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_data');
    localStorage.removeItem('organization_data');
    setUser(null);
    setOrganization(null);
    window.location.href = '/';
  };

  if (loading) {
    return <div className="loading">🔄 Loading...</div>;
  }

  if (!user) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <Router>
      <AgentProvider>
        <div className="app">
          <Header user={user} organization={organization} onLogout={handleLogout} />
          
          <div className="app-content">
            <Navigation user={user} organization={organization} onLogout={handleLogout} />

            <main className="main-content">
              <Routes>
              <Route path="/" element={<Dashboard organization={organization} />} />
              <Route path="/clusters" element={<ClusterManagement />} />
              <Route path="/clusters/create" element={<ClusterCreation />} />
              <Route path="/explorer" element={<ClusterExplorerPage />} />
              <Route path="/applications" element={<HelmApplicationsPage />} />
              <Route path="/clusters/:clusterId/*" element={
                <ClusterDetail 
                  apiCall={apiCall} 
                  showNotification={(message, type = 'info') => {
                    // This would be connected to your notification system
                    console.log(`[${type}] ${message}`);
                  }} 
                />
              } />
              <Route path="/monitoring" element={
                <div className="page-placeholder">
                  <h2>📈 Real-Time Monitoring</h2>
                  <p>Advanced monitoring dashboard coming soon...</p>
                </div>
              } />
                <Route path="/accounts" element={<CloudAccountManager />} />
                <Route path="/agents" element={<AgentsDashboard />} />
              </Routes>
            </main>
          </div>
        </div>
      </AgentProvider>
    </Router>
  );
};

export default App;

