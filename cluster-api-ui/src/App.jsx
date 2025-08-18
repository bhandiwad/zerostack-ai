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
import AIEndpointConfig from './features/ai/AIEndpointConfig';
import WorkflowTester from './features/ai/WorkflowTester';
import AgentPerformanceDashboard from './features/ai/AgentPerformanceDashboard';
import WorkflowDesigner from './features/ai/WorkflowDesigner';
import ErrorBoundary from './components/ErrorBoundary';
import CloudAccountManager from './pages/CloudAccounts/CloudAccountManager';
import HelmApplicationsPage from './pages/HelmApplications/HelmApplicationsPage';
import LoginForm from './components/auth/LoginForm';
import Dashboard from './components/dashboard/Dashboard';
import MetricsPage from './components/metrics/MetricsPage';
import OnboardingFlow from './components/onboarding/OnboardingFlow';
import TemplateHub from './components/templates/TemplateHub';
import WorkflowManagement from './components/workflows/WorkflowManagement';
import ClusterDebugger from './components/debugging/ClusterDebugger';
import MaintenanceManager from './components/maintenance/MaintenanceManager';
import AIEndpointManager from './components/ai/AIEndpointManager';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './styles/design-system.css';

// Refactored components
import Navigation from './components/layout/Navigation';
import Header from './components/layout/Header';
import ClusterManagement from './components/clusters/ClusterManagement';

// Main App Component
const App = () => {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Check for existing authentication
    const token = localStorage.getItem('jwt_token');
    const userData = localStorage.getItem('user_data');
    const orgData = localStorage.getItem('organization_data');
    const onboardingCompleted = localStorage.getItem('onboarding_completed');

    if (token && userData && orgData) {
      setUser(JSON.parse(userData));
      setOrganization(JSON.parse(orgData));
      
      // Show onboarding for new users who haven't completed it
      if (!onboardingCompleted) {
        setShowOnboarding(true);
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (loginData) => {
    setUser(loginData.user);
    setOrganization(loginData.organization);
    
    // Check if new user needs onboarding
    const onboardingCompleted = localStorage.getItem('onboarding_completed');
    if (!onboardingCompleted) {
      setShowOnboarding(true);
    }
  };

  const handleOnboardingComplete = (onboardingData) => {
    localStorage.setItem('onboarding_completed', 'true');
    localStorage.setItem('user_preferences', JSON.stringify(onboardingData));
    setShowOnboarding(false);
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

  // Show onboarding flow for new users
  if (showOnboarding) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  return (
    <Router>
      <ErrorBoundary componentName="AgentProvider">
        <AgentProvider>
          <div className="app">
            <Header user={user} organization={organization} onLogout={handleLogout} />
            <div className="app-content">
              <Navigation user={user} organization={organization} />
              <main className="main-content">
              <Routes>
              <Route path="/" element={<Dashboard organization={organization} />} />
              <Route path="/clusters" element={<ClusterManagement />} />
              <Route path="/clusters/create" element={<ClusterCreation />} />
              <Route path="/templates" element={<TemplateHub />} />
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
              <Route path="/metrics" element={<MetricsPage />} />
                <Route path="/accounts" element={<CloudAccountManager />} />
                <Route path="/agents/*" element={<AIHub />} />
                <Route path="/ai-config" element={<AIEndpointConfig />} />
                <Route path="/workflows" element={<WorkflowManagement />} />
            <Route path="/debugging" element={<ClusterDebugger />} />
                <Route path="/maintenance" element={<MaintenanceManager />} />
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
