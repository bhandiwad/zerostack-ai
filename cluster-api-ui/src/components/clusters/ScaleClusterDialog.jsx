import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';

const ScaleClusterDialog = ({ cluster, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentCount, setCurrentCount] = useState(cluster?.node_count || 1);
  const [targetCount, setTargetCount] = useState(cluster?.node_count || 1);
  const [tempTargetCount, setTempTargetCount] = useState(targetCount);
  useEffect(() => {
    setTempTargetCount(targetCount);
  }, [targetCount]);

  const handleTargetChange = (e) => {
    const newTarget = parseInt(e.target.value);
    if (!isNaN(newTarget) && newTarget >= 1 && newTarget <= 500) {
      setTargetCount(newTarget);
    }
  };


  const handleScale = async () => {
    if (!cluster?.id) return;
    
    setLoading(true);
    setError('');
    
    try {
      // First validate the target count
      if (targetCount < 1 || targetCount > 500 || isNaN(targetCount)) {
        throw new Error('Invalid node count. Must be between 1 and 500.');
      }
      
      // Show confirmation for scaling down
      if (targetCount < currentCount) {
        const confirmMessage = `Are you sure you want to scale down from ${currentCount} to ${targetCount} nodes? ` +
          'This will terminate worker nodes and may affect your workloads.';
        if (!window.confirm(confirmMessage)) {
          return;
        }
      }
      
      // Call the API to scale the cluster
      const response = await api.post(`/clusters/${cluster.id}/scale`, { 
        node_count: targetCount 
      });
      
      if (response.data?.message) {
        // Show success message
        alert(response.data.message);
      }
      
      // Close the dialog and let parent refresh the cluster data
      onClose();
    } catch (err) {
      console.error('Error scaling cluster:', err);
      setError(err.response?.data?.error || err.message || 'Failed to scale cluster');
    } finally {
      setLoading(false);
    }
  };

  const getScaleDirection = () => {
    return tempTargetCount > currentCount ? 'up' : 'down';
  };

  const getScaleIcon = () => {
    return getScaleDirection() === 'up' ? '📈' : '📉';
  };

  const getScaleColor = () => {
    return getScaleDirection() === 'up' ? 'scale-up' : 'scale-down';
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>Scale Cluster: {cluster?.name}</h3>
          <button onClick={onClose} className="close-button">×</button>
        </div>
        
        <div className="modal-content">
          {/* Scale Overview */}
          <div className="scale-overview">
            <div className="scale-current">
              <span className="scale-label">Current Nodes:</span>
              <span className="node-count">{currentCount}</span>
            </div>
            <div className="scale-arrow">→</div>
            <div className="scale-target">
              <span className="scale-label">Target Nodes:</span>
              <span className={`node-count ${getScaleColor()}`}>{tempTargetCount}</span>
            </div>
            <div className={`scale-direction ${getScaleColor()}`}>
              {getScaleIcon()} {getScaleDirection().toUpperCase()}
            </div>
          </div>

          {/* Target Input */}
          <div className="form-group">
            <label>Target Node Count:</label>
            <input
              type="number"
              min="1"
              max="500"
              value={targetCount}
              onChange={handleTargetChange}
              className={`scale-input ${getScaleColor()}`}
              disabled={loading}
            />
            <small>Enter the desired number of nodes (1-500)</small>
            {error && <div className="error-message">{error}</div>}
          </div>

          {/* Quick Scale Presets */}
          <div className="scale-presets">
            <h4>Quick Scale</h4>
            <div className="preset-buttons">
              <button 
                onClick={() => handleTargetChange({ target: { value: currentCount + 1 } })}
                className="preset-button up"
              >
                +1
              </button>
              <button 
                onClick={() => handleTargetChange({ target: { value: currentCount + 5 } })}
                className="preset-button up"
              >
                +5
              </button>
              <button 
                onClick={() => handleTargetChange({ target: { value: Math.max(1, currentCount - 1) } })}
                className="preset-button down"
              >
                -1
              </button>
              <button 
                onClick={() => handleTargetChange({ target: { value: Math.max(1, currentCount - 5) } })}
                className="preset-button down"
              >
                -5
              </button>
            </div>
           </div>
        </div>
        <div className="modal-actions">
          <button 
            onClick={onClose} 
            className="btn btn-secondary"
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            onClick={handleScale}
            className={`btn ${getScaleDirection() === 'up' ? 'btn-primary' : 'btn-warning'}`}
            disabled={loading || targetCount === currentCount}
          >
            {loading 
              ? 'Scaling...' 
              : `Confirm Scale ${getScaleDirection().toUpperCase()}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScaleClusterDialog;
