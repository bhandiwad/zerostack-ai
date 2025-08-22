import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
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
      const result = await api.get('/multitenant/clusters');
      setClusters(Array.isArray(result) ? result : []);
      if (Array.isArray(result) && result.length > 0 && !selectedCluster) {
        setSelectedCluster(result[0]);
      }
    } catch (error) {
      console.error('Error loading clusters:', error);
      showNotification('Error loading clusters: ' + (error.message || 'Unknown error'), 'error');
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
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center gap-3 text-gray-600">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="text-lg">Loading clusters...</span>
          </div>
        </div>
      </div>
    );
  }

  if (clusters.length === 0) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-xl p-8 border border-gray-200 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-gray-400">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Clusters Available</h3>
          <p className="text-gray-600">Create a cluster first to manage Helm applications.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
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
        <div className="space-y-8">
          {/* Modern Header */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-8 border border-indigo-200">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                  <path d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Helm Applications</h1>
                <p className="text-gray-600 mt-1">Manage and deploy applications using Helm charts</p>
              </div>
            </div>
          </div>

          {/* Cluster Selection */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Select a Cluster</h2>
            <p className="text-gray-600 mb-6">Choose a cluster to manage Helm applications:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clusters.map(cluster => (
                <div 
                  key={cluster.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer hover:border-indigo-300"
                  onClick={() => setSelectedCluster(cluster)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">{cluster.name}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      cluster.status?.toLowerCase() === 'running' 
                        ? 'bg-green-100 text-green-800' 
                        : cluster.status?.toLowerCase() === 'stopped'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {cluster.status || 'Unknown'}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Provider:</span>
                      <span className="font-medium">{cluster.provider}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Region:</span>
                      <span className="font-medium">{cluster.region}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Nodes:</span>
                      <span className="font-medium">{cluster.node_count || 0}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HelmApplicationsPage;
