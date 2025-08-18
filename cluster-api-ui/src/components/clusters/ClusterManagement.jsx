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
        <h1>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={{marginRight: '8px'}}>
            <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.22,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.22,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"/>
          </svg>
          Cluster Management
        </h1>
        <p>Manage your Kubernetes clusters with ZeroStack AI – Zero Ops. Full Stack automation</p>
      </div>

      <div className="cluster-stats">
        <div className="stat-card">
          <div className="stat-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3M19,5V19H5V5H19Z"/>
            </svg>
          </div>
          <div className="stat-content">
            <h3>Total Clusters</h3>
            <div className="stat-value">{stats.totalClusters}</div>
            <div className="stat-change">Managed</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M11,16.5L6.5,12L7.91,10.59L11,13.67L16.59,8.09L18,9.5L11,16.5Z"/>
            </svg>
          </div>
          <div className="stat-content">
            <h3>Running</h3>
            <div className="stat-value">{stats.runningClusters}</div>
            <div className="stat-change">Active</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4,2H20A2,2 0 0,1 22,4V16A2,2 0 0,1 20,18H16L12,22L8,18H4A2,2 0 0,1 2,16V4A2,2 0 0,1 4,2M4,4V16H8.83L12,19.17L15.17,16H20V4H4Z"/>
            </svg>
          </div>
          <div className="stat-content">
            <h3>Total Nodes</h3>
            <div className="stat-value">{stats.totalNodes}</div>
            <div className="stat-change">Compute</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3,3V21H21V3H3M19,19H5V5H19V19Z"/>
            </svg>
          </div>
          <div className="stat-content">
            <h3>Providers</h3>
            <div className="stat-value">{stats.providers}</div>
            <div className="stat-change">Multi-cloud</div>
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{marginRight: '8px'}}>
                <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/>
              </svg>
              Create Cluster
            </Link>
            <button 
              className="btn btn-secondary"
              onClick={() => loadClusters()}
              disabled={loading}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{marginRight: '8px'}}>
                <path d="M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z"/>
              </svg>
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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{marginRight: '8px'}}>
                  <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/>
                </svg>
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
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M21,16V4H9V16H21M21,2A2,2 0 0,1 23,4V16A2,2 0 0,1 21,18H9A2,2 0 0,1 7,16V4A2,2 0 0,1 9,2H21M3,8V20H15V22H3A2,2 0 0,1 1,20V8H3Z"/>
                        </svg>
                        Scale
                      </button>
                      <button
                        className="action-btn action-btn-nodes"
                        onClick={() => handleNodeManagement(cluster)}
                        disabled={cluster.status !== 'running'}
                        title="Manage nodes"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M4,2H20A2,2 0 0,1 22,4V16A2,2 0 0,1 20,18H16L12,22L8,18H4A2,2 0 0,1 2,16V4A2,2 0 0,1 4,2M4,4V16H8.83L12,19.17L15.17,16H20V4H4Z"/>
                        </svg>
                        Nodes
                      </button>
                      <button
                        className="action-btn action-btn-upgrade"
                        onClick={() => handleUpgradeCluster(cluster)}
                        disabled={cluster.status !== 'running'}
                        title="Upgrade Kubernetes"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M7,14L5,10V8H7L8.5,12L10,8H12V10L10,14H7M14.5,8C16.43,8 18,9.57 18,11.5V12.5C18,14.43 16.43,16 14.5,16H13V14H14.5A1.5,1.5 0 0,0 16,12.5V11.5A1.5,1.5 0 0,0 14.5,10H13V8H14.5Z"/>
                        </svg>
                        Upgrade
                      </button>
                      <button
                        className="action-btn action-btn-delete"
                        onClick={() => handleDeleteCluster(cluster)}
                        title="Delete cluster"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
                        </svg>
                        Delete
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
