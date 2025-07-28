/**
 * @file HelmApplications.jsx
 * @description A component for managing Helm applications on a Kubernetes cluster.
 * Allows users to list, install, and uninstall Helm charts with a user-friendly interface.
 */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './HelmApplications.css';
import CircularProgress from '@mui/material/CircularProgress';

/**
 * @typedef {Object} HelmApplication
 * @property {string} name - The name of the installed application
 * @property {string} namespace - The Kubernetes namespace where the application is installed
 * @property {string} status - The current status of the application (e.g., 'deployed', 'pending', 'failed')
 * @property {string} version - The version of the installed chart
 * @property {string} chart - The name and version of the chart
 * @property {string} [updated] - Timestamp of when the application was last updated
 */

/**
 * @typedef {Object} HelmChart
 * @property {string} name - The name of the chart
 * @property {string} version - The version of the chart
 * @property {string} description - A brief description of the chart
 * @property {string} [icon] - URL to the chart's icon
 * @property {string} [repository] - The repository URL where the chart is located
 * @property {string} [category] - Category of the chart (e.g., 'database', 'monitoring')
 */

/**
 * HelmApplications Component
 * 
 * @param {Object} props - Component props
 * @param {Object} props.cluster - The currently selected cluster
 * @param {Function} props.apiCall - Function to make authenticated API calls
 * @param {Function} props.showNotification - Function to display notifications to the user
 * @returns {JSX.Element} The rendered component
 */
