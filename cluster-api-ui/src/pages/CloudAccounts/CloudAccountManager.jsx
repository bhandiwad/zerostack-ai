import React, { useState, useEffect } from 'react';
import apiCall from '../../lib/api.js';
import Notification from '../../components/common/Notification';

const CloudAccountManager = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });
  const [formData, setFormData] = useState({
    name: '',
    provider: 'aws',
    credentials: {
      aws_access_key_id: '',
      aws_secret_access_key: '',
      region: 'us-east-1'
    }
  });

  useEffect(() => {
    loadCloudAccounts();
  }, []);

  const showNotification = (message, type = 'info') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'info' }), 5000);
  };

  const loadCloudAccounts = async () => {
    setLoading(true);
    try {
      const result = await apiCall('/cloud-accounts');
      if (result && result.success) {
        setAccounts(result.data || []);
      }
    } catch (error) {
      console.error('Error loading cloud accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProviderChange = (provider) => {
    let defaultCredentials = {};
    switch (provider) {
      case 'aws':
        defaultCredentials = {
          aws_access_key_id: '',
          aws_secret_access_key: '',
          region: 'us-east-1'
        };
        break;
      case 'gcp':
        defaultCredentials = {
          project_id: '',
          service_account_key: '',
          region: 'us-central1'
        };
        break;
      case 'azure':
        defaultCredentials = {
          subscription_id: '',
          client_id: '',
          client_secret: '',
          tenant_id: '',
          region: 'East US'
        };
        break;
    }
    setFormData({ ...formData, provider, credentials: defaultCredentials });
  };

  const handleCredentialChange = (key, value) => {
    setFormData({
      ...formData,
      credentials: { ...formData.credentials, [key]: value }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await apiCall('/cloud-accounts', {
      method: 'POST',
      body: JSON.stringify(formData)
    });

    if (result && result.success) {
      showNotification(`✅ Cloud account "${formData.name}" added successfully!`);
      setShowAddForm(false);
      setFormData({
        name: '',
        provider: 'aws',
        credentials: {
          aws_access_key_id: '',
          aws_secret_access_key: '',
          region: 'us-east-1'
        }
      });
      loadCloudAccounts();
    } else {
      showNotification(`❌ Failed to add cloud account: ${result?.error || 'Unknown error'}`, 'error');
    }

    setLoading(false);
  };

  const deleteAccount = async (accountId) => {
    if (!confirm('Are you sure you want to delete this cloud account?')) return;

    const result = await apiCall(`/cloud-accounts/${accountId}`, {
      method: 'DELETE'
    });

    if (result && result.success) {
      showNotification('✅ Cloud account deleted successfully!');
      loadCloudAccounts();
    } else {
      showNotification(`❌ Failed to delete cloud account: ${result?.error || 'Unknown error'}`, 'error');
    }
  };

  const renderCredentialFields = () => {
    switch (formData.provider) {
      case 'aws':
        return (
          <>
            <div className="form-group">
              <label>AWS Access Key ID *</label>
              <input
                type="text"
                value={formData.credentials.aws_access_key_id}
                onChange={(e) => handleCredentialChange('aws_access_key_id', e.target.value)}
                placeholder="AKIA..."
                required
              />
            </div>
            <div className="form-group">
              <label>AWS Secret Access Key *</label>
              <input
                type="password"
                value={formData.credentials.aws_secret_access_key}
                onChange={(e) => handleCredentialChange('aws_secret_access_key', e.target.value)}
                placeholder="Enter secret access key"
                required
              />
            </div>
            <div className="form-group">
              <label>Default Region</label>
              <select
                value={formData.credentials.region}
                onChange={(e) => handleCredentialChange('region', e.target.value)}
              >
                <option value="us-east-1">US East (N. Virginia)</option>
                <option value="us-west-2">US West (Oregon)</option>
                <option value="eu-west-1">Europe (Ireland)</option>
                <option value="ap-south-1">Asia Pacific (Mumbai)</option>
                <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
              </select>
            </div>
          </>
        );
      case 'gcp':
        return (
          <>
            <div className="form-group">
              <label>Project ID *</label>
              <input
                type="text"
                value={formData.credentials.project_id}
                onChange={(e) => handleCredentialChange('project_id', e.target.value)}
                placeholder="my-gcp-project"
                required
              />
            </div>
            <div className="form-group">
              <label>Service Account Key (JSON) *</label>
              <textarea
                value={formData.credentials.service_account_key}
                onChange={(e) => handleCredentialChange('service_account_key', e.target.value)}
                placeholder="Paste your service account JSON key here"
                rows="4"
                required
              />
            </div>
            <div className="form-group">
              <label>Default Region</label>
              <select
                value={formData.credentials.region}
                onChange={(e) => handleCredentialChange('region', e.target.value)}
              >
                <option value="us-central1">US Central 1</option>
                <option value="us-east1">US East 1</option>
                <option value="europe-west1">Europe West 1</option>
                <option value="asia-south1">Asia South 1</option>
                <option value="asia-southeast1">Asia Southeast 1</option>
              </select>
            </div>
          </>
        );
      case 'azure':
        return (
          <>
            <div className="form-group">
              <label>Subscription ID *</label>
              <input
                type="text"
                value={formData.credentials.subscription_id}
                onChange={(e) => handleCredentialChange('subscription_id', e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                required
              />
            </div>
            <div className="form-group">
              <label>Client ID *</label>
              <input
                type="text"
                value={formData.credentials.client_id}
                onChange={(e) => handleCredentialChange('client_id', e.target.value)}
                placeholder="Application (client) ID"
                required
              />
            </div>
            <div className="form-group">
              <label>Client Secret *</label>
              <input
                type="password"
                value={formData.credentials.client_secret}
                onChange={(e) => handleCredentialChange('client_secret', e.target.value)}
                placeholder="Enter client secret"
                required
              />
            </div>
            <div className="form-group">
              <label>Tenant ID *</label>
              <input
                type="text"
                value={formData.credentials.tenant_id}
                onChange={(e) => handleCredentialChange('tenant_id', e.target.value)}
                placeholder="Directory (tenant) ID"
                required
              />
            </div>
            <div className="form-group">
              <label>Default Region</label>
              <select
                value={formData.credentials.region}
                onChange={(e) => handleCredentialChange('region', e.target.value)}
              >
                <option value="East US">East US</option>
                <option value="West US 2">West US 2</option>
                <option value="West Europe">West Europe</option>
                <option value="Southeast Asia">Southeast Asia</option>
                <option value="Central India">Central India</option>
              </select>
            </div>
          </>
        );
    }
  };

  if (loading && accounts.length === 0) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading cloud accounts...</p>
      </div>
    );
  }

  return (
    <div className="cloud-accounts-container">
      <Notification 
        notification={notification}
        onClose={() => setNotification(prev => ({...prev, show: false}))} 
      />
      <div className="page-header">
        <h2>☁️ Cloud Account Management</h2>
        <p>Manage your cloud provider credentials for cluster provisioning</p>
        <button 
          className="btn-primary"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? '❌ Cancel' : '➕ Add Cloud Account'}
        </button>
      </div>

      {showAddForm && (
        <div className="add-account-form">
          <h3>Add New Cloud Account</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Account Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Production AWS Account"
                required
              />
            </div>

            <div className="form-group">
              <label>Cloud Provider *</label>
              <select
                value={formData.provider}
                onChange={(e) => handleProviderChange(e.target.value)}
              >
                <option value="aws">Amazon Web Services (AWS)</option>
                <option value="gcp">Google Cloud Platform (GCP)</option>
                <option value="azure">Microsoft Azure</option>
              </select>
            </div>

            {renderCredentialFields()}

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? '⏳ Adding...' : '✅ Add Account'}
              </button>
              <button 
                type="button" 
                className="btn-secondary"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="accounts-list">
        <h3>Configured Cloud Accounts ({accounts.length})</h3>
        
        {accounts.length === 0 ? (
          <div className="empty-state">
            <p>🔒 No cloud accounts configured yet.</p>
            <p>Add your first cloud account to start provisioning clusters.</p>
          </div>
        ) : (
          <div className="accounts-grid">
            {accounts.map((account) => (
              <div key={account.id} className="account-card">
                <div className="account-header">
                  <h4>{account.name}</h4>
                  <span className={`provider-badge ${account.provider}`}>
                    {account.provider.toUpperCase()}
                  </span>
                </div>
                
                <div className="account-details">
                  <p><strong>Region:</strong> {account.credentials?.region || 'Not specified'}</p>
                  <p><strong>Status:</strong> 
                    <span className={`status ${account.status || 'active'}`}>
                      {account.status === 'active' ? '✅ Active' : '⚠️ Inactive'}
                    </span>
                  </p>
                  <p><strong>Created:</strong> {new Date(account.created_at).toLocaleDateString()}</p>
                </div>

                <div className="account-actions">
                  <button 
                    className="btn-danger"
                    onClick={() => deleteAccount(account.id)}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CloudAccountManager;
