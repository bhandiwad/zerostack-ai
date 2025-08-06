import React, { useState, useEffect } from 'react';
import apiCall from '../../lib/api';
import { HelmCharts as HelmApplications } from '../../features/helm';
import Notification from '../../components/common/Notification';

const HelmApplicationsPage = () => {
  const [clusters, setClusters] = useState([]);
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({
    show: false,
    message: '',
    type: 'info'
  });

  useEffect(() => {
    loadClusters();
  }, []);

  const loadClusters = async () => {
    setLoading(true);
    try {
      const result = await apiCall('/mt/clusters');
      if (result && result.success) {
        setClusters(result.data);
        if (result.data && result.data.length > 0 && !selectedCluster) {
          setSelectedCluster(result.data[0]);
        }
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

  const showNotification = (message, type = 'info') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'info' }), 5000);
  };

  if (loading) {
    return (
      <div className="helm-applications-page">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading clusters...</p>
        </div>
      </div>
    );
  }

  if (clusters.length === 0) {
    return (
      <div className="helm-applications-page">
        <div className="applications-placeholder">
          <h3>No Clusters Available</h3>
          <p>Create a cluster first to manage Helm applications.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="helm-applications-page">
      <Notification 
        notification={notification}
        onClose={() => setNotification(prev => ({...prev, show: false}))} 
      />
      
      {selectedCluster ? (
        <HelmApplications 
          cluster={selectedCluster}
          apiCall={apiCall}
          showNotification={showNotification}
        />
      ) : (
        <div className="cluster-selector">
          <h2>Select a Cluster</h2>
          <p>Choose a cluster to manage Helm applications:</p>
          <div className="cluster-grid">
            {clusters.map(cluster => (
              <div 
                key={cluster.id}
                className="cluster-card clickable"
                onClick={() => setSelectedCluster(cluster)}
              >
                <div className="cluster-header">
                  <h3>{cluster.name}</h3>
                  <span className={`status ${cluster.status?.toLowerCase()}`}>
                    {cluster.status || 'Unknown'}
                  </span>
                </div>
                <div className="cluster-details">
                  <div className="detail-row">
                    <span>Provider:</span>
                    <span>{cluster.provider}</span>
                  </div>
                  <div className="detail-row">
                    <span>Region:</span>
                    <span>{cluster.region}</span>
                  </div>
                  <div className="detail-row">
                    <span>Nodes:</span>
                    <span>{cluster.node_count || 0}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HelmApplicationsPage;