const HelmApplications = ({ cluster, apiCall, showNotification }) => {
  /** @type {[HelmApplication[], Function]} */
  const [applications, setApplications] = useState([]);
  /** @type {[HelmChart[], Function]} */
  const [availableCharts, setAvailableCharts] = useState([]);
  const [loading, setLoading] = useState(true);
  /** @type {[HelmChart|null, Function]} */
  const [selectedChart, setSelectedChart] = useState(null);
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [installConfig, setInstallConfig] = useState({
    name: '',
    namespace: 'default',
    version: '',
    values: {}
  });
  
  const [formErrors, setFormErrors] = useState({
    name: '',
    namespace: '',
    version: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Chart categories
  const categories = [
    { key: 'all', label: 'All Charts', icon: '📦' },
    { key: 'monitoring', label: 'Monitoring', icon: '📊' },
    { key: 'database', label: 'Databases', icon: '🗄️' },
    { key: 'messaging', label: 'Messaging', icon: '💬' },
    { key: 'storage', label: 'Storage', icon: '💾' },
    { key: 'security', label: 'Security', icon: '🔒' },
    { key: 'networking', label: 'Networking', icon: '🌐' },
    { key: 'development', label: 'Development', icon: '🛠️' }
  ];

  // Sample Helm charts (in a real implementation, these would come from Helm repositories)
  const sampleCharts = [
    {
      name: 'prometheus',
      displayName: 'Prometheus',
      description: 'Prometheus is a monitoring system and time series database.',
      version: '25.8.0',
      category: 'monitoring',
      icon: '📊',
      repository: 'prometheus-community',
      home: 'https://prometheus.io/',
      keywords: ['monitoring', 'metrics', 'alerting'],
      maintainers: ['Prometheus Community'],
      sources: ['https://github.com/prometheus/prometheus']
    },
    {
      name: 'grafana',
      displayName: 'Grafana',
      description: 'Grafana is the open source analytics and monitoring solution.',
      version: '7.0.17',
      category: 'monitoring',
      icon: '📈',
      repository: 'grafana',
      home: 'https://grafana.com/',
      keywords: ['monitoring', 'visualization', 'dashboards'],
      maintainers: ['Grafana Labs'],
      sources: ['https://github.com/grafana/grafana']
    },
    {
      name: 'postgresql',
      displayName: 'PostgreSQL',
      description: 'PostgreSQL is a powerful, open source object-relational database system.',
      version: '13.2.30',
      category: 'database',
      icon: '🗄️',
      repository: 'bitnami',
      home: 'https://www.postgresql.org/',
      keywords: ['database', 'sql', 'postgresql'],
      maintainers: ['Bitnami'],
      sources: ['https://github.com/bitnami/charts']
    },
    {
      name: 'redis',
      displayName: 'Redis',
      description: 'Redis is an open source, in-memory data structure store.',
      version: '18.4.0',
      category: 'database',
      icon: '🔴',
      repository: 'bitnami',
      home: 'https://redis.io/',
      keywords: ['cache', 'database', 'redis'],
      maintainers: ['Bitnami'],
      sources: ['https://github.com/bitnami/charts']
    },
    {
      name: 'nginx-ingress',
      displayName: 'NGINX Ingress Controller',
      description: 'NGINX Ingress Controller for Kubernetes.',
      version: '9.7.7',
      category: 'networking',
      icon: '🌐',
      repository: 'ingress-nginx',
      home: 'https://kubernetes.github.io/ingress-nginx/',
      keywords: ['ingress', 'nginx', 'load-balancer'],
      maintainers: ['Kubernetes'],
      sources: ['https://github.com/kubernetes/ingress-nginx']
    },
    {
      name: 'cert-manager',
      displayName: 'cert-manager',
      description: 'A Kubernetes add-on to automate the management and issuance of TLS certificates.',
      version: '1.13.3',
      category: 'security',
      icon: '🔒',
      repository: 'jetstack',
      home: 'https://cert-manager.io/',
      keywords: ['ssl', 'tls', 'certificates', 'security'],
      maintainers: ['Jetstack'],
      sources: ['https://github.com/cert-manager/cert-manager']
    },
    {
      name: 'elasticsearch',
      displayName: 'Elasticsearch',
      description: 'Elasticsearch is a distributed, RESTful search and analytics engine.',
      version: '8.11.1',
      category: 'database',
      icon: '🔍',
      repository: 'elastic',
      home: 'https://www.elastic.co/elasticsearch/',
      keywords: ['search', 'analytics', 'elasticsearch'],
      maintainers: ['Elastic'],
      sources: ['https://github.com/elastic/helm-charts']
    },
    {
      name: 'kibana',
      displayName: 'Kibana',
      description: 'Kibana is an open source analytics and visualization platform.',
      version: '8.11.1',
      category: 'monitoring',
      icon: '📊',
      repository: 'elastic',
      home: 'https://www.elastic.co/kibana/',
      keywords: ['visualization', 'analytics', 'kibana'],
      maintainers: ['Elastic'],
      sources: ['https://github.com/elastic/helm-charts']
    }
  ];

  /**
   * Loads available Helm charts from the API or falls back to sample data
   * @async
   * @returns {Promise<void>}
   */
  const loadAvailableCharts = async () => {
    if (!cluster?.id) return;
    
    try {
      // First try to fetch from the backend
      const result = await apiCall(`/clusters/${cluster.id}/charts`);
      
      if (result && result.success) {
        setAvailableCharts(result.data || []);
      } else {
        // Fallback to sample charts if API call fails
        console.warn('Using sample charts as fallback');
        setAvailableCharts(sampleCharts);
      }
    } catch (error) {
      console.error('Error loading available charts:', error);
      // Fallback to sample charts on error
      setAvailableCharts(sampleCharts);
    }
  };

  useEffect(() => {
    if (cluster) {
      loadApplications();
      loadAvailableCharts();
    }
  }, [cluster]);

  /**
   * Fetches the list of installed applications from the API
   * @async
   * @returns {Promise<void>}
   */
  const loadApplications = async () => {
    if (!cluster?.id) return;
    
    setLoading(true);
    try {
      const result = await apiCall(`/clusters/${cluster.id}/applications`);
      if (result && result.success) {
        setApplications(result.data || []);
      } else {
        throw new Error(result?.error || 'Failed to load applications');
      }
    } catch (error) {
      console.error('Error loading applications:', error);
      showNotification(`Failed to load applications: ${error.message}`, 'error');
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Validates the installation form
   * @returns {boolean} True if the form is valid, false otherwise
   */
  const validateForm = () => {
    const errors = {
      name: !installConfig.name.trim() ? 'Application name is required' : 
            !/^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$/.test(installConfig.name) ? 
            'Name must be a valid DNS subdomain name' : '',
      namespace: !installConfig.namespace.trim() ? 'Namespace is required' : '',
      version: ''
    };
    
    setFormErrors(errors);
    return !Object.values(errors).some(error => error);
  };

  /**
   * Handles the installation of a Helm chart
   * @async
   * @returns {Promise<void>}
   * @throws {Error} If installation fails
   */
  const handleInstallChart = async () => {
    if (!selectedChart) {
      showNotification('Please select a chart to install', 'error');
      return;
    }
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    if (!cluster?.id) {
      showNotification('No cluster selected', 'error');
      return;
    }

    try {
      const payload = {
        name: installConfig.name,
        namespace: installConfig.namespace,
        chart: selectedChart.name,
        version: installConfig.version || selectedChart.version,
        repository: selectedChart.repository,
        values: installConfig.values || {}
      };

      const result = await apiCall(`/clusters/${cluster.id}/applications`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      if (result && result.success) {
        showNotification(`Application "${installConfig.name}" installation started successfully`);
        setShowInstallDialog(false);
        setInstallConfig({ name: '', namespace: 'default', version: '', values: {} });
        loadApplications();
      } else {
        throw new Error(result?.error || 'Failed to start installation');
      }
    } catch (error) {
      console.error('Error installing application:', error);
      showNotification(`Failed to install application: ${error.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Opens the installation dialog for a specific chart
   * @param {HelmChart} chart - The chart to install
   */
  const handleOpenInstallDialog = (chart) => {
    setSelectedChart(chart);
    setInstallConfig({
      name: chart.name,
      namespace: 'default',
      version: chart.version,
      values: {}
    });
    setFormErrors({
      name: '',
      namespace: '',
      version: ''
    });
    setShowInstallDialog(true);
  };

  /**
   * Handles input changes in the installation form
   * @param {React.ChangeEvent<HTMLInputElement|HTMLSelectElement>} e - The change event
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setInstallConfig(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  /** @type {[string|null, Function]} */
  const [uninstallingApp, setUninstallingApp] = useState(null);

  /**
   * Handles the uninstallation of a Helm release
   * @async
   * @param {HelmApplication} app - The application to uninstall
   * @returns {Promise<void>}
   */
  const handleUninstallApplication = async (app) => {
    if (!window.confirm(`Are you sure you want to uninstall "${app.name}" from namespace "${app.namespace}"? This action cannot be undone.`)) {
      return;
    }
    
    setUninstallingApp(app.name);

    if (!cluster?.id) {
      showNotification('No cluster selected', 'error');
      return;
    }

    try {
      const result = await apiCall(
        `/clusters/${cluster.id}/namespaces/${app.namespace}/releases/${app.name}`, 
        { method: 'DELETE' }
      );
      
      if (result && result.success) {
        showNotification(`Application "${app.name}" uninstallation started successfully`);
        loadApplications();
      } else {
        throw new Error(result?.error || 'Failed to start uninstallation');
      }
    } catch (error) {
      console.error('Error uninstalling application:', error);
      showNotification(`Failed to uninstall application: ${error.message}`, 'error');
    }
  };

  const getApplicationStatusColor = (status) => {
    switch (status) {
      case 'deployed': return 'success';
      case 'pending': return 'warning';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  const filteredCharts = availableCharts.filter(chart => {
    const matchesSearch = chart.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         chart.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || chart.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (!cluster) {
    return (
      <div className="helm-applications">
        <div className="applications-placeholder">
          <h3>Select a Cluster</h3>
          <p>Choose a cluster to manage Helm applications.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="helm-applications">
      {/* Header */}
      <div className="applications-header">
        <div className="applications-title">
          <h2>Helm Applications</h2>
          <span className="cluster-name">{cluster.name}</span>
        </div>
        <div className="applications-actions">
          <button 
            className="refresh-button"
            onClick={loadApplications}
            disabled={loading}
          >
            {loading ? '🔄' : '🔄'} Refresh
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="applications-navigation">
        <div className="category-tabs">
          {categories.map(category => (
            <button
              key={category.key}
              className={`category-tab ${selectedCategory === category.key ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category.key)}
            >
              <span className="tab-icon">{category.icon}</span>
              <span className="tab-label">{category.label}</span>
            </button>
          ))}
        </div>

        <div className="search-box">
          <input
            type="text"
            placeholder="Search applications..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="applications-content">
        <div className="applications-tabs">
          <button className="tab-button active">📦 Available Charts</button>
          <button className="tab-button">🚀 Installed Applications</button>
        </div>

        <div className="applications-grid">
          {loading ? (
            <div className="loading-applications">
              <div className="spinner"></div>
              <p>Loading applications...</p>
            </div>
          ) : (
            filteredCharts.map(chart => (
              <div key={chart.name} className="chart-card">
                <div className="chart-header">
                  <div className="chart-icon">{chart.icon}</div>
                  <div className="chart-info">
                    <h4>{chart.displayName}</h4>
                    <span className="chart-version">v{chart.version}</span>
                  </div>
                </div>
                
                <div className="chart-description">
                  <p>{chart.description}</p>
                </div>

                <div className="chart-details">
                  <div className="detail-item">
                    <span className="label">Repository:</span>
                    <span className="value">{chart.repository}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Category:</span>
                    <span className="value">{chart.category}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Maintainer:</span>
                    <span className="value">{chart.maintainers.join(', ')}</span>
                  </div>
                </div>

                <div className="chart-actions">
                  <button
                    className={`action-btn install ${uninstallingApp === chart.name ? 'loading' : ''}`}
                    onClick={() => handleOpenInstallDialog(chart)}
                    disabled={uninstallingApp === chart.name}
                  >
                    {uninstallingApp === chart.name ? (
                      <>
                        <CircularProgress size={16} style={{ marginRight: '6px', color: 'inherit' }} />
                        Installing...
                      </>
                    ) : 'Install'}
                  </button>
                  
                  <button
                    className="action-btn details"
                    onClick={() => window.open(chart.home, '_blank')}
                  >
                    📖 Details
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Install Dialog */}
      {showInstallDialog && selectedChart && (
        <div className="modal-overlay">
          <div className="install-dialog">
            <div className="dialog-header">
              <h3>Install {selectedChart.displayName}</h3>
              <button 
                className="close-button"
                onClick={() => setShowInstallDialog(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="dialog-content">
              <div className="form-group">
                <label>Application Name *</label>
                <input
                  type="text"
                  value={installConfig.name}
                  onChange={handleInputChange}
                  name="name"
                  placeholder="Enter application name"
                />
                {formErrors.name && <div className="error-message">{formErrors.name}</div>}
              </div>
              
              <div className="form-group">
                <label>Namespace *</label>
                <select
                  value={installConfig.namespace}
                  onChange={handleInputChange}
                  name="namespace"
                >
                  <option value="default">default</option>
                  <option value="monitoring">monitoring</option>
                  <option value="kube-system">kube-system</option>
                </select>
                {formErrors.namespace && <div className="error-message">{formErrors.namespace}</div>}
              </div>
              
              <div className="form-group">
                <label>Version</label>
                <select
                  value={installConfig.version}
                  onChange={handleInputChange}
                  name="version"
                >
                  <option value={selectedChart.version}>{selectedChart.version}</option>
                  <option value="latest">latest</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={selectedChart.description}
                  readOnly
                  rows={3}
                />
              </div>
            </div>
            
            <div className="dialog-actions">
              <button 
                className="cancel-button"
                onClick={() => setShowInstallDialog(false)}
              >
                Cancel
              </button>
              <button 
                className={`install-button ${isSubmitting ? 'loading' : ''}`}
                onClick={handleInstallChart}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <CircularProgress size={20} style={{ marginRight: '8px', color: '#fff' }} />
                    Installing...
                  </>
                ) : '🚀 Install Application'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

HelmApplications.propTypes = {
  cluster: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
  }),
  apiCall: PropTypes.func.isRequired,
  showNotification: PropTypes.func.isRequired,
};

export default HelmApplications; 