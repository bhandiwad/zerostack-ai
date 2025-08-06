import React, { useState, useEffect } from 'react';

const MaintenanceModeDialog = ({ cluster, onClose, onToggle, loading }) => {
  const [maintenanceConfig, setMaintenanceConfig] = useState({
    enabled: false,
    reason: '',
    duration_minutes: 60
  });

  useEffect(() => {
    if (cluster) {
      setMaintenanceConfig({
        enabled: cluster.maintenance_mode || false,
        reason: cluster.maintenance_reason || '',
        duration_minutes: cluster.maintenance_duration || 60
      });
    }
  }, [cluster]);

  const handleConfigChange = (key, value) => {
    setMaintenanceConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onToggle(maintenanceConfig);
  };

  const getMaintenanceIcon = () => {
    return maintenanceConfig.enabled ? '🔧' : '✅';
  };

  const getMaintenanceTitle = () => {
    return maintenanceConfig.enabled
      ? 'Maintenance Mode Active'
      : 'Configure Maintenance Mode';
  };

  const getMaintenanceDescription = () => {
    return maintenanceConfig.enabled
      ? 'Maintenance mode is active. This cluster is in a read-only state with no new deployments allowed.'
      : 'Enable maintenance mode to perform maintenance tasks. This will prevent new deployments and cordon all nodes.';
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>{getMaintenanceIcon()} {getMaintenanceTitle()}</h3>
          <button onClick={onClose} className="close-button">×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-content">
            <div className="maintenance-overview">
              <div className="cluster-info">
                <h4>Cluster: {cluster?.name}</h4>
                <div className="cluster-details">
                  <div className="detail-item">
                    <span className="detail-label">Provider:</span>
                    <span className="detail-value">{cluster?.provider?.toUpperCase()}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Region:</span>
                    <span className="detail-value">{cluster?.region}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Version:</span>
                    <span className="detail-value">{cluster?.version}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Nodes:</span>
                    <span className="detail-value">{cluster?.node_count} nodes</span>
                  </div>
                </div>
                <p className="maintenance-description">{getMaintenanceDescription()}</p>
              </div>

              <div className="maintenance-status">
                <div className="status-indicator">
                  <span className={`status-badge ${maintenanceConfig.enabled ? 'maintenance' : 'active'}`}>
                    {maintenanceConfig.enabled ? 'Maintenance Mode' : 'Active Mode'}
                  </span>
                </div>
              </div>
            </div>

            <div className="maintenance-config">
              <div className="config-section toggle-section">
                <label className="toggle-container">
                  <span className="toggle-label">Maintenance Mode</span>
                  <div className="toggle-switch">
                    <input
                      type="checkbox"
                      id="maintenance-toggle"
                      checked={maintenanceConfig.enabled}
                      onChange={(e) => handleConfigChange('enabled', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </div>
                  <span className={`toggle-status ${maintenanceConfig.enabled ? 'active' : ''}`}>
                    {maintenanceConfig.enabled ? 'Active' : 'Inactive'}
                  </span>
                </label>
                <p className="toggle-description">
                  {maintenanceConfig.enabled
                    ? 'Maintenance mode is active. This cluster is read-only.'
                    : 'Enable to prevent changes during maintenance.'}
                </p>
              </div>

              {maintenanceConfig.enabled && (
                <>
                  <div className="config-section">
                    <label>
                      Reason for Maintenance
                      <span className="required-indicator">*</span>
                    </label>
                    <div className="input-with-icon">
                      <span className="input-icon">💡</span>
                      <textarea
                        value={maintenanceConfig.reason}
                        onChange={(e) => handleConfigChange('reason', e.target.value)}
                        placeholder="e.g., Scheduled maintenance, Security updates, Infrastructure changes..."
                        rows={3}
                        required={maintenanceConfig.enabled}
                        className={!maintenanceConfig.reason && maintenanceConfig.enabled ? 'input-error' : ''}
                      />
                    </div>
                    {!maintenanceConfig.reason && maintenanceConfig.enabled && (
                      <p className="error-message">Please provide a reason for maintenance</p>
                    )}
                  </div>

                  <div className="config-section">
                    <label>Duration</label>
                    <div className="input-with-icon">
                      <span className="input-icon">⏱️</span>
                      <select
                        value={maintenanceConfig.duration_minutes}
                        onChange={(e) => handleConfigChange('duration_minutes', parseInt(e.target.value))}
                        className="duration-select"
                      >
                        <option value={30}>30 minutes</option>
                        <option value={60}>1 hour</option>
                        <option value={120}>2 hours</option>
                        <option value={240}>4 hours</option>
                        <option value={480}>8 hours</option>
                        <option value={1440}>24 hours</option>
                      </select>
                    </div>
                  </div>

                  <div className="impact-section">
                    <h4>What to Expect:</h4>
                    <div className="impact-grid">
                      <div className="impact-item">
                        <div className="impact-icon">⏸️</div>
                        <div className="impact-text">No new deployments</div>
                      </div>
                      <div className="impact-item">
                        <div className="impact-icon">🚫</div>
                        <div className="impact-text">Scaling disabled</div>
                      </div>
                      <div className="impact-item">
                        <div className="impact-icon">🔒</div>
                        <div className="impact-text">Read-only mode</div>
                      </div>
                      <div className="impact-item">
                        <div className="impact-icon">🔄</div>
                        <div className="impact-text">Workloads continue</div>
                      </div>
                    </div>

                    <div className="maintenance-note">
                      <div className="note-icon">ℹ️</div>
                      <div className="note-content">
                        <strong>Note:</strong> This action will cordon all nodes.
                        Existing workloads will continue to run, but no new pods will be scheduled
                        until maintenance mode is disabled.
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="cancel-button">
              Cancel
            </button>
            <button
              type="submit"
              className={`confirm-button ${maintenanceConfig.enabled ? 'maintenance' : 'active'}`}
              disabled={loading || (maintenanceConfig.enabled && !maintenanceConfig.reason.trim())}
            >
              {loading ? '🔄 Processing...' : (maintenanceConfig.enabled ? 'Enable Maintenance Mode' : 'Apply Configuration')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MaintenanceModeDialog;
