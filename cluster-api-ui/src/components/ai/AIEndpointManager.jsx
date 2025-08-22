import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import Button from '../ui/Button';

const AIEndpointManager = () => {
  const [endpoints, setEndpoints] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEndpoint, setEditingEndpoint] = useState(null);
  const [testingEndpoint, setTestingEndpoint] = useState(null);
  const [healthData, setHealthData] = useState(null);

  const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5002' 
    : 'http://localhost:5002';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [endpointsRes, providersRes, healthRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/ai/endpoints`),
        fetch(`${API_BASE_URL}/api/ai/providers`),
        fetch(`${API_BASE_URL}/api/ai/endpoints/health`)
      ]);

      const endpointsData = await endpointsRes.json();
      const providersData = await providersRes.json();
      const healthData = await healthRes.json();

      if (endpointsData.success) setEndpoints(endpointsData.endpoints);
      if (providersData.success) setProviders(providersData.providers);
      if (healthData.success) setHealthData(healthData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const testEndpoint = async (endpointId) => {
    try {
      setTestingEndpoint(endpointId);
      const response = await fetch(`${API_BASE_URL}/api/ai/endpoints/${endpointId}/test`, {
        method: 'POST'
      });
      const data = await response.json();
      
      // Reload data to get updated status
      await loadData();
      
      return data;
    } catch (error) {
      console.error('Error testing endpoint:', error);
      return { success: false, error: error.message };
    } finally {
      setTestingEndpoint(null);
    }
  };

  const deleteEndpoint = async (endpointId) => {
    if (!confirm('Are you sure you want to delete this endpoint?')) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/endpoints/${endpointId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      
      if (data.success) {
        await loadData();
      }
    } catch (error) {
      console.error('Error deleting endpoint:', error);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'timeout':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return <ExclamationCircleIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'error':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'timeout':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section with Stripe-inspired design */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">🤖 AI Endpoint Manager</h1>
            <p className="text-gray-600">Manage AI provider endpoints and load balancing</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm font-medium">
                Enterprise AI
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Multi-Provider
              </div>
            </div>
            <Button
              onClick={() => setShowCreateModal(true)}
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              }
            >
              Add Endpoint
            </Button>
          </div>
        </div>
      </div>

      {/* Health Summary */}
      {healthData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Endpoints</p>
                <p className="text-2xl font-bold text-gray-900">{healthData.summary.total}</p>
              </div>
              <CogIcon className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold text-green-600">{healthData.summary.active}</p>
              </div>
              <CheckCircleIcon className="h-8 w-8 text-green-400" />
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Errors</p>
                <p className="text-2xl font-bold text-red-600">{healthData.summary.error}</p>
              </div>
              <XCircleIcon className="h-8 w-8 text-red-400" />
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Untested</p>
                <p className="text-2xl font-bold text-gray-600">{healthData.summary.untested}</p>
              </div>
              <ExclamationCircleIcon className="h-8 w-8 text-gray-400" />
            </div>
          </div>
        </div>
      )}

      {/* Endpoints List */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Configured Endpoints</h2>
        </div>
        
        {endpoints.length === 0 ? (
          <div className="p-8 text-center">
            <CogIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No endpoints configured</h3>
            <p className="text-gray-600 mb-4">Get started by adding your first AI provider endpoint</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              Add First Endpoint
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {endpoints.map((endpoint) => (
              <div key={endpoint.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-3 h-8 rounded-full ${
                      endpoint.provider === 'openai' ? 'bg-green-500' :
                      endpoint.provider === 'anthropic' ? 'bg-orange-500' :
                      endpoint.provider === 'azure' ? 'bg-blue-500' :
                      endpoint.provider === 'google' ? 'bg-red-500' :
                      'bg-purple-500'
                    }`}></div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{endpoint.name}</h3>
                      <p className="text-sm text-gray-600">
                        {endpoint.provider_config.name} • Priority {endpoint.priority}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className={`px-3 py-1 rounded-full border text-sm font-medium ${getStatusColor(endpoint.status)}`}>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(endpoint.status)}
                        <span className="capitalize">{endpoint.status}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => testEndpoint(endpoint.id)}
                        disabled={testingEndpoint === endpoint.id}
                        className="p-2 text-gray-400 hover:text-blue-600 disabled:opacity-50"
                        title="Test endpoint"
                      >
                        {testingEndpoint === endpoint.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        ) : (
                          <PlayIcon className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => setEditingEndpoint(endpoint)}
                        className="p-2 text-gray-400 hover:text-yellow-600"
                        title="Edit endpoint"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteEndpoint(endpoint.id)}
                        className="p-2 text-gray-400 hover:text-red-600"
                        title="Delete endpoint"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Models</p>
                    <p className="text-sm font-medium text-gray-900">
                      {endpoint.models.slice(0, 2).join(', ')}
                      {endpoint.models.length > 2 && ` +${endpoint.models.length - 2} more`}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Rate Limit</p>
                    <p className="text-sm font-medium text-gray-900">{endpoint.max_requests_per_minute}/min</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Timeout</p>
                    <p className="text-sm font-medium text-gray-900">{endpoint.timeout}s</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Last Response</p>
                    <p className="text-sm font-medium text-gray-900">
                      {endpoint.last_response_time ? `${Math.round(endpoint.last_response_time)}ms` : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingEndpoint) && (
        <EndpointModal
          endpoint={editingEndpoint}
          providers={providers}
          onClose={() => {
            setShowCreateModal(false);
            setEditingEndpoint(null);
          }}
          onSave={async () => {
            await loadData();
            setShowCreateModal(false);
            setEditingEndpoint(null);
          }}
          apiBaseUrl={API_BASE_URL}
        />
      )}
    </div>
  );
};

