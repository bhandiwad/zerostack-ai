import React, { useState, useEffect } from 'react';
import apiCall from '../../lib/api';

const Dashboard = ({ organization }) => {
  const [dashboardData, setDashboardData] = useState({
    clusters: [],
    totalClusters: 0,
    activeNodes: 0,
    monthlyCost: 0,
    loading: true
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    const result = await apiCall('/mt/clusters');
    if (result && result.success) {
      const clusters = result.data;
      const totalNodes = clusters.reduce((sum, cluster) => sum + cluster.node_count, 0);
      const totalCost = clusters.reduce((sum, cluster) => sum + cluster.monthly_cost, 0);

      setDashboardData({
        clusters,
        totalClusters: clusters.length,
        activeNodes: totalNodes,
        monthlyCost: totalCost,
        loading: false
      });
    } else {
      setDashboardData(prev => ({ ...prev, loading: false }));
    }
  };

  const getProviderDistribution = () => {
    const providers = {};
    dashboardData.clusters.forEach(cluster => {
      providers[cluster.provider] = (providers[cluster.provider] || 0) + 1;
    });
    return providers;
  };

  if (dashboardData.loading) {
    return <div className="loading">🔄 Loading dashboard...</div>;
  }

  const providerDistribution = getProviderDistribution();

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>📊 Organization Dashboard</h2>
        <div className="org-limits">
          <span>Clusters: {dashboardData.totalClusters}/{organization?.max_clusters}</span>
          <span>Subscription: {organization?.subscription_tier}</span>
        </div>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <h3>Total Clusters</h3>
          <div className="stat-value">{dashboardData.totalClusters}</div>
          <div className="stat-change">📈 Active</div>
        </div>

        <div className="stat-card">
          <h3>Active Nodes</h3>
          <div className="stat-value">{dashboardData.activeNodes}</div>
          <div className="stat-change">⚡ Running</div>
        </div>

        <div className="stat-card">
          <h3>Cloud Providers</h3>
          <div className="stat-value">{Object.keys(providerDistribution).length}</div>
          <div className="stat-change">☁️ Multi-cloud</div>
        </div>

        <div className="stat-card">
          <h3>Monthly Cost</h3>
          <div className="stat-value">${dashboardData.monthlyCost.toFixed(0)}</div>
          <div className="stat-change">💰 Estimated</div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="provider-distribution">
          <h3>Provider Distribution</h3>
          <div className="provider-list">
            {Object.entries(providerDistribution).map(([provider, count]) => (
              <div key={provider} className="provider-item">
                <span className="provider-name">{provider.toUpperCase()}</span>
                <span className="provider-count">{count} clusters</span>
              </div>
            ))}
          </div>
        </div>

        <div className="recent-clusters">
          <h3>Recent Clusters</h3>
          <div className="cluster-list">
            {dashboardData.clusters.slice(0, 5).map(cluster => (
              <div key={cluster.id} className="cluster-item">
                <div className="cluster-info">
                  <div className="cluster-name">{cluster.name}</div>
                  <div className="cluster-details">
                    {cluster.provider} • {cluster.region} • {cluster.node_count} nodes
                  </div>
                </div>
                <div className="cluster-status">
                  <span className={`status ${cluster.status}`}>{cluster.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
