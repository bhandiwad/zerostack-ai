import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Navigation.css';

const NavItem = ({ to, icon, label, isActive }) => {
  return (
    <Link
      to={to}
      className={`nav-item ${isActive ? 'active' : ''}`}
    >
      <div className="nav-item-content">
        <span className="nav-icon">{icon}</span>
        <div className="nav-text">
          <span className="nav-label">{label}</span>
        </div>
      </div>
      {isActive && <div className="active-indicator" />}
    </Link>
  );
};

const Navigation = ({ user, organization, onLogout }) => {
  const location = window.location.pathname;
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (path) => {
    if (path === '/') return location === '/';
    return location.startsWith(path);
  };

  const navigationItems = [
    { path: '/', icon: '🏠', label: 'Home', description: 'Dashboard overview' },
    { path: '/agents', icon: '🤖', label: 'AI Agents', description: 'Intelligent automation' },
    { path: '/ai-config', icon: '🤖', label: 'AI Config', description: 'AI endpoint management' },
    { path: '/clusters', icon: '⚙️', label: 'Clusters', description: 'Kubernetes management' },
    { path: '/explorer', icon: '🔍', label: 'Explorer', description: 'Resource browser' },
    { path: '/applications', icon: '📱', label: 'Apps', description: 'Application catalog' },
    { path: '/metrics', icon: '📊', label: 'Metrics', description: 'Performance insights' },
    { path: '/accounts', icon: '👥', label: 'Accounts', description: 'User management' }
  ];

  return (
    <nav className={`navigation ${collapsed ? 'collapsed' : ''}`}>
      <div className="nav-brand">
        <div className="brand-logo">
          <div className="logo-icon">🚀</div>
          {!collapsed && (
            <div className="brand-text">
              <h1>ZeroStack AI</h1>
              <p>Zero Ops. Full Stack.</p>
            </div>
          )}
        </div>
        <button 
          className="collapse-btn"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>

      <div className="nav-items">
        {navigationItems.map((item) => {
          const active = isActive(item.path) && !(item.path === '/clusters' && isActive('/clusters/create'));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${active ? 'active' : ''}`}
              title={collapsed ? `${item.label} - ${item.description}` : ''}
            >
              <div className="nav-item-content">
                <span className="nav-icon">{item.icon}</span>
                {!collapsed && (
                  <div className="nav-text">
                    <span className="nav-label">{item.label}</span>
                    <span className="nav-description">{item.description}</span>
                  </div>
                )}
              </div>
              {active && <div className="active-indicator" />}
            </Link>
          );
        })}
        <NavItem 
          to="/workflow-tester" 
          icon="🔄" 
          label="Workflow Tester"
          isActive={location.pathname === '/workflow-tester'}
        />
        <NavItem 
          to="/agent-dashboard" 
          icon="📊" 
          label="Agent Dashboard"
          isActive={location.pathname === '/agent-dashboard'}
        />
        <NavItem 
          to="/workflow-designer" 
          icon="🎨" 
          label="Workflow Designer"
          isActive={location.pathname === '/workflow-designer'}
        />
      </div>

    </nav>
  );
};

export default Navigation;
