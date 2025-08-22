import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';

export const NavItem = ({ 
  to, 
  icon: Icon, 
  label, 
  isActive, 
  collapsed,
  badge,
  className,
  ...props 
}) => {
  return (
    <Link
      to={to}
      className={cn(
        'group flex items-center px-3 py-2.5 rounded-lg transition-colors text-sm font-medium',
        'hover:bg-gray-50',
        isActive 
          ? 'bg-indigo-50 text-indigo-700' 
          : 'text-gray-700 hover:text-gray-900',
        collapsed ? 'justify-center' : 'justify-between',
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          'p-1.5 rounded-lg',
          isActive 
            ? 'bg-indigo-100 text-indigo-600' 
            : 'text-gray-500 group-hover:text-gray-700'
        )}>
          {Icon && <Icon className="w-5 h-5" />}
        </div>
        {!collapsed && (
          <span className="truncate">{label}</span>
        )}
      </div>
      
      {!collapsed && badge && (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
          {badge}
        </span>
      )}
      
      {!collapsed && isActive && (
        <div className="absolute right-0 w-1 h-6 bg-indigo-600 rounded-l-full" />
      )}
    </Link>
  );
};

export default NavItem;
