import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import Button from '../ui/Button';

// Icon components (explicit sizes to avoid oversized rendering)
const ShieldCheckIcon = ({ className, size = 20 }) => (
  <svg className={className} width={size} height={size} fill="currentColor" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" aria-hidden="true" role="img">
    <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9L10,17Z"/>
  </svg>
);

const ArrowRightIcon = ({ className, size = 14 }) => (
  <svg className={className} width={size} height={size} fill="currentColor" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" aria-hidden="true" role="img">
    <path d="M4 11v2h12l-5.5 5.5 1.42 1.42L19.84 12l-7.92-7.92L10.5 5.5 16 11H4z"/>
  </svg>
);

const DocumentDuplicateIcon = ({ className, size = 20 }) => (
  <svg className={className} width={size} height={size} fill="currentColor" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" aria-hidden="true" role="img">
    <path d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z"/>
  </svg>
);

const ScaleIcon = ({ className, size = 20 }) => (
  <svg className={className} width={size} height={size} fill="currentColor" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" aria-hidden="true" role="img">
    <path d="M12,3L2,12H5V20H19V12H22L12,3M7,18V10.5L12,5.5L17,10.5V18H7Z"/>
  </svg>
);

const CogIcon = ({ className, size = 20 }) => (
  <svg className={className} width={size} height={size} fill="currentColor" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" aria-hidden="true" role="img">
    <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.22,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.22,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"/>
  </svg>
);

const API_BASE = 'http://localhost:5002/api';

