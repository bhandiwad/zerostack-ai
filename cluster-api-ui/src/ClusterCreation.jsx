import React, { useState } from 'react';
import { Wizard, WizardHeader, WizardNavigation, WizardStep, WizardActions, WizardField } from './components/ui/wizard';
import { Icon, ProviderIcon } from './components/ui/icons';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';

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

  const handleWizardComplete = (wizardData) => {
    console.log('Wizard completed with data:', wizardData);
    handleSubmit();
  };

  const handleStepChange = (stepIndex, stepData) => {
    console.log('Step changed to:', stepIndex, 'Data:', stepData);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Wizard onComplete={handleWizardComplete} onStepChange={handleStepChange}>
          <WizardHeader>
            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-indigo-100 rounded-full">
                <Icon name="cloud" size="lg" className="text-indigo-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Cluster</h1>
              <p className="text-lg text-gray-600">Deploy a new Kubernetes cluster on your preferred cloud provider</p>
            </div>
          </WizardHeader>

          <WizardNavigation />

          <Card className="mb-8">
            <CardContent className="p-8">
              {/* Step 1: Basic Configuration */}
              <WizardStep 
                data-step-index="0"
                title="Basic Configuration"
                description="Set up the fundamental details for your cluster"
              >
                <div className="space-y-6">
                  <WizardField 
                    label="Cluster Name" 
                    description="Choose a unique name for your cluster"
                    required
                  >
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="my-production-cluster"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                      required
                    />
                  </WizardField>

                  <WizardField 
                    label="Cloud Provider" 
                    description="Select your preferred cloud infrastructure provider"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { value: 'aws', name: 'Amazon Web Services', icon: 'aws' },
                        { value: 'gcp', name: 'Google Cloud Platform', icon: 'gcp' },
                        { value: 'azure', name: 'Microsoft Azure', icon: 'azure' }
                      ].map((provider) => (
                        <button
                          key={provider.value}
                          type="button"
                          onClick={() => handleProviderChange(provider.value)}
                          className={`p-4 border-2 rounded-lg transition-all duration-200 ${
                            formData.provider === provider.value
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                              : 'border-gray-200 hover:border-gray-300 text-gray-700'
                          }`}
                        >
                          <div className="flex flex-col items-center space-y-3">
                            <ProviderIcon provider={provider.icon} size="xl" />
                            <span className="font-medium">{provider.name}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </WizardField>

                  <WizardField 
                    label="Region" 
                    description="Choose the geographic region for your cluster"
                  >
                    <select
                      value={formData.region}
                      onChange={(e) => setFormData({...formData, region: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    >
                      {getRegionOptions(formData.provider).map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </WizardField>
                </div>
                <WizardActions nextDisabled={!formData.name.trim()} />
              </WizardStep>

              {/* Step 2: Node Configuration */}
              <WizardStep 
                data-step-index="1"
                title="Node Configuration"
                description="Configure the compute resources for your cluster nodes"
              >
                <div className="space-y-6">
                  <WizardField 
                    label="Master Node Instance Type" 
                    description="Choose the instance type for your master nodes (control plane)"
                  >
                    <select
                      value={formData.masterInstanceType}
                      onChange={(e) => setFormData({...formData, masterInstanceType: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    >
                      {getInstanceOptions(formData.provider).map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </WizardField>

                  <WizardField 
                    label="Worker Node Instance Type" 
                    description="Choose the instance type for your worker nodes (where workloads run)"
                  >
                    <select
                      value={formData.workerInstanceType}
                      onChange={(e) => setFormData({...formData, workerInstanceType: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    >
                      {getInstanceOptions(formData.provider).map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </WizardField>

                  <WizardField 
                    label="Worker Node Count" 
                    description="Number of worker nodes to create (1-10)"
                  >
                    <div className="flex items-center space-x-4">
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={formData.nodeCount}
                        onChange={(e) => setFormData({...formData, nodeCount: parseInt(e.target.value)})}
                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                      />
                      <div className="flex items-center justify-center w-16 h-12 bg-gray-100 rounded-lg">
                        <span className="text-lg font-semibold text-gray-700">{formData.nodeCount}</span>
                      </div>
                    </div>
                  </WizardField>
                </div>
                <WizardActions />
              </WizardStep>

              {/* Step 3: Cluster Configuration */}
              <WizardStep 
                data-step-index="2"
                title="Cluster Configuration"
                description="Set up Kubernetes version and cluster topology"
              >
                <div className="space-y-6">
                  <WizardField 
                    label="Kubernetes Version" 
                    description="Choose the Kubernetes version for your cluster"
                  >
                    <div className="space-y-3">
                      {[
                        { value: '1.28.0', label: '1.28.0', badge: 'Latest', badgeColor: 'bg-green-100 text-green-800' },
                        { value: '1.27.8', label: '1.27.8', badge: 'Stable', badgeColor: 'bg-blue-100 text-blue-800' },
                        { value: '1.26.12', label: '1.26.12', badge: 'LTS', badgeColor: 'bg-purple-100 text-purple-800' }
                      ].map((version) => (
                        <label key={version.value} className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                          <input
                            type="radio"
                            name="version"
                            value={version.value}
                            checked={formData.version === version.value}
                            onChange={(e) => setFormData({...formData, version: e.target.value})}
                            className="mr-4 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-gray-900">Kubernetes {version.label}</span>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${version.badgeColor}`}>
                                {version.badge}
                              </span>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </WizardField>

                  <WizardField 
                    label="Cluster Topology" 
                    description="Choose the high availability configuration"
                  >
                    <div className="space-y-3">
                      {[
                        { value: 'single-master', label: 'Single Master', desc: 'Single control plane node (development/testing)' },
                        { value: 'multi-master-ha', label: 'Multi-Master HA', desc: 'High availability with multiple control plane nodes' },
                        { value: 'all-in-one', label: 'All-in-One', desc: 'Single node cluster (development only)' }
                      ].map((topology) => (
                        <label key={topology.value} className="flex items-start p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                          <input
                            type="radio"
                            name="topology"
                            value={topology.value}
                            checked={formData.topology === topology.value}
                            onChange={(e) => setFormData({...formData, topology: e.target.value})}
                            className="mt-1 mr-4 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div>
                            <div className="font-medium text-gray-900">{topology.label}</div>
                            <div className="text-sm text-gray-600">{topology.desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </WizardField>
                </div>
                <WizardActions />
              </WizardStep>

              {/* Step 4: GPU Configuration & Review */}
              <WizardStep 
                data-step-index="3"
                title="GPU Configuration & Review"
                description="Optional GPU acceleration and final review"
              >
                <div className="space-y-8">
                  {/* GPU Configuration */}
                  <div>
                    <WizardField 
                      label="GPU Acceleration" 
                      description="Enable GPU support for machine learning and compute workloads"
                    >
                      <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={formData.gpuEnabled}
                          onChange={(e) => setFormData({...formData, gpuEnabled: e.target.checked})}
                          className="mr-4 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div>
                          <div className="font-medium text-gray-900">Enable GPU Acceleration</div>
                          <div className="text-sm text-gray-600">Add GPU nodes for AI/ML workloads</div>
                        </div>
                      </label>
                    </WizardField>

                    {formData.gpuEnabled && (
                      <div className="mt-6 space-y-4 p-4 bg-blue-50 rounded-lg">
                        <WizardField label="GPU Type">
                          <select
                            value={formData.gpuType}
                            onChange={(e) => setFormData({...formData, gpuType: e.target.value})}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          >
                            <option value="nvidia-t4">NVIDIA T4 (Cost-effective)</option>
                            <option value="nvidia-v100">NVIDIA V100 (High performance)</option>
                            <option value="nvidia-a100">NVIDIA A100 (Latest generation)</option>
                          </select>
                        </WizardField>

                        <WizardField label="GPU Count">
                          <select
                            value={formData.gpuCount}
                            onChange={(e) => setFormData({...formData, gpuCount: parseInt(e.target.value)})}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          >
                            <option value="1">1 GPU</option>
                            <option value="2">2 GPUs</option>
                            <option value="4">4 GPUs</option>
                            <option value="8">8 GPUs</option>
                          </select>
                        </WizardField>
                      </div>
                    )}
                  </div>

                  {/* Configuration Review */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Configuration Review</h4>
                    <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-600">Cluster Name:</span>
                          <span className="ml-2 text-gray-900">{formData.name}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Provider:</span>
                          <span className="ml-2 text-gray-900">{formData.provider.toUpperCase()}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Region:</span>
                          <span className="ml-2 text-gray-900">{formData.region}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Kubernetes:</span>
                          <span className="ml-2 text-gray-900">{formData.version}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Topology:</span>
                          <span className="ml-2 text-gray-900">{formData.topology}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Worker Nodes:</span>
                          <span className="ml-2 text-gray-900">{formData.nodeCount}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Master Instance:</span>
                          <span className="ml-2 text-gray-900">{formData.masterInstanceType}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Worker Instance:</span>
                          <span className="ml-2 text-gray-900">{formData.workerInstanceType}</span>
                        </div>
                        {formData.gpuEnabled && (
                          <>
                            <div>
                              <span className="font-medium text-gray-600">GPU Type:</span>
                              <span className="ml-2 text-gray-900">{formData.gpuType}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-600">GPU Count:</span>
                              <span className="ml-2 text-gray-900">{formData.gpuCount}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <WizardActions 
                  completeLabel={loading ? 'Creating Cluster...' : 'Create Cluster'}
                  nextDisabled={loading}
                  onNext={handleSubmit}
                />
              </WizardStep>
            </CardContent>
          </Card>
        </Wizard>
      </div>
    </div>
  );
};

export default ClusterCreation;

