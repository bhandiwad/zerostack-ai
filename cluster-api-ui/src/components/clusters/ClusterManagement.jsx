import React, { useState, useEffect } from 'react';
import apiCall from '../../lib/api';
import Notification from '../common/Notification';
import UpgradeKubernetesDialog from './UpgradeKubernetesDialog';
import NodeManagementDialog from './NodeManagementDialog';
import ScaleClusterDialog from './ScaleClusterDialog';
import MaintenanceModeDialog from './MaintenanceModeDialog';
import ClusterToolbar from './ClusterToolbar';
import ClusterTable from './ClusterTable';

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
    } catch (error).
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
      <ClusterToolbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedProvider={selectedProvider}
        setSelectedProvider={setSelectedProvider}
        providers={providers}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
        statuses={statuses}
        onRefresh={loadClusters}
        loading={loading}
      />

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
            <ClusterTable
              clusters={filteredClusters}
              handleSort={handleSort}
              getSortIcon={getSortIcon}
              getProviderIcon={getProviderIcon}
              getStatusBadge={getStatusBadge}
              inlineScaleMode={inlineScaleMode}
              inlineScaleValues={inlineScaleValues}
              handleInlineScaleChange={handleInlineScaleChange}
              handleInlineScaleSubmit={handleInlineScaleSubmit}
              scalingInProgress={scalingInProgress}
              setInlineScaleMode={setInlineScaleMode}
              handleInlineScale={handleInlineScale}
              loadClusterNodes={loadClusterNodes}
              handleInlineUpgrade={handleInlineUpgrade}
              upgradeInProgress={upgradeInProgress}
              handleInlineMaintenance={handleInlineMaintenance}
              maintenanceOperationInProgress={maintenanceOperationInProgress}
              handleDeleteClick={handleDeleteClick}
              showNodeDetails={showNodeDetails}
              nodesLoading={nodesLoading}
              clusterNodes={clusterNodes}
              handleDrainNode={handleDrainNode}
              drainOperationInProgress={drainOperationInProgress}
              handleUncordonNode={handleUncordonNode}
            />
          )}
        </div>
      </div>

      {renderDialogs()}
    </div>
  );
};

export default ClusterManagement;
