import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import { ClusterExplorer } from './features/cluster-explorer';
import { HelmCharts } from './features/helm';
import apiCall from './lib/api';
import './MaintenanceMode.css';
import ClusterCreation from './ClusterCreation.jsx';
import ClusterDetail from './pages/ClusterDetail';
import { AgentProvider } from './features/agents';
import AIHub from './features/ai/AIHub';
import ErrorBoundary from './components/ErrorBoundary';
import CloudAccountManager from './pages/CloudAccounts/CloudAccountManager';
import HelmApplicationsPage from './pages/HelmApplications/HelmApplicationsPage';
import LoginForm from './components/auth/LoginForm';
import Dashboard from './components/dashboard/Dashboard';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

// Refactored components
import Navigation from './components/layout/Navigation';
import ClusterManagement from './components/clusters/ClusterManagement';

// Main App Component
const App = () => {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing authentication
    const token = localStorage.getItem('jwt_token');
    const userData = localStorage.getItem('user_data');
    const orgData = localStorage.getItem('organization_data');

    if (token && userData && orgData) {
      setUser(JSON.parse(userData));
      setOrganization(JSON.parse(orgData));
    }
    setLoading(false);
  }, []);

  const handleLogin = (loginData) => {
    setUser(loginData.user);
    setOrganization(loginData.organization);
  };

  const handleLogout = () => {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_data');
    localStorage.removeItem('organization_data');
    setUser(null);
    setOrganization(null);
    window.location.href = '/';
  };

  if (loading) {
    return <div className="loading">🔄 Loading...</div>;
  }

  if (!user) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <Router>
      <ErrorBoundary componentName="AgentProvider">
        <AgentProvider>
          <div className="app">
          <div className="app-content">
            <Navigation user={user} organization={organization} onLogout={handleLogout} />

            <main className="main-content">
              <Routes>
              <Route path="/" element={<Dashboard organization={organization} />} />
              <Route path="/clusters" element={<ClusterManagement />} />
              <Route path="/clusters/create" element={<ClusterCreation />} />
              <Route path="/explorer" element={<ClusterExplorer />} />
              <Route path="/helm" element={<HelmCharts />} />
              <Route path="/clusters/:clusterId/*" element={
                <ClusterDetail 
                  apiCall={apiCall} 
                  showNotification={(message, type = 'info') => {
                    // This would be connected to your notification system
                    console.log(`[${type}] ${message}`);
                  }} 
                />
              } />
              <Route path="/monitoring" element={
                <div className="page-placeholder">
                  <h2>📈 Real-Time Monitoring</h2>
                  <p>Advanced monitoring dashboard coming soon...</p>
                </div>
              } />
                <Route path="/accounts" element={<CloudAccountManager />} />
                <Route path="/agents/*" element={<AIHub />} />
                <Route path="/applications" element={<HelmApplicationsPage />} />
              </Routes>
            </main>
          </div>
        </div>
      </AgentProvider>
      </ErrorBoundary>
    </Router>
  );
};

export default App;
