import React, { useState } from 'react';

const ClusterCreation = () => {
  const [formData, setFormData] = useState({
    name: '',
    provider: 'aws',
    region: 'us-east-1',
    version: '1.28.0',
    topology: 'single-master',
    nodeCount: 2,
    masterInstanceType: 't3.medium',
    workerInstanceType: 't3.medium',
    gpuEnabled: false,
    gpuType: 'nvidia-t4',
    gpuCount: 1
  });

  const [loading, setLoading] = useState(false);

  // Import the API utility
  const apiCall = async (endpoint, options = {}) => {
    try {
      // Use the API utility with proper error handling
      const response = await fetch(`http://localhost:5002/api/multitenant${endpoint}`, {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          ...(options.headers || {})
        },
        body: options.body,
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`API call failed: ${response.status} ${response.statusText}`, error);
        throw new Error(error || 'API request failed');
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return { success: true };
      }

      return await response.json();
    } catch (error) {
      console.error('API call failed:', error);
      return { success: false, error: error.message };
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await apiCall('/clusters', {
      method: 'POST',
      body: JSON.stringify({
        name: formData.name,
        provider: formData.provider,
        region: formData.region,
        kubernetes_version: formData.version,
        topology: formData.topology,
        node_count: formData.nodeCount,
        master_instance_type: formData.masterInstanceType,
        worker_instance_type: formData.workerInstanceType,
        gpu_enabled: formData.gpuEnabled,
        gpu_type: formData.gpuType,
        gpu_count: formData.gpuCount
      })
    });

    if (result && result.success) {
      alert(`✅ Cluster creation initiated: ${formData.name}\n\nCluster ID: ${result.data?.id || 'N/A'}\nStatus: ${result.data?.status || 'Creating'}\nEstimated completion: ${result.data?.estimated_completion || 'N/A'}`);
      setFormData({
        name: '',
        provider: 'aws',
        region: 'us-east-1',
        version: '1.28.0',
        topology: 'single-master',
        nodeCount: 2,
        masterInstanceType: 't3.medium',
        workerInstanceType: 't3.medium',
        gpuEnabled: false,
        gpuType: 'nvidia-t4',
        gpuCount: 1
      });
    } else {
      const errorMsg = result?.error || 'Unknown error occurred';
      alert(`❌ Cluster creation failed: ${errorMsg}\n\nThis might be due to:\n- Missing cloud provider credentials\n- Invalid configuration\n- Backend service issues\n\nPlease check the configuration and try again.`);
    }

    setLoading(false);
  };

  const handleProviderChange = (provider) => {
    let defaultRegion = 'us-east-1';
    let defaultMasterType = 't3.medium';
    let defaultWorkerType = 't3.medium';

    if (provider === 'gcp') {
      defaultRegion = 'us-central1';
      defaultMasterType = 'e2-medium';
      defaultWorkerType = 'e2-medium';
    } else if (provider === 'azure') {
      defaultRegion = 'East US';
      defaultMasterType = 'Standard_B2s';
      defaultWorkerType = 'Standard_B2s';
    }

    setFormData({
      ...formData,
      provider,
      region: defaultRegion,
      masterInstanceType: defaultMasterType,
      workerInstanceType: defaultWorkerType
    });
  };

  const getInstanceOptions = (provider) => {
    switch (provider) {
      case 'aws':
        return [
          { value: 't3.medium', label: 't3.medium (2 vCPU, 4 GB RAM)' },
          { value: 't3.large', label: 't3.large (2 vCPU, 8 GB RAM)' },
          { value: 'm5.large', label: 'm5.large (2 vCPU, 8 GB RAM)' },
          { value: 'm5.xlarge', label: 'm5.xlarge (4 vCPU, 16 GB RAM)' },
          { value: 'm5.2xlarge', label: 'm5.2xlarge (8 vCPU, 32 GB RAM)' },
          { value: 'c5.large', label: 'c5.large (2 vCPU, 4 GB RAM) - Compute Optimized' },
          { value: 'c5.xlarge', label: 'c5.xlarge (4 vCPU, 8 GB RAM) - Compute Optimized' }
        ];
      case 'gcp':
        return [
          { value: 'e2-medium', label: 'e2-medium (1 vCPU, 4 GB RAM)' },
          { value: 'e2-standard-2', label: 'e2-standard-2 (2 vCPU, 8 GB RAM)' },
          { value: 'e2-standard-4', label: 'e2-standard-4 (4 vCPU, 16 GB RAM)' },
          { value: 'n1-standard-2', label: 'n1-standard-2 (2 vCPU, 7.5 GB RAM)' },
          { value: 'n1-standard-4', label: 'n1-standard-4 (4 vCPU, 15 GB RAM)' },
          { value: 'n1-highcpu-4', label: 'n1-highcpu-4 (4 vCPU, 3.6 GB RAM) - High CPU' }
        ];
      case 'azure':
        return [
          { value: 'Standard_B2s', label: 'Standard_B2s (2 vCPU, 4 GB RAM)' },
          { value: 'Standard_D2s_v3', label: 'Standard_D2s_v3 (2 vCPU, 8 GB RAM)' },
          { value: 'Standard_D4s_v3', label: 'Standard_D4s_v3 (4 vCPU, 16 GB RAM)' },
          { value: 'Standard_D8s_v3', label: 'Standard_D8s_v3 (8 vCPU, 32 GB RAM)' },
          { value: 'Standard_F4s_v2', label: 'Standard_F4s_v2 (4 vCPU, 8 GB RAM) - Compute Optimized' }
        ];
      default:
        return [];
    }
  };

  const getRegionOptions = (provider) => {
    switch (provider) {
      case 'aws':
        return [
          { value: 'us-east-1', label: 'US East (N. Virginia)' },
          { value: 'us-west-2', label: 'US West (Oregon)' },
          { value: 'eu-west-1', label: 'Europe (Ireland)' },
          { value: 'ap-south-1', label: 'Asia Pacific (Mumbai)' },
          { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' }
        ];
      case 'gcp':
        return [
          { value: 'us-central1', label: 'US Central 1' },
          { value: 'us-east1', label: 'US East 1' },
          { value: 'europe-west1', label: 'Europe West 1' },
          { value: 'asia-south1', label: 'Asia South 1' },
          { value: 'asia-southeast1', label: 'Asia Southeast 1' }
        ];
      case 'azure':
        return [
          { value: 'East US', label: 'East US' },
          { value: 'West US 2', label: 'West US 2' },
          { value: 'West Europe', label: 'West Europe' },
          { value: 'Southeast Asia', label: 'Southeast Asia' },
          { value: 'Central India', label: 'Central India' }
        ];
      default:
        return [];
    }
  };

  return (
    <div className="cluster-creation">
      <div className="page-header">
        <h2>➕ Create New Cluster</h2>
        <p>Deploy a new Kubernetes cluster on your preferred cloud provider</p>
      </div>

      <form onSubmit={handleSubmit} className="creation-form">
        <div className="form-section">
          <h3>Basic Configuration</h3>
          
          <div className="form-group">
            <label>Cluster Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="my-production-cluster"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Cloud Provider</label>
              <select
                value={formData.provider}
                onChange={(e) => handleProviderChange(e.target.value)}
              >
                <option value="aws">Amazon Web Services (AWS)</option>
                <option value="gcp">Google Cloud Platform (GCP)</option>
                <option value="azure">Microsoft Azure</option>
              </select>
            </div>

            <div className="form-group">
              <label>Region</label>
              <select
                value={formData.region}
                onChange={(e) => setFormData({...formData, region: e.target.value})}
              >
                {getRegionOptions(formData.provider).map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Node Configuration</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label>Master Node Instance Type</label>
              <select
                value={formData.masterInstanceType}
                onChange={(e) => setFormData({...formData, masterInstanceType: e.target.value})}
              >
                {getInstanceOptions(formData.provider).map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Worker Node Instance Type</label>
              <select
                value={formData.workerInstanceType}
                onChange={(e) => setFormData({...formData, workerInstanceType: e.target.value})}
              >
                {getInstanceOptions(formData.provider).map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Cluster Configuration</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label>Kubernetes Version</label>
              <select
                value={formData.version}
                onChange={(e) => setFormData({...formData, version: e.target.value})}
              >
                <option value="1.28.0">1.28.0 (Latest)</option>
                <option value="1.27.8">1.27.8 (Stable)</option>
                <option value="1.26.12">1.26.12 (LTS)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Cluster Topology</label>
              <select
                value={formData.topology}
                onChange={(e) => setFormData({...formData, topology: e.target.value})}
              >
                <option value="single-master">Single Master</option>
                <option value="multi-master-ha">Multi-Master HA</option>
                <option value="all-in-one">All-in-One</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Worker Node Count</label>
            <input
              type="number"
              min="1"
              max="10"
              value={formData.nodeCount}
              onChange={(e) => setFormData({...formData, nodeCount: parseInt(e.target.value)})}
            />
          </div>
        </div>

        <div className="form-section">
          <h3>GPU Configuration</h3>
          
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.gpuEnabled}
                onChange={(e) => setFormData({...formData, gpuEnabled: e.target.checked})}
              />
              Enable GPU Acceleration
            </label>
          </div>

          {formData.gpuEnabled && (
            <div className="form-row">
              <div className="form-group">
                <label>GPU Type</label>
                <select
                  value={formData.gpuType}
                  onChange={(e) => setFormData({...formData, gpuType: e.target.value})}
                >
                  <option value="nvidia-t4">NVIDIA T4</option>
                  <option value="nvidia-v100">NVIDIA V100</option>
                  <option value="nvidia-a100">NVIDIA A100</option>
                </select>
              </div>

              <div className="form-group">
                <label>GPU Count</label>
                <select
                  value={formData.gpuCount}
                  onChange={(e) => setFormData({...formData, gpuCount: parseInt(e.target.value)})}
                >
                  <option value="1">1 GPU</option>
                  <option value="2">2 GPUs</option>
                  <option value="4">4 GPUs</option>
                  <option value="8">8 GPUs</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="form-actions">
          <button type="submit" disabled={loading} className="create-button">
            {loading ? '🔄 Creating Cluster...' : '🚀 Create Cluster'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ClusterCreation;

