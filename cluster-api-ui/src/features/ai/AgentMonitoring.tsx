import React, { useState, useEffect } from 'react';
import './AgentMonitoring.css';

interface MonitoringData {
  agentId: string;
  agentName: string;
  type: string;
  status: 'healthy' | 'warning' | 'critical' | 'offline';
  uptime: string;
  lastActivity: string;
  metrics: {
    cpuUsage: number;
    memoryUsage: number;
    requestsPerMinute: number;
    errorRate: number;
    responseTime: number;
  };
  alerts: Alert[];
}

interface Alert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: string;
}

const AgentMonitoring: React.FC = () => {
  const [monitoringData, setMonitoringData] = useState<MonitoringData[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<MonitoringData | null>(null);
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('1h');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock monitoring data for all agents
    const mockData: MonitoringData[] = [
      {
        agentId: 'cluster_management',
        agentName: 'Cluster Management',
        type: 'Infrastructure',
        status: 'healthy',
        uptime: '15d 4h 23m',
        lastActivity: '2 minutes ago',
        metrics: {
          cpuUsage: 23,
          memoryUsage: 45,
          requestsPerMinute: 127,
          errorRate: 0.2,
          responseTime: 145
        },
        alerts: [
          {
            id: '1',
            severity: 'info',
            message: 'Cluster scaling operation completed successfully',
            timestamp: '2024-01-15T10:30:00Z'
          }
        ]
      },
      {
        agentId: 'support_l1',
        agentName: 'L1 Support Agent',
        type: 'Support',
        status: 'healthy',
        uptime: '12d 8h 15m',
        lastActivity: '30 seconds ago',
        metrics: {
          cpuUsage: 18,
          memoryUsage: 32,
          requestsPerMinute: 89,
          errorRate: 0.1,
          responseTime: 89
        },
        alerts: []
      },
      {
        agentId: 'support_l2',
        agentName: 'L2 Support Agent',
        type: 'Support',
        status: 'warning',
        uptime: '8d 12h 45m',
        lastActivity: '5 minutes ago',
        metrics: {
          cpuUsage: 67,
          memoryUsage: 78,
          requestsPerMinute: 156,
          errorRate: 2.3,
          responseTime: 234
        },
        alerts: [
          {
            id: '2',
            severity: 'warning',
            message: 'High CPU usage detected - consider scaling',
            timestamp: '2024-01-15T11:15:00Z'
          }
        ]
      },
      {
        agentId: 'monitoring',
        agentName: 'Monitoring Agent',
        type: 'Observability',
        status: 'healthy',
        uptime: '20d 2h 10m',
        lastActivity: '1 minute ago',
        metrics: {
          cpuUsage: 34,
          memoryUsage: 56,
          requestsPerMinute: 203,
          errorRate: 0.5,
          responseTime: 112
        },
        alerts: []
      },
      {
        agentId: 'security_scanning',
        agentName: 'Security Scanner',
        type: 'Security',
        status: 'critical',
        uptime: '3d 6h 30m',
        lastActivity: '15 minutes ago',
        metrics: {
          cpuUsage: 89,
          memoryUsage: 92,
          requestsPerMinute: 45,
          errorRate: 5.7,
          responseTime: 456
        },
        alerts: [
          {
            id: '3',
            severity: 'critical',
            message: 'Agent experiencing high error rate and memory pressure',
            timestamp: '2024-01-15T11:45:00Z'
          },
          {
            id: '4',
            severity: 'warning',
            message: 'Scan queue backlog detected',
            timestamp: '2024-01-15T11:30:00Z'
          }
        ]
      },
      {
        agentId: 'auto_scaling',
        agentName: 'Auto Scaling',
        type: 'Infrastructure',
        status: 'healthy',
        uptime: '7d 14h 20m',
        lastActivity: '3 minutes ago',
        metrics: {
          cpuUsage: 41,
          memoryUsage: 38,
          requestsPerMinute: 67,
          errorRate: 0.3,
          responseTime: 178
        },
        alerts: []
      }
    ];

    setMonitoringData(mockData);
    setSelectedAgent(mockData[0]);
    setLoading(false);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return '#4caf50';
      case 'warning': return '#ff9800';
      case 'critical': return '#f44336';
      case 'offline': return '#9e9e9e';
      default: return '#9e9e9e';
    }
  };

  const getMetricColor = (value: number, type: 'usage' | 'error' | 'response') => {
    if (type === 'usage') {
      if (value > 80) return '#f44336';
      if (value > 60) return '#ff9800';
      return '#4caf50';
    }
    if (type === 'error') {
      if (value > 3) return '#f44336';
      if (value > 1) return '#ff9800';
      return '#4caf50';
    }
    if (type === 'response') {
      if (value > 300) return '#f44336';
      if (value > 200) return '#ff9800';
      return '#4caf50';
    }
    return '#4caf50';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'info': return '#2196f3';
      case 'warning': return '#ff9800';
      case 'critical': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  if (loading) {
    return <div className="monitoring-loading">Loading monitoring data...</div>;
  }

  return (
    <div className="agent-monitoring">
      <div className="monitoring-header">
        <h2>📊 Agent Monitoring</h2>
        <p>Real-time monitoring and metrics for all AI agents</p>
        <div className="time-range-selector">
          {(['1h', '6h', '24h', '7d'] as const).map((range) => (
            <button
              key={range}
              className={`time-range-btn ${timeRange === range ? 'active' : ''}`}
              onClick={() => setTimeRange(range)}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <div className="monitoring-content">
        <div className="agents-overview">
          <div className="overview-stats">
            <div className="stat-card">
              <div className="stat-value">{monitoringData.filter(a => a.status === 'healthy').length}</div>
              <div className="stat-label">Healthy</div>
            </div>
            <div className="stat-card warning">
              <div className="stat-value">{monitoringData.filter(a => a.status === 'warning').length}</div>
              <div className="stat-label">Warning</div>
            </div>
            <div className="stat-card critical">
              <div className="stat-value">{monitoringData.filter(a => a.status === 'critical').length}</div>
              <div className="stat-label">Critical</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{monitoringData.reduce((sum, a) => sum + a.alerts.length, 0)}</div>
              <div className="stat-label">Active Alerts</div>
            </div>
          </div>

          <div className="agents-list">
            {monitoringData.map((agent) => (
              <div
                key={agent.agentId}
                className={`agent-item ${selectedAgent?.agentId === agent.agentId ? 'selected' : ''}`}
                onClick={() => setSelectedAgent(agent)}
              >
                <div className="agent-info">
                  <div className="agent-name">{agent.agentName}</div>
                  <div className="agent-type">{agent.type}</div>
                </div>
                <div className="agent-metrics-preview">
                  <div className="metric-preview">
                    <span>CPU: {agent.metrics.cpuUsage}%</span>
                  </div>
                  <div className="metric-preview">
                    <span>Mem: {agent.metrics.memoryUsage}%</span>
                  </div>
                </div>
                <div
                  className="agent-status-indicator"
                  style={{ backgroundColor: getStatusColor(agent.status) }}
                >
                  {agent.status}
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedAgent && (
          <div className="agent-details">
            <div className="details-header">
              <h3>{selectedAgent.agentName}</h3>
              <div
                className="status-badge"
                style={{ backgroundColor: getStatusColor(selectedAgent.status) }}
              >
                {selectedAgent.status}
              </div>
            </div>

            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-label">CPU Usage</div>
                <div 
                  className="metric-value"
                  style={{ color: getMetricColor(selectedAgent.metrics.cpuUsage, 'usage') }}
                >
                  {selectedAgent.metrics.cpuUsage}%
                </div>
                <div className="metric-bar">
                  <div 
                    className="metric-fill"
                    style={{ 
                      width: `${selectedAgent.metrics.cpuUsage}%`,
                      backgroundColor: getMetricColor(selectedAgent.metrics.cpuUsage, 'usage')
                    }}
                  />
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-label">Memory Usage</div>
                <div 
                  className="metric-value"
                  style={{ color: getMetricColor(selectedAgent.metrics.memoryUsage, 'usage') }}
                >
                  {selectedAgent.metrics.memoryUsage}%
                </div>
                <div className="metric-bar">
                  <div 
                    className="metric-fill"
                    style={{ 
                      width: `${selectedAgent.metrics.memoryUsage}%`,
                      backgroundColor: getMetricColor(selectedAgent.metrics.memoryUsage, 'usage')
                    }}
                  />
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-label">Requests/Min</div>
                <div className="metric-value">
                  {selectedAgent.metrics.requestsPerMinute}
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-label">Error Rate</div>
                <div 
                  className="metric-value"
                  style={{ color: getMetricColor(selectedAgent.metrics.errorRate, 'error') }}
                >
                  {selectedAgent.metrics.errorRate}%
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-label">Response Time</div>
                <div 
                  className="metric-value"
                  style={{ color: getMetricColor(selectedAgent.metrics.responseTime, 'response') }}
                >
                  {selectedAgent.metrics.responseTime}ms
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-label">Uptime</div>
                <div className="metric-value">
                  {selectedAgent.uptime}
                </div>
              </div>
            </div>

            <div className="agent-info-section">
              <h4>Agent Information</h4>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Last Activity:</span>
                  <span className="info-value">{selectedAgent.lastActivity}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Type:</span>
                  <span className="info-value">{selectedAgent.type}</span>
                </div>
              </div>
            </div>

            {selectedAgent.alerts.length > 0 && (
              <div className="alerts-section">
                <h4>Active Alerts ({selectedAgent.alerts.length})</h4>
                <div className="alerts-list">
                  {selectedAgent.alerts.map((alert) => (
                    <div key={alert.id} className="alert-item">
                      <div 
                        className="alert-severity"
                        style={{ backgroundColor: getSeverityColor(alert.severity) }}
                      >
                        {alert.severity}
                      </div>
                      <div className="alert-content">
                        <div className="alert-message">{alert.message}</div>
                        <div className="alert-timestamp">
                          {new Date(alert.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentMonitoring;
