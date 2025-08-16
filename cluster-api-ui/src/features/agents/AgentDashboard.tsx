import React, { useState, useEffect } from 'react';
import './AgentDashboard.css';

interface Agent {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'inactive' | 'error' | 'maintenance';
  capabilities: string[];
  last_activity: string;
  health_score: number;
  tasks_completed: number;
  tasks_failed: number;
  uptime: string;
  version: string;
}

interface AgentActivity {
  id: string;
  agent_id: string;
  action: string;
  status: 'success' | 'failed' | 'in_progress';
  timestamp: string;
  duration?: number;
  details?: string;
  error_message?: string;
}

interface AgentMetrics {
  agent_id: string;
  cpu_usage: number;
  memory_usage: number;
  response_time: number;
  success_rate: number;
  active_tasks: number;
}

const AgentDashboard: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [metrics, setMetrics] = useState<Record<string, AgentMetrics>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadAgents();
    loadActivities();
    loadMetrics();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      if (autoRefresh) {
        loadAgents();
        loadActivities();
        loadMetrics();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const loadAgents = async () => {
    try {
      const response = await fetch('/api/agents');
      if (response.ok) {
        const data = await response.json();
        setAgents(data.agents || []);
      }
    } catch (error) {
      console.error('Error loading agents:', error);
    }
  };

  const loadActivities = async () => {
    try {
      const response = await fetch('/api/agents/activities?limit=50');
      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities || []);
      }
    } catch (error) {
      console.error('Error loading activities:', error);
    }
  };

  const loadMetrics = async () => {
    try {
      const response = await fetch('/api/agents/metrics');
      if (response.ok) {
        const data = await response.json();
        setMetrics(data.metrics || {});
      }
    } catch (error) {
      console.error('Error loading metrics:', error);
    }
  };

  const restartAgent = async (agentId: string) => {
    if (!confirm(`Are you sure you want to restart agent ${agentId}?`)) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/agents/${agentId}/restart`, {
        method: 'POST',
      });

      if (response.ok) {
        await loadAgents();
        alert(`Agent ${agentId} restarted successfully`);
      }
    } catch (error) {
      console.error('Error restarting agent:', error);
      alert('Failed to restart agent');
    } finally {
      setIsLoading(false);
    }
  };

  const stopAgent = async (agentId: string) => {
    if (!confirm(`Are you sure you want to stop agent ${agentId}?`)) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/agents/${agentId}/stop`, {
        method: 'POST',
      });

      if (response.ok) {
        await loadAgents();
        alert(`Agent ${agentId} stopped successfully`);
      }
    } catch (error) {
      console.error('Error stopping agent:', error);
      alert('Failed to stop agent');
    } finally {
      setIsLoading(false);
    }
  };

  const startAgent = async (agentId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/agents/${agentId}/start`, {
        method: 'POST',
      });

      if (response.ok) {
        await loadAgents();
        alert(`Agent ${agentId} started successfully`);
      }
    } catch (error) {
      console.error('Error starting agent:', error);
      alert('Failed to start agent');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#28a745';
      case 'inactive': return '#6c757d';
      case 'error': return '#dc3545';
      case 'maintenance': return '#ffc107';
      default: return '#6c757d';
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 90) return '#28a745';
    if (score >= 70) return '#ffc107';
    if (score >= 50) return '#fd7e14';
    return '#dc3545';
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const formatUptime = (uptime: string) => {
    // Assuming uptime is in format like "2d 5h 30m"
    return uptime || 'Unknown';
  };

  const getAgentActivities = (agentId: string) => {
    return activities.filter(activity => activity.agent_id === agentId).slice(0, 10);
  };

  return (
    <div className="agent-dashboard">
      <div className="dashboard-header">
        <div className="header-info">
          <h2>Agent Management Dashboard</h2>
          <p>Monitor and manage your AI agents</p>
        </div>
        
        <div className="header-controls">
          <label className="auto-refresh-toggle">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh
          </label>
          <button 
            className="btn btn-primary"
            onClick={() => {
              loadAgents();
              loadActivities();
              loadMetrics();
            }}
            disabled={isLoading}
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        {/* Agents Overview */}
        <div className="agents-overview">
          <h3>Agents Overview ({agents.length})</h3>
          
          <div className="agents-grid">
            {agents.map(agent => {
              const agentMetrics = metrics[agent.id];
              
              return (
                <div
                  key={agent.id}
                  className={`agent-card ${selectedAgent?.id === agent.id ? 'selected' : ''}`}
                  onClick={() => setSelectedAgent(agent)}
                >
                  <div className="agent-header">
                    <div className="agent-info">
                      <h4>{agent.name}</h4>
                      <span className="agent-type">{agent.type}</span>
                    </div>
                    
                    <div className="agent-status">
                      <span 
                        className="status-indicator"
                        style={{ backgroundColor: getStatusColor(agent.status) }}
                      />
                      <span className="status-text">{agent.status}</span>
                    </div>
                  </div>
                  
                  <div className="agent-metrics">
                    <div className="metric">
                      <span className="metric-label">Health</span>
                      <div className="health-bar">
                        <div 
                          className="health-fill"
                          style={{ 
                            width: `${agent.health_score}%`,
                            backgroundColor: getHealthColor(agent.health_score)
                          }}
                        />
                        <span className="health-text">{agent.health_score}%</span>
                      </div>
                    </div>
                    
                    <div className="metric-row">
                      <div className="metric">
                        <span className="metric-label">Tasks</span>
                        <span className="metric-value">{agent.tasks_completed}</span>
                      </div>
                      <div className="metric">
                        <span className="metric-label">Failed</span>
                        <span className="metric-value error">{agent.tasks_failed}</span>
                      </div>
                    </div>
                    
                    {agentMetrics && (
                      <div className="metric-row">
                        <div className="metric">
                          <span className="metric-label">CPU</span>
                          <span className="metric-value">{agentMetrics.cpu_usage}%</span>
                        </div>
                        <div className="metric">
                          <span className="metric-label">Memory</span>
                          <span className="metric-value">{agentMetrics.memory_usage}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="agent-actions">
                    {agent.status === 'active' ? (
                      <>
                        <button
                          className="btn btn-warning btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            restartAgent(agent.id);
                          }}
                          disabled={isLoading}
                        >
                          Restart
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            stopAgent(agent.id);
                          }}
                          disabled={isLoading}
                        >
                          Stop
                        </button>
                      </>
                    ) : (
                      <button
                        className="btn btn-success btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          startAgent(agent.id);
                        }}
                        disabled={isLoading}
                      >
                        Start
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Agent Details */}
        {selectedAgent && (
          <div className="agent-details">
            <div className="details-header">
              <h3>{selectedAgent.name} Details</h3>
              <button
                className="btn btn-secondary"
                onClick={() => setSelectedAgent(null)}
              >
                Close
              </button>
            </div>
            
            <div className="details-content">
              <div className="details-section">
                <h4>Agent Information</h4>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">ID:</span>
                    <span className="info-value">{selectedAgent.id}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Type:</span>
                    <span className="info-value">{selectedAgent.type}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Version:</span>
                    <span className="info-value">{selectedAgent.version}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Uptime:</span>
                    <span className="info-value">{formatUptime(selectedAgent.uptime)}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Last Activity:</span>
                    <span className="info-value">
                      {new Date(selectedAgent.last_activity).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="details-section">
                <h4>Capabilities</h4>
                <div className="capabilities-list">
                  {selectedAgent.capabilities.map(capability => (
                    <span key={capability} className="capability-badge">
                      {capability.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>
              
              {metrics[selectedAgent.id] && (
                <div className="details-section">
                  <h4>Performance Metrics</h4>
                  <div className="metrics-grid">
                    <div className="metric-card">
                      <span className="metric-title">Response Time</span>
                      <span className="metric-number">
                        {metrics[selectedAgent.id].response_time}ms
                      </span>
                    </div>
                    <div className="metric-card">
                      <span className="metric-title">Success Rate</span>
                      <span className="metric-number">
                        {metrics[selectedAgent.id].success_rate}%
                      </span>
                    </div>
                    <div className="metric-card">
                      <span className="metric-title">Active Tasks</span>
                      <span className="metric-number">
                        {metrics[selectedAgent.id].active_tasks}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="details-section">
                <h4>Recent Activity</h4>
                <div className="activity-list">
                  {getAgentActivities(selectedAgent.id).map(activity => (
                    <div key={activity.id} className="activity-item">
                      <div className="activity-header">
                        <span className="activity-action">{activity.action}</span>
                        <div className="activity-meta">
                          <span 
                            className={`activity-status ${activity.status}`}
                          >
                            {activity.status}
                          </span>
                          <span className="activity-time">
                            {new Date(activity.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      
                      {activity.duration && (
                        <div className="activity-duration">
                          Duration: {formatDuration(activity.duration)}
                        </div>
                      )}
                      
                      {activity.details && (
                        <div className="activity-details">
                          {activity.details}
                        </div>
                      )}
                      
                      {activity.error_message && (
                        <div className="activity-error">
                          Error: {activity.error_message}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {getAgentActivities(selectedAgent.id).length === 0 && (
                    <div className="no-activity">
                      No recent activity for this agent.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentDashboard;
