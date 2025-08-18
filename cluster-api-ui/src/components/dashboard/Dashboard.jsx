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
          <Link to="/clusters/create" className="action-card">
            <div className="action-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/>
              </svg>
            </div>
            <div className="action-content">
              <h3>Create Cluster</h3>
              <p>Deploy new Kubernetes cluster</p>
            </div>
          </Link>
          <Link to="/agents/management" className="action-card">
            <div className="action-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.22,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.22,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"/>
              </svg>
            </div>
            <div className="action-content">
              <h3>Agent Control</h3>
              <p>{agentStats.activeAgents}/{agentStats.totalAgents} agents running</p>
            </div>
          </Link>
          <Link to="/agents/training" className="action-card">
            <div className="action-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,3L1,9L12,15L21,10.09V17H23V9M5,13.18V17.18L12,21L19,17.18V13.18L12,17L5,13.18Z"/>
              </svg>
            </div>
            <div className="action-content">
              <h3>Training</h3>
              <p>Customize agent behavior</p>
            </div>
          </Link>
          <Link to="/agents/monitoring" className="action-card">
            <div className="action-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3,3V21H21V3H3M9,17H7V10H9V17M13,17H11V7H13V17M17,17H15V13H17V17Z"/>
              </svg>
            </div>
            <div className="action-content">
              <h3>Monitoring</h3>
              <p>Real-time metrics</p>
            </div>
          </Link>
        </div>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card cluster-stat">
          <div className="stat-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12,2A2,2 0 0,1 14,4A2,2 0 0,1 12,6A2,2 0 0,1 10,4A2,2 0 0,1 12,2M21,9V7L15,1H5A2,2 0 0,0 3,3V21A2,2 0 0,0 5,23H19A2,2 0 0,0 21,21V9M19,9H14V4H19V9Z"/>
            </svg>
          </div>
          <div className="stat-content">
            <h3>Clusters</h3>
            <div className="stat-value">{dashboardData.totalClusters}</div>
            <div className="stat-change">📈 Active</div>
          </div>
        </div>

        <div className="stat-card node-stat">
          <div className="stat-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11,9H13V7H11M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,17H13V11H11V17Z"/>
            </svg>
          </div>
          <div className="stat-content">
            <h3>Nodes</h3>
            <div className="stat-value">{dashboardData.activeNodes}</div>
            <div className="stat-change">🟢 Running</div>
          </div>
        </div>

        <div className="stat-card agent-stat">
          <div className="stat-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12,2A2,2 0 0,1 14,4A2,2 0 0,1 12,6A2,2 0 0,1 10,4A2,2 0 0,1 12,2M21,9V7L15,1H5A2,2 0 0,0 3,3V21A2,2 0 0,0 5,23H19A2,2 0 0,0 21,21V9M19,9H14V4H19V9Z"/>
            </svg>
          </div>
          <div className="stat-content">
            <h3>AI Agents</h3>
            <div className="stat-value">{agentStats.activeAgents}</div>
            <div className="stat-change">🚀 Intelligent</div>
          </div>
        </div>

        <div className="stat-card cost-stat">
          <div className="stat-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7,15H9C9,16.08 10.37,17 12,17C13.63,17 15,16.08 15,15C15,13.9 13.96,13.5 11.76,12.97C9.64,12.44 7,11.78 7,9C7,7.21 8.47,5.69 10.5,5.18V3H13.5V5.18C15.53,5.69 17,7.21 17,9H15C15,7.92 13.63,7 12,7C10.37,7 9,7.92 9,9C9,10.1 10.04,10.5 12.24,11.03C14.36,11.56 17,12.22 17,15C17,16.79 15.53,18.31 13.5,18.82V21H10.5V18.82C8.47,18.31 7,16.79 7,15Z"/>
            </svg>
          </div>
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
