import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';

const UpgradeKubernetesDialog = ({ 
  cluster, 
  onClose
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [targetVersion, setTargetVersion] = useState('');
  const [availableVersions, setAvailableVersions] = useState([]);
  const [validation, setValidation] = useState({ isValid: true, message: '' });

  // Fetch available Kubernetes versions when component mounts
  useEffect(() => {
    const fetchAvailableVersions = async () => {
      if (!cluster?.id) return;
      
      setLoading(true);
      setError('');
      
      try {
        // Fetch available versions from the API
        const response = await api.get(`/clusters/${cluster.id}/upgrades`);
        const versions = response?.data?.available_versions || [];
        
        if (versions.length === 0) {
          throw new Error('No upgrade versions available');
        }
        
        setAvailableVersions(versions);
        setTargetVersion(versions[0]); // Default to first available version
      } catch (err) {
        console.error('Error fetching available versions:', err);
        setError(err.response?.data?.error || err.message || 'Failed to fetch available versions');
      } finally {
        setLoading(false);
      }
    };

    fetchAvailableVersions();
  }, [cluster]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!cluster?.id) {
      setError('No cluster selected');
      return;
    }
    
    if (!targetVersion) {
      setError('Please select a target version');
      return;
    }
    
    // Show confirmation for downgrade
    if (!isUpgrade()) {
      const confirmMessage = `WARNING: You are about to downgrade Kubernetes from ${cluster.kubernetes_version} to ${targetVersion}.\n\n` +
        'Downgrading Kubernetes can cause compatibility issues with your workloads.\n' +
        'Please ensure you have backups and have tested this in a non-production environment first.\n\n' +
        'Are you sure you want to proceed?';
      
      if (!window.confirm(confirmMessage)) {
        return;
      }
    } else {
      // Show confirmation for upgrade
      const confirmMessage = `You are about to upgrade Kubernetes from ${cluster.kubernetes_version} to ${targetVersion}.\n\n` +
        'The upgrade process may take several minutes and will temporarily affect cluster operations.\n' +
        'Are you sure you want to proceed?';
      
      if (!window.confirm(confirmMessage)) {
        return;
      }
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Call the upgrade API
      const response = await api.post(`/clusters/${cluster.id}/upgrade`, { 
        version: targetVersion,
        force: false, // Don't force by default
        skip_preflight: false // Run preflight checks
      });
      
      // Show success message
      if (response.data?.message) {
        alert(response.data.message);
      } else {
        alert(`Kubernetes ${getVersionDifference()} to ${targetVersion} has been initiated.`);
      }
      
      // Close the dialog on success
      onClose();
    } catch (err) {
      console.error('Error upgrading cluster:', err);
      
      // Handle specific error cases
      if (err.response?.data?.error?.includes('preflight')) {
        setError(`Preflight checks failed: ${err.response.data.error}\n\n${err.response.data.details || ''}`);
      } else if (err.response?.status === 409) {
        setError('Another operation is already in progress. Please try again later.');
      } else {
        setError(err.response?.data?.error || err.message || 'Failed to upgrade cluster');
      }
    } finally {
      setLoading(false);
    }
  };

  const isUpgrade = () => {
    if (!cluster?.kubernetes_version || !targetVersion) return true; // Default to upgrade
    
    // If versions are the same, it's not an upgrade
    if (cluster.kubernetes_version === targetVersion) return false;
    
    // Handle pre-release versions (e.g., 1.24.0-rc.1)
    const [currentBase] = cluster.kubernetes_version.split('-');
    const [targetBase] = targetVersion.split('-');
    
    const current = currentBase.split('.').map(Number);
    const target = targetBase.split('.').map(Number);
    
    // Compare version components
    for (let i = 0; i < Math.min(current.length, target.length); i++) {
      if (target[i] > current[i]) return true;
      if (target[i] < current[i]) return false;
    }
    
    // If we get here, the versions are the same up to the minimum length
    // The longer version is considered newer if all preceding components are equal
    return target.length > current.length;
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
                  value={cluster?.kubernetes_version || 'N/A'}
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
                  required
                  disabled={loading || availableVersions.length === 0}
                >
                  {loading && availableVersions.length === 0 ? (
                    <option>Loading versions...</option>
                  ) : availableVersions.length === 0 ? (
                    <option>No upgrade versions available</option>
                  ) : (
                    availableVersions.map(version => (
                      <option key={version} value={version}>
                        {version} {version === cluster?.kubernetes_version ? '(current)' : ''}
                      </option>
                    ))
                  )}
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
              className={`btn ${isUpgrade() ? 'btn-primary' : 'btn-warning'}`}
              disabled={loading || availableVersions.length === 0 || cluster?.kubernetes_version === targetVersion}
            >
              {loading 
                ? (isUpgrade() ? 'Upgrading...' : 'Downgrading...')
                : `Confirm ${getVersionDifference().charAt(0).toUpperCase() + getVersionDifference().slice(1)}`}
            </button>
          </div>
        </form>
        {error && (
          <div className="alert alert-error" style={{ marginTop: '1rem' }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default UpgradeKubernetesDialog;
