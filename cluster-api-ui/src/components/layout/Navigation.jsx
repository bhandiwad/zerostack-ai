import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Navigation.css';

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
    { path: '/workflow-tester', icon: '⚡', label: 'Workflow Tester', description: '' },
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
      </div>

      <div className="nav-footer">
        <div className="user-section">
          <div className="user-avatar">
            <span>{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
          </div>
          {!collapsed && (
            <div className="user-info">
              <div className="user-name">{user?.name || 'User'}</div>
              <div className="org-name">{organization?.name || 'Organization'}</div>
            </div>
          )}
        </div>
        {!collapsed && (
          <button onClick={onLogout} className="logout-btn">
            <span className="logout-icon">🚪</span>
            Logout
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
