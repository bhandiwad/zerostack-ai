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
  ServerIcon
} from '@heroicons/react/24/outline';

const API_BASE = 'http://localhost:5002/api';

const WorkflowOrchestrator = () => {
  const [templates, setTemplates] = useState([]);
  const [activeWorkflows, setActiveWorkflows] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [workflowInput, setWorkflowInput] = useState('');

  useEffect(() => {
    loadTemplates();
    loadActiveWorkflows();
    
    // Poll for workflow updates every 5 seconds
    const interval = setInterval(loadActiveWorkflows, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await fetch(`${API_BASE}/workflows/templates`);
      const data = await response.json();
      if (data.success) {
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const loadActiveWorkflows = async () => {
    try {
      const response = await fetch(`${API_BASE}/workflows/active`);
      const data = await response.json();
      if (data.success) {
        setActiveWorkflows(data.workflows);
      }
    } catch (error) {
      console.error('Failed to load active workflows:', error);
    }
  };

  const createDefaultTemplates = async () => {
    try {
      const response = await fetch(`${API_BASE}/workflows/templates/create-defaults`, {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        loadTemplates();
      }
    } catch (error) {
      console.error('Failed to create templates:', error);
    }
  };

  const executeWorkflow = async (templateId) => {
    setIsExecuting(true);
    try {
      let inputData = {};
      if (workflowInput.trim()) {
        try {
          inputData = JSON.parse(workflowInput);
        } catch (e) {
          inputData = { issue_description: workflowInput };
        }
      }

      const response = await fetch(`${API_BASE}/workflows/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template_id: templateId,
          input_data: inputData
        })
      });

      const data = await response.json();
      if (data.success) {
        loadActiveWorkflows();
        setWorkflowInput('');
      }
    } catch (error) {
      console.error('Failed to execute workflow:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      running: 'text-blue-600 bg-blue-50 border-blue-200',
      completed: 'text-green-600 bg-green-50 border-green-200',
      failed: 'text-red-600 bg-red-50 border-red-200',
      paused: 'text-gray-600 bg-gray-50 border-gray-200'
    };
    return colors[status] || colors.pending;
  };

  const getTemplateIcon = (templateId) => {
    if (templateId.includes('troubleshooting')) return WrenchScrewdriverIcon;
    if (templateId.includes('optimization')) return ChartBarIcon;
    return ServerIcon;
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Workflow Orchestrator</h1>
        <p className="text-gray-600">Advanced multi-agent workflow orchestration using LangGraph</p>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          <button
            onClick={createDefaultTemplates}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
          >
            Create Default Templates
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Kubernetes Troubleshooting</h3>
            <p className="text-sm text-gray-600 mb-3">AI-powered multi-agent workflow for diagnosing and fixing K8s issues</p>
            <button
              onClick={() => executeWorkflow('k8s_troubleshooting')}
              disabled={isExecuting}
              className="w-full bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 disabled:opacity-50"
            >
              Start Troubleshooting
            </button>
          </div>
          
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Deployment Optimization</h3>
            <p className="text-sm text-gray-600 mb-3">Multi-agent workflow for optimizing Kubernetes deployments</p>
            <button
              onClick={() => executeWorkflow('deployment_optimization')}
              disabled={isExecuting}
              className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              Start Optimization
            </button>
          </div>
        </div>
      </div>

      {/* Workflow Input */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Workflow Input</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Issue Description or JSON Input
            </label>
            <textarea
              value={workflowInput}
              onChange={(e) => setWorkflowInput(e.target.value)}
              placeholder="Describe the issue or provide JSON input for the workflow..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm h-24 resize-none"
            />
          </div>
          <p className="text-xs text-gray-500">
            You can provide a simple description or JSON format like: {"{"}"issue_description": "Pods are failing", "logs": ["error1", "error2"]{"}"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Available Templates */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Templates</h2>
          
          {templates.length === 0 ? (
            <div className="text-center py-8">
              <CogIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">No workflow templates available</p>
              <button
                onClick={createDefaultTemplates}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Create Default Templates
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {templates.map((template) => {
                const IconComponent = getTemplateIcon(template.id);
                
                return (
                  <div
                    key={template.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <div className="flex items-start gap-3">
                      <IconComponent className="h-6 w-6 text-blue-600 mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{template.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-xs text-gray-500">
                            {template.nodes?.length || 0} steps
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              executeWorkflow(template.id);
                            }}
                            disabled={isExecuting}
                            className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 disabled:opacity-50"
                          >
                            <PlayIcon className="h-3 w-3" />
                            Execute
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Active Workflows */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Workflows</h2>
          
          {activeWorkflows.length === 0 ? (
            <div className="text-center py-8">
              <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No active workflows</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeWorkflows.map((workflow) => (
                <div
                  key={workflow.workflow_id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900">
                      {workflow.workflow_id.split('_')[0].replace(/([A-Z])/g, ' $1').trim()}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(workflow.status)}`}>
                      {workflow.status.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                      <span>Progress</span>
                      <span>{workflow.progress_percentage.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${workflow.progress_percentage}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>Step {workflow.current_step} of {workflow.total_steps}</div>
                    <div>Started: {formatTimestamp(workflow.created_at)}</div>
                    <div>Updated: {formatTimestamp(workflow.updated_at)}</div>
                  </div>
                  
                  {workflow.messages && workflow.messages.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="text-xs text-gray-600">
                        Latest: {workflow.messages[workflow.messages.length - 1].result}
                      </div>
                    </div>
                  )}
                  
                  {workflow.errors && workflow.errors.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-1 text-xs text-red-600">
                        <ExclamationCircleIcon className="h-3 w-3" />
                        {workflow.errors[workflow.errors.length - 1]}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Template Detail Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">{selectedTemplate.name}</h3>
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                  <p className="text-gray-600">{selectedTemplate.description}</p>
                </div>
                
                {selectedTemplate.nodes && selectedTemplate.nodes.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Workflow Steps</h4>
                    <div className="space-y-2">
                      {selectedTemplate.nodes.map((node, index) => (
                        <div key={node.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{node.name}</div>
                            <div className="text-sm text-gray-600">Role: {node.agent_role}</div>
                          </div>
                          {index < selectedTemplate.nodes.length - 1 && (
                            <ArrowRightIcon className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      executeWorkflow(selectedTemplate.id);
                      setSelectedTemplate(null);
                    }}
                    disabled={isExecuting}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    Execute Workflow
                  </button>
                  <button
                    onClick={() => setSelectedTemplate(null)}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowOrchestrator;
