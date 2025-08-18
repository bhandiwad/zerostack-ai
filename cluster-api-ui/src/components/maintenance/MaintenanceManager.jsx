import React, { useState, useEffect } from 'react';
import { 
  PlayIcon, 
  PauseIcon, 
  StopIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  CogIcon,
  ArrowRightIcon,
  ChartBarIcon,
  WrenchScrewdriverIcon,
  ServerIcon,
  CalendarIcon,
  ShieldCheckIcon,
  DocumentDuplicateIcon,
  ScaleIcon
} from '@heroicons/react/24/outline';

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
      case 'running': return 'text-blue-600 bg-blue-50';
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Automated Maintenance</h1>
          <p className="text-gray-600">Manage cluster maintenance workflows, detect configuration drift, and predict maintenance needs</p>
        </div>

        {/* Predictive Maintenance Section */}
        {predictions && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <ChartBarIcon className="h-6 w-6 mr-2 text-blue-600" />
                Predictive Maintenance
              </h2>
              <button
                onClick={loadPredictions}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Refresh Predictions
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {predictions.predictions.map((prediction, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(prediction.severity)}`}>
                      {prediction.severity.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-500">
                      {Math.round(prediction.confidence * 100)}% confidence
                    </span>
                  </div>
                  <h3 className="font-medium text-gray-900 mb-1">{prediction.type.replace('_', ' ').toUpperCase()}</h3>
                  <p className="text-sm text-gray-600 mb-2">{prediction.description}</p>
                  <p className="text-xs text-gray-500 mb-2">
                    Predicted: {new Date(prediction.predicted_date).toLocaleDateString()}
                  </p>
                  {prediction.automation_available && (
                    <button className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded">
                      Auto-fix Available
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Configuration Drift Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <WrenchScrewdriverIcon className="h-6 w-6 mr-2 text-orange-600" />
              Configuration Drift Detection
            </h2>
            <button
              onClick={detectConfigurationDrift}
              disabled={loading}
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
            >
              {loading ? 'Scanning...' : 'Scan for Drift'}
            </button>
          </div>

          {driftResults && (
            <div className="mt-4">
              {driftResults.drift_detected ? (
                <div className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-orange-900">
                      Configuration Drift Detected ({driftResults.drift_items.length} issues)
                    </h3>
                    {driftResults.auto_correction_available && (
                      <button
                        onClick={correctConfigurationDrift}
                        className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded text-sm"
                      >
                        Auto-Correct
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    {driftResults.drift_items.map((item, index) => (
                      <div key={index} className="bg-white border border-orange-200 rounded p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-900">
                            {item.resource_type}/{item.resource_name}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(item.severity)}`}>
                            {item.severity}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          Expected: {item.expected_value} → Actual: {item.actual_value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-green-600">
                  <CheckCircleIcon className="h-8 w-8 mx-auto mb-2" />
                  No configuration drift detected
                </div>
              )}
            </div>
          )}
        </div>

        {/* Active Executions */}
        {activeExecutions.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <PlayIcon className="h-6 w-6 mr-2 text-blue-600" />
              Active Maintenance ({activeExecutions.length})
            </h2>
            
            <div className="space-y-3">
              {activeExecutions.map((execution) => (
                <div key={execution.id} className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">{execution.workflow_id}</h3>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">{execution.progress}%</span>
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${execution.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">{execution.current_step}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Started: {new Date(execution.started_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Available Workflows */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Available Maintenance Workflows</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workflows.map((workflow) => (
              <div key={workflow.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    {getWorkflowIcon(workflow.category)}
                    <h3 className="font-medium text-gray-900">{workflow.name}</h3>
                  </div>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                    {workflow.category}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 mb-3">{workflow.description}</p>
                
                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  <span className="flex items-center">
                    <ClockIcon className="h-3 w-3 mr-1" />
                    {workflow.duration}
                  </span>
                  <span>{workflow.steps.length} steps</span>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => executeWorkflow(workflow.id)}
                    disabled={loading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm font-medium disabled:opacity-50"
                  >
                    Run Now
                  </button>
                  <button
                    onClick={() => {
                      setSelectedWorkflow(workflow);
                      setShowScheduleModal(true);
                    }}
                    className="px-3 py-2 border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50"
                  >
                    <CalendarIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Execution History */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Maintenance History</h2>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Workflow
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Started
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progress
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {executionHistory.slice(0, 10).map((execution) => (
                  <tr key={execution.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{execution.workflow_id}</div>
                      <div className="text-sm text-gray-500">{execution.cluster_id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(execution.status)}`}>
                        {execution.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(execution.started_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {execution.completed_at ? 
                        `${Math.round((new Date(execution.completed_at) - new Date(execution.started_at)) / 1000)}s` : 
                        'Running...'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${execution.progress || 0}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-500">{execution.progress || 0}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceManager;
