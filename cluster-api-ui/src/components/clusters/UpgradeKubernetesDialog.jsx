import React, { useState, useEffect } from 'react';

const UpgradeKubernetesDialog = ({ 
  cluster, 
  onClose, 
  onUpgrade,
  loading = false 
}) => {
  const [targetVersion, setTargetVersion] = useState('');
  const [availableVersions, setAvailableVersions] = useState([]);
  const [validation, setValidation] = useState({ isValid: true, message: '' });

  // Fetch available Kubernetes versions when component mounts
  useEffect(() => {
    const fetchAvailableVersions = async () => {
      try {
        // This would be an API call to get available versions
        // For now, we'll mock some versions based on current version
        const currentVersion = cluster?.version || '1.24.0';
        const [major, minor] = currentVersion.split('.').map(Number);
        
        // Generate some versions around the current version
        const versions = [
          `${major}.${minor - 1}.0`, // One minor version back
          currentVersion,             // Current version
          `${major}.${minor + 1}.0`, // Next minor version
          `${major}.${minor + 2}.0`  // Next next minor version
        ].filter(Boolean);
        
        setAvailableVersions(versions);
        setTargetVersion(versions[versions.length - 1]); // Default to latest available
      } catch (error) {
        console.error('Error fetching available versions:', error);
        setValidation({
          isValid: false,
          message: 'Failed to fetch available Kubernetes versions.'
        });
      }
    };

    fetchAvailableVersions();
  }, [cluster]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!targetVersion) {
      setValidation({
        isValid: false,
        message: 'Please select a target version.'
      });
      return;
    }
    
    // Call the upgrade handler with the selected version
    onUpgrade(targetVersion);
  };

  const isUpgrade = () => {
    if (!cluster?.version || !targetVersion) return false;
    const current = cluster.version.split('.').map(Number);
    const target = targetVersion.split('.').map(Number);
    
    for (let i = 0; i < Math.min(current.length, target.length); i++) {
      if (target[i] > current[i]) return true;
      if (target[i] < current[i]) return false;
    }
    return false;
  };

  const getVersionDifference = () => {
    if (!cluster?.version || !targetVersion) return '';
    return isUpgrade() ? 'upgrade' : 'downgrade';
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>Kubernetes Version {getVersionDifference().charAt(0).toUpperCase() + getVersionDifference().slice(1)}</h3>
          <button onClick={onClose} className="close-button">×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-content">
            <div className="version-selection">
              <div className="form-group">
                <label htmlFor="current-version">Current Version</label>
                <input
                  id="current-version"
                  type="text"
                  value={cluster?.version || 'N/A'}
                  readOnly
                  className="form-control"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="target-version">
                  Target Version
                  <span className="required-indicator">*</span>
                </label>
                <select
                  id="target-version"
                  value={targetVersion}
                  onChange={(e) => setTargetVersion(e.target.value)}
                  className="form-control"
                  disabled={loading || availableVersions.length === 0}
                >
                  <option value="">Select a version</option>
                  {availableVersions.map((version) => (
                    <option key={version} value={version}>
                      {version} {version === cluster?.version ? '(current)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              
              {!validation.isValid && (
                <div className="error-message">
                  {validation.message}
                </div>
              )}
              
              <div className="upgrade-info">
                <h4>About this {getVersionDifference()}</h4>
                <ul>
                  <li>This is a {getVersionDifference()} from {cluster?.version || 'current version'} to {targetVersion || 'target version'}</li>
                  <li>The cluster control plane will be upgraded first, followed by worker nodes</li>
                  <li>Workloads will be drained and rescheduled during the upgrade process</li>
                  <li>Some downtime may occur during the upgrade process</li>
                  <li>Make sure you have taken a backup before proceeding</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="modal-footer">
            <button 
              type="button" 
              onClick={onClose} 
              className="cancel-button"
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className={`confirm-button ${isUpgrade() ? 'upgrade' : 'downgrade'}`}
              disabled={loading || !targetVersion || targetVersion === cluster?.version}
            >
              {loading ? (
                'Processing...'
              ) : (
                `${isUpgrade() ? 'Upgrade' : 'Downgrade'} to ${targetVersion}`
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpgradeKubernetesDialog;
