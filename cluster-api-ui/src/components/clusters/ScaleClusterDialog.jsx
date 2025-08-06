import React, { useState, useEffect } from 'react';

const ScaleClusterDialog = ({ cluster, currentCount, targetCount, validation, loading, onClose, onScale, onTargetChange }) => {
  const [tempTargetCount, setTempTargetCount] = useState(targetCount);
  useEffect(() => {
    setTempTargetCount(targetCount);
  }, [targetCount]);

  const handleTargetChange = (e) => {
    const newTarget = parseInt(e.target.value);
    setTempTargetCount(newTarget);
    onTargetChange(newTarget);
  };


  const handleScale = () => {
    onScale();
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
              value={tempTargetCount}
              onChange={handleTargetChange}
              className={`scale-input ${getScaleColor()}`}
            />
            <small>Enter the desired number of nodes (1-500)</small>
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
        <div className="modal-footer">
          <button onClick={onClose} className="cancel-button">Close</button>
          <button onClick={handleScale} className={`confirm-button ${getScaleColor()}`} disabled={loading || (validation && !validation.isValid)}>
            {loading ? '🔄 Scaling...' : `${getScaleIcon()} Scale Cluster`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScaleClusterDialog;
