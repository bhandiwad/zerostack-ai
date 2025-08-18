import React, { useState, useEffect } from 'react';
import './MetricsPage.css';

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
    <div className="metrics-page">
      <div className="metrics-header">
        <h1>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={{marginRight: '8px'}}>
            <path d="M3,3V21H21V3H3M9,17H7V10H9V17M13,17H11V7H13V17M17,17H15V13H17V17Z"/>
          </svg>
          System Metrics
        </h1>
        <div className="metrics-controls">
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            className="time-range-select"
          >
            <option value="5m">Last 5 minutes</option>
            <option value="1h">Last hour</option>
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
          </select>
          <button 
            className={`auto-refresh-btn ${autoRefresh ? 'active' : ''}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z"/>
            </svg>
            Auto Refresh
          </button>
        </div>
      </div>

      <div className="metrics-overview">
        <MetricCard 
          title="Total Clusters"
          value={metrics.clusters.total}
          unit=""
          trend={5.2}
          status="good"
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3M19,5V19H5V5H19Z"/>
            </svg>
          }
        />
        <MetricCard 
          title="Active Nodes"
          value={metrics.nodes.healthy}
          unit=""
          trend={2.1}
          status="good"
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4,2H20A2,2 0 0,1 22,4V16A2,2 0 0,1 20,18H16L12,22L8,18H4A2,2 0 0,1 2,16V4A2,2 0 0,1 4,2M4,4V16H8.83L12,19.17L15.17,16H20V4H4Z"/>
            </svg>
          }
        />
        <MetricCard 
          title="Running Pods"
          value={metrics.pods.running}
          unit=""
          trend={-1.3}
          status="warning"
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4Z"/>
            </svg>
          }
        />
        <MetricCard 
          title="Network Latency"
          value={metrics.network.latency}
          unit="ms"
          trend={-8.5}
          status="good"
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2,3H22C23.05,3 24,3.95 24,5V19C24,20.05 23.05,21 22,21H2C0.95,21 0,20.05 0,19V5C0,3.95 0.95,3 2,3M22,19V5H2V19H22M6,17V15L10,11V13H18V15H10V17H6Z"/>
            </svg>
          }
        />
      </div>

      <div className="metrics-grid">
        <div className="metrics-section">
          <h2>Cluster Resources</h2>
          <div className="resource-metrics">
            <ProgressBar label="CPU Usage" value={metrics.clusters.cpu} color="#3182ce" />
            <ProgressBar label="Memory Usage" value={metrics.clusters.memory} color="#38a169" />
            <ProgressBar label="Storage Usage" value={metrics.clusters.storage} color="#ed8936" />
          </div>
        </div>

        <div className="metrics-section">
          <h2>Node Health</h2>
          <div className="node-health">
            <div className="health-item">
              <div className="health-indicator healthy"></div>
              <span>Healthy Nodes: {metrics.nodes.healthy}</span>
            </div>
            <div className="health-item">
              <div className="health-indicator unhealthy"></div>
              <span>Unhealthy Nodes: {metrics.nodes.unhealthy}</span>
            </div>
            <div className="resource-metrics">
              <ProgressBar label="Node CPU" value={metrics.nodes.cpu} color="#3182ce" />
              <ProgressBar label="Node Memory" value={metrics.nodes.memory} color="#38a169" />
              <ProgressBar label="Node Disk" value={metrics.nodes.disk} color="#ed8936" />
            </div>
          </div>
        </div>

        <div className="metrics-section">
          <h2>Pod Statistics</h2>
          <div className="pod-stats">
            <div className="stat-grid">
              <div className="stat-item">
                <div className="stat-value">{metrics.pods.running}</div>
                <div className="stat-label">Running</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{metrics.pods.pending}</div>
                <div className="stat-label">Pending</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{metrics.pods.failed}</div>
                <div className="stat-label">Failed</div>
              </div>
            </div>
            <div className="resource-metrics">
              <ProgressBar label="Pod CPU" value={metrics.pods.cpu} color="#3182ce" />
              <ProgressBar label="Pod Memory" value={metrics.pods.memory} color="#38a169" />
            </div>
          </div>
        </div>

        <div className="metrics-section">
          <h2>Network Performance</h2>
          <div className="network-metrics">
            <div className="network-item">
              <div className="network-label">Inbound Traffic</div>
              <div className="network-value">{metrics.network.inbound} GB/s</div>
            </div>
            <div className="network-item">
              <div className="network-label">Outbound Traffic</div>
              <div className="network-value">{metrics.network.outbound} GB/s</div>
            </div>
            <div className="network-item">
              <div className="network-label">Error Rate</div>
              <div className="network-value">{metrics.network.errors}%</div>
            </div>
          </div>
        </div>
      </div>

      <div className="metrics-alerts">
        <h2>System Alerts</h2>
        <div className="alert-list">
          <div className="alert-item warning">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13,14H11V10H13M13,18H11V16H13M1,21H23L12,2L1,21Z"/>
            </svg>
            <span>High memory usage detected on cluster-prod-01</span>
            <span className="alert-time">2 minutes ago</span>
          </div>
          <div className="alert-item info">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13,9H11V7H13M13,17H11V11H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
            </svg>
            <span>Scheduled maintenance for cluster-dev-02 starting in 1 hour</span>
            <span className="alert-time">15 minutes ago</span>
          </div>
          <div className="alert-item success">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M11,16.5L18,9.5L16.59,8.09L11,13.67L7.91,10.59L6.5,12L11,16.5Z"/>
            </svg>
            <span>All systems operating normally</span>
            <span className="alert-time">1 hour ago</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetricsPage;
