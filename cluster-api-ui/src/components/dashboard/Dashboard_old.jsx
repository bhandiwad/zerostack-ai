import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../utils/api';

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
    try {
      const result = await api.get('/multitenant/clusters');
      const clusters = Array.isArray(result) ? result : [];
      const totalNodes = clusters.reduce((sum, cluster) => sum + (cluster.node_count || 0), 0);
      const totalCost = clusters.reduce((sum, cluster) => sum + (cluster.monthly_cost || 0), 0);

      setDashboardData({
        clusters,
        totalClusters: clusters.length,
        activeNodes: totalNodes,
        monthlyCost: totalCost,
        loading: false
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setDashboardData(prev => ({
        ...prev,
        loading: false
      }));
    }
  };

  const loadAgentStats = async () => {
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

  if (dashboardData.loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* ZeroStack Banner Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 rounded-2xl p-8 mb-8 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">ZeroStack AI</h1>
              <p className="text-xl opacity-90">Zero Ops, Full Stack – Intelligent Kubernetes management with AI-powered automation</p>
              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm">System Online</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span className="text-sm">AI Agents Active</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => window.location.reload()}
                className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
              <Link 
                to="/clusters/new"
                className="bg-white text-indigo-600 hover:bg-gray-50 px-6 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Cluster
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-l-blue-500 hover:shadow-xl transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Total Clusters</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{dashboardData.totalClusters}</p>
                <p className="text-sm text-gray-500 mt-1">Managed</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-l-green-500 hover:shadow-xl transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Active Nodes</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{dashboardData.activeNodes}</p>
                <p className="text-sm text-gray-500 mt-1">Running</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-l-purple-500 hover:shadow-xl transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">AI Agents</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{agentStats.activeAgents}</p>
                <p className="text-sm text-gray-500 mt-1">Active</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-l-orange-500 hover:shadow-xl transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Monthly Cost</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">${dashboardData.monthlyCost}</p>
                <p className="text-sm text-gray-500 mt-1">Estimated</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Clusters */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Clusters</h3>
            <div className="space-y-3">
              {dashboardData.clusters.slice(0, 5).map((cluster, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="font-medium text-gray-900">{cluster.name || `cluster-${index + 1}`}</p>
                      <p className="text-sm text-gray-500">{cluster.provider || 'AWS'} • {cluster.region || 'us-east-1'}</p>
                    </div>
                  </div>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Running</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-4">
              <Link to="/clusters/new" className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 text-center">
                <svg className="w-6 h-6 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <p className="text-sm font-medium">New Cluster</p>
              </Link>
              <Link to="/monitoring" className="p-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 text-center">
                <svg className="w-6 h-6 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="text-sm font-medium">Monitoring</p>
              </Link>
              <Link to="/ai-hub" className="p-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 text-center">
                <svg className="w-6 h-6 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <p className="text-sm font-medium">AI Hub</p>
              </Link>
              <Link to="/helm-applications" className="p-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-200 text-center">
                <svg className="w-6 h-6 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <p className="text-sm font-medium">Helm Apps</p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link to="/clusters/new" className="group">
                  <div className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:shadow-md transition-all duration-200 group-hover:bg-indigo-50">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-200">
                        <Icon name="plus" size="sm" className="text-indigo-600" />
                      </div>
                      <h3 className="font-semibold text-gray-900">Create Cluster</h3>
                    </div>
                    <p className="text-sm text-gray-600">Deploy new Kubernetes cluster</p>
                  </div>
                </Link>

                <div className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:shadow-md transition-all duration-200 hover:bg-purple-50 cursor-pointer">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Icon name="cog" size="sm" className="text-purple-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900">Agent Control</h3>
                  </div>
                  <p className="text-sm text-gray-600">{agentStats.totalAgents} agents running</p>
                </div>

                <div className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all duration-200 hover:bg-blue-50 cursor-pointer">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Icon name="academic-cap" size="sm" className="text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900">Training</h3>
                  </div>
                  <p className="text-sm text-gray-600">Customize agent behavior</p>
                </div>

                <Link to="/metrics" className="group">
                  <div className="p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:shadow-md transition-all duration-200 group-hover:bg-green-50">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200">
                        <Icon name="chart-bar" size="sm" className="text-green-600" />
                      </div>
                      <h3 className="font-semibold text-gray-900">Monitoring</h3>
                    </div>
                    <p className="text-sm text-gray-600">Real-time metrics</p>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon name="chart-pie" size="sm" className="text-gray-600" />
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Support Tickets</span>
                  <span className="text-lg font-bold text-gray-900">{agentStats.supportTickets}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Automation Tasks</span>
                  <span className="text-lg font-bold text-gray-900">{agentStats.automationTasks}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Active Agents</span>
                  <span className="text-lg font-bold text-green-600">{agentStats.activeAgents}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Clusters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon name="server" size="sm" className="text-gray-600" />
              Recent Clusters
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardData.clusters.length === 0 ? (
              <div className="text-center py-8">
                <Icon name="server" size="lg" className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-4">No clusters found</p>
                <Button asChild>
                  <Link to="/clusters/new">Create Your First Cluster</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {dashboardData.clusters.slice(0, 5).map(cluster => (
                  <div key={cluster.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Icon name="server" size="sm" className="text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{cluster.name}</p>
                        <p className="text-sm text-gray-500">
                          {cluster.provider} • {cluster.region} • {cluster.node_count} nodes
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                        cluster.status === 'running' ? 'bg-green-100 text-green-800' : 
                        cluster.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {cluster.status}
                      </span>
                      <Button variant="ghost" size="sm">
                        <Icon name="chevron-right" size="sm" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Interactive Analytics Charts */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Analytics & Insights</h2>
          <DashboardCharts />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
