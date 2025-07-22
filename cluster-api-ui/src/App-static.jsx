import React, { useState, useEffect } from 'react';
import './App.css';
import CloudAccountManager from './components/CloudAccountManager';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [clusters, setClusters] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cluster creation form state
  const [clusterForm, setClusterForm] = useState({
    name: '',
    topology: 'Multi-Master HA',
    nodeCount: 3,
    provider: '',
    region: '',
    version: '',
    instanceType: '',
    storageSize: 100,
    networkConfig: {
      vpcCidr: '10.0.0.0/16',
      subnetCidr: '10.0.1.0/24'
    }
  });

  const [providerData, setProviderData] = useState({
    regions: [],
    versions: [],
    flavors: [],
    loadingRegions: false,
    loadingVersions: false,
    loadingFlavors: false
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [clustersRes, providersRes] = await Promise.all([
        fetch('http://localhost:5000/api/clusters'),
        fetch('http://localhost:5000/api/providers')
      ]);

      const clustersData = await clustersRes.json();
      const providersData = await providersRes.json();

      if (clustersData.success) {
        setClusters(clustersData.data);
      }

      if (providersData.success) {
        setProviders(providersData.data);
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProviderRegions = async (providerId) => {
    setProviderData(prev => ({ ...prev, loadingRegions: true }));
    try {
      const response = await fetch(`http://localhost:5000/api/providers/${providerId}/regions`);
      const data = await response.json();
      if (data.success) {
        setProviderData(prev => ({ ...prev, regions: data.data }));
      }
    } catch (error) {
      console.error('Error fetching regions:', error);
    } finally {
      setProviderData(prev => ({ ...prev, loadingRegions: false }));
    }
  };

  const fetchProviderVersions = async (providerId) => {
    setProviderData(prev => ({ ...prev, loadingVersions: true }));
    try {
      const response = await fetch(`http://localhost:5000/api/providers/${providerId}/versions`);
      const data = await response.json();
      if (data.success) {
        setProviderData(prev => ({ ...prev, versions: data.data }));
      }
    } catch (error) {
      console.error('Error fetching versions:', error);
    } finally {
      setProviderData(prev => ({ ...prev, loadingVersions: false }));
    }
  };

  const handleProviderSelect = (providerId) => {
    setClusterForm(prev => ({ ...prev, provider: providerId, region: '', version: '' }));
    setProviderData(prev => ({ ...prev, regions: [], versions: [], flavors: [] }));
    
    if (providerId) {
      fetchProviderRegions(providerId);
      fetchProviderVersions(providerId);
    }
  };

  const handleCreateCluster = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/clusters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clusterForm)
      });

      const data = await response.json();
      if (data.success) {
        setClusters(prev => [data.data, ...prev]);
        setCurrentPage('clusters');
        // Reset form
        setClusterForm({
          name: '',
          topology: 'Multi-Master HA',
          nodeCount: 3,
          provider: '',
          region: '',
          version: '',
          instanceType: '',
          storageSize: 100,
          networkConfig: {
            vpcCidr: '10.0.0.0/16',
            subnetCidr: '10.0.1.0/24'
          }
        });
      }
    } catch (error) {
      console.error('Error creating cluster:', error);
    }
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return renderDashboard();
      case 'clusters':
        return renderClusterList();
      case 'create-cluster':
        return renderClusterCreation();
      case 'cloud-accounts':
        return <CloudAccountManager />;
      case 'monitoring':
        return renderMonitoring();
      default:
        return renderDashboard();
    }
  };

  const renderDashboard = () => (
    <div className="dashboard">
      <h1>Cluster Dashboard</h1>
      <p>Overview of your Kubernetes clusters across all providers</p>
      
      <div className="stats-grid">
        <div className="stat-card total">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3>Total Clusters</h3>
            <div className="stat-number">{clusters.length}</div>
            <p>Across all providers</p>
          </div>
        </div>
        
        <div className="stat-card running">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>Running</h3>
            <div className="stat-number">{clusters.filter(c => c.status === 'running').length}</div>
            <p>Active clusters</p>
          </div>
        </div>
        
        <div className="stat-card pending">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <h3>Pending</h3>
            <div className="stat-number">{clusters.filter(c => c.status === 'pending').length}</div>
            <p>Being created</p>
          </div>
        </div>
        
        <div className="stat-card failed">
          <div className="stat-icon">❌</div>
          <div className="stat-content">
            <h3>Failed</h3>
            <div className="stat-number">{clusters.filter(c => c.status === 'failed').length}</div>
            <p>Need attention</p>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="recent-clusters">
          <div className="section-header">
            <h2>Recent Clusters</h2>
            <button 
              className="btn-primary"
              onClick={() => setCurrentPage('create-cluster')}
            >
              Create New Cluster
            </button>
          </div>
          
          {clusters.length === 0 ? (
            <div className="empty-state">
              <p>No clusters found. Create your first cluster to get started.</p>
            </div>
          ) : (
            <div className="cluster-list">
              {clusters.slice(0, 5).map(cluster => (
                <div key={cluster.id} className="cluster-item">
                  <div className="cluster-info">
                    <h3>{cluster.name}</h3>
                    <p>{cluster.provider} • {cluster.region}</p>
                  </div>
                  <div className={`cluster-status ${cluster.status}`}>
                    {cluster.status}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="provider-distribution">
          <h2>Provider Distribution</h2>
          <div className="provider-stats">
            {providers.map(provider => (
              <div key={provider.id} className="provider-stat">
                <div className="provider-icon">{provider.icon}</div>
                <div className="provider-info">
                  <span className="provider-name">{provider.name}</span>
                  <span className="cluster-count">
                    {clusters.filter(c => c.provider === provider.id).length}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderClusterList = () => (
    <div className="cluster-management">
      <h1>Cluster Management</h1>
      <p>Manage your Kubernetes clusters across all cloud providers</p>
      
      <div className="cluster-grid">
        {clusters.map(cluster => (
          <div key={cluster.id} className="cluster-card">
            <div className="cluster-header">
              <h3>{cluster.name}</h3>
              <div className={`status-badge ${cluster.status}`}>
                {cluster.status}
              </div>
            </div>
            
            <div className="cluster-details">
              <p><strong>Provider:</strong> {cluster.provider}</p>
              <p><strong>Region:</strong> {cluster.region}</p>
              <p><strong>Version:</strong> {cluster.version}</p>
              <p><strong>Nodes:</strong> {cluster.nodeCount}</p>
            </div>
            
            <div className="cluster-actions">
              <button className="btn-secondary">Manage</button>
              <button className="btn-outline">Scale</button>
              <button className="btn-danger">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderClusterCreation = () => (
    <div className="cluster-creation">
      <h1>Create New Cluster</h1>
      <p>Configure your Kubernetes cluster with dynamic provider options</p>
      
      <div className="creation-form">
        <div className="form-section">
          <h2>Basic Configuration</h2>
          
          <div className="form-row">
            <div className="form-group">
              <label>Cluster Name *</label>
              <input
                type="text"
                value={clusterForm.name}
                onChange={(e) => setClusterForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter cluster name"
              />
            </div>
            
            <div className="form-group">
              <label>Cluster Topology *</label>
              <select
                value={clusterForm.topology}
                onChange={(e) => setClusterForm(prev => ({ ...prev, topology: e.target.value }))}
              >
                <option value="Single Master">Single Master</option>
                <option value="Multi-Master HA">Multi-Master HA</option>
                <option value="All-in-One">All-in-One</option>
                <option value="Custom Topology">Custom Topology</option>
              </select>
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Node Count *</label>
              <input
                type="number"
                value={clusterForm.nodeCount}
                onChange={(e) => setClusterForm(prev => ({ ...prev, nodeCount: parseInt(e.target.value) }))}
                min="1"
                max="100"
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h2>Cloud Provider</h2>
          <p>Select your cloud provider and region</p>
          
          <div className="provider-grid">
            {providers.map(provider => (
              <div
                key={provider.id}
                className={`provider-card ${clusterForm.provider === provider.id ? 'selected' : ''}`}
                onClick={() => handleProviderSelect(provider.id)}
              >
                <div className="provider-icon">{provider.icon}</div>
                <h3>{provider.name}</h3>
                <p>{provider.description}</p>
                <div className="provider-services">
                  {provider.services.map(service => (
                    <span key={service} className="service-tag">{service}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {clusterForm.provider && (
          <>
            <div className="form-section">
              <h2>Provider Configuration</h2>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Region *</label>
                  <div className="select-with-refresh">
                    <select
                      value={clusterForm.region}
                      onChange={(e) => setClusterForm(prev => ({ ...prev, region: e.target.value }))}
                      disabled={providerData.loadingRegions}
                    >
                      <option value="">Select a region</option>
                      {providerData.regions.map(region => (
                        <option key={region.id} value={region.id}>
                          {region.name}
                        </option>
                      ))}
                    </select>
                    <button 
                      className="refresh-btn"
                      onClick={() => fetchProviderRegions(clusterForm.provider)}
                      disabled={providerData.loadingRegions}
                    >
                      Refresh Regions
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="form-section">
              <h2>Kubernetes Version</h2>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Kubernetes Version *</label>
                  <select
                    value={clusterForm.version}
                    onChange={(e) => setClusterForm(prev => ({ ...prev, version: e.target.value }))}
                    disabled={providerData.loadingVersions}
                  >
                    <option value="">Select version</option>
                    {providerData.versions.map(version => (
                      <option key={version} value={version}>
                        {version}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="form-actions">
          <button 
            className="btn-secondary"
            onClick={() => setCurrentPage('dashboard')}
          >
            Cancel
          </button>
          <button 
            className="btn-primary"
            onClick={handleCreateCluster}
            disabled={!clusterForm.name || !clusterForm.provider || !clusterForm.region || !clusterForm.version}
          >
            Create Cluster
          </button>
        </div>
      </div>
    </div>
  );

  const renderMonitoring = () => (
    <div className="monitoring">
      <h1>Monitoring Dashboard</h1>
      <p>Real-time monitoring and alerts for your clusters</p>
      
      <div className="monitoring-grid">
        <div className="metric-card">
          <h3>Cluster Health</h3>
          <div className="metric-value">98%</div>
          <p>Overall health score</p>
        </div>
        
        <div className="metric-card">
          <h3>Resource Utilization</h3>
          <div className="metric-value">67%</div>
          <p>Average across clusters</p>
        </div>
        
        <div className="metric-card">
          <h3>Active Alerts</h3>
          <div className="metric-value">3</div>
          <p>Require attention</p>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading Cluster-API Console...</p>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            ☰
          </button>
          <div className="logo">
            <span className="logo-icon">🚀</span>
            <span className="logo-text">Sify Cluster-API Console</span>
          </div>
        </div>
        
        <div className="header-right">
          <div className="user-menu">
            <span>Admin User</span>
            <div className="user-avatar">👤</div>
          </div>
        </div>
      </header>

      <div className="main-container">
        {/* Sidebar */}
        <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <nav className="nav-menu">
            <div 
              className={`nav-item ${currentPage === 'dashboard' ? 'active' : ''}`}
              onClick={() => setCurrentPage('dashboard')}
            >
              <span className="nav-icon">📊</span>
              <span className="nav-text">Dashboard</span>
            </div>
            
            <div 
              className={`nav-item ${currentPage === 'clusters' ? 'active' : ''}`}
              onClick={() => setCurrentPage('clusters')}
            >
              <span className="nav-icon">💻</span>
              <span className="nav-text">Clusters</span>
            </div>
            
            <div 
              className={`nav-item ${currentPage === 'create-cluster' ? 'active' : ''}`}
              onClick={() => setCurrentPage('create-cluster')}
            >
              <span className="nav-icon">➕</span>
              <span className="nav-text">Create Cluster</span>
            </div>
            
            <div 
              className={`nav-item ${currentPage === 'cloud-accounts' ? 'active' : ''}`}
              onClick={() => setCurrentPage('cloud-accounts')}
            >
              <span className="nav-icon">🔐</span>
              <span className="nav-text">Cloud Accounts</span>
            </div>
            
            <div 
              className={`nav-item ${currentPage === 'monitoring' ? 'active' : ''}`}
              onClick={() => setCurrentPage('monitoring')}
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
    </div>
  );
}

export default App;

