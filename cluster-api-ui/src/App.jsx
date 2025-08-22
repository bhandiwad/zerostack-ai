import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import { ClusterExplorer } from './features/cluster-explorer';
import { HelmCharts } from './features/helm';
import ClusterCreation from './ClusterCreation.jsx';
import ClusterDetail from './pages/ClusterDetail';
import AuthWrapper from './components/auth/AuthWrapper';
import Sidebar from './components/layout/Sidebar';
import ClusterManagement from './components/clusters/ClusterManagement';
import Dashboard from './components/dashboard/Dashboard';
import ErrorBoundary from './components/ErrorBoundary';
import CloudAccountManager from './pages/CloudAccounts/CloudAccountManager';
import HelmApplicationsPage from './pages/HelmApplications/HelmApplicationsPage';
import AIHub from './features/ai/AIHub';
import AIEndpointConfig from './features/ai/AIEndpointConfig';
import WorkflowTester from './features/ai/WorkflowTester';
import AgentPerformanceDashboard from './features/ai/AgentPerformanceDashboard';
import WorkflowDesigner from './features/ai/WorkflowDesigner';

// Simple fallback components for missing ones
const MonitoringDashboard = () => (
  <div className="max-w-7xl mx-auto p-6">
    <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-8 border border-green-200">
      <h1 className="text-3xl font-bold text-gray-900">Monitoring Dashboard</h1>
      <p className="text-gray-600 mt-2">Real-time cluster monitoring and alerts</p>
    </div>
  </div>
);

const CommandPalette = () => null;
const ThemeProvider = ({ children }) => <div>{children}</div>;
const AgentProvider = ({ children }) => <div>{children}</div>;

// Main App Component
const App = () => {

  return (
    <Router>
      <ErrorBoundary>
        <AuthWrapper>
          <ThemeProvider>
            <AgentProvider>
            <div className="app">
              <div className="app-container">
                <Sidebar />
                <main className="main-content">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/clusters" element={<ClusterManagement />} />
                    <Route path="/monitoring" element={<MonitoringDashboard />} />
                    <Route path="/ai-hub" element={<AIHub />} />
                    <Route path="/ai-endpoints" element={<AIEndpointConfig />} />
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
            
            {/* Global Command Palette */}
            <CommandPalette />
            </AgentProvider>
          </ThemeProvider>
        </AuthWrapper>
      </ErrorBoundary>
    </Router>
  );
};

export default App;
