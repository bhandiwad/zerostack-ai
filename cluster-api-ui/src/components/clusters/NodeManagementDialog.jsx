import React from 'react';

const NodeManagementDialog = ({ cluster, nodes, loading, onClose, onDrainNode, onUncordonNode, onRefresh }) => {
  const getNodeStatusColor = (node) => {
    // Handle the actual API response structure
    if (node.ready === true) {
      return 'success';
    } else if (node.ready === false) {
      return 'error';
    } else {
      return 'warning';
    }
  };

  const getNodeStatusText = (node) => {
    if (node.ready === true) {
      return 'Ready';
    } else if (node.ready === false) {
      return 'NotReady';
    } else {
      return 'Unknown';
    }
  };

  const getNodeRole = (node) => {
    // Handle the actual API response structure
    if (node.is_master === true) {
      return 'Master';
    }
    return 'Worker';
  };

  const canDrainNode = (node) => {
    // Can't drain master nodes in single-master clusters
    const isMaster = getNodeRole(node) === 'Master';
    const isReady = node.ready === true;
    const isSchedulable = node.schedulable !== false; // Default to true if not specified
    return isReady && isSchedulable && (!isMaster || (cluster && cluster.node_count > 1));
  };

  const canUncordonNode = (node) => {
    // Can uncordon if node is not schedulable
    return node.schedulable === false;
  };

  return (
    <div className="modal-overlay">
      <div className="modal large-modal">
        <div className="modal-header">
          <h3>Node Management: {cluster?.name}</h3>
          <div className="header-actions">
            <button 
              onClick={onRefresh} 
              className="refresh-button"
              disabled={loading}
            >
              {loading ? '🔄' : '🔄'} Refresh
            </button>
            <button onClick={onClose} className="close-button">×</button>
          </div>
        </div>
        
        <div className="modal-content">
          {loading ? (
            <div className="loading">🔄 Loading nodes...</div>
          ) : nodes.length === 0 ? (
            <div className="empty-state">
              <p>No nodes found for this cluster.</p>
            </div>
          ) : (
            <div className="nodes-table">
              <table>
                <thead>
                  <tr>
                    <th>Node Name</th>
                    <th>Status</th>
                    <th>Role</th>
                    <th>K8s Version</th>
                    <th>CPU</th>
                    <th>Memory</th>
                    <th>Pods</th>
                    <th>Age</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {nodes.map(node => (
                    <tr key={node.name}>
                      <td>{node.name}</td>
                      <td>
                        <span className={`status-dot status-${getNodeStatusColor(node)}`}></span>
                        {getNodeStatusText(node)}
                      </td>
                      <td>{getNodeRole(node)}</td>
                      <td>{node.kubelet_version}</td>
                      <td>{node.cpu_usage || 'N/A'}</td>
                      <td>{node.memory_usage || 'N/A'}</td>
                      <td>{node.pod_count || 'N/A'}</td>
                      <td>{node.age || 'N/A'}</td>
                      <td className="actions">
                        {canDrainNode(node) && (
                          <button onClick={() => onDrainNode(node.name)} className="action-button drain">Drain</button>
                        )}
                        {canUncordonNode(node) && (
                          <button onClick={() => onUncordonNode(node.name)} className="action-button uncordon">Uncordon</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NodeManagementDialog;
