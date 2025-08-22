import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import { ClusterExplorer } from './features/cluster-explorer';
import { HelmCharts } from './features/helm';
import { api } from './utils/api';
import './MaintenanceMode.css';
import ClusterCreation from './ClusterCreation.jsx';
import ClusterDetail from './pages/ClusterDetail';
// Simple fallback provider to prevent crashes
const AgentProvider = ({ children }) => {
  return <div>{children}</div>;
};
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
import './styles/theme.css';

// Layout components
import Navigation from './components/layout/NewNavigation';
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

  const handleLogin = async (loginData) => {
    try {
      // Store the token from login response
      if (loginData.token) {
        localStorage.setItem('jwt_token', loginData.token);
      }
      
      // Update user and organization state
      setUser(loginData.user || null);
      setOrganization(loginData.organization || null);
      
      // Store user data in localStorage
      if (loginData.user) {
        localStorage.setItem('user_data', JSON.stringify(loginData.user));
      }
      if (loginData.organization) {
        localStorage.setItem('organization_data', JSON.stringify(loginData.organization));
      }
      
      // Check if onboarding is needed
      const hasCompletedOnboarding = loginData.user?.has_completed_onboarding || 
                                   localStorage.getItem('onboarding_completed') === 'true';
      setShowOnboarding(!hasCompletedOnboarding);
      
    } catch (error) {
      console.error('Login failed:', error);
      // Clear any partial state on error
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('user_data');
      localStorage.removeItem('organization_data');
      throw error; // Re-throw to allow the login form to handle the error
    } finally {
      setLoading(false);
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
          <div className="min-h-screen bg-white flex">
            <Navigation />
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Top Header */}
              <header className="h-16 bg-white border-b border-gray-200 flex-shrink-0 flex items-center px-6">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                      <div className="text-xl font-semibold text-gray-900">ZeroStack AI</div>
                    </div>
                    <div className="hidden md:flex items-center bg-gray-50 rounded-lg px-3 py-1.5 w-96">
                      <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input 
                        type="text" 
                        placeholder="Search clusters, workflows, templates..." 
                        className="bg-transparent border-none outline-none flex-1 text-sm text-gray-900 placeholder-gray-500"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-12" />
                      </svg>
                    </button>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">{user?.name}</div>
                        <div className="text-xs text-gray-500">{organization?.name}</div>
                      </div>
                      <button 
                        onClick={handleLogout}
                        className="w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-sm font-medium hover:bg-indigo-200 transition-colors"
                      >
                        {user?.name?.charAt(0) || 'U'}
                      </button>
                    </div>
                  </div>
                </div>
              </header>
              
              {/* Main Content */}
              <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/clusters" element={<ClusterManagement />} />
                  <Route path="/workflows" element={<WorkflowManagement />} />
                  <Route path="/debugging" element={<ClusterDebugger />} />
                  <Route path="/maintenance" element={<MaintenanceManager />} />
                  <Route path="/metrics" element={<MetricsPage />} />
                  <Route path="/templates" element={<TemplateHub />} />
                  <Route path="/ai-hub" element={<AIHub />} />
                  <Route path="/ai-endpoints" element={<AIEndpointManager />} />
                  <Route path="/ai-endpoints/configure" element={<AIEndpointConfig />} />
                  <Route path="/workflow-tester" element={<WorkflowTester />} />
                  <Route path="/agent-performance" element={<AgentPerformanceDashboard />} />
                  <Route path="/workflow-designer" element={<WorkflowDesigner />} />
                  <Route path="/helm" element={<HelmCharts />} />
                  <Route path="/cluster-explorer" element={<ClusterExplorer />} />
                  <Route path="/cloud-accounts" element={<CloudAccountManager />} />
                  <Route path="/helm-applications" element={<HelmApplicationsPage />} />
                  <Route path="/clusters/new" element={<ClusterCreation />} />
                  <Route path="/clusters/:id" element={<ClusterDetail />} />
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
