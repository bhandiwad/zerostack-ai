import React, { useState } from 'react';
import apiCall from '../../lib/api';

const LoginForm = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    email: 'admin@sifytechnologies.com',
    password: 'SifyAdmin123!'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify(formData)
    });

    if (result && result.success) {
      localStorage.setItem('jwt_token', result.data.token);
      localStorage.setItem('user_data', JSON.stringify(result.data.user));
      localStorage.setItem('organization_data', JSON.stringify(result.data.organization));
      onLogin(result.data);
    } else {
      setError(result?.error || 'Login failed');
    }

    setLoading(false);
  };

  const handleDemoLogin = (email, password) => {
    setFormData({ email, password });
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>🏢 Sify Cluster-API Console</h1>
          <p>Multi-Tenant Kubernetes Management Platform</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
              placeholder="Enter your email"
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required
              placeholder="Enter your password"
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading} className="login-button">
            {loading ? '🔄 Signing In...' : '🔐 Sign In'}
          </button>
        </form>

        <div className="demo-accounts">
          <h3>Demo Accounts</h3>
          <div className="demo-buttons">
            <button 
              onClick={() => handleDemoLogin('admin@sifytechnologies.com', 'SifyAdmin123!')}
              className="demo-button sify"
            >
              🏢 Sify Technologies (Enterprise)
            </button>
            <button 
              onClick={() => handleDemoLogin('admin@example.com', 'DemoAdmin123!')}
              className="demo-button demo"
            >
              🏢 Demo Company (Professional)
            </button>
            <button 
              onClick={() => handleDemoLogin('founder@techstartup.com', 'StartupFounder123!')}
              className="demo-button startup"
            >
              🏢 Tech Startup (Free)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
