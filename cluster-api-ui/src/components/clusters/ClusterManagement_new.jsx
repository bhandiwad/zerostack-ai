import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiCall from '../../lib/api';
import Notification from '../common/Notification';
import UpgradeKubernetesDialog from './UpgradeKubernetesDialog';
import NodeManagementDialog from './NodeManagementDialog';
import ScaleClusterDialog from './ScaleClusterDialog';
import MaintenanceModeDialog from './MaintenanceModeDialog';
import './ClusterManagement.css';

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
  const [showNodeManagementDialog, setShowNodeManagementDialog] = useState(false);
  const [showMaintenanceDialog, setShowMaintenanceDialog] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  // Operation states
  const [scalingInProgress, setScalingInProgress] = useState(false);
  const [upgradeInProgress, setUpgradeInProgress] = useState(false);
  const [maintenanceOperationInProgress, setMaintenanceOperationInProgress] = useState(false);
  const [clusterNodes, setClusterNodes] = useState([]);
  const [nodesLoading, setNodesLoading] = useState(false);
  const [drainOperationInProgress, setDrainOperationInProgress] = useState(false);

  useEffect(() => {
    loadClusters();
  }, []);

  const loadClusters = async () => {
    setLoading(true);
    try {
      const result = await apiCall('/mt/clusters');
      if (result && result.success) {
        setClusters(result.data || []);
      } else {
        showNotification('Failed to load clusters', 'error');
      }
    } catch (error) {
      showNotification('Error loading clusters: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ show: true, message, type });
  };

  const getClusterStats = () => {
    const totalClusters = clusters.length;
    const runningClusters = clusters.filter(c => c.status === 'running').length;
    const totalNodes = clusters.reduce((sum, c) => sum + (c.node_count || 0), 0);
    const providers = [...new Set(clusters.map(c => c.provider))].length;
    
    return { totalClusters, runningClusters, totalNodes, providers };
  };

  const getFilteredClusters = () => {
    let filtered = clusters.filter(cluster => {
      const matchesSearch = cluster.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
      default: return '⚙️';
    }
  };

  const getStatusBadge = (status) => {
    const statusClass = `status-${status?.toLowerCase() || 'unknown'}`;
    return (
      <span className={`status-badge ${statusClass}`}>
        {status || 'Unknown'}
      </span>
    );
  };

  const handleScaleCluster = (cluster) => {
    setSelectedCluster(cluster);
    setShowScaleDialog(true);
  };

  const handleNodeManagement = (cluster) => {
    setSelectedCluster(cluster);
    setShowNodeManagementDialog(true);
  };

  const handleUpgradeCluster = (cluster) => {
    setSelectedCluster(cluster);
    setShowUpgradeDialog(true);
  };

  const handleMaintenanceMode = (cluster) => {
    setSelectedCluster(cluster);
    setShowMaintenanceDialog(true);
  };

  const handleDeleteCluster = async (cluster) => {
    if (!confirm(`Are you sure you want to delete cluster "${cluster.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const result = await apiCall(`/clusters/${cluster.id}`, { method: 'DELETE' });
      if (result && result.success) {
        showNotification(`Cluster ${cluster.name} deleted successfully`, 'success');
        loadClusters();
      } else {
        showNotification(`Failed to delete cluster: ${result?.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      showNotification(`Error deleting cluster: ${error.message}`, 'error');
    }
  };

  const stats = getClusterStats();
  const filteredClusters = getFilteredClusters();
  const providers = ['all', ...new Set(clusters.map(c => c.provider).filter(Boolean))];
  const statuses = ['all', ...new Set(clusters.map(c => c.status).filter(Boolean))];

  if (loading) {
    return <div className="loading">🔄 Loading clusters...</div>;
  }

  return (
    <div className="cluster-management">
      <div className="cluster-header">
        <h1>⚙️ Cluster Management</h1>
        <p>Manage your Kubernetes clusters across multiple cloud providers with AI-powered automation</p>
      </div>

      <div className="cluster-stats">
        <div className="stat-card">
          <div className="stat-icon">🏗️</div>
          <div className="stat-content">
            <h3>Total Clusters</h3>
            <div className="stat-value">{stats.totalClusters}</div>
            <div className="stat-change">📊 Managed</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🟢</div>
          <div className="stat-content">
            <h3>Running</h3>
            <div className="stat-value">{stats.runningClusters}</div>
            <div className="stat-change">⚡ Active</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⚙️</div>
          <div className="stat-content">
            <h3>Total Nodes</h3>
            <div className="stat-value">{stats.totalNodes}</div>
            <div className="stat-change">🔧 Compute</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">☁️</div>
          <div className="stat-content">
            <h3>Providers</h3>
            <div className="stat-value">{stats.providers}</div>
            <div className="stat-change">🌐 Multi-cloud</div>
          </div>
        </div>
      </div>

      <div className="cluster-content">
        <div className="cluster-toolbar">
          <div className="toolbar-left">
            <h2>Your Clusters</h2>
          </div>
          <div className="toolbar-actions">
            <Link to="/clusters/create" className="btn btn-primary">
              <span>➕</span>
              Create Cluster
            </Link>
            <button 
              className="btn btn-secondary"
              onClick={() => loadClusters()}
              disabled={loading}
            >
              <span>🔄</span>
              Refresh
            </button>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="cluster-filters">
          <input
            type="text"
            placeholder="Search clusters..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
            className="filter-select"
          >
            {providers.map(provider => (
              <option key={provider} value={provider}>
                {provider === 'all' ? 'All Providers' : provider.toUpperCase()}
              </option>
            ))}
          </select>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="filter-select"
          >
            {statuses.map(status => (
              <option key={status} value={status}>
                {status === 'all' ? 'All Statuses' : status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Clusters Table */}
        {filteredClusters.length === 0 ? (
          <div className="empty-state">
            <h3>No clusters found</h3>
            <p>
              {searchTerm || selectedProvider !== 'all' || selectedStatus !== 'all'
                ? 'Try adjusting your search or filters'
                : 'No clusters available. Create your first cluster to get started.'}
            </p>
            {!searchTerm && selectedProvider === 'all' && selectedStatus === 'all' && (
              <Link to="/clusters/create" className="btn btn-primary">
                <span>➕</span>
                Create Your First Cluster
              </Link>
            )}
          </div>
        ) : (
          <table className="cluster-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                  Name {getSortIcon('name')}
                </th>
                <th onClick={() => handleSort('provider')} style={{ cursor: 'pointer' }}>
                  Provider {getSortIcon('provider')}
                </th>
                <th onClick={() => handleSort('region')} style={{ cursor: 'pointer' }}>
                  Region {getSortIcon('region')}
                </th>
                <th onClick={() => handleSort('node_count')} style={{ cursor: 'pointer' }}>
                  Nodes {getSortIcon('node_count')}
                </th>
                <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>
                  Status {getSortIcon('status')}
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClusters.map((cluster) => (
                <tr key={cluster.id}>
                  <td>
                    <div className="cluster-name">{cluster.name}</div>
                    <div className="cluster-details">
                      {cluster.kubernetes_version && `v${cluster.kubernetes_version}`}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>{getProviderIcon(cluster.provider)}</span>
                      {cluster.provider?.toUpperCase()}
                    </div>
                  </td>
                  <td>{cluster.region}</td>
                  <td>{cluster.node_count || 0}</td>
                  <td>{getStatusBadge(cluster.status)}</td>
                  <td>
                    <div className="cluster-actions">
                      <button
                        className="action-btn action-btn-scale"
                        onClick={() => handleScaleCluster(cluster)}
                        disabled={cluster.status !== 'running'}
                        title="Scale cluster"
                      >
                        📏 Scale
                      </button>
                      <button
                        className="action-btn action-btn-nodes"
                        onClick={() => handleNodeManagement(cluster)}
                        disabled={cluster.status !== 'running'}
                        title="Manage nodes"
                      >
                        🔧 Nodes
                      </button>
                      <button
                        className="action-btn action-btn-upgrade"
                        onClick={() => handleUpgradeCluster(cluster)}
                        disabled={cluster.status !== 'running'}
                        title="Upgrade Kubernetes"
                      >
                        ⬆️ Upgrade
                      </button>
                      <button
                        className="action-btn action-btn-delete"
                        onClick={() => handleDeleteCluster(cluster)}
                        title="Delete cluster"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Notification
        notification={notification}
        onClose={() => setNotification(prev => ({...prev, show: false}))}
      />

      {/* Dialogs */}
      {selectedCluster && showScaleDialog && (
        <ScaleClusterDialog
          cluster={selectedCluster}
          onClose={() => setShowScaleDialog(false)}
          onScale={() => {
            setShowScaleDialog(false);
            loadClusters();
          }}
          loading={scalingInProgress}
        />
      )}

      {selectedCluster && showNodeManagementDialog && (
        <NodeManagementDialog
          cluster={selectedCluster}
          nodes={clusterNodes}
          loading={nodesLoading}
          onClose={() => setShowNodeManagementDialog(false)}
          onRefresh={loadClusters}
        />
      )}

      {selectedCluster && showUpgradeDialog && (
        <UpgradeKubernetesDialog
          cluster={selectedCluster}
          onClose={() => setShowUpgradeDialog(false)}
          onUpgrade={() => {
            setShowUpgradeDialog(false);
            loadClusters();
          }}
          loading={upgradeInProgress}
        />
      )}

      {selectedCluster && showMaintenanceDialog && (
        <MaintenanceModeDialog
          cluster={selectedCluster}
          onClose={() => setShowMaintenanceDialog(false)}
          onToggle={() => {
            setShowMaintenanceDialog(false);
            loadClusters();
          }}
          loading={maintenanceOperationInProgress}
        />
      )}
    </div>
  );
};

export default ClusterManagement;
