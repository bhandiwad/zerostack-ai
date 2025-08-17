import React, { useState, useEffect } from 'react';
import './AIEndpointConfig.css';

interface AIEndpointConfig {
  id?: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'azure' | 'google' | 'cohere' | 'huggingface' | 'custom';
  model: string;
  apiKey: string;
  baseUrl?: string;
  temperature: number;
  maxTokens: number;
  timeout: number;
  isDefault: boolean;
  status: 'active' | 'inactive' | 'testing' | 'error';
}

interface AIProvider {
  id: string;
  name: string;
  models: string[];
  defaultBaseUrl?: string;
  requiresApiKey: boolean;
}

const AI_PROVIDERS: AIProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-4o', 'gpt-4o-mini'],
    requiresApiKey: true
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku', 'claude-3-5-sonnet'],
    requiresApiKey: true
  },
  {
    id: 'azure',
    name: 'Azure OpenAI',
    models: ['gpt-4', 'gpt-35-turbo', 'text-embedding-ada-002'],
    requiresApiKey: true
  },
  {
    id: 'google',
    name: 'Google AI',
    models: ['gemini-pro', 'gemini-pro-vision', 'text-bison', 'chat-bison'],
    requiresApiKey: true
  },
  {
    id: 'cohere',
    name: 'Cohere',
    models: ['command', 'command-light', 'command-nightly'],
    requiresApiKey: true
  },
  {
    id: 'huggingface',
    name: 'Hugging Face',
    models: ['mistral-7b', 'llama-2-7b', 'codellama-7b', 'falcon-7b'],
    requiresApiKey: true
  },
  {
    id: 'custom',
    name: 'Custom Endpoint',
    models: [],
    requiresApiKey: false
  }
];