const MaintenanceManager = () => {
  const [workflows, setWorkflows] = useState([]);
  const [activeExecutions, setActiveExecutions] = useState([]);
  const [scheduledWorkflows, setScheduledWorkflows] = useState([]);
  const [executionHistory, setExecutionHistory] = useState([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [driftResults, setDriftResults] = useState(null);
  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMaintenanceWorkflows();
    loadExecutionHistory();
    loadPredictions();
    
    // Poll for active executions every 5 seconds
    const interval = setInterval(() => {
      loadExecutionHistory();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const loadMaintenanceWorkflows = async () => {
    try {
      const response = await fetch(`${API_BASE}/maintenance/workflows`);
      const data = await response.json();
      if (data.success) {
        setWorkflows(data.workflows);
      }
    } catch (error) {
      console.error('Failed to load maintenance workflows:', error);
    }
  };

  const cancelExecution = async (executionId) => {
    try {
      await fetch(`${API_BASE}/maintenance/cancel/${executionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      // Refresh history to reflect cancellation
      loadExecutionHistory();
    } catch (error) {
      console.error('Failed to cancel execution:', error);
    }
  };

  const loadExecutionHistory = async () => {
    try {
      const response = await fetch(`${API_BASE}/maintenance/history?limit=20`);
      const data = await response.json();
      if (data.success) {
        setExecutionHistory(data.history);
        // Filter active executions
        const active = data.history.filter(exec => exec.status === 'running');
        setActiveExecutions(active);
      }
    } catch (error) {
      console.error('Failed to load execution history:', error);
    }
  };

  const loadPredictions = async () => {
    try {
      const response = await fetch(`${API_BASE}/maintenance/health/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cluster_id: 'default', analysis_period: '30d' })
      });
      const data = await response.json();
      if (data.success) {
        setPredictions(data.predictions);
      }
    } catch (error) {
      console.error('Failed to load predictions:', error);
    }
  };

  const executeWorkflow = async (workflowId, scheduleType = 'immediate', scheduledTime = null) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/maintenance/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflow_id: workflowId,
          cluster_id: 'default',
          schedule_type: scheduleType,
          scheduled_time: scheduledTime,
          parameters: {}
        })
      });
      
      const data = await response.json();
      if (data.success) {
        // Refresh data
        loadExecutionHistory();
        setShowScheduleModal(false);
      } else {
        alert(`Failed to execute workflow: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to execute workflow:', error);
      alert('Failed to execute workflow. Please check the console for details.');
    } finally {
      setLoading(false);
    }
  };

  const detectConfigurationDrift = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/maintenance/drift/detect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cluster_id: 'default',
          baseline_config: { version: '1.0', components: ['kube-proxy', 'coredns'] }
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setDriftResults(data.drift_results);
      }
    } catch (error) {
      console.error('Failed to detect drift:', error);
    } finally {
      setLoading(false);
    }
  };

  const correctConfigurationDrift = async () => {
    if (!driftResults || !driftResults.drift_items) return;
    
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/maintenance/drift/correct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cluster_id: 'default',
          drift_items: driftResults.drift_items,
          auto_approve: true
        })
      });
      
      const data = await response.json();
      if (data.success) {
        alert(`Configuration drift correction started. Execution ID: ${data.execution_id}`);
        setDriftResults(null);
        loadExecutionHistory();
      }
    } catch (error) {
      console.error('Failed to correct drift:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWorkflowIcon = (category) => {
    switch (category) {
      case 'Security': return <ShieldCheckIcon className="h-5 w-5" />;
      case 'Upgrade': return <ArrowRightIcon className="h-5 w-5" />;
      case 'Backup': return <DocumentDuplicateIcon className="h-5 w-5" />;
      case 'Optimization': return <ScaleIcon className="h-5 w-5" />;
      default: return <CogIcon className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50';
      case 'running': return 'text-indigo-600 bg-indigo-50';
      case 'failed': return 'text-red-600 bg-red-50';
      case 'cancelled': return 'text-gray-600 bg-gray-50';
      default: return 'text-yellow-600 bg-yellow-50';
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Hero */}
      <Card hover>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-xl font-semibold text-gray-900">Maintenance</h1>
              <p className="text-sm text-gray-600">Execute workflows, scan drift, and view recent runs</p>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">Ops</span>
              <span className="px-2 py-0.5 text-xs rounded-full bg-gray-50 text-gray-700 border border-gray-200">Maintenance</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="small" onClick={loadPredictions}>Refresh</Button>
            <Button variant="warning" size="small" onClick={detectConfigurationDrift} disabled={loading} loading={loading}>
              {loading ? 'Scanning...' : 'Scan Drift'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Workflows */}
        <Card className="lg:col-span-2" hover>
          <CardHeader>
            <CardTitle>Workflows</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {workflows.map((w) => (
                <div key={w.id} className="flex items-start justify-between p-3 border border-gray-200 rounded-lg hover:border-indigo-300 hover:shadow-sm transition-all">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{w.name}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-gray-50 text-gray-700 border border-gray-200">{w.category}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{w.description}</p>
                    <p className="text-xs text-gray-500 mt-1">Est. {w.estimated_duration} min</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="small" onClick={() => executeWorkflow(w.id)}>Execute</Button>
                    <Button variant="secondary" size="small" onClick={() => { setSelectedWorkflow(w); setShowScheduleModal(true); }}>Schedule</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Right: Active + Predictions */}
        <div className="space-y-6">
          {activeExecutions.length > 0 && (
            <Card hover>
              <CardHeader>
                <CardTitle>Active</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activeExecutions.map((e) => (
                    <div key={e.id} className="p-3 border border-gray-200 rounded-lg hover:border-indigo-300 hover:shadow-sm transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">{e.workflow_id}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[11px] ${getStatusColor(e.status)}`}>{e.status}</span>
                        </div>
                        <Button variant="danger" size="small" onClick={() => cancelExecution(e.id)}>Cancel</Button>
                      </div>
                      <div className="flex items-center mt-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 mr-3">
                          <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${e.progress || 0}%` }} />
                        </div>
                        <span className="text-xs text-gray-600">{e.progress || 0}%</span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1">Started: {new Date(e.started_at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {predictions && predictions.predictions?.length > 0 && (
            <Card hover>
              <CardHeader>
                <CardTitle>Predictions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {predictions.predictions.map((p, idx) => (
                    <div key={idx} className="p-3 border border-gray-200 rounded-lg hover:border-indigo-300 hover:shadow-sm transition-all">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">{p.type.replace('_', ' ')}</span>
                        <span className={`px-2 py-0.5 rounded text-[11px] ${getSeverityColor(p.severity)}`}>{p.severity}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{p.description}</p>
                      <p className="text-[11px] text-gray-500 mt-1">Predicted: {new Date(p.predicted_date).toLocaleDateString()} • {Math.round(p.confidence * 100)}% confidence</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* History (condensed) */}
      <Card hover>
        <CardHeader>
          <CardTitle>Recent Executions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {executionHistory.slice(0, 10).map((ex) => (
              <div key={ex.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-indigo-300 hover:shadow-sm transition-all">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 truncate">{ex.workflow_id}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] ${getStatusColor(ex.status)}`}>{ex.status}</span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">{new Date(ex.started_at).toLocaleString()} {ex.completed_at ? `• ${Math.round((new Date(ex.completed_at) - new Date(ex.started_at)) / 1000)}s` : '• Running...'}</p>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${ex.progress || 0}%` }} />
                  </div>
                  <span className="text-xs text-gray-500">{ex.progress || 0}%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MaintenanceManager;
