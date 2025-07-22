import React, { useState, useEffect } from 'react';
import './App.css';

// API base URL
const API_BASE = 'http://localhost:5000/api';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [clusters, setClusters] = useState([]);
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [regions, setRegions] = useState([]);
  const [flavors, setFlavors] = useState([]);
  const [kubernetesVersions, setKubernetesVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [costEstimate, setCostEstimate] = useState(null);
  const [flavorCategory, setFlavorCategory] = useState('all');
  
  // Cluster creation form state
  const [clusterForm, setClusterForm] = useState({
    name: '',
    provider: '',
    region: '',
    version: '',
    topology: 'multi-master',
    nodeCount: 3,
    flavor: '',
    configuration: {}
  });

  // Load initial data
  useEffect(() => {
    loadProviders();
    loadClusters();
  }, []);

  // Load providers
  const loadProviders = async () => {
    try {
      const response = await fetch(`${API_BASE}/providers`);
      const data = await response.json();
      if (data.success) {
        setProviders(data.data);
      }
    } catch (error) {
      console.error('Failed to load providers:', error);
    }
  };

  // Load clusters
  const loadClusters = async () => {
    try {
      const response = await fetch(`${API_BASE}/clusters`);
      const data = await response.json();
      if (data.success) {
        setClusters(data.data);
      }
    } catch (error) {
      console.error('Failed to load clusters:', error);
    }
  };

  // Load regions for selected provider
  const loadRegions = async (providerId, refresh = false) => {
    if (!providerId) return;
    
    setLoading(true);
    try {
      const endpoint = refresh ? 
        `${API_BASE}/providers/${providerId}/regions/refresh` : 
        `${API_BASE}/providers/${providerId}/regions`;
      
      const response = await fetch(endpoint, {
        method: refresh ? 'POST' : 'GET'
      });
      const data = await response.json();
      
      if (data.success) {
        setRegions(data.data);
      }
    } catch (error) {
      console.error('Failed to load regions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load flavors for selected provider and region
  const loadFlavors = async (providerId, region = null, refresh = false, category = 'all') => {
    if (!providerId) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (region) params.append('region', region);
      if (category !== 'all') params.append('category', category);
      params.append('limit', '20');
      
      const endpoint = refresh ? 
        `${API_BASE}/providers/${providerId}/flavors/refresh?${params}` : 
        `${API_BASE}/providers/${providerId}/flavors?${params}`;
      
      const response = await fetch(endpoint, {
        method: refresh ? 'POST' : 'GET'
      });
      const data = await response.json();
      
      if (data.success) {
        setFlavors(data.data);
      }
    } catch (error) {
      console.error('Failed to load flavors:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load Kubernetes versions
  const loadKubernetesVersions = async (providerId, region = null) => {
    if (!providerId) return;
    
    try {
      const params = new URLSearchParams();
      if (region) params.append('region', region);
      
      const response = await fetch(`${API_BASE}/providers/${providerId}/versions?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setKubernetesVersions(data.data);
      }
    } catch (error) {
      console.error('Failed to load Kubernetes versions:', error);
    }
  };

  // Estimate cost
  const estimateCost = async (formData) => {
    if (!formData.provider || !formData.flavor || !formData.nodeCount) return;
    
    try {
      const response = await fetch(`${API_BASE}/cost/estimate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          provider: formData.provider,
          flavor: formData.flavor,
          nodeCount: formData.nodeCount,
          region: formData.region,
          durationHours: 24 * 30 // 30 days
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setCostEstimate(data.data);
      }
    } catch (error) {
      console.error('Failed to estimate cost:', error);
    }
  };

  // Handle provider selection
  const handleProviderChange = (providerId) => {
    setSelectedProvider(providerId);
    setClusterForm(prev => ({ ...prev, provider: providerId, region: '', flavor: '' }));
    setRegions([]);
    setFlavors([]);
    setKubernetesVersions([]);
    setCostEstimate(null);
    
    if (providerId) {
      loadRegions(providerId);
      loadKubernetesVersions(providerId);
    }
  };

  // Handle region selection
  const handleRegionChange = (regionId) => {
    setClusterForm(prev => ({ ...prev, region: regionId, flavor: '' }));
    setFlavors([]);
    setCostEstimate(null);
    
    if (regionId && selectedProvider) {
      loadFlavors(selectedProvider, regionId, false, flavorCategory);
    }
  };

  // Handle flavor selection
  const handleFlavorChange = (flavorId) => {
    const updatedForm = { ...clusterForm, flavor: flavorId };
    setClusterForm(updatedForm);
    estimateCost(updatedForm);
  };

  // Handle category filter change
  const handleCategoryChange = (category) => {
    setFlavorCategory(category);
    if (selectedProvider) {
      loadFlavors(selectedProvider, clusterForm.region, false, category);
    }
  };

  // Create cluster
  const createCluster = async () => {
    if (!clusterForm.name || !clusterForm.provider || !clusterForm.region || !clusterForm.flavor) {
      alert('Please fill in all required fields');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/clusters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(clusterForm)
      });
      
      const data = await response.json();
      if (data.success) {
        alert('Cluster creation initiated successfully!');
        loadClusters(); // Refresh cluster list
        setCurrentPage('clusters'); // Navigate to clusters page
        // Reset form
        setClusterForm({
          name: '',
          provider: '',
          region: '',
          version: '',
          topology: 'multi-master',
          nodeCount: 3,
          flavor: '',
          configuration: {}
        });
        setSelectedProvider('');
        setRegions([]);
        setFlavors([]);
        setCostEstimate(null);
      } else {
        alert(`Failed to create cluster: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to create cluster:', error);
      alert('Failed to create cluster. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Cluster operations
  const performClusterOperation = async (clusterId, operation, data = {}) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/clusters/${clusterId}/${operation}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      const result = await response.json();
      if (result.success) {
        alert(result.message || `${operation} operation initiated successfully!`);
        loadClusters(); // Refresh cluster list
      } else {
        alert(`Failed to ${operation}: ${result.error}`);
      }
    } catch (error) {
      console.error(`Failed to ${operation}:`, error);
      alert(`Failed to ${operation}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Components
  const StatCard = ({ title, value, subtitle, color = 'primary' }) => (
    <div className={`stat-card ${color}`}>
      <div className="stat-content">
        <div className="stat-text">
          <p className="stat-title">{title}</p>
          <p className="stat-value">{value}</p>
          <p className="stat-subtitle">{subtitle}</p>
        </div>
        <div className="stat-icon">
          📊
        </div>
      </div>
    </div>
  );

  const renderDashboard = () => {
    const clusterStats = {
      total: clusters.length,
      running: clusters.filter(c => c.status === 'running').length,
      pending: clusters.filter(c => c.status === 'pending').length,
      failed: clusters.filter(c => c.status === 'failed').length,
    };

    return (
      <div className="page-content">
        <div className="page-header">
          <h1>Cluster Dashboard</h1>
          <p>Overview of your Kubernetes clusters across all providers</p>
        </div>
        
        <div className="stats-grid">
          <StatCard 
            title="Total Clusters" 
            value={clusterStats.total} 
            subtitle="Across all providers" 
            color="primary" 
          />
          <StatCard 
            title="Running" 
            value={clusterStats.running} 
            subtitle="Active clusters" 
            color="success" 
          />
          <StatCard 
            title="Pending" 
            value={clusterStats.pending} 
            subtitle="Being created" 
            color="warning" 
          />
          <StatCard 
            title="Failed" 
            value={clusterStats.failed} 
            subtitle="Need attention" 
            color="error" 
          />
        </div>

        <div className="dashboard-grid">
          <div className="card">
            <div className="card-header">
              <h2>Recent Clusters</h2>
              <button 
                className="btn btn-primary"
                onClick={() => setCurrentPage('create')}
              >
                Create New Cluster
              </button>
            </div>
            <div className="card-content">
              {clusters.slice(0, 5).map(cluster => (
                <div key={cluster.id} className="cluster-item">
                  <div className="cluster-info">
                    <h3>{cluster.name}</h3>
                    <p>{cluster.provider} • {cluster.region} • {cluster.nodeCount} nodes</p>
                  </div>
                  <div className={`status-badge ${cluster.status}`}>
                    {cluster.status}
                  </div>
                </div>
              ))}
              {clusters.length === 0 && (
                <p className="empty-state">No clusters found. Create your first cluster to get started.</p>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2>Provider Distribution</h2>
            </div>
            <div className="card-content">
              {providers.map(provider => {
                const providerClusters = clusters.filter(c => c.provider === provider.id);
                return (
                  <div key={provider.id} className="provider-stat">
                    <div className="provider-info">
                      <span className="provider-icon">{provider.icon}</span>
                      <span className="provider-name">{provider.displayName}</span>
                    </div>
                    <span className="provider-count">{providerClusters.length}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderClusterList = () => (
    <div className="page-content">
      <div className="page-header">
        <h1>Cluster Management</h1>
        <p>Manage your Kubernetes clusters across all providers</p>
        <button 
          className="btn btn-primary"
          onClick={() => setCurrentPage('create')}
        >
          Create New Cluster
        </button>
      </div>
      
      <div className="clusters-grid">
        {clusters.map(cluster => (
          <div key={cluster.id} className="cluster-card">
            <div className="cluster-header">
              <h3>{cluster.name}</h3>
              <div className={`status-badge ${cluster.status}`}>
                {cluster.status}
              </div>
            </div>
            
            <div className="cluster-details">
              <div className="detail-row">
                <span className="label">Provider:</span>
                <span className="value">{cluster.provider}</span>
              </div>
              <div className="detail-row">
                <span className="label">Region:</span>
                <span className="value">{cluster.region}</span>
              </div>
              <div className="detail-row">
                <span className="label">Version:</span>
                <span className="value">{cluster.version}</span>
              </div>
              <div className="detail-row">
                <span className="label">Nodes:</span>
                <span className="value">{cluster.nodeCount}</span>
              </div>
              <div className="detail-row">
                <span className="label">Resources:</span>
                <span className="value">
                  {cluster.resources?.cpu}vCPU, {cluster.resources?.memory}GB RAM
                  {cluster.resources?.gpu?.count > 0 && (
                    <span>, {cluster.resources.gpu.count}x {cluster.resources.gpu.type}</span>
                  )}
                </span>
              </div>
              <div className="detail-row">
                <span className="label">Cost:</span>
                <span className="value">${cluster.cost?.hourly?.toFixed(2)}/hr</span>
              </div>
            </div>
            
            <div className="cluster-actions">
              {cluster.status === 'running' && (
                <>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => performClusterOperation(cluster.id, 'stop')}
                    disabled={loading}
                  >
                    Stop
                  </button>
                  <button 
                    className="btn btn-primary"
                    onClick={() => {
                      const newCount = prompt('Enter new node count:', cluster.nodeCount);
                      if (newCount && parseInt(newCount) !== cluster.nodeCount) {
                        performClusterOperation(cluster.id, 'scale', { nodeCount: parseInt(newCount) });
                      }
                    }}
                    disabled={loading}
                  >
                    Scale
                  </button>
                </>
              )}
              {cluster.status === 'stopped' && (
                <button 
                  className="btn btn-success"
                  onClick={() => performClusterOperation(cluster.id, 'start')}
                  disabled={loading}
                >
                  Start
                </button>
              )}
              <button 
                className="btn btn-danger"
                onClick={() => {
                  if (confirm(`Are you sure you want to delete cluster "${cluster.name}"?`)) {
                    fetch(`${API_BASE}/clusters/${cluster.id}`, { method: 'DELETE' })
                      .then(response => response.json())
                      .then(data => {
                        if (data.success) {
                          alert('Cluster deletion initiated');
                          loadClusters();
                        } else {
                          alert(`Failed to delete cluster: ${data.error}`);
                        }
                      });
                  }
                }}
                disabled={loading}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        
        {clusters.length === 0 && (
          <div className="empty-state">
            <h3>No clusters found</h3>
            <p>Create your first cluster to get started with Kubernetes management.</p>
            <button 
              className="btn btn-primary"
              onClick={() => setCurrentPage('create')}
            >
              Create First Cluster
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderClusterCreation = () => (
    <div className="page-content">
      <div className="page-header">
        <h1>Create New Cluster</h1>
        <p>Configure your Kubernetes cluster with dynamic provider options</p>
      </div>
      
      <div className="creation-wizard">
        {/* Basic Configuration */}
        <div className="card">
          <div className="card-header">
            <h2>Basic Configuration</h2>
          </div>
          <div className="card-content">
            <div className="form-grid">
              <div className="form-group">
                <label>Cluster Name *</label>
                <input
                  type="text"
                  value={clusterForm.name}
                  onChange={(e) => setClusterForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter cluster name"
                  className="form-input"
                />
              </div>
              
              <div className="form-group">
                <label>Cluster Topology *</label>
                <select
                  value={clusterForm.topology}
                  onChange={(e) => setClusterForm(prev => ({ ...prev, topology: e.target.value }))}
                  className="form-select"
                >
                  <option value="single-master">Single Master</option>
                  <option value="multi-master">Multi-Master HA</option>
                  <option value="all-in-one">All-in-One</option>
                  <option value="custom">Custom Topology</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Node Count *</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={clusterForm.nodeCount}
                  onChange={(e) => {
                    const updatedForm = { ...clusterForm, nodeCount: parseInt(e.target.value) };
                    setClusterForm(updatedForm);
                    if (updatedForm.flavor) estimateCost(updatedForm);
                  }}
                  className="form-input"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Provider Selection */}
        <div className="card">
          <div className="card-header">
            <h2>Cloud Provider</h2>
            <p>Select your cloud provider and region</p>
          </div>
          <div className="card-content">
            <div className="provider-grid">
              {providers.map(provider => (
                <div
                  key={provider.id}
                  className={`provider-card ${selectedProvider === provider.id ? 'selected' : ''}`}
                  onClick={() => handleProviderChange(provider.id)}
                >
                  <div className="provider-icon">{provider.icon}</div>
                  <h3>{provider.displayName}</h3>
                  <p>{provider.description}</p>
                  <div className="provider-features">
                    {provider.features?.slice(0, 2).map(feature => (
                      <span key={feature} className="feature-tag">{feature}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            {selectedProvider && (
              <div className="region-selection">
                <div className="form-group">
                  <label>Region *</label>
                  <div className="region-header">
                    <select
                      value={clusterForm.region}
                      onChange={(e) => handleRegionChange(e.target.value)}
                      className="form-select"
                      disabled={loading}
                    >
                      <option value="">Select a region</option>
                      {regions.map(region => (
                        <option key={region.id} value={region.id}>
                          {region.name} ({region.location})
                        </option>
                      ))}
                    </select>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => loadRegions(selectedProvider, true)}
                      disabled={loading}
                    >
                      {loading ? 'Refreshing...' : 'Refresh Regions'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Instance Type Selection */}
        {selectedProvider && clusterForm.region && (
          <div className="card">
            <div className="card-header">
              <h2>Instance Type & GPU Configuration</h2>
              <p>Choose your compute resources including GPU options</p>
            </div>
            <div className="card-content">
              <div className="flavor-filters">
                <label>Category Filter:</label>
                <div className="filter-buttons">
                  {['all', 'general', 'compute', 'memory', 'gpu', 'storage'].map(category => (
                    <button
                      key={category}
                      className={`btn btn-sm ${flavorCategory === category ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => handleCategoryChange(category)}
                    >
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </button>
                  ))}
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => loadFlavors(selectedProvider, clusterForm.region, true, flavorCategory)}
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Load More Types'}
                </button>
              </div>
              
              <div className="flavors-grid">
                {flavors.map(flavor => (
                  <div
                    key={flavor.id}
                    className={`flavor-card ${clusterForm.flavor === flavor.id ? 'selected' : ''} ${flavor.category}`}
                    onClick={() => handleFlavorChange(flavor.id)}
                  >
                    <div className="flavor-header">
                      <h3>{flavor.displayName}</h3>
                      <div className="flavor-category">{flavor.category}</div>
                    </div>
                    
                    <div className="flavor-specs">
                      <div className="spec-row">
                        <span>CPU:</span>
                        <span>{flavor.resources.cpu} vCPUs</span>
                      </div>
                      <div className="spec-row">
                        <span>Memory:</span>
                        <span>{flavor.resources.memory} GB</span>
                      </div>
                      <div className="spec-row">
                        <span>Storage:</span>
                        <span>{flavor.resources.storage} GB</span>
                      </div>
                      {flavor.resources.gpu && (
                        <div className="spec-row gpu-spec">
                          <span>GPU:</span>
                          <span>{flavor.resources.gpu.count}x {flavor.resources.gpu.type}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flavor-pricing">
                      <div className="price-row">
                        <span>Hourly:</span>
                        <span>${flavor.pricing.hourly.toFixed(3)}</span>
                      </div>
                      <div className="price-row">
                        <span>Monthly:</span>
                        <span>${flavor.pricing.monthly.toFixed(2)}</span>
                      </div>
                    </div>
                    
                    <p className="flavor-description">{flavor.description}</p>
                  </div>
                ))}
              </div>
              
              {flavors.length === 0 && selectedProvider && clusterForm.region && (
                <div className="empty-state">
                  <p>No instance types found for the selected region and category.</p>
                  <button
                    className="btn btn-primary"
                    onClick={() => loadFlavors(selectedProvider, clusterForm.region, true, flavorCategory)}
                    disabled={loading}
                  >
                    {loading ? 'Loading...' : 'Load Instance Types'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Kubernetes Version */}
        {selectedProvider && (
          <div className="card">
            <div className="card-header">
              <h2>Kubernetes Version</h2>
            </div>
            <div className="card-content">
              <div className="form-group">
                <label>Kubernetes Version *</label>
                <select
                  value={clusterForm.version}
                  onChange={(e) => setClusterForm(prev => ({ ...prev, version: e.target.value }))}
                  className="form-select"
                >
                  <option value="">Select version</option>
                  {kubernetesVersions.map(version => (
                    <option key={version} value={version}>{version}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Cost Estimation */}
        {costEstimate && (
          <div className="card">
            <div className="card-header">
              <h2>Cost Estimation</h2>
              <p>Estimated costs for your cluster configuration</p>
            </div>
            <div className="card-content">
              <div className="cost-grid">
                <div className="cost-item">
                  <span className="cost-label">Compute (Hourly):</span>
                  <span className="cost-value">${costEstimate.compute.hourly.toFixed(3)}</span>
                </div>
                <div className="cost-item">
                  <span className="cost-label">Compute (Monthly):</span>
                  <span className="cost-value">${costEstimate.compute.monthly.toFixed(2)}</span>
                </div>
                <div className="cost-item">
                  <span className="cost-label">Networking:</span>
                  <span className="cost-value">${costEstimate.networking.toFixed(3)}</span>
                </div>
                <div className="cost-item">
                  <span className="cost-label">Storage:</span>
                  <span className="cost-value">${costEstimate.storage.toFixed(3)}</span>
                </div>
                <div className="cost-item">
                  <span className="cost-label">Data Transfer:</span>
                  <span className="cost-value">${costEstimate.dataTransfer.toFixed(3)}</span>
                </div>
                <div className="cost-item total">
                  <span className="cost-label">Total (30 days):</span>
                  <span className="cost-value">${costEstimate.total.toFixed(2)}</span>
                </div>
              </div>
              
              {costEstimate.savings && Object.keys(costEstimate.savings).length > 0 && (
                <div className="savings-info">
                  <h4>Potential Savings:</h4>
                  {costEstimate.savings.monthly && (
                    <p>Monthly commitment: Save ${costEstimate.savings.monthly.toFixed(2)} (15%)</p>
                  )}
                  {costEstimate.savings.annual && (
                    <p>Annual commitment: Save ${costEstimate.savings.annual.toFixed(2)} (30%)</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="card">
          <div className="card-content">
            <div className="action-buttons">
              <button
                className="btn btn-secondary"
                onClick={() => setCurrentPage('clusters')}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={createCluster}
                disabled={loading || !clusterForm.name || !clusterForm.provider || !clusterForm.region || !clusterForm.flavor}
              >
                {loading ? 'Creating...' : 'Create Cluster'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderMonitoring = () => (
    <div className="page-content">
      <div className="page-header">
        <h1>Cluster Monitoring</h1>
        <p>Real-time monitoring and alerts for your clusters</p>
      </div>
      
      <div className="monitoring-grid">
        <div className="card">
          <div className="card-header">
            <h2>System Overview</h2>
          </div>
          <div className="card-content">
            <div className="metrics-grid">
              <div className="metric-card">
                <h3>Cluster Health</h3>
                <div className="metric-value success">98.5%</div>
                <p>Overall system health</p>
              </div>
              <div className="metric-card">
                <h3>Resource Utilization</h3>
                <div className="metric-value warning">75.2%</div>
                <p>Average across all clusters</p>
              </div>
              <div className="metric-card">
                <h3>Active Alerts</h3>
                <div className="metric-value error">3</div>
                <p>Requiring attention</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="card-header">
            <h2>Recent Alerts</h2>
          </div>
          <div className="card-content">
            <div className="alert-item warning">
              <div className="alert-content">
                <h4>High CPU Usage</h4>
                <p>Cluster 'production-web' CPU usage above 80%</p>
                <span className="alert-time">2 minutes ago</span>
              </div>
            </div>
            <div className="alert-item error">
              <div className="alert-content">
                <h4>Node Failure</h4>
                <p>Node 'worker-3' in cluster 'ml-training' is unresponsive</p>
                <span className="alert-time">15 minutes ago</span>
              </div>
            </div>
            <div className="alert-item info">
              <div className="alert-content">
                <h4>Scaling Event</h4>
                <p>Cluster 'api-backend' scaled from 3 to 5 nodes</p>
                <span className="alert-time">1 hour ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return renderDashboard();
      case 'clusters':
        return renderClusterList();
      case 'create':
        return renderClusterCreation();
      case 'monitoring':
        return renderMonitoring();
      default:
        return renderDashboard();
    }
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <button className="sidebar-toggle" onClick={handleSidebarToggle}>
            ☰
          </button>
          <div className="logo">
            <span className="logo-icon">🟢</span>
            <span className="logo-text">Sify Cluster-API Console</span>
          </div>
        </div>
        <div className="header-right">
          <div className="user-menu">
            <span className="user-name">Admin User</span>
            <div className="user-avatar">👤</div>
          </div>
        </div>
      </header>

      <div className="main-container">
        {/* Sidebar */}
        <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <nav className="nav">
            <div 
              className={`nav-item ${currentPage === 'dashboard' ? 'active' : ''}`}
              onClick={() => handlePageChange('dashboard')}
            >
              <span className="nav-icon">📊</span>
              <span className="nav-text">Dashboard</span>
            </div>
            <div 
              className={`nav-item ${currentPage === 'clusters' ? 'active' : ''}`}
              onClick={() => handlePageChange('clusters')}
            >
              <span className="nav-icon">🖥️</span>
              <span className="nav-text">Clusters</span>
            </div>
            <div 
              className={`nav-item ${currentPage === 'create' ? 'active' : ''}`}
              onClick={() => handlePageChange('create')}
            >
              <span className="nav-icon">➕</span>
              <span className="nav-text">Create Cluster</span>
            </div>
            <div 
              className={`nav-item ${currentPage === 'monitoring' ? 'active' : ''}`}
              onClick={() => handlePageChange('monitoring')}
            >
              <span className="nav-icon">📈</span>
              <span className="nav-text">Monitoring</span>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="main-content">
          {renderCurrentPage()}
        </main>
      </div>
      
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner">Loading...</div>
        </div>
      )}
    </div>
  );
}

export default App;

