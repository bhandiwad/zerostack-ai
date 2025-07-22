import React, { useState, useEffect } from 'react';

const CloudAccountManager = () => {
  const [accounts, setAccounts] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [validationResults, setValidationResults] = useState({});

  useEffect(() => {
    fetchAccounts();
    fetchTemplates();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/cloud-accounts');
      const data = await response.json();
      if (data.success) {
        setAccounts(data.data);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const fetchTemplates = async (provider = null) => {
    try {
      const url = provider 
        ? `http://localhost:5000/api/cloud-account-templates?provider=${provider}`
        : 'http://localhost:5000/api/cloud-account-templates';
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setTemplates(data.data);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const handleProviderChange = (provider) => {
    setSelectedProvider(provider);
    setSelectedTemplate(null);
    setFormData({});
    fetchTemplates(provider);
  };

  const handleTemplateChange = (templateId) => {
    const template = templates.find(t => t.id === templateId);
    setSelectedTemplate(template);
    
    // Initialize form data with default values
    const initialData = { ...template.default_values };
    setFormData(initialData);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const testConnection = async () => {
    if (!selectedTemplate || !selectedProvider) return;

    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/cloud-accounts/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: selectedProvider,
          credentials: formData
        })
      });

      const data = await response.json();
      setValidationResults({
        isValid: data.validation?.is_valid,
        message: data.validation?.message
      });
    } catch (error) {
      setValidationResults({
        isValid: false,
        message: `Connection test failed: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  const saveAccount = async () => {
    if (!selectedTemplate || !selectedProvider) return;

    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/cloud-accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account_name: formData.account_name || `${selectedProvider}-account-${Date.now()}`,
          provider: selectedProvider,
          credentials: formData,
          region: formData.region
        })
      });

      const data = await response.json();
      if (data.success) {
        setAccounts(prev => [data.data, ...prev]);
        setShowAddForm(false);
        setSelectedProvider('');
        setSelectedTemplate(null);
        setFormData({});
        setValidationResults({});
      }
    } catch (error) {
      console.error('Error saving account:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteAccount = async (accountId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/cloud-accounts/${accountId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setAccounts(prev => prev.filter(acc => acc.id !== accountId));
      }
    } catch (error) {
      console.error('Error deleting account:', error);
    }
  };

  const validateAccount = async (accountId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/cloud-accounts/${accountId}/validate`, {
        method: 'POST'
      });

      const data = await response.json();
      if (data.success) {
        // Update account status in the list
        setAccounts(prev => prev.map(acc => 
          acc.id === accountId 
            ? { ...acc, status: data.validation.is_valid ? 'active' : 'error' }
            : acc
        ));
      }
    } catch (error) {
      console.error('Error validating account:', error);
    }
  };

  const getProviderIcon = (provider) => {
    const icons = {
      aws: '☁️',
      gcp: '🌐',
      azure: '🔷',
      sify: '🟢',
      vmware: '💻',
      onprem: '🏢'
    };
    return icons[provider] || '☁️';
  };

  const getStatusColor = (status) => {
    const colors = {
      active: '#10b981',
      error: '#ef4444',
      inactive: '#6b7280'
    };
    return colors[status] || '#6b7280';
  };

  return (
    <div className="cloud-account-manager">
      <div className="header">
        <h2>Cloud Account Management</h2>
        <button 
          className="btn-primary"
          onClick={() => setShowAddForm(true)}
        >
          Add Cloud Account
        </button>
      </div>

      {/* Account List */}
      <div className="accounts-grid">
        {accounts.map(account => (
          <div key={account.id} className="account-card">
            <div className="account-header">
              <div className="account-info">
                <span className="provider-icon">{getProviderIcon(account.provider)}</span>
                <div>
                  <h3>{account.account_name}</h3>
                  <p className="provider-name">{account.provider.toUpperCase()}</p>
                </div>
              </div>
              <div 
                className="status-indicator"
                style={{ backgroundColor: getStatusColor(account.status) }}
              >
                {account.status}
              </div>
            </div>
            
            <div className="account-details">
              <p><strong>Account ID:</strong> {account.account_id || 'N/A'}</p>
              <p><strong>Region:</strong> {account.region || 'N/A'}</p>
              <p><strong>Last Validated:</strong> {
                account.last_validated 
                  ? new Date(account.last_validated).toLocaleDateString()
                  : 'Never'
              }</p>
            </div>

            <div className="account-actions">
              <button 
                className="btn-secondary"
                onClick={() => validateAccount(account.id)}
              >
                Validate
              </button>
              <button 
                className="btn-danger"
                onClick={() => deleteAccount(account.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Account Modal */}
      {showAddForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Add Cloud Account</h3>
              <button 
                className="close-btn"
                onClick={() => setShowAddForm(false)}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              {/* Provider Selection */}
              <div className="form-group">
                <label>Cloud Provider</label>
                <select 
                  value={selectedProvider}
                  onChange={(e) => handleProviderChange(e.target.value)}
                >
                  <option value="">Select Provider</option>
                  <option value="aws">Amazon Web Services</option>
                  <option value="gcp">Google Cloud Platform</option>
                  <option value="azure">Microsoft Azure</option>
                  <option value="sify">Sify Cloud</option>
                  <option value="vmware">VMware vSphere</option>
                  <option value="onprem">On-Premises</option>
                </select>
              </div>

              {/* Template Selection */}
              {selectedProvider && templates.length > 0 && (
                <div className="form-group">
                  <label>Authentication Method</label>
                  <select 
                    value={selectedTemplate?.id || ''}
                    onChange={(e) => handleTemplateChange(e.target.value)}
                  >
                    <option value="">Select Method</option>
                    {templates.map(template => (
                      <option key={template.id} value={template.id}>
                        {template.template_name}
                      </option>
                    ))}
                  </select>
                  {selectedTemplate && (
                    <p className="template-description">{selectedTemplate.description}</p>
                  )}
                </div>
              )}

              {/* Dynamic Form Fields */}
              {selectedTemplate && (
                <>
                  <div className="form-group">
                    <label>Account Name</label>
                    <input
                      type="text"
                      value={formData.account_name || ''}
                      onChange={(e) => handleInputChange('account_name', e.target.value)}
                      placeholder="Enter a name for this account"
                    />
                  </div>

                  {/* Required Fields */}
                  {selectedTemplate.required_fields.map(field => (
                    <div key={field} className="form-group">
                      <label>{field.replace(/_/g, ' ').toUpperCase()} *</label>
                      {field.includes('json') || field.includes('key') || field.includes('config') ? (
                        <textarea
                          value={formData[field] || ''}
                          onChange={(e) => handleInputChange(field, e.target.value)}
                          placeholder={`Enter ${field}`}
                          rows={4}
                        />
                      ) : field.includes('password') || field.includes('secret') ? (
                        <input
                          type="password"
                          value={formData[field] || ''}
                          onChange={(e) => handleInputChange(field, e.target.value)}
                          placeholder={`Enter ${field}`}
                        />
                      ) : (
                        <input
                          type="text"
                          value={formData[field] || ''}
                          onChange={(e) => handleInputChange(field, e.target.value)}
                          placeholder={`Enter ${field}`}
                        />
                      )}
                    </div>
                  ))}

                  {/* Optional Fields */}
                  {selectedTemplate.optional_fields.map(field => (
                    <div key={field} className="form-group">
                      <label>{field.replace(/_/g, ' ').toUpperCase()}</label>
                      <input
                        type="text"
                        value={formData[field] || ''}
                        onChange={(e) => handleInputChange(field, e.target.value)}
                        placeholder={`Enter ${field} (optional)`}
                      />
                    </div>
                  ))}

                  {/* Validation Results */}
                  {validationResults.message && (
                    <div className={`validation-result ${validationResults.isValid ? 'success' : 'error'}`}>
                      {validationResults.message}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="modal-footer">
              <button 
                className="btn-secondary"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </button>
              {selectedTemplate && (
                <>
                  <button 
                    className="btn-outline"
                    onClick={testConnection}
                    disabled={loading}
                  >
                    {loading ? 'Testing...' : 'Test Connection'}
                  </button>
                  <button 
                    className="btn-primary"
                    onClick={saveAccount}
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Save Account'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CloudAccountManager;

