import React, { useState, useEffect } from 'react';
import { 
  RocketLaunchIcon, 
  CheckCircleIcon, 
  ExclamationCircleIcon,
  ClockIcon,
  CpuChipIcon,
  PlayIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import deploymentApi from '../../api/deploymentApi';

const DeploymentOrchestrator = ({ template, onComplete, onCancel }) => {
  const [deployment, setDeployment] = useState(null);
  const [deploymentStatus, setDeploymentStatus] = useState('preparing');
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState(null);
  const [clusterName, setClusterName] = useState(`${template.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now().toString().slice(-6)}`);

  const deploymentSteps = [
    {
      name: 'Validating Configuration',
      description: 'Checking template parameters and resource availability',
      duration: 2000
    },
    {
      name: 'Provisioning Infrastructure',
      description: 'Creating cloud resources and network configuration',
      duration: 45000
    },
    {
      name: 'Installing Kubernetes',
      description: 'Setting up control plane and worker nodes',
      duration: 60000
    },
    {
      name: 'Configuring Networking',
      description: 'Setting up CNI, load balancers, and ingress',
      duration: 30000
    },
    {
      name: 'Installing Add-ons',
      description: 'Deploying monitoring, logging, and security components',
      duration: 25000
    },
    {
      name: 'Running Health Checks',
      description: 'Verifying cluster functionality and connectivity',
      duration: 15000
    },
    {
      name: 'Finalizing Setup',
      description: 'Applying configurations and generating access credentials',
      duration: 10000
    }
  ];

  const startDeployment = async () => {
    try {
      setDeploymentStatus('deploying');
      setError(null);
      
      // Create deployment via API
      const deploymentData = {
        template_id: template.id,
        template_name: template.name,
        cluster_name: clusterName,
        region: 'us-east-1',
        estimated_cost: template.estimatedCost,
        resources: template.resources
      };
      
      const result = await deploymentApi.createDeployment(deploymentData);
      
      if (result.success) {
        setDeployment(result.deployment);
        
        // Start polling for updates
        deploymentApi.pollDeploymentStatus(
          result.deployment.id,
          (updatedDeployment) => {
            setDeployment(updatedDeployment);
            
            if (updatedDeployment.status === 'completed') {
              setDeploymentStatus('completed');
              onComplete({
                clusterId: updatedDeployment.id,
                clusterName: updatedDeployment.cluster_name,
                template,
                endpoint: updatedDeployment.cluster_endpoint,
                status: 'ready'
              });
            } else if (updatedDeployment.status === 'error') {
              setDeploymentStatus('error');
              setError(updatedDeployment.error || 'Deployment failed');
            }
          }
        );
      } else {
        throw new Error(result.error || 'Failed to create deployment');
      }
    } catch (err) {
      setError(err.message);
      setDeploymentStatus('error');
    }
  };

  const simulateDeploymentStep = async (step, index) => {
    const baseDelay = step.duration;
    const randomVariation = Math.random() * 0.3 - 0.15; // ±15% variation
    const actualDelay = baseDelay * (1 + randomVariation);
    
    // Simulate potential issues (5% chance)
    if (Math.random() < 0.05 && index > 1) {
      await new Promise(resolve => setTimeout(resolve, actualDelay * 0.7));
      addLog(`⚠️ Retrying ${step.name} due to temporary issue...`, 'warning');
      await new Promise(resolve => setTimeout(resolve, actualDelay * 0.3));
    } else {
      await new Promise(resolve => setTimeout(resolve, actualDelay));
    }
  };

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { 
      message, 
      type, 
      timestamp,
      id: Date.now() + Math.random()
    }]);
  };

  const getLogIcon = (type) => {
    switch (type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return 'ℹ️';
    }
  };

  const getLogColor = (type) => {
    switch (type) {
      case 'success': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const progress = deploymentStatus === 'completed' ? 100 : 
    deploymentStatus === 'deploying' ? ((deploymentStep + 1) / deploymentSteps.length) * 100 : 0;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className={`w-3 h-8 rounded-full ${template.accentColor.replace('border-', 'bg-')}`}></div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Deploy {template.name}
              </h2>
              <p className="text-sm text-gray-600">
                {template.category} • {template.deployTime} setup
              </p>
            </div>
          </div>
          {deploymentStatus === 'preparing' && (
            <div className="flex space-x-3">
              <button
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
              >
                <XMarkIcon className="h-4 w-4" />
                <span>Cancel</span>
              </button>
              <button
                onClick={startDeployment}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium flex items-center space-x-2"
              >
                <PlayIcon className="h-4 w-4" />
                <span>Deploy</span>
              </button>
            </div>
          )}
        </div>

        {/* Cluster Name Input */}
        {deploymentStatus === 'preparing' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cluster Name
            </label>
            <input
              type="text"
              value={clusterName}
              onChange={(e) => setClusterName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter cluster name"
            />
          </div>
        )}

        {/* Progress Bar */}
        {deploymentStatus !== 'preparing' && (
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>
                {deploymentStatus === 'completed' ? 'Deployment Complete' : 
                 deploymentStatus === 'deploying' ? (deployment?.logs?.[deployment.logs.length - 1]?.message || 'Deploying...') : 'Preparing...'}
              </span>
              <span>{deployment?.progress || 0}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${deployment?.progress || 0}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Deployment Steps */}
        {deploymentStatus !== 'preparing' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Steps Progress */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Deployment Steps</h3>
              <div className="space-y-3">
                {deploymentSteps.map((step, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index < deploymentStep ? 'bg-green-500 text-white' :
                      index === deploymentStep && deploymentStatus === 'deploying' ? 'bg-blue-500 text-white' :
                      deploymentStatus === 'completed' ? 'bg-green-500 text-white' :
                      'bg-gray-200 text-gray-600'
                    }`}>
                      {index < deploymentStep || deploymentStatus === 'completed' ? (
                        <CheckCircleIcon className="h-4 w-4" />
                      ) : index === deploymentStep && deploymentStatus === 'deploying' ? (
                        <div className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent"></div>
                      ) : (
                        index + 1
                      )}
                    </div>
                    <div className="flex-1">
                      <div className={`font-medium ${
                        index <= deploymentStep || deploymentStatus === 'completed' ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                        {step.name}
                      </div>
                      <div className="text-sm text-gray-500">{step.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Deployment Logs */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Deployment Logs</h3>
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg h-80 overflow-y-auto font-mono text-sm">
                {logs.map((log) => (
                  <div key={log.id} className="mb-1">
                    <span className="text-gray-500">[{log.timestamp}]</span>{' '}
                    <span className={getLogColor(log.type)}>{log.message}</span>
                  </div>
                ))}
                {deploymentStatus === 'deploying' && (
                  <div className="animate-pulse">
                    <span className="text-gray-500">[{new Date().toLocaleTimeString()}]</span>{' '}
                    <span className="text-blue-400">Processing...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Cluster Information */}
        {deploymentStatus === 'preparing' && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Configuration Preview</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">{template.resources.nodes}</div>
                <div className="text-xs text-gray-600">Nodes</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">{template.resources.cpu}</div>
                <div className="text-xs text-gray-600">CPU</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">{template.resources.memory}</div>
                <div className="text-xs text-gray-600">Memory</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">{template.estimatedCost}</div>
                <div className="text-xs text-gray-600">per month</div>
              </div>
            </div>
          </div>
        )}

        {/* Completion Status */}
        {deploymentStatus === 'completed' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <CheckCircleIcon className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-green-900">Deployment Successful!</h3>
                <p className="text-green-700">Your cluster is ready and accessible</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-sm text-gray-600">Cluster ID</div>
                <div className="font-mono text-sm bg-white p-2 rounded border">{clusterId}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Endpoint</div>
                <div className="font-mono text-sm bg-white p-2 rounded border">
                  https://{clusterId}.k8s.zerostack.ai
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                Access Dashboard
              </button>
              <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50">
                Download Kubeconfig
              </button>
              <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50">
                View Documentation
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeploymentOrchestrator;
