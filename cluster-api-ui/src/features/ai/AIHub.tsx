import React, { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import './AIHub.css';

// Import the new AI components
import SupportTickets from '../support/SupportTickets';
import AgentTraining from '../agents/AgentTraining';
import AgentDashboard from '../agents/AgentDashboard';
import AgentCapabilities from './AgentCapabilities';
import AgentMonitoring from './AgentMonitoring';

const AIHub: React.FC = () => {
  const location = useLocation();
  
  const isActive = (path: string) => {
    const currentPath = location.pathname;
    if (path === '/agents') return currentPath === '/agents';
    return currentPath.startsWith(path);
  };

  return (
    <div className="ai-hub">
      <div className="ai-hub-header">
        <h1>🤖 AI Agent Platform</h1>
        <p>Manage your AI-powered support system, agents, and training</p>
      </div>

      <nav className="ai-hub-nav">
        <Link 
          to="/agents" 
          className={`nav-item ${isActive('/agents') && !isActive('/agents/') ? 'active' : ''}`}
        >
          <span className="nav-icon">🏠</span>
          <span>Overview</span>
        </Link>
        <Link 
          to="/agents/support" 
          className={`nav-item ${isActive('/agents/support') ? 'active' : ''}`}
        >
          <span className="nav-icon">🎫</span>
          <span>Support System</span>
        </Link>
        <Link 
          to="/agents/management" 
          className={`nav-item ${isActive('/agents/management') ? 'active' : ''}`}
        >
          <span className="nav-icon">⚙️</span>
          <span>Agent Control</span>
        </Link>
        <Link 
          to="/agents/training" 
          className={`nav-item ${isActive('/agents/training') ? 'active' : ''}`}
        >
          <span className="nav-icon">🎓</span>
          <span>Training</span>
        </Link>
        <Link 
          to="/agents/capabilities" 
          className={`nav-item ${isActive('/agents/capabilities') ? 'active' : ''}`}
        >
          <span className="nav-icon">🔧</span>
          <span>Capabilities</span>
        </Link>
        <Link 
          to="/agents/monitoring" 
          className={`nav-item ${isActive('/agents/monitoring') ? 'active' : ''}`}
        >
          <span className="nav-icon">📊</span>
          <span>Monitoring</span>
        </Link>
      </nav>

      <div className="ai-hub-content">
        <Routes>
          <Route path="/" element={<AIOverview />} />
          <Route path="/support/*" element={<SupportTickets />} />
          <Route path="/management/*" element={<AgentDashboard />} />
          <Route path="/training/*" element={<AgentTraining />} />
          <Route path="/capabilities/*" element={<AgentCapabilities />} />
          <Route path="/monitoring/*" element={<AgentMonitoring />} />
        </Routes>
      </div>
    </div>
  );
};

// Overview component showing all AI features
const AIOverview: React.FC = () => {
  return (
    <div className="ai-overview">
      <div className="overview-grid">
        <div className="feature-card">
          <div className="feature-icon">🎫</div>
          <h3>Support System</h3>
          <p>L1, L2, L3 support tiers with AI escalation and PagerDuty integration</p>
          <Link to="/agents/support" className="feature-link">
            View Support System →
          </Link>
        </div>

        <div className="feature-card">
          <div className="feature-icon">⚙️</div>
          <h3>Agent Control</h3>
          <p>Start, stop, restart agents with real-time status monitoring</p>
          <Link to="/agents/management" className="feature-link">
            Control Agents →
          </Link>
        </div>

        <div className="feature-card">
          <div className="feature-icon">🎓</div>
          <h3>Agent Training</h3>
          <p>Upload training data and create agent personalizations</p>
          <Link to="/agents/training" className="feature-link">
            Train Agents →
          </Link>
        </div>

        <div className="feature-card">
          <div className="feature-icon">🔧</div>
          <h3>Agent Capabilities</h3>
          <p>Browse all 12 available agent types and their capabilities</p>
          <Link to="/agents/capabilities" className="feature-link">
            View Capabilities →
          </Link>
        </div>

        <div className="feature-card">
          <div className="feature-icon">📊</div>
          <h3>Real-time Monitoring</h3>
          <p>Monitor agent performance, metrics, and health status</p>
          <Link to="/agents/monitoring" className="feature-link">
            View Monitoring →
          </Link>
        </div>

        <div className="feature-card">
          <div className="feature-icon">🤖</div>
          <h3>All Agent Types</h3>
          <p>Cluster Management, Security Scanning, Auto Scaling, Monitoring, Automation, and more</p>
          <Link to="/agents/capabilities" className="feature-link">
            Explore All →
          </Link>
        </div>
      </div>

      <div className="quick-stats">
        <h3>Quick Stats</h3>
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-value">12</div>
            <div className="stat-label">Active Agents</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">47</div>
            <div className="stat-label">Open Tickets</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">98%</div>
            <div className="stat-label">Resolution Rate</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">2.3m</div>
            <div className="stat-label">Avg Response Time</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIHub;