const AIEndpointConfig: React.FC = () => {
  const [endpoints, setEndpoints] = useState<AIEndpointConfig[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEndpoint, setEditingEndpoint] = useState<AIEndpointConfig | null>(null);
  const [testingEndpoint, setTestingEndpoint] = useState<string | null>(null);

  const [formData, setFormData] = useState<AIEndpointConfig>({
    name: '',
    provider: 'openai',
    model: '',
    apiKey: '',
    baseUrl: '',
    temperature: 0.7,
    maxTokens: 4000,
    timeout: 30,
    isDefault: false,
    status: 'inactive'
  });

  useEffect(() => {
    loadEndpoints();
  }, []);

  const loadEndpoints = async () => {
    try {
      const response = await fetch('/api/ai/endpoints');
      if (response.ok) {
        const data = await response.json();
        setEndpoints(data.endpoints || []);
      }
    } catch (error) {
      console.error('Failed to load AI endpoints:', error);
    }
  };

  const handleProviderChange = (provider: string) => {
    const selectedProvider = AI_PROVIDERS.find(p => p.id === provider);
    setFormData({
      ...formData,
      provider: provider as any,
      model: selectedProvider?.models[0] || '',
      baseUrl: selectedProvider?.defaultBaseUrl || ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingEndpoint ? `/api/ai/endpoints/${editingEndpoint.id}` : '/api/ai/endpoints';
      const method = editingEndpoint ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await loadEndpoints();
        closeModal();
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Failed to save endpoint:', error);
      alert('Failed to save endpoint configuration');
    }
  };

  const testEndpoint = async (endpointId: string) => {
    setTestingEndpoint(endpointId);
    
    try {
      const response = await fetch(`/api/ai/endpoints/${endpointId}/test`, {
        method: 'POST'
      });
      
      const result = await response.json();
      
      if (result.success) {
        setEndpoints(endpoints.map(ep => 
          ep.id === endpointId ? { ...ep, status: 'active' } : ep
        ));
        alert('Endpoint test successful!');
      } else {
        setEndpoints(endpoints.map(ep => 
          ep.id === endpointId ? { ...ep, status: 'error' } : ep
        ));
        alert(`Endpoint test failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to test endpoint:', error);
      alert('Failed to test endpoint');
    } finally {
      setTestingEndpoint(null);
    }
  };

  const deleteEndpoint = async (endpointId: string) => {
    if (!confirm('Are you sure you want to delete this endpoint?')) return;
    
    try {
      const response = await fetch(`/api/ai/endpoints/${endpointId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await loadEndpoints();
      }
    } catch (error) {
      console.error('Failed to delete endpoint:', error);
    }
  };

  const setAsDefault = async (endpointId: string) => {
    try {
      const response = await fetch(`/api/ai/endpoints/${endpointId}/default`, {
        method: 'POST'
      });
      
      if (response.ok) {
        await loadEndpoints();
      }
    } catch (error) {
      console.error('Failed to set default endpoint:', error);
    }
  };

  const openModal = (endpoint?: AIEndpointConfig) => {
    if (endpoint) {
      setEditingEndpoint(endpoint);
      setFormData(endpoint);
    } else {
      setEditingEndpoint(null);
      setFormData({
        name: '',
        provider: 'openai',
        model: 'gpt-4',
        apiKey: '',
        baseUrl: '',
        temperature: 0.7,
        maxTokens: 4000,
        timeout: 30,
        isDefault: false,
        status: 'inactive'
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEndpoint(null);
  };

  const selectedProvider = AI_PROVIDERS.find(p => p.id === formData.provider);

  return (
    <div className="ai-endpoint-config">
      <div className="config-header">
        <h2>AI Endpoint Configuration</h2>
        <button className="btn-primary" onClick={() => openModal()}>
          Add New Endpoint
        </button>
      </div>

      <div className="endpoints-grid">
        {endpoints.map((endpoint) => (
          <div key={endpoint.id} className={`endpoint-card ${endpoint.status}`}>
            <div className="endpoint-header">
              <div className="endpoint-info">
                <h3>{endpoint.name}</h3>
                <span className="provider-badge">{endpoint.provider}</span>
                {endpoint.isDefault && <span className="default-badge">Default</span>}
              </div>
              <div className={`status-indicator ${endpoint.status}`}>
                {endpoint.status}
              </div>
            </div>
            
            <div className="endpoint-details">
              <div className="detail-row">
                <span>Model:</span>
                <span>{endpoint.model}</span>
              </div>
              <div className="detail-row">
                <span>Temperature:</span>
                <span>{endpoint.temperature}</span>
              </div>
              <div className="detail-row">
                <span>Max Tokens:</span>
                <span>{endpoint.maxTokens}</span>
              </div>
              <div className="detail-row">
                <span>Timeout:</span>
                <span>{endpoint.timeout}s</span>
              </div>
            </div>

            <div className="endpoint-actions">
              <button 
                className="btn-test"
                onClick={() => testEndpoint(endpoint.id!)}
                disabled={testingEndpoint === endpoint.id}
              >
                {testingEndpoint === endpoint.id ? 'Testing...' : 'Test'}
              </button>
              
              {!endpoint.isDefault && (
                <button 
                  className="btn-default"
                  onClick={() => setAsDefault(endpoint.id!)}
                >
                  Set Default
                </button>
              )}
              
              <button 
                className="btn-edit"
                onClick={() => openModal(endpoint)}
              >
                Edit
              </button>
              
              <button 
                className="btn-delete"
                onClick={() => deleteEndpoint(endpoint.id!)}
                disabled={endpoint.isDefault}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{editingEndpoint ? 'Edit Endpoint' : 'Add New Endpoint'}</h3>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>

            <form onSubmit={handleSubmit} className="endpoint-form">
              <div className="form-group">
                <label>Endpoint Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  placeholder="e.g., Production GPT-4"
                />
              </div>

              <div className="form-group">
                <label>AI Provider</label>
                <select
                  value={formData.provider}
                  onChange={(e) => handleProviderChange(e.target.value)}
                  required
                >
                  {AI_PROVIDERS.map(provider => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Model</label>
                {selectedProvider?.models.length ? (
                  <select
                    value={formData.model}
                    onChange={(e) => setFormData({...formData, model: e.target.value})}
                    required
                  >
                    {selectedProvider.models.map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({...formData, model: e.target.value})}
                    required
                    placeholder="Enter model name"
                  />
                )}
              </div>

              {selectedProvider?.requiresApiKey && (
                <div className="form-group">
                  <label>API Key</label>
                  <input
                    type="password"
                    value={formData.apiKey}
                    onChange={(e) => setFormData({...formData, apiKey: e.target.value})}
                    required
                    placeholder="Enter your API key"
                  />
                </div>
              )}

              <div className="form-group">
                <label>Base URL (Optional)</label>
                <input
                  type="url"
                  value={formData.baseUrl}
                  onChange={(e) => setFormData({...formData, baseUrl: e.target.value})}
                  placeholder="Custom base URL for API calls"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Temperature</label>
                  <input
                    type="number"
                    min="0"
                    max="2"
                    step="0.1"
                    value={formData.temperature}
                    onChange={(e) => setFormData({...formData, temperature: parseFloat(e.target.value)})}
                  />
                </div>

                <div className="form-group">
                  <label>Max Tokens</label>
                  <input
                    type="number"
                    min="1"
                    max="32000"
                    value={formData.maxTokens}
                    onChange={(e) => setFormData({...formData, maxTokens: parseInt(e.target.value)})}
                  />
                </div>

                <div className="form-group">
                  <label>Timeout (seconds)</label>
                  <input
                    type="number"
                    min="5"
                    max="300"
                    value={formData.timeout}
                    onChange={(e) => setFormData({...formData, timeout: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData({...formData, isDefault: e.target.checked})}
                  />
                  Set as default endpoint
                </label>
              </div>

              <div className="form-actions">
                <button type="button" onClick={closeModal} className="btn-cancel">
                  Cancel
                </button>
                <button type="submit" className="btn-save">
                  {editingEndpoint ? 'Update' : 'Create'} Endpoint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIEndpointConfig;
