import React, { useState, useEffect } from 'react';
import './App.css';
import ClusterCreation from './ClusterCreation.jsx';

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
    return 'Maintenance Mode Configuration';
  };

  const getMaintenanceDescription = () => {
    return maintenanceConfig.enabled 
      ? 'This will cordon all nodes and prevent new deployments. Existing workloads will continue running.'
      : 'This will uncordon all nodes and allow new deployments.';
  };

  return (
    <div className="modal-overlay">
      <div className="large-modal maintenance-mode-dialog">
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
              <div className="config-section">
                <label>
                  <input
                    type="checkbox"
                    checked={maintenanceConfig.enabled}
                    onChange={(e) => handleConfigChange('enabled', e.target.checked)}
                  />
                  <span>Enable Maintenance Mode</span>
                </label>
              </div>

              {maintenanceConfig.enabled && (
                <>
                  <div className="config-section">
                    <label>Reason for Maintenance:</label>
                    <textarea
                      value={maintenanceConfig.reason}
                      onChange={(e) => handleConfigChange('reason', e.target.value)}
                      placeholder="e.g., Scheduled maintenance, Security updates, Infrastructure changes..."
                      rows={3}
                      required={maintenanceConfig.enabled}
                    />
                  </div>

                  <div className="config-section">
                    <label>Duration (minutes):</label>
                    <select
                      value={maintenanceConfig.duration_minutes}
                      onChange={(e) => handleConfigChange('duration_minutes', parseInt(e.target.value))}
                    >
                      <option value={30}>30 minutes</option>
                      <option value={60}>1 hour</option>
                      <option value={120}>2 hours</option>
                      <option value={240}>4 hours</option>
                      <option value={480}>8 hours</option>
                      <option value={1440}>24 hours</option>
                    </select>
                  </div>

                  <div className="maintenance-warning">
                    <div className="warning-icon">⚠️</div>
                    <div className="warning-content">
                      <h4>Maintenance Mode Effects:</h4>
                      <ul>
                        <li>All nodes will be cordoned (no new pods scheduled)</li>
                        <li>New deployments will be blocked</li>
                        <li>Existing workloads continue running</li>
                        <li>Manual intervention may be required</li>
                      </ul>
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
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [showScaleDialog, setShowScaleDialog] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });
  
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
    setNodesLoading(true);
    try {
      const result = await apiCall(`/clusters/${clusterId}/nodes`);
      if (result && result.success) {
        setClusterNodes(result.data.nodes || []);
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
    if (!confirm(`Are you sure you want to delete cluster "${cluster.name}"?`)) return;

    const result = await apiCall(`/mt/clusters/${cluster.id}`, {
      method: 'DELETE'
    });

    if (result && result.success) {
      // Close dialogs if the deleted cluster was selected
      if (selectedCluster && selectedCluster.id === cluster.id) {
        setShowScaleDialog(false);
        setShowNodeManagementDialog(false);
        setShowDrainNodeDialog(false);
        setSelectedCluster(null);
      }
      
      await loadClusters(); // Refresh the list
      showNotification(`Cluster deletion initiated: ${cluster.name}`);
    } else {
      showNotification(`Deletion failed: ${result?.error || 'Unknown error'}`, 'error');
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
    if (!selectedNode || !selectedCluster) return;

    setDrainOperationInProgress(true);
    try {
      const result = await apiCall(`/clusters/${selectedCluster.id}/nodes/drain`, {
        method: 'POST',
        body: JSON.stringify({
          node_name: selectedNode.name,
          ...drainConfig
        })
      });

      if (result && result.success) {
        showNotification(`Node drain initiated successfully for ${selectedNode.name}`);
        setShowDrainNodeDialog(false);
        
        // OPTIMISTIC UPDATE: Immediately update the node status in the UI
        setClusterNodes(prevNodes => 
          prevNodes.map(node => 
            node.name === selectedNode.name 
              ? { ...node, schedulable: false }
              : node
          )
        );
        
        // Refresh node list from backend (but don't wait for it)
        loadClusterNodes(selectedCluster.id).then(() => {
          console.log('Node data refresh completed');
        }).catch(error => {
          console.error('Node data refresh failed:', error);
        });
        
        // Also refresh cluster data to update node count if needed
        loadClusters().then(() => {
          console.log('Cluster data refresh completed');
        }).catch(error => {
          console.error('Cluster data refresh failed:', error);
        });
        
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

  const handleUncordonNode = async (node) => {
    if (!selectedCluster) return;

    if (!confirm(`Are you sure you want to uncordon node "${node.name}"? This will make it schedulable again.`)) return;

    try {
      const result = await apiCall(`/clusters/${selectedCluster.id}/nodes/uncordon`, {
        method: 'POST',
        body: JSON.stringify({ node_name: node.name })
      });

      if (result && result.success) {
        showNotification(`Node ${node.name} uncordoned successfully`);
        
        // OPTIMISTIC UPDATE: Immediately update the node status in the UI
        setClusterNodes(prevNodes => 
          prevNodes.map(n => 
            n.name === node.name 
              ? { ...n, schedulable: true }
              : n
          )
        );
        
        // Refresh node list from backend (but don't wait for it)
        loadClusterNodes(selectedCluster.id).then(() => {
          console.log('Node data refresh completed');
        }).catch(error => {
          console.error('Node data refresh failed:', error);
        });
        
        // Also refresh cluster data
        loadClusters().then(() => {
          console.log('Cluster data refresh completed');
        }).catch(error => {
          console.error('Cluster data refresh failed:', error);
        });
        
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

    setMaintenanceOperationInProgress(true);
    try {
             const result = await apiCall(`/clusters/${selectedCluster.id}/maintenance-mode`, {
        method: 'POST',
        body: JSON.stringify(config)
      });

      if (result && result.success) {
        showNotification(`Maintenance mode toggled for ${selectedCluster.name}`);
        setShowMaintenanceDialog(false);
        
        // OPTIMISTIC UPDATE: Immediately update the cluster status in the UI
        setClusters(prevClusters => 
          prevClusters.map(cluster => 
            cluster.id === selectedCluster.id 
              ? { ...cluster, maintenance_mode: config.enabled, maintenance_reason: config.reason, maintenance_duration: config.duration_minutes }
              : cluster
          )
        );
        
        // Refresh cluster data
        loadClusters().then(() => {
          console.log('Cluster data refresh completed');
        }).catch(error => {
          console.error('Cluster data refresh failed:', error);
        });
        
      } else {
        showNotification(`Maintenance mode toggle failed: ${result?.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Error toggling maintenance mode:', error);
      showNotification(`Maintenance mode toggle failed: ${error.message}`, 'error');
    } finally {
      setMaintenanceOperationInProgress(false);
    }
  };

  if (loading) {
    return <div className="loading">🔄 Loading clusters...</div>;
  }

  return (
    <div className="cluster-management">
      <Notification 
        notification={notification} 
        onClose={() => setNotification({ show: false, message: '', type: 'info' })} 
      />
      <div className="page-header">
        <div className="header-content">
          <div>
            <h2>⚙️ Cluster Management</h2>
            <p>Manage your Kubernetes clusters across multiple cloud providers</p>
          </div>
          <button 
            onClick={loadClusters} 
            className="refresh-clusters-button"
            disabled={loading}
          >
            {loading ? '🔄' : '🔄'} Refresh Clusters
          </button>
        </div>
      </div>

      {clusters.length === 0 ? (
        <div className="empty-state">
          <h3>No clusters found</h3>
          <p>Create your first cluster to get started</p>
        </div>
      ) : (
        <div className="clusters-grid">
          {clusters.map(cluster => (
            <div key={cluster.id} className={`cluster-card ${cluster.maintenance_mode ? 'maintenance-mode' : ''}`}>
              <div className="cluster-header">
                <h3>{cluster.name}</h3>
                <span className={`status ${cluster.status}`}>{cluster.status}</span>
              </div>

              <div className="cluster-details">
                <div className="detail-row">
                  <span>Provider:</span>
                  <span>{cluster.provider.toUpperCase()}</span>
                </div>
                <div className="detail-row">
                  <span>Region:</span>
                  <span>{cluster.region}</span>
                </div>
                <div className="detail-row">
                  <span>Version:</span>
                  <span>{cluster.version}</span>
                </div>
                <div className="detail-row">
                  <span>Nodes:</span>
                  <span className="node-count-display">
                    {cluster.node_count} 
                    <span className="node-count-label">nodes</span>
                  </span>
                </div>
                <div className="detail-row">
                  <span>Cost:</span>
                  <span>${cluster.monthly_cost}/month</span>
                </div>
                {cluster.gpu_count > 0 && (
                  <div className="detail-row">
                    <span>GPUs:</span>
                    <span>{cluster.gpu_count}x {cluster.gpu_type}</span>
                  </div>
                )}
              </div>

              <div className="cluster-actions">
                <button 
                  onClick={() => handleOpenNodeManagement(cluster)}
                  className="action-button manage"
                >
                  🔧 Manage Nodes
                </button>
                <button 
                  onClick={() => handleOpenScaleDialog(cluster)}
                  className="action-button scale"
                >
                  📈 Scale
                </button>
                <button 
                  onClick={() => {
                    setSelectedCluster(cluster);
                    setShowMaintenanceDialog(true);
                  }}
                  className={`action-button maintenance ${cluster.maintenance_mode ? 'maintenance-active' : ''}`}
                  title={cluster.maintenance_mode ? 'Disable Maintenance Mode' : 'Enable Maintenance Mode'}
                >
                  {cluster.maintenance_mode ? '🔧 Maintenance' : '✅ Active'}
                </button>
                <button 
                  onClick={() => handleDeleteCluster(cluster)}
                  className="action-button delete"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Enhanced Scale Dialog */}
      {showScaleDialog && (
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

      {/* Node Management Dialog */}
      {showNodeManagementDialog && (
        <NodeManagementDialog
          cluster={selectedCluster}
          nodes={clusterNodes}
          loading={nodesLoading}
          onClose={() => setShowNodeManagementDialog(false)}
          onDrainNode={(node) => {
            setSelectedNode(node);
            setShowDrainNodeDialog(true);
          }}
          onUncordonNode={handleUncordonNode}
          onRefresh={handleRefreshNodes}
        />
      )}

      {/* Drain Node Dialog */}
      {showDrainNodeDialog && (
        <DrainNodeDialog
          node={selectedNode}
          cluster={selectedCluster}
          onClose={() => setShowDrainNodeDialog(false)}
          onDrain={handleDrainNode}
          loading={drainOperationInProgress}
        />
      )}

      {/* Maintenance Mode Dialog */}
      {showMaintenanceDialog && (
        <MaintenanceModeDialog
          cluster={selectedCluster}
          onClose={() => setShowMaintenanceDialog(false)}
          onToggle={handleToggleMaintenanceMode}
          loading={maintenanceOperationInProgress}
        />
      )}
    </div>
  );
};

// Cloud Account Manager Component
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

// Main App Component
const App = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');
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
    setCurrentPage('dashboard');
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard organization={organization} />;
      case 'create':
        return <ClusterCreation />;
      case 'manage':
        return <ClusterManagement />;
      case 'monitoring':
        return (
          <div className="page-placeholder">
            <h2>📈 Real-Time Monitoring</h2>
            <p>Advanced monitoring dashboard coming soon...</p>
          </div>
        );
      case 'accounts':
        return <CloudAccountManager />;
      default:
        return <Dashboard organization={organization} />;
    }
  };

  if (loading) {
    return <div className="loading">🔄 Loading...</div>;
  }

  if (!user) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <div className="app">
      <Header user={user} organization={organization} onLogout={handleLogout} />
      
      <div className="app-content">
        <nav className="sidebar">
          <button 
            className={currentPage === 'dashboard' ? 'active' : ''}
            onClick={() => setCurrentPage('dashboard')}
          >
            📊 Dashboard
          </button>
          <button 
            className={currentPage === 'create' ? 'active' : ''}
            onClick={() => setCurrentPage('create')}
          >
            ➕ Create Cluster
          </button>
          <button 
            className={currentPage === 'manage' ? 'active' : ''}
            onClick={() => setCurrentPage('manage')}
          >
            ⚙️ Manage Clusters
          </button>
          <button 
            className={currentPage === 'monitoring' ? 'active' : ''}
            onClick={() => setCurrentPage('monitoring')}
          >
            📈 Monitoring
          </button>
          <button 
            className={currentPage === 'accounts' ? 'active' : ''}
            onClick={() => setCurrentPage('accounts')}
          >
            ☁️ Cloud Accounts
          </button>
        </nav>

        <main className="main-content">
          {renderCurrentPage()}
        </main>
      </div>
    </div>
  );
};

export default App;

