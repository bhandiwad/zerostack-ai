import React, { useState, useCallback, useRef, useEffect } from 'react';
import './WorkflowDesigner.css';

interface WorkflowNode {
  id: string;
  type: 'start' | 'end' | 'agent' | 'condition' | 'action' | 'deploy' | 'maintenance' | 'monitor' | 'backup' | 'security' | 'scale';
  position: { x: number; y: number };
  data: {
    label: string;
    agentType?: string;
    condition?: string;
    action?: string;
    deployType?: string;
    maintenanceType?: string;
    monitorType?: string;
    backupType?: string;
    securityType?: string;
    scaleType?: string;
    parameters?: Record<string, any>;
  };
  inputs?: string[];
  outputs?: string[];
}

interface WorkflowConnection {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  category: string;
}

const WorkflowDesigner: React.FC = () => {
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [connections, setConnections] = useState<WorkflowConnection[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [draggedNodeType, setDraggedNodeType] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [connectionStart, setConnectionStart] = useState<{ nodeId: string; handle: string } | null>(null);
  const [workflowName, setWorkflowName] = useState<string>('New Workflow');
  const [savedWorkflows, setSavedWorkflows] = useState<WorkflowTemplate[]>([]);
  const [showTemplates, setShowTemplates] = useState<boolean>(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const nodeTypes = [
    { 
      type: 'start', 
      label: 'Start', 
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8,5.14V19.14L19,12.14L8,5.14Z" /></svg>, 
      color: '#10b981' 
    },
    { 
      type: 'agent', 
      label: 'Agent', 
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12,2A2,2 0 0,1 14,4A2,2 0 0,1 12,6A2,2 0 0,1 10,4A2,2 0 0,1 12,2M21,9V7L15,1H5A2,2 0 0,0 3,3V21A2,2 0 0,0 5,23H19A2,2 0 0,0 21,21V9M19,9H14V4H19V9Z" /></svg>, 
      color: '#3b82f6' 
    },
    { 
      type: 'condition', 
      label: 'Condition', 
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M15.07,11.25L14.17,12.17C13.45,12.89 13,13.5 13,15H11V14.5C11,13.39 11.45,12.39 12.17,11.67L13.41,10.41C13.78,10.05 14,9.55 14,9C14,7.89 13.1,7 12,7A2,2 0 0,0 10,9H8A4,4 0 0,1 12,5A4,4 0 0,1 16,9C16,10.27 15.45,11.4 14.59,12.26L15.07,11.25M13,19H11V17H13V19Z" /></svg>, 
      color: '#f59e0b' 
    },
    { 
      type: 'action', 
      label: 'Action', 
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M13,9H11V7H13M13,17H11V11H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" /></svg>, 
      color: '#06b6d4' 
    },
    { 
      type: 'end', 
      label: 'End', 
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6,6H18V18H6V6Z" /></svg>, 
      color: '#ef4444' 
    },
    { 
      type: 'deploy', 
      label: 'Deploy', 
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8,5.14V19.14L19,12.14L8,5.14Z" /></svg>, 
      color: '#6366f1' 
    },
    { 
      type: 'maintenance', 
      label: 'Maintenance', 
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22.7,19L13.6,9.9C14.5,7.6 14,4.9 12.1,3C10.1,1 7.1,0.6 4.7,1.7L9,6L6,9L1.6,4.7C0.4,7.1 0.9,10.1 2.9,12.1C4.8,14 7.5,14.5 9.8,13.6L18.9,22.7C19.3,23.1 19.9,23.1 20.3,22.7L22.6,20.4C23.1,20 23.1,19.3 22.7,19Z" /></svg>, 
      color: '#f97316' 
    },
    { 
      type: 'monitor', 
      label: 'Monitor', 
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3,3H21A2,2 0 0,1 23,5V17A2,2 0 0,1 21,19H13V21H17V23H7V21H11V19H3A2,2 0 0,1 1,17V5A2,2 0 0,1 3,3M3,5V17H21V5H3Z" /></svg>, 
      color: '#14b8a6' 
    },
    { 
      type: 'backup', 
      label: 'Backup', 
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" /></svg>, 
      color: '#6b7280' 
    },
    { 
      type: 'security', 
      label: 'Security', 
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M12,7C13.4,7 14.8,8.6 14.8,10V11.5C15.4,11.5 16,12.1 16,12.7V16.2C16,16.8 15.4,17.3 14.8,17.3H9.2C8.6,17.3 8,16.8 8,16.2V12.7C8,12.1 8.4,11.5 9,11.5V10C9,8.6 10.6,7 12,7M12,8.2C11.2,8.2 10.2,9.2 10.2,10V11.5H13.8V10C13.8,9.2 12.8,8.2 12,8.2Z" /></svg>, 
      color: '#dc2626' 
    },
    { 
      type: 'scale', 
      label: 'Scale', 
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16,6L18.29,8.29L13.41,13.17L9.41,9.17L2,16.59L3.41,18L9.41,12L13.41,16L19.71,9.71L22,12V6H16Z" /></svg>, 
      color: '#059669' 
    }
  ];

  const agentTypes = [
    'coordinator',
    'l1_support',
    'l2_support',
    'l3_support',
    'cluster_ops',
    'monitoring'
  ];

  const workflowTemplates: WorkflowTemplate[] = [
    {
      id: 'support_escalation',
      name: 'Support Escalation',
      description: 'Automated support ticket escalation workflow',
      category: 'Support',
      nodes: [
        { id: 'start', type: 'start', position: { x: 100, y: 200 }, data: { label: 'Start' } },
        { id: 'l1', type: 'agent', position: { x: 300, y: 200 }, data: { label: 'L1 Support', agentType: 'l1_support' } },
        { id: 'check', type: 'condition', position: { x: 500, y: 200 }, data: { label: 'Can Resolve?', condition: 'resolution_confidence > 0.8' } },
        { id: 'l2', type: 'agent', position: { x: 500, y: 350 }, data: { label: 'L2 Support', agentType: 'l2_support' } },
        { id: 'end', type: 'end', position: { x: 700, y: 200 }, data: { label: 'End' } }
      ],
      connections: [
        { id: 'c1', source: 'start', target: 'l1' },
        { id: 'c2', source: 'l1', target: 'check' },
        { id: 'c3', source: 'check', target: 'end' },
        { id: 'c4', source: 'check', target: 'l2' },
        { id: 'c5', source: 'l2', target: 'end' }
      ]
    },
    {
      id: 'cluster_deployment',
      name: 'Cluster Deployment',
      description: 'Automated cluster deployment and validation workflow',
      category: 'Operations',
      nodes: [
        { id: 'start', type: 'start', position: { x: 100, y: 200 }, data: { label: 'Start' } },
        { id: 'validate', type: 'action', position: { x: 300, y: 200 }, data: { label: 'Validate Config', action: 'validate_cluster_config' } },
        { id: 'deploy', type: 'deploy', position: { x: 500, y: 200 }, data: { label: 'Deploy Cluster', deployType: 'cluster' } },
        { id: 'monitor', type: 'monitor', position: { x: 700, y: 200 }, data: { label: 'Health Check', monitorType: 'cluster_health' } },
        { id: 'end', type: 'end', position: { x: 900, y: 200 }, data: { label: 'End' } }
      ],
      connections: [
        { id: 'c1', source: 'start', target: 'validate' },
        { id: 'c2', source: 'validate', target: 'deploy' },
        { id: 'c3', source: 'deploy', target: 'monitor' },
        { id: 'c4', source: 'monitor', target: 'end' }
      ]
    },
    {
      id: 'automated_maintenance',
      name: 'Automated Maintenance',
      description: 'Scheduled maintenance workflow with patching and updates',
      category: 'Maintenance',
      nodes: [
        { id: 'start', type: 'start', position: { x: 100, y: 200 }, data: { label: 'Start' } },
        { id: 'backup', type: 'backup', position: { x: 300, y: 200 }, data: { label: 'Create Backup', backupType: 'full' } },
        { id: 'maintenance', type: 'maintenance', position: { x: 500, y: 200 }, data: { label: 'Apply Updates', maintenanceType: 'security_patches' } },
        { id: 'validate', type: 'monitor', position: { x: 700, y: 200 }, data: { label: 'Validate Health', monitorType: 'post_maintenance' } },
        { id: 'rollback_check', type: 'condition', position: { x: 900, y: 200 }, data: { label: 'Health OK?', condition: 'cluster_healthy' } },
        { id: 'rollback', type: 'maintenance', position: { x: 900, y: 350 }, data: { label: 'Rollback', maintenanceType: 'rollback' } },
        { id: 'end', type: 'end', position: { x: 1100, y: 200 }, data: { label: 'End' } }
      ],
      connections: [
        { id: 'c1', source: 'start', target: 'backup' },
        { id: 'c2', source: 'backup', target: 'maintenance' },
        { id: 'c3', source: 'maintenance', target: 'validate' },
        { id: 'c4', source: 'validate', target: 'rollback_check' },
        { id: 'c5', source: 'rollback_check', target: 'end' },
        { id: 'c6', source: 'rollback_check', target: 'rollback' },
        { id: 'c7', source: 'rollback', target: 'end' }
      ]
    },
    {
      id: 'security_hardening',
      name: 'Security Hardening',
      description: 'Automated security scanning and policy enforcement',
      category: 'Security',
      nodes: [
        { id: 'start', type: 'start', position: { x: 100, y: 200 }, data: { label: 'Start' } },
        { id: 'scan', type: 'security', position: { x: 300, y: 200 }, data: { label: 'Security Scan', securityType: 'vulnerability_scan' } },
        { id: 'policy', type: 'security', position: { x: 500, y: 200 }, data: { label: 'Apply Policies', securityType: 'policy_enforcement' } },
        { id: 'monitor', type: 'monitor', position: { x: 700, y: 200 }, data: { label: 'Monitor Compliance', monitorType: 'security_compliance' } },
        { id: 'end', type: 'end', position: { x: 900, y: 200 }, data: { label: 'End' } }
      ],
      connections: [
        { id: 'c1', source: 'start', target: 'scan' },
        { id: 'c2', source: 'scan', target: 'policy' },
        { id: 'c3', source: 'policy', target: 'monitor' },
        { id: 'c4', source: 'monitor', target: 'end' }
      ]
    },
    {
      id: 'auto_scaling',
      name: 'Auto Scaling Workflow',
      description: 'Intelligent scaling based on metrics and cost optimization',
      category: 'Operations',
      nodes: [
        { id: 'start', type: 'start', position: { x: 100, y: 200 }, data: { label: 'Start' } },
        { id: 'monitor', type: 'monitor', position: { x: 300, y: 200 }, data: { label: 'Monitor Metrics', monitorType: 'resource_usage' } },
        { id: 'scale_check', type: 'condition', position: { x: 500, y: 200 }, data: { label: 'Scale Needed?', condition: 'resource_threshold' } },
        { id: 'scale_up', type: 'scale', position: { x: 700, y: 150 }, data: { label: 'Scale Up', scaleType: 'horizontal_up' } },
        { id: 'scale_down', type: 'scale', position: { x: 700, y: 250 }, data: { label: 'Scale Down', scaleType: 'horizontal_down' } },
        { id: 'end', type: 'end', position: { x: 900, y: 200 }, data: { label: 'End' } }
      ],
      connections: [
        { id: 'c1', source: 'start', target: 'monitor' },
        { id: 'c2', source: 'monitor', target: 'scale_check' },
        { id: 'c3', source: 'scale_check', target: 'scale_up' },
        { id: 'c4', source: 'scale_check', target: 'scale_down' },
        { id: 'c5', source: 'scale_up', target: 'end' },
        { id: 'c6', source: 'scale_down', target: 'end' }
      ]
    }
  ];

  const generateNodeId = (): string => {
    return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const generateConnectionId = (): string => {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleDragStart = (e: React.DragEvent, nodeType: string) => {
    setDraggedNodeType(nodeType);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    
    if (!draggedNodeType || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const nodeTypeConfig = nodeTypes.find(nt => nt.type === draggedNodeType);
    if (!nodeTypeConfig) return;

    const newNode: WorkflowNode = {
      id: generateNodeId(),
      type: draggedNodeType as any,
      position: { x, y },
      data: {
        label: nodeTypeConfig.label,
        ...(draggedNodeType === 'agent' && { agentType: 'coordinator' }),
        ...(draggedNodeType === 'condition' && { condition: 'true' }),
        ...(draggedNodeType === 'action' && { action: 'log_message' })
      }
    };

    setNodes(prev => [...prev, newNode]);
    setDraggedNodeType(null);
  }, [draggedNodeType, nodeTypes]);

  const handleNodeClick = (nodeId: string) => {
    setSelectedNode(selectedNode === nodeId ? null : nodeId);
  };

  const handleNodeDelete = (nodeId: string) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setConnections(prev => prev.filter(c => c.source !== nodeId && c.target !== nodeId));
    if (selectedNode === nodeId) {
      setSelectedNode(null);
    }
  };

  const handleNodeUpdate = (nodeId: string, updates: Partial<WorkflowNode['data']>) => {
    setNodes(prev => prev.map(node => 
      node.id === nodeId 
        ? { ...node, data: { ...node.data, ...updates } }
        : node
    ));
  };

  const handleConnectionStart = (nodeId: string, handle: string) => {
    setIsConnecting(true);
    setConnectionStart({ nodeId, handle });
  };

  const handleConnectionEnd = (nodeId: string, handle: string) => {
    if (isConnecting && connectionStart && connectionStart.nodeId !== nodeId) {
      const newConnection: WorkflowConnection = {
        id: generateConnectionId(),
        source: connectionStart.nodeId,
        target: nodeId,
        sourceHandle: connectionStart.handle,
        targetHandle: handle
      };
      setConnections(prev => [...prev, newConnection]);
    }
    setIsConnecting(false);
    setConnectionStart(null);
  };

  const handleConnectionDelete = (connectionId: string) => {
    setConnections(prev => prev.filter(c => c.id !== connectionId));
  };

  const saveWorkflow = () => {
    const workflow: WorkflowTemplate = {
      id: `workflow_${Date.now()}`,
      name: workflowName,
      description: `Custom workflow created on ${new Date().toLocaleDateString()}`,
      category: 'Custom',
      nodes,
      connections
    };

    setSavedWorkflows(prev => [...prev, workflow]);
    alert(`Workflow "${workflowName}" saved successfully!`);
  };

  const loadTemplate = (template: WorkflowTemplate) => {
    setNodes(template.nodes);
    setConnections(template.connections);
    setWorkflowName(template.name);
    setShowTemplates(false);
  };

  const clearWorkflow = () => {
    setNodes([]);
    setConnections([]);
    setSelectedNode(null);
    setWorkflowName('New Workflow');
  };

  const executeWorkflow = async () => {
    if (nodes.length === 0) {
      alert('Please add nodes to the workflow before executing');
      return;
    }

    try {
      const workflowData = {
        name: workflowName,
        nodes: nodes.map(node => ({
          id: node.id,
          type: node.type,
          data: node.data,
          position: node.position
        })),
        connections: connections.map(conn => ({
          id: conn.id,
          source: conn.source,
          target: conn.target,
          sourceHandle: conn.sourceHandle,
          targetHandle: conn.targetHandle
        }))
      };

      // First create the workflow from design
      const createResponse = await fetch('http://localhost:5002/api/workflows/design/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          workflow_design: workflowData
        })
      });

      if (!createResponse.ok) {
        const error = await createResponse.json();
        alert(`Failed to create workflow: ${error.error}`);
        return;
      }

      const createResult = await createResponse.json();
      const workflowId = createResult.workflow_id;

      // Then execute the created workflow
      const executeResponse = await fetch('http://localhost:5002/api/workflows/design/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          workflow_id: workflowId,
          input_data: {
            user_request: 'Execute custom designed workflow',
            workflow_name: workflowName
          }
        })
      });

      if (executeResponse.ok) {
        const result = await executeResponse.json();
        alert(`Workflow created and executed successfully!\nWorkflow ID: ${workflowId}\nExecution ID: ${result.execution_id}`);
      } else {
        const error = await executeResponse.json();
        alert(`Workflow execution failed: ${error.error}`);
      }
    } catch (error) {
      console.error('Workflow execution error:', error);
      alert('Failed to execute workflow. Please check the console for details.');
    }
  };

  const selectedNodeData = selectedNode ? nodes.find(n => n.id === selectedNode) : null;

  return (
    <div className="workflow-designer">
      <div className="designer-header">
        <h1 style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={{marginRight: '8px'}}>
            <path d="M2,2V4H4V2H2M20,2V4H22V2H20M2,10V12H4V10H2M20,10V12H22V10H20M2,18V20H4V18H2M20,18V20H22V18H20M8,2V4H16V2H8M8,18V20H16V18H8M2,6V8H4V6H2M20,6V8H22V6H20M2,14V16H4V14H2M20,14V16H22V14H20M6,2V4H8V2H6M16,2V4H18V2H16M6,18V20H8V18H6M16,18V20H18V18H16M10,2V4H14V2H10M10,18V20H14V18H10Z"/>
          </svg>
          Visual Workflow Designer
        </h1>
        <p>Drag and drop components to create multi-agent workflows</p>
      </div>

      <div className="designer-toolbar">
        <div className="workflow-controls">
          <input
            type="text"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            placeholder="Workflow name"
            className="workflow-name-input"
          />
          <button onClick={saveWorkflow} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15,9H5V5H15M12,19A3,3 0 0,1 9,16A3,3 0 0,1 12,13A3,3 0 0,1 15,16A3,3 0 0,1 12,19M17,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V7L17,3Z"/>
            </svg>
            Save
          </button>
          <button onClick={() => setShowTemplates(!showTemplates)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19,3H5C3.9,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.9 20.1,3 19,3M9,17H7V15H9V17M9,13H7V11H9V13M9,9H7V7H9V9M17,17H11V15H17V17M17,13H11V11H17V13M17,9H11V7H17V9Z"/>
            </svg>
            Templates
          </button>
          <button onClick={clearWorkflow} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
            </svg>
            Clear
          </button>
          <button onClick={executeWorkflow} className="btn btn-success" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8,5.14V19.14L19,12.14L8,5.14Z"/>
            </svg>
            Execute
          </button>
        </div>
      </div>

      <div className="designer-content">
        <div className="node-palette">
          <h3>Components</h3>
          <div className="palette-nodes">
            {nodeTypes.map(nodeType => (
              <div
                key={nodeType.type}
                className="palette-node"
                draggable
                onDragStart={(e) => handleDragStart(e, nodeType.type)}
                style={{ borderColor: nodeType.color }}
              >
                <span className="node-icon">{nodeType.icon}</span>
                <span className="node-label">{nodeType.label}</span>
              </div>
            ))}
          </div>

          {showTemplates && (
            <div className="templates-section">
              <h3>Templates</h3>
              <div className="template-list">
                {workflowTemplates.map(template => (
                  <div key={template.id} className="template-item">
                    <div className="template-info">
                      <h4>{template.name}</h4>
                      <p>{template.description}</p>
                      <span className="template-category">{template.category}</span>
                    </div>
                    <button
                      onClick={() => loadTemplate(template)}
                      className="btn btn-sm btn-primary"
                    >
                      Load
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="workflow-canvas-container">
          <div
            ref={canvasRef}
            className="workflow-canvas"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <svg className="connections-layer">
              {connections.map(connection => {
                const sourceNode = nodes.find(n => n.id === connection.source);
                const targetNode = nodes.find(n => n.id === connection.target);
                
                if (!sourceNode || !targetNode) return null;

                const x1 = sourceNode.position.x + 100;
                const y1 = sourceNode.position.y + 30;
                const x2 = targetNode.position.x;
                const y2 = targetNode.position.y + 30;

                return (
                  <g key={connection.id}>
                    <path
                      d={`M ${x1} ${y1} Q ${(x1 + x2) / 2} ${y1} ${x2} ${y2}`}
                      stroke="#666"
                      strokeWidth="2"
                      fill="none"
                      markerEnd="url(#arrowhead)"
                    />
                    <circle
                      cx={(x1 + x2) / 2}
                      cy={(y1 + y2) / 2}
                      r="8"
                      fill="#ff4444"
                      className="connection-delete"
                      onClick={() => handleConnectionDelete(connection.id)}
                      style={{ cursor: 'pointer' }}
                    />
                  </g>
                );
              })}
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill="#666" />
                </marker>
              </defs>
            </svg>

            {nodes.map(node => {
              const nodeTypeConfig = nodeTypes.find(nt => nt.type === node.type);
              const isSelected = selectedNode === node.id;

              return (
                <div
                  key={node.id}
                  className={`workflow-node ${node.type}-node ${isSelected ? 'selected' : ''}`}
                  style={{
                    left: node.position.x,
                    top: node.position.y,
                    borderColor: nodeTypeConfig?.color
                  }}
                  onClick={() => handleNodeClick(node.id)}
                >
                  <div className="node-header">
                    <span className="node-icon">{nodeTypeConfig?.icon}</span>
                    <span className="node-title">{node.data.label}</span>
                    <button
                      className="node-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNodeDelete(node.id);
                      }}
                    >
                      ×
                    </button>
                  </div>
                  
                  <div className="node-content">
                    {node.type === 'agent' && (
                      <div className="node-detail">Agent: {node.data.agentType}</div>
                    )}
                    {node.type === 'condition' && (
                      <div className="node-detail">If: {node.data.condition}</div>
                    )}
                    {node.type === 'action' && (
                      <div className="node-detail">Do: {node.data.action}</div>
                    )}
                  </div>

                  <div className="node-handles">
                    {node.type !== 'start' && (
                      <div
                        className="node-handle input-handle"
                        onClick={() => handleConnectionEnd(node.id, 'input')}
                      />
                    )}
                    {node.type !== 'end' && (
                      <div
                        className="node-handle output-handle"
                        onClick={() => handleConnectionStart(node.id, 'output')}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {selectedNodeData && (
          <div className="node-properties">
            <h3>Properties</h3>
            <div className="property-group">
              <label>Label:</label>
              <input
                type="text"
                value={selectedNodeData.data.label}
                onChange={(e) => handleNodeUpdate(selectedNode!, { label: e.target.value })}
              />
            </div>

            {selectedNodeData.type === 'agent' && (
              <div className="property-group">
                <label>Agent Type:</label>
                <select
                  value={selectedNodeData.data.agentType || 'coordinator'}
                  onChange={(e) => handleNodeUpdate(selectedNode!, { agentType: e.target.value })}
                >
                  {agentTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            )}

            {selectedNodeData.type === 'condition' && (
              <div className="property-group">
                <label>Condition:</label>
                <textarea
                  value={selectedNodeData.data.condition || ''}
                  onChange={(e) => handleNodeUpdate(selectedNode!, { condition: e.target.value })}
                  placeholder="Enter condition logic..."
                />
              </div>
            )}

            {selectedNodeData.type === 'action' && (
              <div className="property-group">
                <label>Action:</label>
                <input
                  type="text"
                  value={selectedNodeData.data.action || ''}
                  onChange={(e) => handleNodeUpdate(selectedNode!, { action: e.target.value })}
                  placeholder="Enter action name..."
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkflowDesigner;
