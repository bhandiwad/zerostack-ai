
import React, { useState } from 'react';
import './Header.css';

const Header = ({ user, organization, onLogout }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);

  const toggleUserMenu = () => {
    setShowUserMenu(!showUserMenu);
  };

  const handleLogout = () => {
    setShowUserMenu(false);
    onLogout();
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <h1>◉ ZeroStack AI</h1>
        <span className="tagline">Zero Ops. Full Stack.</span>
      </div>
      <div className="header-right">
        <div className="organization-info">
          <span className="org-name">{organization?.name || 'Organization'}</span>
        </div>
        <div className="user-menu-container">
          <button 
            className="user-avatar-btn" 
            onClick={toggleUserMenu}
            aria-label="User menu"
          >
            <div className="user-avatar">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <span className="user-name">{user?.name || 'User'}</span>
            <svg className="chevron-icon" width="16" height="16" viewBox="0 0 16 16">
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" fill="none"/>
            </svg>
          </button>
          
          {showUserMenu && (
            <div className="user-dropdown">
              <div className="dropdown-header">
                <div className="user-info">
                  <div className="user-name-full">{user?.name || 'User'}</div>
                  <div className="user-email">{user?.email || 'user@example.com'}</div>
                </div>
              </div>
              <div className="dropdown-divider"></div>
              <div className="dropdown-items">
                <button className="dropdown-item">
                  <span className="item-icon">👤</span>
                  Profile
                </button>
                <button className="dropdown-item">
                  <span className="item-icon">⚙️</span>
                  Settings
                </button>
                <button className="dropdown-item">
                  <span className="item-icon">❓</span>
                  Help
                </button>
              </div>
              <div className="dropdown-divider"></div>
              <button className="dropdown-item logout-item" onClick={handleLogout}>
                <span className="item-icon">🚪</span>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;

