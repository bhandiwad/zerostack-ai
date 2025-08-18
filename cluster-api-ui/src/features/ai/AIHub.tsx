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
        <h1>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={{marginRight: '8px'}}>
            <path d="M12,2A2,2 0 0,1 14,4A2,2 0 0,1 12,6A2,2 0 0,1 10,4A2,2 0 0,1 12,2M21,9V7L15,1H5A2,2 0 0,0 3,3V21A2,2 0 0,0 5,23H19A2,2 0 0,0 21,21V9M19,9H14V4H19V9Z"/>
          </svg>
          AI Agent Platform
        </h1>
        <p>Manage your AI-powered support system, agents, and training</p>
      </div>

      <nav className="ai-hub-nav">
        <Link 
          to="/agents" 
          className={`nav-item ${isActive('/agents') && !isActive('/agents/') ? 'active' : ''}`}
        >
          <span className="nav-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
            </svg>
          </span>
          <span>Overview</span>
        </Link>
        <Link 
          to="/agents/support" 
          className={`nav-item ${isActive('/agents/support') ? 'active' : ''}`}
        >
          <span className="nav-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20,8H18V6C18,5.45 17.55,5 17,5H16L15.5,4H9.5L9,5H8C7.45,5 7,5.45 7,6V8H5C4.45,8 4,8.45 4,9V19C4,19.55 4.45,20 5,20H20C20.55,20 21,19.55 21,19V9C21,8.45 20.55,8 20,8Z"/>
            </svg>
          </span>
          <span>Support System</span>
        </Link>
        <Link 
          to="/agents/management" 
          className={`nav-item ${isActive('/agents/management') ? 'active' : ''}`}
        >
          <span className="nav-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.22,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.22,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"/>
            </svg>
          </span>
          <span>Agent Control</span>
        </Link>
        <Link 
          to="/agents/training" 
          className={`nav-item ${isActive('/agents/training') ? 'active' : ''}`}
        >
          <span className="nav-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12,3L1,9L12,15L21,10.09V17H23V9M5,13.18V17.18L12,21L19,17.18V13.18L12,17L5,13.18Z"/>
            </svg>
          </span>
          <span>Training</span>
        </Link>
        <Link 
          to="/agents/capabilities" 
          className={`nav-item ${isActive('/agents/capabilities') ? 'active' : ''}`}
        >
          <span className="nav-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.7,19L13.6,9.9C14.5,7.6 14,4.9 12.1,3C10.1,1 7.1,0.6 4.7,1.7L9,6L6,9L1.6,4.7C0.4,7.1 0.9,10.1 2.9,12.1C4.8,14 7.5,14.5 9.8,13.6L18.9,22.7C19.3,23.1 19.9,23.1 20.3,22.7L22.6,20.4C23.1,20 23.1,19.3 22.7,19Z"/>
            </svg>
          </span>
          <span>Capabilities</span>
        </Link>
        <Link 
          to="/agents/monitoring" 
          className={`nav-item ${isActive('/agents/monitoring') ? 'active' : ''}`}
        >
          <span className="nav-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3,3V21H21V3H3M9,17H7V10H9V17M13,17H11V7H13V17M17,17H15V13H17V17Z"/>
            </svg>
          </span>
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
          <div className="feature-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20,8H18V6C18,5.45 17.55,5 17,5H16L15.5,4H9.5L9,5H8C7.45,5 7,5.45 7,6V8H5C4.45,8 4,8.45 4,9V19C4,19.55 4.45,20 5,20H20C20.55,20 21,19.55 21,19V9C21,8.45 20.55,8 20,8Z"/>
            </svg>
          </div>
          <h3>Support System</h3>
          <p>L1, L2, L3 support tiers with AI escalation and PagerDuty integration</p>
          <Link to="/agents/support" className="feature-link">
            View Support System →
          </Link>
        </div>

        <div className="feature-card">
          <div className="feature-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.22,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.22,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"/>
            </svg>
          </div>
          <h3>Agent Control</h3>
          <p>Start, stop, restart agents with real-time status monitoring</p>
          <Link to="/agents/management" className="feature-link">
            Control Agents →
          </Link>
        </div>

        <div className="feature-card">
          <div className="feature-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12,3L1,9L12,15L21,10.09V17H23V9M5,13.18V17.18L12,21L19,17.18V13.18L12,17L5,13.18Z"/>
            </svg>
          </div>
          <h3>Agent Training</h3>
          <p>Upload training data and create agent personalizations</p>
          <Link to="/agents/training" className="feature-link">
            Train Agents →
          </Link>
        </div>

        <div className="feature-card">
          <div className="feature-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.7,19L13.6,9.9C14.5,7.6 14,4.9 12.1,3C10.1,1 7.1,0.6 4.7,1.7L9,6L6,9L1.6,4.7C0.4,7.1 0.9,10.1 2.9,12.1C4.8,14 7.5,14.5 9.8,13.6L18.9,22.7C19.3,23.1 19.9,23.1 20.3,22.7L22.6,20.4C23.1,20 23.1,19.3 22.7,19Z"/>
            </svg>
          </div>
          <h3>Agent Capabilities</h3>
          <p>Browse all 12 available agent types and their capabilities</p>
          <Link to="/agents/capabilities" className="feature-link">
            View Capabilities →
          </Link>
        </div>

        <div className="feature-card">
          <div className="feature-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3,3V21H21V3H3M9,17H7V10H9V17M13,17H11V7H13V17M17,17H15V13H17V17Z"/>
            </svg>
          </div>
          <h3>Real-time Monitoring</h3>
          <p>Monitor agent performance, metrics, and health status</p>
          <Link to="/agents/monitoring" className="feature-link">
            View Monitoring →
          </Link>
        </div>

        <div className="feature-card">
          <div className="feature-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12,2A2,2 0 0,1 14,4A2,2 0 0,1 12,6A2,2 0 0,1 10,4A2,2 0 0,1 12,2M21,9V7L15,1H5A2,2 0 0,0 3,3V21A2,2 0 0,0 5,23H19A2,2 0 0,0 21,21V9M19,9H14V4H19V9Z"/>
            </svg>
          </div>
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
