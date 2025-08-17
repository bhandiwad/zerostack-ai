import React, { useState, useEffect } from 'react';
import './WorkflowTester.css';

interface WorkflowType {
  name: string;
  description: string;
  parameters: string[];
}

interface WorkflowExecution {
  id: string;
  workflow_name: string;
  status: string;
  user_request: string;
  started_at: string;
  completed_at?: string;
  result?: any;
  error?: string;
}

const WorkflowTester: React.FC = () => {
  const [workflowTypes, setWorkflowTypes] = useState<WorkflowType[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('');
  const [userRequest, setUserRequest] = useState<string>('');
  const [context, setContext] = useState<string>('{}');
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [activeWorkflows, setActiveWorkflows] = useState<WorkflowExecution[]>([]);
  const [executionResults, setExecutionResults] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    loadWorkflowTypes();
    loadActiveWorkflows();
  }, []);

  const loadWorkflowTypes = async () => {
    try {
      const response = await fetch('http://localhost:5002/api/workflows/types');
      if (response.ok) {
        const data = await response.json();
        setWorkflowTypes(data.workflow_types || []);
      } else {
        console.error('Failed to load workflow types:', response.status);
        setWorkflowTypes([]);
      }
    } catch (error) {
      console.error('Failed to load workflow types:', error);
      setWorkflowTypes([]);
    }
  };

  const loadActiveWorkflows = async () => {
    try {
      const response = await fetch('http://localhost:5002/api/workflows/active');
      if (response.ok) {
        const data = await response.json();
        setActiveWorkflows(data.workflows || []);
      } else {
        console.error('Failed to load active workflows:', response.status);
        setActiveWorkflows([]);
      }
    } catch (error) {
      console.error('Failed to load active workflows:', error);
      setActiveWorkflows([]);
    }
  };

  const executeWorkflow = async () => {
    if (!selectedWorkflow || !userRequest.trim()) {
      alert('Please select a workflow and enter a user request');
      return;
    }

    setIsExecuting(true);
    setLoading(true);

    try {
      let parsedContext = {};
      if (context.trim()) {
        try {
          parsedContext = JSON.parse(context);
        } catch (e) {
          alert('Invalid JSON in context field');
          setIsExecuting(false);
          setLoading(false);
          return;
        }
      }

      const response = await fetch('http://localhost:5002/api/workflows/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workflow_name: selectedWorkflow,
          user_request: userRequest,
          context: parsedContext
        }),
      });

      const result = await response.json();
      
      if (response.ok) {
        setExecutionResults(prev => [result, ...prev]);
        setUserRequest('');
        loadActiveWorkflows(); // Refresh active workflows
      } else {
        alert(`Execution failed: ${result.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Workflow execution failed:', error);
      alert('Failed to execute workflow');
    } finally {
      setIsExecuting(false);
      setLoading(false);
    }
  };

  const testWorkflowSystem = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5002/api/workflows/test', {
        method: 'POST',
      });
      const result = await response.json();
      
      if (response.ok) {
        alert('Workflow system test completed successfully!');
        setExecutionResults(prev => [result, ...prev]);
      } else {
        alert(`Test failed: ${result.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Test failed:', error);
      alert('Failed to test workflow system');
    } finally {
      setLoading(false);
    }
  };

  const initializeOrchestrator = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5002/api/workflows/initialize', {
        method: 'POST',
      });
      const result = await response.json();
      
      if (response.ok) {
        alert('Orchestrator initialized successfully!');
        loadWorkflowTypes();
      } else {
        alert(`Initialization failed: ${result.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Initialization failed:', error);
      alert('Failed to initialize orchestrator');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return '#28a745';
      case 'running': return '#007bff';
      case 'failed': return '#dc3545';
      case 'pending': return '#ffc107';
      default: return '#6c757d';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="workflow-tester">
      <div className="workflow-header">
        <h2>AI Workflow Tester</h2>
        <p>Test and monitor multi-agent workflows</p>
      </div>

      <div className="workflow-controls">
        <div className="control-section">
          <h3>System Controls</h3>
          <div className="button-group">
            <button 
              onClick={initializeOrchestrator}
              disabled={loading}
              className="btn btn-secondary"
            >
              Initialize Orchestrator
            </button>
            <button 
              onClick={testWorkflowSystem}
              disabled={loading}
              className="btn btn-info"
            >
              Test System
            </button>
            <button 
              onClick={loadActiveWorkflows}
              disabled={loading}
              className="btn btn-outline"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="control-section">
          <h3>Execute Workflow</h3>
          <div className="form-group">
            <label>Workflow Type:</label>
            <select 
              value={selectedWorkflow} 
              onChange={(e) => setSelectedWorkflow(e.target.value)}
              disabled={loading}
            >
              <option value="">Select a workflow...</option>
              {(workflowTypes || []).map((workflow) => (
                <option key={workflow.name} value={workflow.name}>
                  {workflow.name} - {workflow.description}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>User Request:</label>
            <textarea
              value={userRequest}
              onChange={(e) => setUserRequest(e.target.value)}
              placeholder="Enter your request (e.g., 'Help me troubleshoot my cluster')"
              disabled={loading}
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>Context (JSON):</label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder='{"cluster_id": "prod-cluster", "namespace": "default"}'
              disabled={loading}
              rows={2}
            />
          </div>

          <button 
            onClick={executeWorkflow}
            disabled={isExecuting || loading || !selectedWorkflow || !userRequest.trim()}
            className="btn btn-primary execute-btn"
          >
            {isExecuting ? 'Executing...' : 'Execute Workflow'}
          </button>
        </div>
      </div>

      <div className="workflow-results">
        <div className="results-section">
          <h3>Active Workflows ({activeWorkflows.length})</h3>
          <div className="active-workflows">
            {activeWorkflows.length === 0 ? (
              <p className="no-data">No active workflows</p>
            ) : (
              activeWorkflows.map((workflow) => (
                <div key={workflow.id} className="workflow-item">
                  <div className="workflow-header-item">
                    <span className="workflow-name">{workflow.workflow_name}</span>
                    <span 
                      className="workflow-status"
                      style={{ color: getStatusColor(workflow.status) }}
                    >
                      {workflow.status}
                    </span>
                  </div>
                  <div className="workflow-details">
                    <p><strong>Request:</strong> {workflow.user_request}</p>
                    <p><strong>Started:</strong> {formatTimestamp(workflow.started_at)}</p>
                    {workflow.completed_at && (
                      <p><strong>Completed:</strong> {formatTimestamp(workflow.completed_at)}</p>
                    )}
                    {workflow.error && (
                      <p className="error-text"><strong>Error:</strong> {workflow.error}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="results-section">
          <h3>Execution Results</h3>
          <div className="execution-results">
            {executionResults.length === 0 ? (
              <p className="no-data">No execution results yet</p>
            ) : (
              executionResults.map((result, index) => (
                <div key={index} className="result-item">
                  <div className="result-header">
                    <span className="result-status" style={{ 
                      color: result.status === 'success' ? '#28a745' : '#dc3545' 
                    }}>
                      {result.status}
                    </span>
                    <span className="result-time">
                      {new Date().toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="result-content">
                    <pre>{JSON.stringify(result, null, 2)}</pre>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="workflow-info">
        <h3>Available Workflow Types</h3>
        <div className="workflow-types">
          {!workflowTypes || workflowTypes.length === 0 ? (
            <p className="no-data">No workflow types available. Initialize the orchestrator first.</p>
          ) : (
            workflowTypes.map((workflow) => (
              <div key={workflow.name} className="workflow-type-card">
                <h4>{workflow.name}</h4>
                <p>{workflow.description}</p>
                {workflow.parameters && workflow.parameters.length > 0 && (
                  <div className="parameters">
                    <strong>Parameters:</strong> {workflow.parameters.join(', ')}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkflowTester;