// Modal component for creating/editing endpoints
const EndpointModal = ({ endpoint, providers, onClose, onSave, apiBaseUrl }) => {
  const [formData, setFormData] = useState({
    name: endpoint?.name || '',
    provider: endpoint?.provider || '',
    api_key: '',
    base_url: endpoint?.base_url || '',
    priority: endpoint?.priority || 1,
    max_requests_per_minute: endpoint?.max_requests_per_minute || 60,
    timeout: endpoint?.timeout || 30,
    enabled: endpoint?.enabled !== false
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    if (formData.provider && !endpoint) {
      const provider = providers.find(p => p.id === formData.provider);
      if (provider) {
        setFormData(prev => ({
          ...prev,
          base_url: provider.base_url
        }));
      }
    }
  }, [formData.provider, providers, endpoint]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = endpoint 
        ? `${apiBaseUrl}/api/ai/endpoints/${endpoint.id}`
        : `${apiBaseUrl}/api/ai/endpoints`;
      
      const method = endpoint ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (data.success) {
        onSave();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!formData.api_key) {
      alert('Please enter an API key first');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      // Create a temporary endpoint for testing
      const testData = {
        ...formData,
        name: formData.name || 'Test Endpoint'
      };

      const response = await fetch(`${apiBaseUrl}/api/ai/endpoints`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testData)
      });

      const createResult = await response.json();
      
      if (createResult.success) {
        // Test the endpoint
        const testResponse = await fetch(`${apiBaseUrl}/api/ai/endpoints/${createResult.endpoint.id}/test`, {
          method: 'POST'
        });
        
        const testData = await testResponse.json();
        setTestResult(testData);
        
        // Clean up test endpoint
        await fetch(`${apiBaseUrl}/api/ai/endpoints/${createResult.endpoint.id}`, {
          method: 'DELETE'
        });
      }
    } catch (error) {
      setTestResult({ success: false, error: error.message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {endpoint ? 'Edit Endpoint' : 'Add New Endpoint'}
          </h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Endpoint Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Provider
              </label>
              <select
                value={formData.provider}
                onChange={(e) => setFormData(prev => ({ ...prev, provider: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select Provider</option>
                {providers.map(provider => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Key
            </label>
            <div className="flex space-x-2">
              <input
                type="password"
                value={formData.api_key}
                onChange={(e) => setFormData(prev => ({ ...prev, api_key: e.target.value }))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={endpoint ? "Enter new API key to update" : "Enter API key"}
                required={!endpoint}
              />
              <button
                type="button"
                onClick={handleTest}
                disabled={testing || !formData.api_key || !formData.provider}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2"
              >
                {testing ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <PlayIcon className="h-4 w-4" />
                )}
                <span>Test</span>
              </button>
            </div>
            {testResult && (
              <div className={`mt-2 p-3 rounded-lg ${testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {testResult.success ? (
                  <div className="flex items-center space-x-2">
                    <CheckCircleIcon className="h-4 w-4" />
                    <span>Connection successful! Response time: {Math.round(testResult.response_time)}ms</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <XCircleIcon className="h-4 w-4" />
                    <span>Test failed: {testResult.error}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Base URL
            </label>
            <input
              type="url"
              value={formData.base_url}
              onChange={(e) => setFormData(prev => ({ ...prev, base_url: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rate Limit (per min)
              </label>
              <input
                type="number"
                min="1"
                value={formData.max_requests_per_minute}
                onChange={(e) => setFormData(prev => ({ ...prev, max_requests_per_minute: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Timeout (seconds)
              </label>
              <input
                type="number"
                min="5"
                max="120"
                value={formData.timeout}
                onChange={(e) => setFormData(prev => ({ ...prev, timeout: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="enabled"
              checked={formData.enabled}
              onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="enabled" className="ml-2 text-sm text-gray-700">
              Enable this endpoint
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium flex items-center space-x-2"
            >
              {saving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
              <span>{endpoint ? 'Update' : 'Create'} Endpoint</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AIEndpointManager;
