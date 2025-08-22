import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import Button from '../ui/Button';

// Icon components
const WrenchScrewdriverIcon = ({ className, size = 20 }) => (
  <svg className={className} width={size} height={size} fill="currentColor" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" aria-hidden="true" role="img">
    <path d="M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2Z"/>
  </svg>
);

const ChartBarIcon = ({ className, size = 20 }) => (
  <svg className={className} width={size} height={size} fill="currentColor" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" aria-hidden="true" role="img">
    <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
  </svg>
);

const ServerIcon = ({ className, size = 20 }) => (
  <svg className={className} width={size} height={size} fill="currentColor" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" aria-hidden="true" role="img">
    <path d="M4 1h16a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zm0 8h16a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1zm0 8h16a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1z"/>
  </svg>
);

const CogIcon = ({ className, size = 48 }) => (
  <svg className={className} width={size} height={size} fill="currentColor" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" aria-hidden="true" role="img">
    <path d="M12 8a4 4 0 100 8 4 4 0 000-8zm9.4 4a7.4 7.4 0 01-.13 1.4l2.02 1.58-2 3.46-2.45-1a7.5 7.5 0 01-2.42 1.4l-.37 2.6h-4l-.37-2.6a7.5 7.5 0 01-2.42-1.4l-2.45 1-2-3.46L2.73 13.4A7.4 7.4 0 012.6 12c0-.47.05-.94.13-1.4L.71 9.02l2-3.46 2.45 1a7.5 7.5 0 012.42-1.4L8 2.56h4l.37 2.6a7.5 7.5 0 012.42 1.4l2.45-1 2 3.46-2.02 1.58c.08.46.13.93.13 1.4z"/>
  </svg>
);

const ClockIcon = ({ className, size = 48 }) => (
  <svg className={className} width={size} height={size} fill="currentColor" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" aria-hidden="true" role="img">
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm4.2 14.2L11 13V7h1.5v5.2l4.5 2.7-.8 1.3z"/>
  </svg>
);

const PlayIcon = ({ className, size = 12 }) => (
  <svg className={className} width={size} height={size} fill="currentColor" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" aria-hidden="true" role="img">
    <path d="M8 5v14l11-7z"/>
  </svg>
);

const ArrowRightIcon = ({ className, size = 16 }) => (
  <svg className={className} width={size} height={size} fill="currentColor" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" aria-hidden="true" role="img">
    <path d="M4 11v2h12l-5.5 5.5 1.42 1.42L19.84 12l-7.92-7.92L10.5 5.5 16 11H4z"/>
  </svg>
);

const ExclamationCircleIcon = ({ className, size = 12 }) => (
  <svg className={className} width={size} height={size} fill="currentColor" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" aria-hidden="true" role="img">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
  </svg>
);

const API_BASE = 'http://localhost:5002/api/workflows';

