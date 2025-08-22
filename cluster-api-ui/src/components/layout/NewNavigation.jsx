import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';

const navItems = [
  { path: '/', icon: '🏠', label: 'Dashboard' },
  { path: '/clusters', icon: '🔧', label: 'Clusters' },
  { path: '/workflows', icon: '🔄', label: 'Workflows' },
  { path: '/debugging', icon: '🐛', label: 'Debugging' },
  { path: '/maintenance', icon: '⚙️', label: 'Maintenance' },
  { path: '/metrics', icon: '📊', label: 'Metrics' }
];

const NavItem = ({ to, icon, label, isActive, collapsed }) => (
  <Link
    to={to}
    className={cn(
      'flex items-center gap-3 p-3 rounded-lg transition-colors',
      'text-sm font-medium',
      'hover:bg-gray-50',
      isActive ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:text-gray-900'
    )}
  >
    <span className="text-xl">{icon}</span>
    {!collapsed && <span>{label}</span>}
  </Link>
);

export const Navigation = () => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (path) => 
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <div className={`h-screen bg-white border-r border-gray-200 flex flex-col ${collapsed ? 'w-16' : 'w-64'}`}>
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        {!collapsed && <h2 className="text-lg font-semibold">ZeroStack</h2>}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 hover:bg-gray-100 rounded"
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => (
          <NavItem
            key={item.path}
            to={item.path}
            icon={item.icon}
            label={item.label}
            isActive={isActive(item.path)}
            collapsed={collapsed}
          />
        ))}
      </nav>
    </div>
  );
};

export default Navigation;
