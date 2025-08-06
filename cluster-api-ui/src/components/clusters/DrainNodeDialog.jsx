import React, { useState } from 'react';

const DrainNodeDialog = ({ node, onClose, onDrain, loading }) => {
  const [drainConfig, setDrainConfig] = useState({
    grace_period_seconds: 300,
    ignore_daemonsets: true,
    delete_emptydir_data: false,
    force: false,
    timeout_seconds: 600
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onDrain(drainConfig);
  };

  const handleConfigChange = (key, value) => {
    setDrainConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>Drain Node: {node?.name}</h3>
          <button onClick={onClose} className="close-button">×</button>
        </div>
        
        <div className="modal-content">
          <div className="warning-box">
            <h4>⚠️ Warning</h4>
            <p>
              Draining a node will evict all pods from the node, making it unavailable for scheduling. 
              This operation is typically used for maintenance or upgrades.
            </p>
            <ul>
              <li>All pods will be evicted from the node</li>
              <li>The node will be marked as unschedulable</li>
              <li>DaemonSet pods may be ignored (configurable)</li>
              <li>EmptyDir data may be lost (configurable)</li>
            </ul>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Grace Period (seconds):</label>
              <input
                type="number"
                min="0"
                max="3600"
                value={drainConfig.grace_period_seconds}
                onChange={(e) => handleConfigChange('grace_period_seconds', parseInt(e.target.value))}
                placeholder="300"
              />
              <small>Time to wait for pods to terminate gracefully</small>
            </div>

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={drainConfig.ignore_daemonsets}
                  onChange={(e) => handleConfigChange('ignore_daemonsets', e.target.checked)}
                />
                Ignore DaemonSets
              </label>
              <small>Ignore DaemonSet pods during drain (recommended)</small>
            </div>

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={drainConfig.delete_emptydir_data}
                  onChange={(e) => handleConfigChange('delete_emptydir_data', e.target.checked)}
                />
                Delete EmptyDir Data
              </label>
              <small>Delete EmptyDir volumes (may cause data loss)</small>
            </div>

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={drainConfig.force}
                  onChange={(e) => handleConfigChange('force', e.target.checked)}
                />
                Force Drain
              </label>
              <small>Force drain even if there are pods that cannot be evicted</small>
            </div>

            <div className="form-group">
              <label>Timeout (seconds):</label>
              <input
                type="number"
                min="60"
                max="3600"
                value={drainConfig.timeout_seconds}
                onChange={(e) => handleConfigChange('timeout_seconds', parseInt(e.target.value))}
                placeholder="600"
              />
              <small>Maximum time to wait for drain operation to complete</small>
            </div>
          </form>
        </div>
        
        <div className="modal-actions">
          <button onClick={onClose} className="cancel-button" disabled={loading}>
            Cancel
          </button>
          <button 
            onClick={handleSubmit} 
            className="confirm-button danger" 
            disabled={loading}
          >
            {loading ? '🔄 Draining...' : '🚫 Drain Node'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DrainNodeDialog;