const WorkflowOrchestrator = () => {
  const [templates, setTemplates] = useState([]);
  const [activeWorkflows, setActiveWorkflows] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [workflowInput, setWorkflowInput] = useState('');
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [loadingWorkflows, setLoadingWorkflows] = useState(false);
  const [errorTemplates, setErrorTemplates] = useState('');
  const [errorWorkflows, setErrorWorkflows] = useState('');

  useEffect(() => {
    loadTemplates();
    loadActiveWorkflows();
    
    // Poll for workflow updates every 5 seconds
    const interval = setInterval(loadActiveWorkflows, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    setErrorTemplates('');
    try {
      const response = await fetch(`${API_BASE}/templates`);
      const data = await response.json();
      if (data.success) {
        setTemplates(data.templates);
      } else {
        setErrorTemplates(data.error || 'Failed to load templates');
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
      setErrorTemplates('Failed to load templates');
    } finally {
      setLoadingTemplates(false);
    }
  };

  const loadActiveWorkflows = async () => {
    setLoadingWorkflows(true);
    setErrorWorkflows('');
    try {
      const response = await fetch(`${API_BASE}/active`);
      const data = await response.json();
      if (data.success) {
        setActiveWorkflows(data.workflows);
      } else {
        setErrorWorkflows(data.error || 'Failed to load active workflows');
      }
    } catch (error) {
      console.error('Failed to load active workflows:', error);
      setErrorWorkflows('Failed to load active workflows');
    } finally {
      setLoadingWorkflows(false);
    }
  };

  const createDefaultTemplates = async () => {
    try {
      const response = await fetch(`${API_BASE}/templates/create-defaults`, {
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

      const response = await fetch(`${API_BASE}/execute`, {
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
      running: 'text-indigo-600 bg-indigo-50 border-indigo-200',
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
    <div className="workflow-orchestrator space-y-6 max-w-7xl mx-auto">
      {/* Hero */}
      <Card hover>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-xl font-semibold text-gray-900">Workflow Orchestrator</h1>
              <p className="text-sm text-gray-600">Design and run multi-agent workflows powered by LangGraph</p>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">AI</span>
              <span className="px-2 py-0.5 text-xs rounded-full bg-gray-50 text-gray-700 border border-gray-200">Multi-agent</span>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Quick Actions</CardTitle>
            <Button onClick={createDefaultTemplates} size="small" variant="primary">
              Create Default Templates
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <button onClick={() => executeWorkflow('k8s_troubleshooting')} className="group border border-gray-200 rounded-lg p-4 text-left hover:border-indigo-300 hover:shadow-sm transition-all">
              <div className="flex items-center gap-2">
                <WrenchScrewdriverIcon className="w-5 h-5 text-orange-600" />
                <div className="font-medium text-gray-900">Troubleshoot Cluster</div>
              </div>
              <p className="text-xs text-gray-600 mt-1">Detect and resolve Kubernetes issues</p>
            </button>
            <button onClick={() => executeWorkflow('deployment_optimization')} className="group border border-gray-200 rounded-lg p-4 text-left hover:border-indigo-300 hover:shadow-sm transition-all">
              <div className="flex items-center gap-2">
                <ChartBarIcon className="w-5 h-5 text-emerald-600" />
                <div className="font-medium text-gray-900">Optimize Deployments</div>
              </div>
              <p className="text-xs text-gray-600 mt-1">Autoscaling, resources and SLOs</p>
            </button>
            <button onClick={createDefaultTemplates} className="group border border-dashed border-gray-300 rounded-lg p-4 text-left hover:border-indigo-300 hover:shadow-sm transition-all">
              <div className="flex items-center gap-2">
                <ServerIcon className="w-5 h-5 text-indigo-600" />
                <div className="font-medium text-gray-900">Create Default Templates</div>
              </div>
              <p className="text-xs text-gray-600 mt-1">Bootstrap with recommended templates</p>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Workflow Input */}
      <Card>
        <CardHeader>
          <CardTitle>Workflow Input</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Issue Description or JSON Input
              </label>
              <textarea
                value={workflowInput}
                onChange={(e) => setWorkflowInput(e.target.value)}
                placeholder="Describe the issue or provide JSON input for the workflow..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-24 resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <p className="text-xs text-gray-500">
              You can provide a simple description or JSON format like: {"{"}"issue_description": "Pods are failing", "logs": ["error1", "error2"]{"}"}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Available Templates */}
        <Card hover>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">Available Templates</h2>
          </CardHeader>
          <CardContent>
          {loadingTemplates ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse h-16 bg-gray-100 rounded" />
              ))}
            </div>
          ) : errorTemplates ? (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
              {errorTemplates}
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8">
              <CogIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">No workflow templates available</p>
              <Button onClick={createDefaultTemplates} variant="primary" size="small">
                Create Default Templates
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((template) => {
                const IconComponent = getTemplateIcon(template.id);
                return (
                  <div
                    key={template.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer"
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <div className="flex items-start gap-3">
                      <IconComponent className="h-6 w-6 text-indigo-600 mt-1 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-medium text-gray-900 truncate">{template.name}</h3>
                          <span className="px-2 py-0.5 text-[11px] rounded-full border border-gray-200 text-gray-600 whitespace-nowrap">{template.nodes?.length || 0} steps</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{template.description}</p>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <span>Updated</span>
                            <span>•</span>
                            <span>Just now</span>
                          </div>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              executeWorkflow(template.id);
                            }}
                            disabled={isExecuting}
                            size="small"
                          >
                            {isExecuting ? (
                              <span className="flex items-center gap-1">
                                <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24">
                                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" className="opacity-25" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                </svg>
                                Executing...
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <PlayIcon className="h-3 w-3" />
                                Run
                              </span>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </CardContent>
        </Card>

        {/* Active Workflows */}
        <Card hover>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">Active Workflows</h2>
          </CardHeader>
          <CardContent>
          {loadingWorkflows ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse h-20 bg-gray-100 rounded" />
              ))}
            </div>
          ) : errorWorkflows ? (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
              {errorWorkflows}
            </div>
          ) : activeWorkflows.length === 0 ? (
            <div className="text-center py-8">
              <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No active workflows</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeWorkflows.map((workflow) => (
                <div
                  key={workflow.workflow_id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900">
                      {workflow.workflow_id.split('_')[0].replace(/([A-Z])/g, ' $1').trim()}
                    </h3>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="text-xs text-gray-600">
                      Latest: {workflow.messages[workflow.messages.length - 1].result}
                    </div>
                  </div>
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
          </CardContent>
        </Card>
      </div>

      {/* Template Detail Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-lg">
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
                          <div className="flex-shrink-0 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
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
                  <Button
                    onClick={() => {
                      executeWorkflow(selectedTemplate.id);
                      setSelectedTemplate(null);
                    }}
                    disabled={isExecuting}
                    className="flex-1"
                  >
                    {isExecuting ? 'Executing...' : 'Execute Workflow'}
                  </Button>
                  <Button onClick={() => setSelectedTemplate(null)} variant="secondary" size="small">
                    Cancel
                  </Button>
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
