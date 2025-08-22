import React, { useState, useEffect } from 'react';

const MetricsPage = () => {
  const [metrics, setMetrics] = useState({
    clusters: {
      total: 12,
      running: 10,
      stopped: 2,
      cpu: 68,
      memory: 72,
      storage: 45
    },
    nodes: {
      total: 48,
      healthy: 45,
      unhealthy: 3,
      cpu: 65,
      memory: 78,
      disk: 52
    },
    pods: {
      total: 324,
      running: 298,
      pending: 15,
      failed: 11,
      cpu: 58,
      memory: 71
    },
    network: {
      inbound: 2.4,
      outbound: 1.8,
      latency: 12,
      errors: 0.02
    }
  });

  const [timeRange, setTimeRange] = useState('1h');
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    const interval = autoRefresh ? setInterval(() => {
      // Simulate real-time updates
      setMetrics(prev => ({
        ...prev,
        clusters: {
          ...prev.clusters,
          cpu: Math.max(0, Math.min(100, prev.clusters.cpu + (Math.random() - 0.5) * 10)),
          memory: Math.max(0, Math.min(100, prev.clusters.memory + (Math.random() - 0.5) * 8))
        }
      }));
    }, 5000) : null;

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const MetricCard = ({ title, value, unit, trend, status, icon }) => (
    <div className={`metric-card ${status}`}>
      <div className="metric-header">
        <div className="metric-icon">{icon}</div>
        <div className="metric-trend">
          {trend > 0 ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="trend-up">
              <path d="M7,14L12,9L17,14H7Z"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="trend-down">
              <path d="M7,10L12,15L17,10H7Z"/>
            </svg>
          )}
          <span>{Math.abs(trend)}%</span>
        </div>
      </div>
      <div className="metric-content">
        <h3>{title}</h3>
        <div className="metric-value">
          {value}
          <span className="metric-unit">{unit}</span>
        </div>
      </div>
    </div>
  );

  const ProgressBar = ({ label, value, max = 100, color = '#3182ce' }) => (
    <div className="progress-container">
      <div className="progress-header">
        <span className="progress-label">{label}</span>
        <span className="progress-value">{value}%</span>
      </div>
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${(value / max) * 100}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Modern Header */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-8 border border-purple-200">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M3,3V21H21V3H3M9,17H7V10H9V17M13,17H11V7H13V17M17,17H15V13H17V17Z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">System Metrics</h1>
            <p className="text-gray-600 mt-1">Real-time monitoring and performance analytics</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 mt-6">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Time Range:</label>
            <select 
              value={timeRange} 
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="5m">Last 5 minutes</option>
              <option value="1h">Last hour</option>
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={autoRefresh} 
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
            />
            <span className="text-sm font-medium text-gray-700">Auto Refresh</span>
          </label>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-xl">🏗️</span>
            </div>
            <span className="text-sm text-green-600 font-medium">+5%</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{metrics.clusters.total}</h3>
          <p className="text-gray-600 text-sm">Total Clusters</p>
        </div>
        
        <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-xl">✅</span>
            </div>
            <span className="text-sm text-green-600 font-medium">+2%</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{metrics.clusters.running}</h3>
          <p className="text-gray-600 text-sm">Running</p>
        </div>
        
        <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <span className="text-xl">⏸️</span>
            </div>
            <span className="text-sm text-red-600 font-medium">-1%</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{metrics.clusters.stopped}</h3>
          <p className="text-gray-600 text-sm">Stopped</p>
        </div>
        
        <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-xl">📊</span>
            </div>
            <span className="text-sm text-green-600 font-medium">+8%</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{metrics.nodes.total}</h3>
          <p className="text-gray-600 text-sm">Total Nodes</p>
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metrics-section">
          <h2>Cluster Resources</h2>
          {/* Resource Utilization */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Resource Utilization</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">CPU</span>
                  <span className="text-sm text-gray-600">{metrics.clusters.cpu}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{width: `${metrics.clusters.cpu}%`}}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Memory</span>
                  <span className="text-sm text-gray-600">{metrics.clusters.memory}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full transition-all duration-300" style={{width: `${metrics.clusters.memory}%`}}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Storage</span>
                  <span className="text-sm text-gray-600">{metrics.clusters.storage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-yellow-600 h-2 rounded-full transition-all duration-300" style={{width: `${metrics.clusters.storage}%`}}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Network & Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Network Traffic</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                        <path d="M7,10L12,15L17,10H7Z"/>
                      </svg>
                    </div>
                    <span className="font-medium text-gray-700">Inbound</span>
                  </div>
                  <span className="text-lg font-bold text-blue-600">{metrics.network.inbound} GB/s</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                        <path d="M7,14L12,9L17,14H7Z"/>
                      </svg>
                    </div>
                    <span className="font-medium text-gray-700">Outbound</span>
                  </div>
                  <span className="text-lg font-bold text-green-600">{metrics.network.outbound} GB/s</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Performance</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                      <span className="text-white text-sm font-bold">⚡</span>
                    </div>
                    <span className="font-medium text-gray-700">Latency</span>
                  </div>
                  <span className="text-lg font-bold text-purple-600">{metrics.network.latency}ms</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                      <span className="text-white text-sm font-bold">⚠️</span>
                    </div>
                    <span className="font-medium text-gray-700">Error Rate</span>
                  </div>
                  <span className="text-lg font-bold text-red-600">{metrics.network.errors}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pod Status */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Pod Status Overview</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl mb-2">📦</div>
              <div className="text-2xl font-bold text-gray-900">{metrics.pods.total}</div>
              <div className="text-sm text-gray-600">Total Pods</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl mb-2">🟢</div>
              <div className="text-2xl font-bold text-green-600">{metrics.pods.running}</div>
              <div className="text-sm text-gray-600">Running</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl mb-2">🟡</div>
              <div className="text-2xl font-bold text-yellow-600">{metrics.pods.pending}</div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl mb-2">🔴</div>
              <div className="text-2xl font-bold text-red-600">{metrics.pods.failed}</div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetricsPage;
