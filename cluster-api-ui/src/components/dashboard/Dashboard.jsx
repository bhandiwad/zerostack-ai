import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiCall from '../../lib/api';
import './Dashboard.css';

const Dashboard = ({ organization }) => {
  const [dashboardData, setDashboardData] = useState({
    clusters: [],
    totalClusters: 0,
    activeNodes: 0,
    monthlyCost: 0,
    loading: true
  });
  
  const [agentStats, setAgentStats] = useState({
    totalAgents: 12,
    activeAgents: 10,
    supportTickets: 47,
    automationTasks: 156,
    loading: false
  });

  useEffect(() => {
    loadDashboardData();
    loadAgentStats();
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

  const loadAgentStats = async () => {
    // Mock agent statistics - in production this would call the agent APIs
    setTimeout(() => {
      setAgentStats({
        totalAgents: 12,
        activeAgents: 10,
        supportTickets: 47,
        automationTasks: 156,
        loading: false
      });
    }, 500);
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
        <div className="header-content">
          <div className="header-text">
            <h1>🚀 ZeroStack AI</h1>
            <p>Zero Ops. Full Stack. – Intelligent Kubernetes management with AI-powered automation</p>
          </div>
          <div className="org-info">
            <div className="org-badge">
              <span className="org-name">{organization?.name}</span>
              <span className="org-tier">{organization?.subscription_tier}</span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Agent Quick Actions */}
      <div className="quick-actions">
        <h2>🤖 ZeroStack AI Agent Hub</h2>
        <div className="action-cards">
          <Link to="/agents/support" className="action-card">
            <div className="action-icon">🎫</div>
            <div className="action-content">
              <h3>Support System</h3>
              <p>{agentStats.supportTickets} active tickets</p>
            </div>
          </Link>
          <Link to="/agents/management" className="action-card">
            <div className="action-icon">⚙️</div>
            <div className="action-content">
              <h3>Agent Control</h3>
              <p>{agentStats.activeAgents}/{agentStats.totalAgents} agents running</p>
            </div>
          </Link>
          <Link to="/agents/training" className="action-card">
            <div className="action-icon">🎓</div>
            <div className="action-content">
              <h3>Training</h3>
              <p>Customize agent behavior</p>
            </div>
          </Link>
          <Link to="/agents/monitoring" className="action-card">
            <div className="action-icon">📊</div>
            <div className="action-content">
              <h3>Monitoring</h3>
              <p>Real-time metrics</p>
            </div>
          </Link>
        </div>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card cluster-stat">
          <div className="stat-icon">🏗️</div>
          <div className="stat-content">
            <h3>Clusters</h3>
            <div className="stat-value">{dashboardData.totalClusters}</div>
            <div className="stat-change">📈 Active</div>
          </div>
        </div>

        <div className="stat-card node-stat">
          <div className="stat-icon">⚡</div>
          <div className="stat-content">
            <h3>Nodes</h3>
            <div className="stat-value">{dashboardData.activeNodes}</div>
            <div className="stat-change">🟢 Running</div>
          </div>
        </div>

        <div className="stat-card agent-stat">
          <div className="stat-icon">🤖</div>
          <div className="stat-content">
            <h3>AI Agents</h3>
            <div className="stat-value">{agentStats.activeAgents}</div>
            <div className="stat-change">🚀 Intelligent</div>
          </div>
        </div>

        <div className="stat-card cost-stat">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>Monthly Cost</h3>
            <div className="stat-value">${dashboardData.monthlyCost.toFixed(0)}</div>
            <div className="stat-change">📊 Optimized</div>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="content-grid">
          <div className="agent-overview">
            <h3>🤖 Agent Activity</h3>
            <div className="agent-activities">
              <div className="activity-item">
                <div className="activity-icon">🎫</div>
                <div className="activity-content">
                  <div className="activity-title">Support Tickets</div>
                  <div className="activity-value">{agentStats.supportTickets} active</div>
                </div>
              </div>
              <div className="activity-item">
                <div className="activity-icon">🔄</div>
                <div className="activity-content">
                  <div className="activity-title">Automation Tasks</div>
                  <div className="activity-value">{agentStats.automationTasks} completed</div>
                </div>
              </div>
              <div className="activity-item">
                <div className="activity-icon">🔍</div>
                <div className="activity-content">
                  <div className="activity-title">Security Scans</div>
                  <div className="activity-value">23 today</div>
                </div>
              </div>
              <div className="activity-item">
                <div className="activity-icon">📈</div>
                <div className="activity-content">
                  <div className="activity-title">Scaling Events</div>
                  <div className="activity-value">12 optimizations</div>
                </div>
              </div>
            </div>
          </div>

          <div className="provider-distribution">
            <h3>☁️ Cloud Providers</h3>
            <div className="provider-list">
              {Object.entries(providerDistribution).map(([provider, count]) => (
                <div key={provider} className="provider-item">
                  <div className="provider-info">
                    <span className="provider-name">{provider.toUpperCase()}</span>
                    <span className="provider-count">{count} clusters</span>
                  </div>
                  <div className="provider-bar">
                    <div 
                      className="provider-fill" 
                      style={{ width: `${(count / dashboardData.totalClusters) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="recent-clusters">
            <h3>🏗️ Recent Clusters</h3>
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
    </div>
  );
};

export default Dashboard;
