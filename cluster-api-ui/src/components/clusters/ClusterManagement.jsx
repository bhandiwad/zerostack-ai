import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../utils/api';
import Notification from '../common/Notification';
import UpgradeKubernetesDialog from './UpgradeKubernetesDialog';
import NodeManagementDialog from './NodeManagementDialog';
import ScaleClusterDialog from './ScaleClusterDialog';
import MaintenanceModeDialog from './MaintenanceModeDialog';

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
      const result = await api.get('/multitenant/clusters');
      setClusters(Array.isArray(result) ? result : []);
    } catch (error) {
      console.error('Error loading clusters:', error);
      showNotification('Error loading clusters: ' + (error.message || 'Unknown error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadClusterNodes = async (clusterId) => {
    setNodesLoading(true);
    try {
      const result = await api.get(`/clusters/${clusterId}/nodes`);
      setClusterNodes(result?.data || []);
    } catch (error) {
      console.error('Error loading cluster nodes:', error);
      showNotification(`Failed to load cluster nodes: ${error.message || 'Unknown error'}`, 'error');
    } finally {
      setNodesLoading(false);
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
    const statusColors = {
      running: 'bg-green-100 text-green-800 border-green-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      stopped: 'bg-red-100 text-red-800 border-red-200',
      error: 'bg-red-100 text-red-800 border-red-200',
      unknown: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    const colorClass = statusColors[status?.toLowerCase()] || statusColors.unknown;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
          status === 'running' ? 'bg-green-400' : 
          status === 'pending' ? 'bg-yellow-400' :
          status === 'stopped' ? 'bg-red-400' :
          'bg-gray-400'
        }`}></span>
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
  
  const handleDialogClose = () => {
    setSelectedCluster(null);
    setShowScaleDialog(false);
    setShowNodeManagementDialog(false);
    setShowUpgradeDialog(false);
    setShowMaintenanceDialog(false);
    loadClusters(); // Refresh cluster data after any operation
  };

  const handleDeleteCluster = async (cluster) => {
    if (!window.confirm(`Are you sure you want to delete cluster ${cluster.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/clusters/${cluster.id}`);
      showNotification(`Cluster ${cluster.name} deleted successfully`, 'success');
      loadClusters();
    } catch (error) {
      console.error('Error deleting cluster:', error);
      showNotification(`Failed to delete cluster: ${error.message || 'Unknown error'}`, 'error');
    }
  };

  const stats = getClusterStats();
  const filteredClusters = getFilteredClusters();
  const providers = ['all', ...new Set(clusters.map(c => c.provider).filter(Boolean))];
  const statuses = ['all', ...new Set(clusters.map(c => c.status).filter(Boolean))];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-gray-600">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-lg">Loading clusters...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="modern-cluster-management max-w-7xl mx-auto p-6 space-y-8" style={{minHeight: '100vh', background: 'transparent'}}>
      {/* Modern Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-8 border border-blue-200">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.22,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.22,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Cluster Management</h1>
            <p className="text-gray-600 mt-1">Manage your Kubernetes clusters with ZeroStack AI – Zero Ops. Full Stack automation</p>
          </div>
        </div>
      </div>

      {/* Modern Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-sm font-semibold text-blue-800">TOTAL CLUSTERS</p>
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">{stats.totalClusters}</p>
              <p className="text-sm text-blue-600 font-medium">Managed</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3M19,5V19H5V5H19Z"/>
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-sm font-semibold text-green-800">RUNNING</p>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">{stats.runningClusters}</p>
              <p className="text-sm text-green-600 font-medium">Active</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M11,16.5L6.5,12L7.91,10.59L11,13.67L16.59,8.09L18,9.5L11,16.5Z"/>
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-sm font-semibold text-purple-800">TOTAL NODES</p>
                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">{stats.totalNodes}</p>
              <p className="text-sm text-purple-600 font-medium">Compute</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4,2H20A2,2 0 0,1 22,4V16A2,2 0 0,1 20,18H16L12,22L8,18H4A2,2 0 0,1 2,16V4A2,2 0 0,1 4,2M4,4V16H8.83L12,19.17L15.17,16H20V4H4Z"/>
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl border border-orange-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-sm font-semibold text-orange-800">PROVIDERS</p>
                <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">{stats.providers}</p>
              <p className="text-sm text-orange-600 font-medium">Multi-cloud</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3,3V21H21V3H3M19,19H5V5H19V19Z"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Toolbar */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Your Clusters</h2>
            <p className="text-gray-600 mt-1">Manage and monitor your Kubernetes infrastructure</p>
          </div>
          <div className="flex items-center gap-3">
            <Link 
              to="/clusters/create" 
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/>
              </svg>
              Create Cluster
            </Link>
            <button 
              onClick={() => loadClusters()}
              disabled={loading}
              className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z"/>
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Modern Search and Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search clusters..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>
          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-[140px]"
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
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-[140px]"
          >
            {statuses.map(status => (
              <option key={status} value={status}>
                {status === 'all' ? 'All Statuses' : status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Modern Empty State or Clusters Table */}
        {filteredClusters.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No clusters found</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || selectedProvider !== 'all' || selectedStatus !== 'all'
                ? 'Try adjusting your search or filters to find what you\'re looking for.'
                : 'No clusters available. Create your first cluster to get started with ZeroStack AI.'}
            </p>
            {!searchTerm && selectedProvider === 'all' && selectedStatus === 'all' && (
              <Link 
                to="/clusters/create" 
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-sm"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/>
                </svg>
                Create Your First Cluster
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    onClick={() => handleSort('name')} 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      Name
                      <span className="text-gray-400">{getSortIcon('name')}</span>
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('provider')} 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      Provider
                      <span className="text-gray-400">{getSortIcon('provider')}</span>
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('region')} 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      Region
                      <span className="text-gray-400">{getSortIcon('region')}</span>
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('node_count')} 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      Nodes
                      <span className="text-gray-400">{getSortIcon('node_count')}</span>
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('status')} 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      Status
                      <span className="text-gray-400">{getSortIcon('status')}</span>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredClusters.map((cluster) => (
                  <tr key={cluster.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <div className="text-sm font-medium text-gray-900">{cluster.name}</div>
                        {cluster.kubernetes_version && (
                          <div className="text-xs text-gray-500">v{cluster.kubernetes_version}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getProviderIcon(cluster.provider)}</span>
                        <span className="text-sm font-medium text-gray-900">{cluster.provider?.toUpperCase()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{cluster.region}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{cluster.node_count || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(cluster.status)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleScaleCluster(cluster)}
                          disabled={cluster.status !== 'running'}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title="Scale cluster"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M21,16V4H9V16H21M21,2A2,2 0 0,1 23,4V16A2,2 0 0,1 21,18H9A2,2 0 0,1 7,16V4A2,2 0 0,1 9,2H21M3,8V20H15V22H3A2,2 0 0,1 1,20V8H3Z"/>
                          </svg>
                          Scale
                        </button>
                        <button
                          onClick={() => handleNodeManagement(cluster)}
                          disabled={cluster.status !== 'running'}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title="Manage nodes"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M4,2H20A2,2 0 0,1 22,4V16A2,2 0 0,1 20,18H16L12,22L8,18H4A2,2 0 0,1 2,16V4A2,2 0 0,1 4,2M4,4V16H8.83L12,19.17L15.17,16H20V4H4Z"/>
                          </svg>
                          Nodes
                        </button>
                        <button
                          onClick={() => handleUpgradeCluster(cluster)}
                          disabled={cluster.status !== 'running'}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title="Upgrade Kubernetes"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M7,14L5,10V8H7L8.5,12L10,8H12V10L10,14H7M14.5,8C16.43,8 18,9.57 18,11.5V12.5C18,14.43 16.43,16 14.5,16H13V14H14.5A1.5,1.5 0 0,0 16,12.5V11.5A1.5,1.5 0 0,0 14.5,10H13V8H14.5Z"/>
                          </svg>
                          Upgrade
                        </button>
                        <button
                          onClick={() => handleDeleteCluster(cluster)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
                          title="Delete cluster"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
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
          </div>
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
          onClose={handleDialogClose}
        />
      )}

      {selectedCluster && showNodeManagementDialog && (
        <NodeManagementDialog
          cluster={selectedCluster}
          nodes={clusterNodes}
          loading={nodesLoading}
          onClose={handleDialogClose}
        />
      )}

      {selectedCluster && showUpgradeDialog && (
        <UpgradeKubernetesDialog
          cluster={selectedCluster}
          onClose={handleDialogClose}
        />
      )}

      {selectedCluster && showMaintenanceDialog && (
        <MaintenanceModeDialog
          cluster={selectedCluster}
          onClose={handleDialogClose}
        />
      )}
    </div>
  );
};

export default ClusterManagement;
