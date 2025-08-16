import React, { useState, useEffect } from 'react';
import './ClusterExplorer.css';

const ClusterExplorer = ({ cluster, apiCall, showNotification }) => {
  const [selectedNamespace, setSelectedNamespace] = useState('default');
  const [namespaces, setNamespaces] = useState([]);
  const [resources, setResources] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedResource, setSelectedResource] = useState(null);
  const [resourceType, setResourceType] = useState('pods');
  const [searchTerm, setSearchTerm] = useState('');
  const [showYamlEditor, setShowYamlEditor] = useState(false);
  const [yamlContent, setYamlContent] = useState('');

  // Resource types available in the explorer
  const resourceTypes = [
    { key: 'pods', label: 'Pods', icon: '🟢' },
    { key: 'deployments', label: 'Deployments', icon: '🚀' },
    { key: 'services', label: 'Services', icon: '🔗' },
    { key: 'configmaps', label: 'ConfigMaps', icon: '⚙️' },
    { key: 'secrets', label: 'Secrets', icon: '🔐' },
    { key: 'persistentvolumeclaims', label: 'PVCs', icon: '💾' },
    { key: 'ingresses', label: 'Ingresses', icon: '🌐' },
    { key: 'jobs', label: 'Jobs', icon: '⚡' },
    { key: 'cronjobs', label: 'CronJobs', icon: '⏰' },
    { key: 'daemonsets', label: 'DaemonSets', icon: '🛡️' },
    { key: 'statefulsets', label: 'StatefulSets', icon: '🗄️' }
  ];

  useEffect(() => {
    if (cluster) {
      loadNamespaces();
      loadResources();
    }
  }, [cluster, selectedNamespace, resourceType]);

  const loadNamespaces = async () => {
    try {
      const result = await apiCall(`/clusters/${cluster.id}/namespaces`);
      if (result && result.success) {
        setNamespaces(result.data || []);
        if (result.data && result.data.length > 0 && !result.data.find(ns => ns.name === selectedNamespace)) {
          setSelectedNamespace(result.data[0].name);
        }
      }
    } catch (error) {
      console.error('Error loading namespaces:', error);
      showNotification('Failed to load namespaces', 'error');
    }
  };

  const loadResources = async () => {
    if (!cluster || !selectedNamespace) return;

    setLoading(true);
    try {
      const result = await apiCall(`/clusters/${cluster.id}/namespaces/${selectedNamespace}/${resourceType}`);
      if (result && result.success) {
        setResources(prev => ({
          ...prev,
          [resourceType]: result.data || []
        }));
      }
    } catch (error) {
      console.error(`Error loading ${resourceType}:`, error);
      showNotification(`Failed to load ${resourceType}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResourceClick = async (resource) => {
    setSelectedResource(resource);
    try {
      const result = await apiCall(`/clusters/${cluster.id}/namespaces/${selectedNamespace}/${resourceType}/${resource.name}/yaml`);
      if (result && result.success) {
        setYamlContent(result.data);
        setShowYamlEditor(true);
      }
    } catch (error) {
      console.error('Error loading resource YAML:', error);
      showNotification('Failed to load resource details', 'error');
    }
  };

  const handleDeleteResource = async (resource) => {
        if (!window.confirm(`Are you sure you want to delete ${resourceType.slice(0, -1)} '${resource.name}'?`)) {
      return;
    }

    try {
      const result = await apiCall(`/clusters/${cluster.id}/namespaces/${selectedNamespace}/${resourceType}/${resource.name}`, {
        method: 'DELETE'
      });
      
      if (result && result.success) {
        showNotification(`${resourceType.slice(0, -1)} "${resource.name}" deleted successfully`);
        loadResources();
        if (selectedResource && selectedResource.name === resource.name) {
          setSelectedResource(null);
          setShowYamlEditor(false);
        }
      } else {
        throw new Error(result?.error || 'Failed to delete resource');
      }
    } catch (error) {
      console.error('Error deleting resource:', error);
      showNotification(`Failed to delete ${resourceType.slice(0, -1)}: ${error.message}`, 'error');
    }
  };

  const handleScaleDeployment = async (deployment, replicas) => {
    try {
      const result = await apiCall(`/clusters/${cluster.id}/namespaces/${selectedNamespace}/deployments/${deployment.name}/scale`, {
        method: 'PATCH',
        body: JSON.stringify({ replicas: parseInt(replicas) })
      });
      
      if (result && result.success) {
        showNotification(`Deployment "${deployment.name}" scaled to ${replicas} replicas`);
        loadResources();
      } else {
        throw new Error(result?.error || 'Failed to scale deployment');
      }
    } catch (error) {
      console.error('Error scaling deployment:', error);
      showNotification(`Failed to scale deployment: ${error.message}`, 'error');
    }
  };

  const getResourceStatus = (resource) => {
    switch (resourceType) {
      case 'pods':
        return resource.status?.phase || 'Unknown';
      case 'deployments':
        return `${resource.status?.readyReplicas || 0}/${resource.status?.replicas || 0} ready`;
      case 'services':
        return resource.spec?.type || 'ClusterIP';
      case 'jobs':
        return resource.status?.succeeded || 0 > 0 ? 'Completed' : 'Running';
      default:
        return 'Active';
    }
  };

  const getResourceStatusColor = (resource) => {
    const status = getResourceStatus(resource);
    if (status === 'Running' || status === 'Active' || status.includes('ready')) return 'success';
    if (status === 'Pending' || status === 'Creating') return 'warning';
    if (status === 'Failed' || status === 'Error') return 'error';
    return 'default';
  };

  const filteredResources = resources[resourceType]?.filter(resource =>
    resource.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    resource.metadata?.labels?.app?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (!cluster) {
    return (
      <div className="cluster-explorer">
        <div className="explorer-placeholder">
          <h3>Select a Cluster</h3>
          <p>Choose a cluster from the cluster list to explore its resources.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cluster-explorer">
      {/* Header */}
      <div className="explorer-header">
        <div className="explorer-title">
          <h1>🔍 Cluster Explorer</h1>
          <p>Explore and manage Kubernetes resources with ZeroStack AI – Zero Ops. Full Stack insights</p>
        </div>
        <div className="cluster-info">
          <div className="cluster-badge">
            <span className="cluster-icon">⚙️</span>
            <span className="cluster-name">{cluster.name}</span>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="explorer-stats">
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-content">
            <h3>Namespaces</h3>
            <div className="stat-value">{namespaces.length}</div>
            <div className="stat-change">🏷️ Active</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🟢</div>
          <div className="stat-content">
            <h3>Current Resource</h3>
            <div className="stat-value">{resourceTypes.find(t => t.key === resourceType)?.label}</div>
            <div className="stat-change">📊 Viewing</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🔢</div>
          <div className="stat-content">
            <h3>Total Items</h3>
            <div className="stat-value">{filteredResources.length}</div>
            <div className="stat-change">📋 Found</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <h3>Namespace</h3>
            <div className="stat-value">{selectedNamespace}</div>
            <div className="stat-change">🏠 Selected</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="explorer-navigation">
        <div className="nav-controls">
          <div className="namespace-selector">
            <label>Namespace:</label>
            <select 
              value={selectedNamespace} 
              onChange={(e) => setSelectedNamespace(e.target.value)}
            >
              {namespaces.map(ns => (
                <option key={ns.name} value={ns.name}>
                  {ns.name} {ns.status === 'Active' ? '✅' : '⚠️'}
                </option>
              ))}
            </select>
          </div>

          <div className="search-box">
            <input
              type="text"
              placeholder={`Search ${resourceType}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <button 
            className="refresh-button"
            onClick={loadResources}
            disabled={loading}
          >
            <span>🔄</span>
            Refresh
          </button>
        </div>

        <div className="resource-type-tabs">
          {resourceTypes.map(type => (
            <button
              key={type.key}
              className={`resource-tab ${resourceType === type.key ? 'active' : ''}`}
              onClick={() => setResourceType(type.key)}
            >
              <span className="tab-icon">{type.icon}</span>
              <span className="tab-label">{type.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="explorer-content">
        <div className="resource-list">
          {loading ? (
            <div className="loading-resources">
              <div className="spinner"></div>
              <p>Loading {resourceType}...</p>
            </div>
          ) : filteredResources.length === 0 ? (
            <div className="empty-state">
              <h3>No {resourceType} found</h3>
                            <p>No {resourceType} found in namespace &quot;{selectedNamespace}&quot;</p>
            </div>
          ) : (
            <div className="resource-grid">
              {filteredResources.map(resource => (
                <div 
                  key={resource.name}
                  className={`resource-card ${selectedResource?.name === resource.name ? 'selected' : ''}`}
                  onClick={() => handleResourceClick(resource)}
                >
                  <div className="resource-header">
                    <h4>{resource.name}</h4>
                    <span className={`status-badge ${getResourceStatusColor(resource)}`}>
                      {getResourceStatus(resource)}
                    </span>
                  </div>
                  
                  <div className="resource-details">
                    <div className="detail-item">
                      <span className="label">Age:</span>
                      <span className="value">{resource.metadata?.creationTimestamp ? 
                        new Date(resource.metadata.creationTimestamp).toLocaleDateString() : 'Unknown'}</span>
                    </div>
                    
                    {resourceType === 'pods' && (
                      <div className="detail-item">
                        <span className="label">Node:</span>
                        <span className="value">{resource.spec?.nodeName || 'Pending'}</span>
                      </div>
                    )}
                    
                    {resourceType === 'deployments' && (
                      <div className="detail-item">
                        <span className="label">Replicas:</span>
                        <span className="value">{resource.spec?.replicas || 0}</span>
                      </div>
                    )}
                    
                    {resourceType === 'services' && (
                      <div className="detail-item">
                        <span className="label">Type:</span>
                        <span className="value">{resource.spec?.type || 'ClusterIP'}</span>
                      </div>
                    )}
                  </div>

                  <div className="resource-actions">
                    {resourceType === 'deployments' && (
                      <button
                        className="action-btn scale"
                        onClick={(e) => {
                          e.stopPropagation();
                          const replicas = prompt('Enter number of replicas:', resource.spec?.replicas || 1);
                          if (replicas) handleScaleDeployment(resource, replicas);
                        }}
                      >
                        📈 Scale
                      </button>
                    )}
                    
                    <button
                      className="action-btn delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteResource(resource);
                      }}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resource Details Panel */}
        {selectedResource && (
          <div className="resource-details-panel">
            <div className="panel-header">
              <h3>{selectedResource.name}</h3>
              <button 
                className="close-button"
                onClick={() => {
                  setSelectedResource(null);
                  setShowYamlEditor(false);
                }}
              >
                ✕
              </button>
            </div>
            
            <div className="panel-content">
              {showYamlEditor ? (
                <div className="yaml-editor">
                  <div className="editor-header">
                    <h4>YAML Configuration</h4>
                    <button className="save-button">💾 Save Changes</button>
                  </div>
                  <textarea
                    value={yamlContent}
                    onChange={(e) => setYamlContent(e.target.value)}
                    placeholder="YAML content..."
                    rows={20}
                  />
                </div>
              ) : (
                <div className="resource-info">
                  <div className="info-section">
                    <h4>Metadata</h4>
                    <div className="info-grid">
                      <div className="info-item">
                        <span className="label">Name:</span>
                        <span className="value">{selectedResource.name}</span>
                      </div>
                      <div className="info-item">
                        <span className="label">Namespace:</span>
                        <span className="value">{selectedResource.metadata?.namespace}</span>
                      </div>
                      <div className="info-item">
                        <span className="label">Created:</span>
                        <span className="value">
                          {selectedResource.metadata?.creationTimestamp ? 
                            new Date(selectedResource.metadata.creationTimestamp).toLocaleString() : 'Unknown'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="info-section">
                    <h4>Status</h4>
                    <div className="status-info">
                      <span className={`status-badge ${getResourceStatusColor(selectedResource)}`}>
                        {getResourceStatus(selectedResource)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="info-section">
                    <h4>Labels</h4>
                    <div className="labels-grid">
                      {selectedResource.metadata?.labels ? 
                        Object.entries(selectedResource.metadata.labels).map(([key, value]) => (
                          <span key={key} className="label-tag">
                            {key}={value}
                          </span>
                        )) : 
                        <span className="no-labels">No labels</span>
                      }
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClusterExplorer; 