import React, { useState, useCallback, useRef, useEffect } from 'react';
import './WorkflowDesigner.css';

interface WorkflowNode {
  id: string;
  type: 'agent' | 'condition' | 'action' | 'start' | 'end';
  position: { x: number; y: number };
  data: {
    label: string;
    agentType?: string;
    condition?: string;
    action?: string;
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
    { type: 'start', label: 'Start', icon: '▶️', color: '#28a745' },
    { type: 'agent', label: 'Agent', icon: '🤖', color: '#007bff' },
    { type: 'condition', label: 'Condition', icon: '❓', color: '#ffc107' },
    { type: 'action', label: 'Action', icon: '⚡', color: '#17a2b8' },
    { type: 'end', label: 'End', icon: '⏹️', color: '#dc3545' }
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
        { id: 'deploy', type: 'agent', position: { x: 500, y: 200 }, data: { label: 'Deploy Cluster', agentType: 'cluster_ops' } },
        { id: 'monitor', type: 'agent', position: { x: 700, y: 200 }, data: { label: 'Monitor Health', agentType: 'monitoring' } },
        { id: 'end', type: 'end', position: { x: 900, y: 200 }, data: { label: 'End' } }
      ],
      connections: [
        { id: 'c1', source: 'start', target: 'validate' },
        { id: 'c2', source: 'validate', target: 'deploy' },
        { id: 'c3', source: 'deploy', target: 'monitor' },
        { id: 'c4', source: 'monitor', target: 'end' }
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
          data: node.data
        })),
        connections: connections.map(conn => ({
          source: conn.source,
          target: conn.target
        }))
      };

      const response = await fetch('http://localhost:5002/api/workflows/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          workflow_name: 'custom_workflow',
          user_request: 'Execute custom workflow',
          context: workflowData
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Workflow executed successfully! Result: ${JSON.stringify(result.result, null, 2)}`);
      } else {
        const error = await response.json();
        alert(`Workflow execution failed: ${error.message}`);
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
        <h2>Visual Workflow Designer</h2>
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
          <button onClick={saveWorkflow} className="btn btn-primary">
            💾 Save
          </button>
          <button onClick={() => setShowTemplates(!showTemplates)} className="btn btn-secondary">
            📋 Templates
          </button>
          <button onClick={clearWorkflow} className="btn btn-outline">
            🗑️ Clear
          </button>
          <button onClick={executeWorkflow} className="btn btn-success">
            ▶️ Execute
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
