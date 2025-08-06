import React from 'react';

const ClusterTable = ({
  clusters,
  handleSort,
  getSortIcon,
  getProviderIcon,
  getStatusBadge,
  inlineScaleMode,
  inlineScaleValues,
  handleInlineScaleChange,
  handleInlineScaleSubmit,
  scalingInProgress,
  setInlineScaleMode,
  handleInlineScale,
  loadClusterNodes,
  handleInlineUpgrade,
  upgradeInProgress,
  handleInlineMaintenance,
  maintenanceOperationInProgress,
  handleDeleteClick,
  showNodeDetails,
  nodesLoading,
  clusterNodes,
  handleDrainNode,
  drainOperationInProgress,
  handleUncordonNode,
}) => {
  return (
    <div className="clusters-table-wrapper">
      <table className="clusters-table">
        <thead>
          <tr>
            <th onClick={() => handleSort('name')} className="sortable">
              Name {getSortIcon('name')}
            </th>
            <th onClick={() => handleSort('provider')} className="sortable">
              Provider {getSortIcon('provider')}
            </th>
            <th onClick={() => handleSort('region')} className="sortable">
              Region {getSortIcon('region')}
            </th>
            <th onClick={() => handleSort('version')} className="sortable">
              Version {getSortIcon('version')}
            </th>
            <th onClick={() => handleSort('node_count')} className="sortable">
              Nodes {getSortIcon('node_count')}
            </th>
            <th onClick={() => handleSort('status')} className="sortable">
              Status {getSortIcon('status')}
            </th>
            <th>Cost</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {clusters.map(cluster => (
            <React.Fragment key={cluster.id}>
              <tr className={`cluster-row ${cluster.maintenance_mode ? 'maintenance-mode' : ''}`}>
                <td className="cluster-name">
                  <div className="name-cell">
                    <span className="provider-icon">{getProviderIcon(cluster.provider)}</span>
                    <div className="name-info">
                      <strong>{cluster.name}</strong>
                      {cluster.maintenance_mode && (
                        <span className="maintenance-indicator">🛠️ Maintenance</span>
                      )}
                    </div>
                  </div>
                </td>
                <td>{cluster.provider ? cluster.provider.toUpperCase() : 'N/A'}</td>
                <td>{cluster.region || 'N/A'}</td>
                <td>{cluster.version || 'N/A'}</td>
                <td>
                  <div className="nodes-cell">
                    {inlineScaleMode[cluster.id] ? (
                      <div className="inline-scale">
                        <input
                          type="number"
                          min="1"
                          max="500"
                          value={inlineScaleValues[cluster.id] || cluster.node_count}
                          onChange={(e) => handleInlineScaleChange(cluster.id, e.target.value)}
                          className="scale-input"
                        />
                        <button
                          onClick={() => handleInlineScaleSubmit(cluster)}
                          disabled={scalingInProgress}
                          className="scale-submit-btn"
                        >
                          {scalingInProgress ? '🔄' : '✓'}
                        </button>
                        <button
                          onClick={() => setInlineScaleMode(prev => ({ ...prev, [cluster.id]: false }))}
                          className="scale-cancel-btn"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="nodes-display">
                        <span>{cluster.node_count || 0}</span>
                        <button
                          onClick={() => handleInlineScale(cluster)}
                          disabled={cluster.maintenance_mode}
                          className="scale-edit-btn"
                          title="Edit node count"
                        >
                          ✏️
                        </button>
                      </div>
                    )}
                  </div>
                </td>
                <td>{getStatusBadge(cluster.status, cluster.maintenance_mode)}</td>
                <td>
                  {cluster.monthly_cost ? `$${cluster.monthly_cost}/month` : 'N/A'}
                </td>
                <td>
                  <div className="actions-cell">
                    <button
                      onClick={() => loadClusterNodes(cluster.id)}
                      disabled={cluster.maintenance_mode}
                      className="action-btn manage"
                      title="View nodes"
                    >
                      🖥️
                    </button>

                    <button
                      onClick={() => handleInlineUpgrade(cluster)}
                      disabled={cluster.maintenance_mode || upgradeInProgress}
                      className="action-btn upgrade"
                      title="Upgrade Kubernetes"
                    >
                      {upgradeInProgress ? '🔄' : '🔄'}
                    </button>

                    <button
                      onClick={() => handleInlineMaintenance(cluster)}
                      disabled={maintenanceOperationInProgress}
                      className={`action-btn ${cluster.maintenance_mode ? 'maintenance' : 'maintenance-toggle'}`}
                      title={cluster.maintenance_mode ? 'Disable maintenance mode' : 'Enable maintenance mode'}
                    >
                      {cluster.maintenance_mode ? '🔓' : '🔒'}
                    </button>

                    <button
                      onClick={(e) => handleDeleteClick(cluster, e)}
                      disabled={cluster.maintenance_mode}
                      className="action-btn delete"
                      title="Delete cluster"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>

              {/* Node details row */}
              {showNodeDetails[cluster.id] && (
                <tr className="node-details-row">
                  <td colSpan="8">
                    <div className="node-details">
                      <div className="node-details-header">
                        <h4>Cluster Nodes</h4>
                        <button
                          onClick={() => loadClusterNodes(cluster.id)}
                          className="refresh-nodes-btn"
                        >
                          🔄 Refresh
                        </button>
                      </div>
                      {nodesLoading ? (
                        <div className="loading-nodes">
                          <div className="spinner"></div>
                          <p>Loading nodes...</p>
                        </div>
                      ) : clusterNodes.length > 0 ? (
                        <div className="nodes-grid">
                          {clusterNodes.map(node => (
                            <div key={node.name} className="node-card">
                              <div className="node-header">
                                <span className="node-name">{node.name}</span>
                                <span className={`node-role ${node.is_master ? 'master' : 'worker'}`}>
                                  {node.is_master ? '🖥️ Master' : '⚙️ Worker'}
                                </span>
                              </div>
                              <div className="node-status">
                                <span className={`status-badge ${node.ready ? 'ready' : 'not-ready'}`}>
                                  {node.ready ? '✅ Ready' : '❌ Not Ready'}
                                </span>
                                {!node.schedulable && (
                                  <span className="status-badge cordoned">🚫 Cordoned</span>
                                )}
                              </div>
                              <div className="node-resources">
                                <div className="resource-item">
                                  <span className="label">CPU:</span>
                                  <span className="value">{node.cpu_capacity}</span>
                                </div>
                                <div className="resource-item">
                                  <span className="label">Memory:</span>
                                  <span className="value">{node.memory_capacity}</span>
                                </div>
                                <div className="resource-item">
                                  <span className="label">Version:</span>
                                  <span className="value">{node.kubernetes_version}</span>
                                </div>
                              </div>
                              <div className="node-actions">
                                {node.schedulable ? (
                                  <button
                                    onClick={() => handleDrainNode({
                                      node_name: node.name,
                                      clusterId: cluster.id,
                                      grace_period_seconds: 300,
                                      ignore_daemonsets: true,
                                      delete_emptydir_data: false,
                                      force: false,
                                      timeout_seconds: 600
                                    })}
                                    disabled={drainOperationInProgress || node.is_master}
                                    className="action-btn drain"
                                    title="Drain node"
                                  >
                                    🚫 Drain
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleUncordonNode(node, cluster.id)}
                                    disabled={drainOperationInProgress}
                                    className="action-btn uncordon"
                                    title="Uncordon node"
                                  >
                                    ✅ Uncordon
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="no-nodes">
                          <p>No nodes found for this cluster.</p>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ClusterTable;
