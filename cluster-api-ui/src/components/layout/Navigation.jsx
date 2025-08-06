import React from 'react';
import { Link } from 'react-router-dom';

const Navigation = ({ user, organization, onLogout }) => {
  const location = window.location.pathname;

  const isActive = (path) => {
    if (path === '/') return location === '/';
    return location.startsWith(path);
  };

  return (
    <nav className="navigation flex flex-col space-y-2">
      <div className="nav-header">
        <div className="org-info">
          <span className="org-icon">🏢</span>
          <span>{organization.name}</span>
        </div>
        <div className="user-info">
          <span className="user-icon">👤</span>
          <span>{user.name}</span>
          <button onClick={onLogout} className="logout-btn">Logout</button>
        </div>
      </div>
      <Link
        to="/"
        className={isActive('/') ? 'active' : ''}
      >
        📊 Dashboard
      </Link>
      <Link
        to="/clusters/create"
        className={isActive('/clusters/create') ? 'active' : ''}
      >
        ➕ Create Cluster
      </Link>
      <Link
        to="/clusters"
        className={isActive('/clusters') && !isActive('/clusters/create') ? 'active' : ''}
      >
        ⚙️ Manage Clusters
      </Link>
      <Link
        to="/explorer"
        className={isActive('/explorer') ? 'active' : ''}
      >
        🔍 Cluster Explorer
      </Link>
      <Link
        to="/applications"
        className={isActive('/applications') ? 'active' : ''}
      >
        📦 Helm Applications
      </Link>
      <Link
        to="/monitoring"
        className={isActive('/monitoring') ? 'active' : ''}
      >
        📈 Monitoring
      </Link>
      <Link
        to="/accounts"
        className={isActive('/accounts') ? 'active' : ''}
      >
        ☁️ Cloud Accounts
      </Link>
      <Link
        to="/agents"
        className={isActive('/agents') ? 'active' : ''}
      >
        🤖 AI Agents
      </Link>
    </nav>
  );
};

export default Navigation;
