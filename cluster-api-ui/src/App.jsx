import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import { ClusterExplorer } from './features/cluster-explorer';
import { HelmCharts } from './features/helm';
import apiCall from './lib/api';
import './MaintenanceMode.css';
import ClusterCreation from './ClusterCreation.jsx';
import UpgradeKubernetesDialog from './components/UpgradeKubernetesDialog';
import ClusterDetail from './pages/ClusterDetail';
import { AgentProvider } from './features/agents';
import AgentsDashboard from './features/agents/AgentsDashboard';
import ErrorBoundary from './components/ErrorBoundary';
import CloudAccountManager from './pages/CloudAccounts/CloudAccountManager';
import HelmApplicationsPage from './pages/HelmApplications/HelmApplicationsPage';
import LoginForm from './components/auth/LoginForm';
import Header from './components/layout/Header';
import Notification from './components/common/Notification';
import Dashboard from './components/dashboard/Dashboard';
import NodeManagementDialog from './components/clusters/NodeManagementDialog';
import ScaleClusterDialog from './components/clusters/ScaleClusterDialog';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

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
  const [currentNodeCount] = useState(0);
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

  // Inline action states
  const [inlineScalingState, setInlineScalingState] = useState({});
  const [inlineScaleMode, setInlineScaleMode] = useState({});
  const [inlineScaleValues, setInlineScaleValues] = useState({});
  const [showNodeDetails, setShowNodeDetails] = useState({});

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

  const handleRefreshNodes = async () => {
    if (selectedCluster) {
      await loadClusterNodes(selectedCluster.id);
    }
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
      let reason = '';
      let duration = '60';
    const newMaintenanceMode = !cluster.maintenance_mode;
    
    if (newMaintenanceMode) {
          reason = prompt('Enter maintenance reason (optional):');
      if (reason === null) return; // User cancelled
      
          duration = prompt('Enter maintenance duration in minutes (default: 60):', '60');
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
    let filtered = clusters.filter(c => c).filter(cluster => {
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

// Navigation Component
const Navigation = ({ user, organization, onLogout }) => {
  const location = window.location.pathname;
  
  const isActive = (path) => {
    if (path === '/') return location === '/';
    return location.startsWith(path);
  };

  return (
    <nav className="navigation flex flex-col space-y-2">
      <div className="nav-header">
        <div className="org-info">
          <span className="org-icon">🏢</span>
          <span>{organization.name}</span>
        </div>
        <div className="user-info">
          <span className="user-icon">👤</span>
          <span>{user.name}</span>
          <button onClick={onLogout} className="logout-btn">Logout</button>
        </div>
      </div>
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
      <ErrorBoundary componentName="AgentProvider">
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
              <Route path="/explorer" element={<ClusterExplorer />} />
              <Route path="/helm" element={<HelmCharts />} />
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
                <Route path="/applications" element={<HelmApplicationsPage />} />
              </Routes>
            </main>
          </div>
        </div>
      </AgentProvider>
      </ErrorBoundary>
    </Router>
  );
};

export default App;
