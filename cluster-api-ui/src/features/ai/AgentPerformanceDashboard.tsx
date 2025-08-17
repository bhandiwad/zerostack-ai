import React, { useState, useEffect } from 'react';
import './AgentPerformanceDashboard.css';

interface AgentMetrics {
  agent_id: string;
  analysis_period_days: number;
  total_interactions: number;
  success_rate: number;
  average_response_time: number;
  escalation_distribution: { [key: string]: number };
  task_type_distribution: { [key: string]: number };
  performance_trend: string;
  recommendations: string[];
}

interface MessagingStats {
  total_messages: number;
  active_agents: number;
  status_distribution: { [key: string]: number };
  priority_distribution: { [key: string]: number };
  average_queue_size: number;
}

interface AgentStatus {
  agent_id: string;
  status: string;
  last_seen: string;
  message_count: number;
  queue_size: number;
  has_keys: boolean;
}

const AgentPerformanceDashboard: React.FC = () => {
  const [agentMetrics, setAgentMetrics] = useState<AgentMetrics[]>([]);
  const [messagingStats, setMessagingStats] = useState<MessagingStats | null>(null);
  const [activeAgents, setActiveAgents] = useState<AgentStatus[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<number>(30);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [selectedPeriod]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError('');
    
    try {
      await Promise.all([
        loadMessagingStats(),
        loadActiveAgents(),
        selectedAgent && loadAgentMetrics(selectedAgent)
      ]);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMessagingStats = async () => {
    try {
      const response = await fetch('http://localhost:5002/api/a2a/stats');
      if (response.ok) {
        const data = await response.json();
        setMessagingStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to load messaging stats:', error);
    }
  };

  const loadActiveAgents = async () => {
    try {
      const response = await fetch('http://localhost:5002/api/a2a/agents');
      if (response.ok) {
        const data = await response.json();
        setActiveAgents(data.agents || []);
      }
    } catch (error) {
      console.error('Failed to load active agents:', error);
    }
  };

  const loadAgentMetrics = async (agentId: string) => {
    try {
      const response = await fetch(`http://localhost:5002/api/memory/insights/${agentId}?days_back=${selectedPeriod}`);
      if (response.ok) {
        const data = await response.json();
        if (data.insights && !data.insights.error) {
          setAgentMetrics([data.insights]);
        }
      }
    } catch (error) {
      console.error('Failed to load agent metrics:', error);
    }
  };

  const initializeTestAgents = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5002/api/a2a/test', {
        method: 'POST'
      });
      
      if (response.ok) {
        const data = await response.json();
        alert('Test agents initialized and messaging test completed successfully!');
        await loadDashboardData();
      } else {
        const errorData = await response.json();
        alert(`Test failed: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Test initialization failed:', error);
      alert('Failed to initialize test agents');
    } finally {
      setLoading(false);
    }
  };

  const cleanupExpiredMessages = async () => {
    try {
      const response = await fetch('http://localhost:5002/api/a2a/cleanup', {
        method: 'POST'
      });
      
      if (response.ok) {
        alert('Expired messages cleaned up successfully!');
        await loadDashboardData();
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
      alert('Failed to cleanup expired messages');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return '#28a745';
      case 'inactive': return '#6c757d';
      case 'error': return '#dc3545';
      default: return '#ffc107';
    }
  };

  const getPerformanceColor = (value: number, type: 'success_rate' | 'response_time') => {
    if (type === 'success_rate') {
      if (value >= 90) return '#28a745';
      if (value >= 75) return '#ffc107';
      return '#dc3545';
    } else {
      if (value <= 2) return '#28a745';
      if (value <= 5) return '#ffc107';
      return '#dc3545';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
  };

  return (
    <div className="agent-performance-dashboard">
      <div className="dashboard-header">
        <h2>Agent Performance Dashboard</h2>
        <p>Real-time monitoring and analytics for AI agents</p>
      </div>

      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
        </div>
      )}

      <div className="dashboard-controls">
        <div className="control-group">
          <label>Analysis Period:</label>
          <select 
            value={selectedPeriod} 
            onChange={(e) => setSelectedPeriod(Number(e.target.value))}
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>

        <div className="control-group">
          <label>Select Agent:</label>
          <select 
            value={selectedAgent} 
            onChange={(e) => setSelectedAgent(e.target.value)}
          >
            <option value="">Select an agent...</option>
            {activeAgents.map((agent) => (
              <option key={agent.agent_id} value={agent.agent_id}>
                {agent.agent_id}
              </option>
            ))}
          </select>
        </div>

        <div className="action-buttons">
          <button 
            onClick={initializeTestAgents}
            disabled={loading}
            className="btn btn-primary"
          >
            Initialize Test Agents
          </button>
          <button 
            onClick={cleanupExpiredMessages}
            disabled={loading}
            className="btn btn-secondary"
          >
            Cleanup Messages
          </button>
          <button 
            onClick={loadDashboardData}
            disabled={loading}
            className="btn btn-outline"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* System Overview */}
        <div className="dashboard-card system-overview">
          <h3>System Overview</h3>
          {messagingStats ? (
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-value">{messagingStats.active_agents}</div>
                <div className="stat-label">Active Agents</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{messagingStats.total_messages}</div>
                <div className="stat-label">Total Messages</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{messagingStats.average_queue_size.toFixed(1)}</div>
                <div className="stat-label">Avg Queue Size</div>
              </div>
            </div>
          ) : (
            <div className="loading-placeholder">Loading system stats...</div>
          )}
        </div>

        {/* Message Status Distribution */}
        <div className="dashboard-card status-distribution">
          <h3>Message Status Distribution</h3>
          {messagingStats?.status_distribution ? (
            <div className="distribution-chart">
              {Object.entries(messagingStats.status_distribution).map(([status, count]) => (
                <div key={status} className="distribution-item">
                  <div className="distribution-bar">
                    <div 
                      className="distribution-fill"
                      style={{ 
                        width: `${(count / Math.max(...Object.values(messagingStats.status_distribution))) * 100}%`,
                        backgroundColor: getStatusColor(status)
                      }}
                    />
                  </div>
                  <div className="distribution-label">
                    <span className="status-name">{status}</span>
                    <span className="status-count">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-data">No status data available</div>
          )}
        </div>

        {/* Active Agents */}
        <div className="dashboard-card active-agents">
          <h3>Active Agents ({activeAgents.length})</h3>
          <div className="agents-list">
            {activeAgents.length === 0 ? (
              <div className="no-data">No active agents</div>
            ) : (
              activeAgents.map((agent) => (
                <div key={agent.agent_id} className="agent-item">
                  <div className="agent-header">
                    <span className="agent-id">{agent.agent_id}</span>
                    <span 
                      className="agent-status"
                      style={{ color: getStatusColor(agent.status) }}
                    >
                      {agent.status}
                    </span>
                  </div>
                  <div className="agent-details">
                    <div className="agent-stat">
                      <span className="stat-label">Messages:</span>
                      <span className="stat-value">{agent.message_count}</span>
                    </div>
                    <div className="agent-stat">
                      <span className="stat-label">Queue:</span>
                      <span className="stat-value">{agent.queue_size}</span>
                    </div>
                    <div className="agent-stat">
                      <span className="stat-label">Keys:</span>
                      <span className={`stat-value ${agent.has_keys ? 'has-keys' : 'no-keys'}`}>
                        {agent.has_keys ? '✓' : '✗'}
                      </span>
                    </div>
                    <div className="agent-stat">
                      <span className="stat-label">Last Seen:</span>
                      <span className="stat-value">{formatTimestamp(agent.last_seen)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Agent Performance Metrics */}
        {selectedAgent && agentMetrics.length > 0 && (
          <div className="dashboard-card agent-metrics">
            <h3>Performance Metrics - {selectedAgent}</h3>
            {agentMetrics.map((metrics) => (
              <div key={metrics.agent_id} className="metrics-content">
                <div className="metrics-grid">
                  <div className="metric-item">
                    <div className="metric-value" style={{ color: getPerformanceColor(metrics.success_rate, 'success_rate') }}>
                      {metrics.success_rate.toFixed(1)}%
                    </div>
                    <div className="metric-label">Success Rate</div>
                  </div>
                  <div className="metric-item">
                    <div className="metric-value" style={{ color: getPerformanceColor(metrics.average_response_time, 'response_time') }}>
                      {formatDuration(metrics.average_response_time)}
                    </div>
                    <div className="metric-label">Avg Response Time</div>
                  </div>
                  <div className="metric-item">
                    <div className="metric-value">{metrics.total_interactions}</div>
                    <div className="metric-label">Total Interactions</div>
                  </div>
                </div>

                {/* Task Type Distribution */}
                {Object.keys(metrics.task_type_distribution).length > 0 && (
                  <div className="task-distribution">
                    <h4>Task Type Distribution</h4>
                    <div className="distribution-chart">
                      {Object.entries(metrics.task_type_distribution).map(([task, count]) => (
                        <div key={task} className="distribution-item">
                          <div className="distribution-bar">
                            <div 
                              className="distribution-fill"
                              style={{ 
                                width: `${(count / Math.max(...Object.values(metrics.task_type_distribution))) * 100}%`,
                                backgroundColor: '#007bff'
                              }}
                            />
                          </div>
                          <div className="distribution-label">
                            <span className="task-name">{task}</span>
                            <span className="task-count">{count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {metrics.recommendations.length > 0 && (
                  <div className="recommendations">
                    <h4>Recommendations</h4>
                    <ul>
                      {metrics.recommendations.map((rec, index) => (
                        <li key={index}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Priority Distribution */}
        <div className="dashboard-card priority-distribution">
          <h3>Message Priority Distribution</h3>
          {messagingStats?.priority_distribution ? (
            <div className="distribution-chart">
              {Object.entries(messagingStats.priority_distribution).map(([priority, count]) => (
                <div key={priority} className="distribution-item">
                  <div className="distribution-bar">
                    <div 
                      className="distribution-fill priority-fill"
                      style={{ 
                        width: `${(count / Math.max(...Object.values(messagingStats.priority_distribution))) * 100}%`
                      }}
                    />
                  </div>
                  <div className="distribution-label">
                    <span className="priority-name">{priority}</span>
                    <span className="priority-count">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-data">No priority data available</div>
          )}
        </div>
      </div>

      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner">Loading...</div>
        </div>
      )}
    </div>
  );
};

export default AgentPerformanceDashboard;
