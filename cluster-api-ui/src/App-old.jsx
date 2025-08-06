import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

const API_BASE = 'http://localhost:5000/api';

function App() {
  const [clusters, setClusters] = useState([]);
  const [providers, setProviders] = useState([]);

  const [currentPage, setCurrentPage] = useState('dashboard');
  const [operationInProgress, setOperationInProgress] = useState({});
  const [realTimeData, setRealTimeData] = useState({});

  // Real-time data fetching
  useEffect(() => {
    const fetchRealTimeData = async () => {
      try {
        // Fetch clusters with real-time status
        const clustersResponse = await fetch(`${API_BASE}/clusters`);
        if (clustersResponse.ok) {
          const clustersData = await clustersResponse.json();
          setClusters(clustersData.data || []);
        }

        // Fetch providers
        const providersResponse = await fetch(`${API_BASE}/providers`);
        if (providersResponse.ok) {
          const providersData = await providersResponse.json();
          setProviders(providersData.data || []);
        }


      } catch (error) {
        console.error('Error fetching real-time data:', error);
      }
    };

    // Initial fetch
    fetchRealTimeData();

    // Set up real-time polling every 10 seconds
    const interval = setInterval(fetchRealTimeData, 10000);

    return () => clearInterval(interval);
  }, []);

  // Fetch cluster operations status
  const fetchClusterOperations = useCallback(async (clusterId) => {
    try {
      const response = await fetch(`${API_BASE}/clusters/${clusterId}/operations`);
      if (response.ok) {
        const data = await response.json();
        setRealTimeData(prev => ({
          ...prev,
          [clusterId]: data.data.operations_status
        }));
      }
    } catch (error) {
      console.error('Error fetching cluster operations:', error);
    }
  }, []);

  // Cluster management operations
  const scaleCluster = async (clusterId, workerReplicas) => {
    setOperationInProgress(prev => ({ ...prev, [clusterId]: 'scaling' }));
    try {
      const response = await fetch(`${API_BASE}/clusters/${clusterId}/scale`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          worker_replicas: workerReplicas,
          auto_scaling: true,
          max_replicas: Math.max(workerReplicas + 3, 8)
        })
      });

      const result = await response.json();
      if (result.success) {
        alert(`Cluster scaling initiated successfully! ${result.data.message || ''}`);
        fetchClusterOperations(clusterId);
      } else {
        alert(`Scaling failed: ${result.error}`);
      }
    } catch (error) {
      alert(`Scaling error: ${error.message}`);
    } finally {
      setOperationInProgress(prev => ({ ...prev, [clusterId]: null }));
    }
  };

  const upgradeCluster = async (clusterId, kubernetesVersion) => {
    setOperationInProgress(prev => ({ ...prev, [clusterId]: 'upgrading' }));
    try {
      const response = await fetch(`${API_BASE}/clusters/${clusterId}/upgrade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kubernetes_version: kubernetesVersion,
          strategy: 'rolling'
        })
      });

      const result = await response.json();
      if (result.success) {
        alert(`Cluster upgrade initiated successfully! Estimated time: ${result.data.estimated_time}`);
        fetchClusterOperations(clusterId);
      } else {
        alert(`Upgrade failed: ${result.error}`);
      }
    } catch (error) {
      alert(`Upgrade error: ${error.message}`);
    } finally {
      setOperationInProgress(prev => ({ ...prev, [clusterId]: null }));
    }
  };

  const configureCluster = async (clusterId, configUpdates) => {
    setOperationInProgress(prev => ({ ...prev, [clusterId]: 'configuring' }));
    try {
      const response = await fetch(`${API_BASE}/clusters/${clusterId}/configure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configUpdates)
      });

      const result = await response.json();
      if (result.success) {
        alert(`Cluster configuration updated successfully!`);
        fetchClusterOperations(clusterId);
      } else {
        alert(`Configuration failed: ${result.error}`);
      }
    } catch (error) {
      alert(`Configuration error: ${error.message}`);
    } finally {
      setOperationInProgress(prev => ({ ...prev, [clusterId]: null }));
    }
  };

  const deleteCluster = async (clusterId) => {
    if (!confirm('<p>Are you sure you want to delete cluster &quot;{clusterToDelete.name}&quot;?</p> This action cannot be undone.')) {
      return;
    }

    setOperationInProgress(prev => ({ ...prev, [clusterId]: 'deleting' }));
    try {
      const response = await fetch(`${API_BASE}/clusters/${clusterId}/delete`, {
        method: 'DELETE'
      });

      const result = await response.json();
      if (result.success) {
        alert('Cluster deletion initiated successfully!');
        // Remove cluster from local state
        setClusters(prev => prev.filter(c => c.id !== clusterId));
      } else {
        alert(`Deletion failed: ${result.error}`);
      }
    } catch (error) {
      alert(`Deletion error: ${error.message}`);
    } finally {
      setOperationInProgress(prev => ({ ...prev, [clusterId]: null }));
    }
  };

  const addNodePool = async (clusterId, nodePoolConfig) => {
    setOperationInProgress(prev => ({ ...prev, [clusterId]: 'adding_node_pool' }));
    try {
      const response = await fetch(`${API_BASE}/clusters/${clusterId}/node-pools`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nodePoolConfig)
      });

      const result = await response.json();
      if (result.success) {
        alert(`Node pool "${nodePoolConfig.name}" creation initiated successfully!`);
        fetchClusterOperations(clusterId);
      } else {
        alert(`Node pool creation failed: ${result.error}`);
      }
    } catch (error) {
      alert(`Node pool creation error: ${error.message}`);
    } finally {
      setOperationInProgress(prev => ({ ...prev, [clusterId]: null }));
    }
  };

  const restartClusterComponents = async (clusterId, components) => {
    setOperationInProgress(prev => ({ ...prev, [clusterId]: 'restarting' }));
    try {
      const response = await fetch(`${API_BASE}/clusters/${clusterId}/restart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ components })
      });

      const result = await response.json();
      if (result.success) {
        alert(`Components restarted successfully: ${components.join(', ')}`);
        fetchClusterOperations(clusterId);
      } else {
        alert(`Restart failed: ${result.error}`);
      }
    } catch (error) {
      alert(`Restart error: ${error.message}`);
    } finally {
      setOperationInProgress(prev => ({ ...prev, [clusterId]: null }));
    }
  };

  // Real-time cluster status component
  const ClusterStatusIndicator = ({ cluster }) => {
    const operations = realTimeData[cluster.id];
    const currentOperation = operationInProgress[cluster.id];
    
    if (currentOperation) {
      return (
        <div className="status-indicator status-in-progress">
          <div className="spinner"></div>
          <span>{currentOperation.replace('_', ' ')}</span>
        </div>
      );
    }

    if (operations?.ongoing_operations?.length > 0) {
      const op = operations.ongoing_operations[0];
      return (
        <div className="status-indicator status-in-progress">
          <div className="spinner"></div>
          <span>{op.operation} ({op.progress})</span>
        </div>
      );
    }

    return (
      <div className={`status-indicator status-${cluster.status || 'running'}`}>
        <div className="status-dot"></div>
        <span>{cluster.status || 'running'}</span>
      </div>
    );
  };

  // Enhanced cluster management component
  const ClusterManagement = () => {
    const [scaleDialogOpen, setScaleDialogOpen] = useState(false);
    const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
    const [configDialogOpen, setConfigDialogOpen] = useState(false);
    const [nodePoolDialogOpen, setNodePoolDialogOpen] = useState(false);
    const [selectedClusterForAction, setSelectedClusterForAction] = useState(null);

    const openScaleDialog = (cluster) => {
      setSelectedClusterForAction(cluster);
      setScaleDialogOpen(true);
    };

    const openUpgradeDialog = (cluster) => {
      setSelectedClusterForAction(cluster);
      setUpgradeDialogOpen(true);
    };

    const openConfigDialog = (cluster) => {
      setSelectedClusterForAction(cluster);
      setConfigDialogOpen(true);
    };

    const openNodePoolDialog = (cluster) => {
      setSelectedClusterForAction(cluster);
      setNodePoolDialogOpen(true);
    };

    return (
      <div className="cluster-management">
        <div className="page-header">
          <h1>Cluster Management</h1>
          <p>Manage your Kubernetes clusters across multiple cloud providers</p>
        </div>

        <div className="clusters-grid">
          {clusters.map(cluster => (
            <div key={cluster.id} className="cluster-card">
              <div className="cluster-header">
                <h3>{cluster.name}</h3>
                <ClusterStatusIndicator cluster={cluster} />
              </div>

              <div className="cluster-info">
                <div className="info-row">
                  <span className="label">Provider:</span>
                  <span className="value">{cluster.provider}</span>
                </div>
                <div className="info-row">
                  <span className="label">Region:</span>
                  <span className="value">{cluster.region}</span>
                </div>
                <div className="info-row">
                  <span className="label">K8s Version:</span>
                  <span className="value">{cluster.kubernetes_version}</span>
                </div>
                <div className="info-row">
                  <span className="label">Nodes:</span>
                  <span className="value">{cluster.node_count || 3}</span>
                </div>
                <div className="info-row">
                  <span className="label">Created:</span>
                  <span className="value">{new Date(cluster.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Real-time operations status */}
              {realTimeData[cluster.id]?.ongoing_operations?.length > 0 && (
                <div className="operations-status">
                  <h4>Ongoing Operations</h4>
                  {realTimeData[cluster.id].ongoing_operations.map((op, idx) => (
                    <div key={idx} className="operation-item">
                      <span className="operation-name">{op.operation}</span>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill" 
                          style={{ width: op.progress }}
                        ></div>
                      </div>
                      <span className="operation-eta">{op.estimated_completion}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="cluster-actions">
                <button 
                  className="action-btn primary"
                  onClick={() => openScaleDialog(cluster)}
                  disabled={operationInProgress[cluster.id]}
                >
                  Scale
                </button>
                <button 
                  className="action-btn secondary"
                  onClick={() => openUpgradeDialog(cluster)}
                  disabled={operationInProgress[cluster.id]}
                >
                  Upgrade
                </button>
                <button 
                  className="action-btn secondary"
                  onClick={() => openConfigDialog(cluster)}
                  disabled={operationInProgress[cluster.id]}
                >
                  Configure
                </button>
                <button 
                  className="action-btn secondary"
                  onClick={() => openNodePoolDialog(cluster)}
                  disabled={operationInProgress[cluster.id]}
                >
                  Add Pool
                </button>
                <button 
                  className="action-btn secondary"
                  onClick={() => restartClusterComponents(cluster.id, ['workers'])}
                  disabled={operationInProgress[cluster.id]}
                >
                  Restart
                </button>
                <button 
                  className="action-btn danger"
                  onClick={() => deleteCluster(cluster.id)}
                  disabled={operationInProgress[cluster.id]}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Scale Dialog */}
        {scaleDialogOpen && (
          <div className="modal-overlay" onClick={() => setScaleDialogOpen(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h3>Scale Cluster: {selectedClusterForAction?.name}</h3>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const workerReplicas = parseInt(formData.get('workerReplicas'));
                scaleCluster(selectedClusterForAction.id, workerReplicas);
                setScaleDialogOpen(false);
              }}>
                <div className="form-group">
                  <label>Worker Nodes:</label>
                  <input 
                    type="number" 
                    name="workerReplicas" 
                    min="1" 
                    max="20" 
                    defaultValue={selectedClusterForAction?.node_count || 3}
                    required 
                  />
                </div>
                <div className="form-actions">
                  <button type="button" onClick={() => setScaleDialogOpen(false)}>Cancel</button>
                  <button type="submit" className="primary">Scale Cluster</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Upgrade Dialog */}
        {upgradeDialogOpen && (
          <div className="modal-overlay" onClick={() => setUpgradeDialogOpen(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h3>Upgrade Cluster: {selectedClusterForAction?.name}</h3>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const kubernetesVersion = formData.get('kubernetesVersion');
                upgradeCluster(selectedClusterForAction.id, kubernetesVersion);
                setUpgradeDialogOpen(false);
              }}>
                <div className="form-group">
                  <label>Kubernetes Version:</label>
                  <select name="kubernetesVersion" required>
                    <option value="1.29.0">v1.29.0 (Latest)</option>
                    <option value="1.28.5">v1.28.5 (Stable)</option>
                    <option value="1.27.10">v1.27.10 (LTS)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>
                    <input type="checkbox" defaultChecked />
                    Enable rollback on failure
                  </label>
                </div>
                <div className="form-actions">
                  <button type="button" onClick={() => setUpgradeDialogOpen(false)}>Cancel</button>
                  <button type="submit" className="primary">Upgrade Cluster</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Configuration Dialog */}
        {configDialogOpen && (
          <div className="modal-overlay" onClick={() => setConfigDialogOpen(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h3>Configure Cluster: {selectedClusterForAction?.name}</h3>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const configUpdates = {};
                
                if (formData.get('cni')) {
                  configUpdates.networking = { cni: formData.get('cni') };
                }
                if (formData.get('podSecurity')) {
                  configUpdates.security = { pod_security_standards: formData.get('podSecurity') };
                }
                if (formData.get('monitoring')) {
                  configUpdates.monitoring = { prometheus: true, grafana: true };
                }
                
                configureCluster(selectedClusterForAction.id, configUpdates);
                setConfigDialogOpen(false);
              }}>
                <div className="form-group">
                  <label>CNI Plugin:</label>
                  <select name="cni">
                    <option value="">No change</option>
                    <option value="calico">Calico</option>
                    <option value="flannel">Flannel</option>
                    <option value="cilium">Cilium</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Pod Security Standards:</label>
                  <select name="podSecurity">
                    <option value="">No change</option>
                    <option value="privileged">Privileged</option>
                    <option value="baseline">Baseline</option>
                    <option value="restricted">Restricted</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>
                    <input type="checkbox" name="monitoring" />
                    Enable monitoring stack (Prometheus + Grafana)
                  </label>
                </div>
                <div className="form-actions">
                  <button type="button" onClick={() => setConfigDialogOpen(false)}>Cancel</button>
                  <button type="submit" className="primary">Update Configuration</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Node Pool Dialog */}
        {nodePoolDialogOpen && (
          <div className="modal-overlay" onClick={() => setNodePoolDialogOpen(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h3>Add Node Pool: {selectedClusterForAction?.name}</h3>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const nodePoolConfig = {
                  name: formData.get('poolName'),
                  instance_type: formData.get('instanceType'),
                  min_nodes: parseInt(formData.get('minNodes')),
                  max_nodes: parseInt(formData.get('maxNodes')),
                  auto_scaling: formData.get('autoScaling') === 'on'
                };
                addNodePool(selectedClusterForAction.id, nodePoolConfig);
                setNodePoolDialogOpen(false);
              }}>
                <div className="form-group">
                  <label>Pool Name:</label>
                  <input type="text" name="poolName" placeholder="e.g., gpu-pool" required />
                </div>
                <div className="form-group">
                  <label>Instance Type:</label>
                  <select name="instanceType" required>
                    <option value="sify.medium">sify.medium (2 vCPU, 4GB RAM)</option>
                    <option value="sify.large">sify.large (4 vCPU, 8GB RAM)</option>
                    <option value="sify.gpu.t4">sify.gpu.t4 (GPU: NVIDIA T4)</option>
                    <option value="sify.gpu.v100">sify.gpu.v100 (GPU: NVIDIA V100)</option>
                    <option value="sify.gpu.a100">sify.gpu.a100 (GPU: NVIDIA A100)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Min Nodes:</label>
                  <input type="number" name="minNodes" min="0" max="10" defaultValue="1" required />
                </div>
                <div className="form-group">
                  <label>Max Nodes:</label>
                  <input type="number" name="maxNodes" min="1" max="20" defaultValue="5" required />
                </div>
                <div className="form-group">
                  <label>
                    <input type="checkbox" name="autoScaling" defaultChecked />
                    Enable auto-scaling
                  </label>
                </div>
                <div className="form-actions">
                  <button type="button" onClick={() => setNodePoolDialogOpen(false)}>Cancel</button>
                  <button type="submit" className="primary">Add Node Pool</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Real-time monitoring dashboard
  const MonitoringDashboard = () => {
    const [selectedTimeRange, setSelectedTimeRange] = useState('1h');
    
    return (
      <div className="monitoring-dashboard">
        <div className="page-header">
          <h1>Real-Time Monitoring</h1>
          <div className="time-range-selector">
            <select value={selectedTimeRange} onChange={(e) => setSelectedTimeRange(e.target.value)}>
              <option value="1h">Last Hour</option>
              <option value="6h">Last 6 Hours</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
            </select>
          </div>
        </div>

        <div className="monitoring-grid">
          {/* Overview Cards */}
          <div className="overview-cards">
            <div className="metric-card">
              <h3>Total Clusters</h3>
              <div className="metric-value">{clusters.length}</div>
              <div className="metric-change positive">+2 this week</div>
            </div>
            <div className="metric-card">
              <h3>Running Clusters</h3>
              <div className="metric-value">{clusters.filter(c => c.status === 'running').length}</div>
              <div className="metric-change positive">100% uptime</div>
            </div>
            <div className="metric-card">
              <h3>Total Nodes</h3>
              <div className="metric-value">{clusters.reduce((sum, c) => sum + (c.node_count || 3), 0)}</div>
              <div className="metric-change neutral">No change</div>
            </div>
            <div className="metric-card">
              <h3>Active Operations</h3>
              <div className="metric-value">
                {Object.values(realTimeData).reduce((sum, data) => 
                  sum + (data?.ongoing_operations?.length || 0), 0)}
              </div>
              <div className="metric-change neutral">Real-time</div>
            </div>
          </div>

          {/* Cluster Status Grid */}
          <div className="cluster-status-grid">
            <h3>Cluster Status Overview</h3>
            <div className="status-grid">
              {clusters.map(cluster => (
                <div key={cluster.id} className="cluster-status-card">
                  <div className="cluster-status-header">
                    <h4>{cluster.name}</h4>
                    <ClusterStatusIndicator cluster={cluster} />
                  </div>
                  
                  <div className="cluster-metrics">
                    <div className="metric">
                      <span className="metric-label">CPU Usage</span>
                      <div className="metric-bar">
                        <div className="metric-fill" style={{ width: '65%' }}></div>
                      </div>
                      <span className="metric-value">65%</span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">Memory Usage</span>
                      <div className="metric-bar">
                        <div className="metric-fill" style={{ width: '42%' }}></div>
                      </div>
                      <span className="metric-value">42%</span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">Storage Usage</span>
                      <div className="metric-bar">
                        <div className="metric-fill" style={{ width: '28%' }}></div>
                      </div>
                      <span className="metric-value">28%</span>
                    </div>
                  </div>

                  {/* Recent Operations */}
                  {realTimeData[cluster.id]?.recent_operations?.length > 0 && (
                    <div className="recent-operations">
                      <h5>Recent Operations</h5>
                      {realTimeData[cluster.id].recent_operations.slice(0, 2).map((op, idx) => (
                        <div key={idx} className="operation-history">
                          <span className="operation-name">{op.operation}</span>
                          <span className={`operation-status status-${op.status}`}>{op.status}</span>
                          <span className="operation-time">
                            {new Date(op.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="cluster-quick-actions">
                    <button 
                      className="quick-action-btn"
                      onClick={() => fetchClusterOperations(cluster.id)}
                    >
                      Refresh
                    </button>
                    <button 
                      className="quick-action-btn"
                      onClick={() => {

                        setCurrentPage('cluster-details');
                      }}
                    >
                      Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Alerts Section */}
          <div className="alerts-section">
            <h3>Active Alerts</h3>
            <div className="alerts-list">
              <div className="alert-item warning">
                <div className="alert-icon">⚠️</div>
                <div className="alert-content">
                  <h4>High CPU Usage</h4>
                  <p>Cluster &quot;production-web&quot; CPU usage above 80%</p>
                  <span className="alert-time">5 minutes ago</span>
                </div>
                <button className="alert-action">Acknowledge</button>
              </div>
              <div className="alert-item info">
                <div className="alert-icon">ℹ️</div>
                <div className="alert-content">
                  <h4>Upgrade Available</h4>
                  <p>Kubernetes v1.29.0 available for 3 clusters</p>
                  <span className="alert-time">1 hour ago</span>
                </div>
                <button className="alert-action">View</button>
              </div>
              <div className="alert-item success">
                <div className="alert-icon">✅</div>
                <div className="alert-content">
                  <h4>Backup Completed</h4>
                  <p>Scheduled backup completed successfully</p>
                  <span className="alert-time">2 hours ago</span>
                </div>
                <button className="alert-action">Dismiss</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Enhanced dashboard with real-time data
  const Dashboard = () => {
    return (
      <div className="dashboard">
        <div className="page-header">
          <h1>Cluster-API Management Console</h1>
          <p>Real-time Kubernetes cluster management across multiple cloud providers</p>
        </div>

        <div className="dashboard-grid">
          {/* Real-time Statistics */}
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Total Clusters</h3>
              <div className="stat-value">{clusters.length}</div>
              <div className="stat-trend positive">↗ +12% this month</div>
            </div>
            <div className="stat-card">
              <h3>Active Nodes</h3>
              <div className="stat-value">{clusters.reduce((sum, c) => sum + (c.node_count || 3), 0)}</div>
              <div className="stat-trend positive">↗ +8% this month</div>
            </div>
            <div className="stat-card">
              <h3>Cloud Providers</h3>
              <div className="stat-value">{providers.length}</div>
              <div className="stat-trend neutral">→ No change</div>
            </div>
            <div className="stat-card">
              <h3>Monthly Cost</h3>
              <div className="stat-value">$2,847</div>
              <div className="stat-trend negative">↘ -15% this month</div>
            </div>
          </div>

          {/* Provider Distribution */}
          <div className="provider-distribution">
            <h3>Provider Distribution</h3>
            <div className="provider-chart">
              {providers.map(provider => {
                const clusterCount = clusters.filter(c => c.provider === provider.id).length;
                const percentage = clusters.length > 0 ? (clusterCount / clusters.length) * 100 : 0;
                return (
                  <div key={provider.id} className="provider-item">
                    <div className="provider-info">
                      <span className="provider-name">{provider.name}</span>
                      <span className="provider-count">{clusterCount} clusters</span>
                    </div>
                    <div className="provider-bar">
                      <div 
                        className="provider-fill" 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="provider-percentage">{percentage.toFixed(1)}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="recent-activity">
            <h3>Recent Activity</h3>
            <div className="activity-list">
              {Object.entries(realTimeData).flatMap(([clusterId, data]) => 
                data.recent_operations?.slice(0, 3).map((op, idx) => {
                  const cluster = clusters.find(c => c.id === clusterId);
                  return (
                    <div key={`${clusterId}-${idx}`} className="activity-item">
                      <div className="activity-icon">
                        {op.operation === 'upgrade' ? '⬆️' : 
                         op.operation === 'scale' ? '📊' : 
                         op.operation === 'configure' ? '⚙️' : '🔄'}
                      </div>
                      <div className="activity-content">
                        <span className="activity-action">
                          {op.operation} operation on {cluster?.name || clusterId}
                        </span>
                        <span className="activity-status">{op.status}</span>
                        <span className="activity-time">
                          {new Date(op.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                }) || []
              ).slice(0, 5)}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="quick-actions">
            <h3>Quick Actions</h3>
            <div className="action-buttons">
              <button 
                className="action-button primary"
                onClick={() => setCurrentPage('cluster-creation')}
              >
                <span className="action-icon">➕</span>
                Create New Cluster
              </button>
              <button 
                className="action-button secondary"
                onClick={() => setCurrentPage('cluster-management')}
              >
                <span className="action-icon">⚙️</span>
                Manage Clusters
              </button>
              <button 
                className="action-button secondary"
                onClick={() => setCurrentPage('monitoring')}
              >
                <span className="action-icon">📊</span>
                View Monitoring
              </button>
              <button 
                className="action-button secondary"
                onClick={() => setCurrentPage('cloud-accounts')}
              >
                <span className="action-icon">☁️</span>
                Cloud Accounts
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Navigation sidebar
  const Sidebar = () => {
    const menuItems = [
      { id: 'dashboard', label: 'Dashboard', icon: '📊' },
      { id: 'cluster-creation', label: 'Create Cluster', icon: '➕' },
      { id: 'cluster-management', label: 'Manage Clusters', icon: '⚙️' },
      { id: 'monitoring', label: 'Monitoring', icon: '📈' },
      { id: 'cloud-accounts', label: 'Cloud Accounts', icon: '☁️' }
    ];

    return (
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>Cluster-API Console</h2>
          <div className="sify-branding">Powered by Sify</div>
        </div>
        <nav className="sidebar-nav">
          {menuItems.map(item => (
            <button
              key={item.id}
              className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
              onClick={() => setCurrentPage(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    );
  };

  // Main render function
  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'cluster-management':
        return <ClusterManagement />;
      case 'monitoring':
        return <MonitoringDashboard />;
      case 'cluster-creation':
        return <div className="page-placeholder">
          <h2>Cluster Creation</h2>
          <p>Enhanced cluster creation wizard coming soon...</p>
        </div>;
      case 'cloud-accounts':
        return <div className="page-placeholder">
          <h2>Cloud Account Management</h2>
          <p>Cloud account management interface coming soon...</p>
        </div>;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app">
      <Sidebar />
      <main className="main-content">
        {renderCurrentPage()}
      </main>
    </div>
  );
}

export default App;

