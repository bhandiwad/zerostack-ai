import React from 'react';
import { render, screen, fireEvent } from '../../../tests/utils/test-utils';
import Navigation from '../Navigation';

describe('Navigation Component', () => {
  const mockUser = {
    id: '1',
    name: 'Test User',
    email: 'test@zerostack.ai',
    role: 'admin'
  };

  const mockOrganization = {
    id: '1',
    name: 'Test Organization',
    subscription_tier: 'enterprise'
  };

  const mockOnLogout = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders ZeroStack AI branding', () => {
    render(
      <Navigation 
        user={mockUser} 
        organization={mockOrganization} 
        onLogout={mockOnLogout} 
      />
    );
    
    expect(screen.getByText('ZeroStack AI – Zero Ops. Full Stack.')).toBeInTheDocument();
  });

  it('displays all navigation items', () => {
    render(
      <Navigation 
        user={mockUser} 
        organization={mockOrganization} 
        onLogout={mockOnLogout} 
      />
    );
    
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('AI Agents')).toBeInTheDocument();
    expect(screen.getByText('Cluster Management')).toBeInTheDocument();
    expect(screen.getByText('Cluster Explorer')).toBeInTheDocument();
    expect(screen.getByText('Cloud Accounts')).toBeInTheDocument();
  });

  it('does not display Create Cluster in navigation', () => {
    render(
      <Navigation 
        user={mockUser} 
        organization={mockOrganization} 
        onLogout={mockOnLogout} 
      />
    );
    
    expect(screen.queryByText('Create Cluster')).not.toBeInTheDocument();
  });

  it('handles navigation collapse toggle', () => {
    render(
      <Navigation 
        user={mockUser} 
        organization={mockOrganization} 
        onLogout={mockOnLogout} 
      />
    );
    
    const collapseButton = screen.getByTestId('nav-collapse-toggle');
    fireEvent.click(collapseButton);
    
    expect(screen.getByTestId('navigation')).toHaveClass('collapsed');
  });

  it('displays user information', () => {
    render(
      <Navigation 
        user={mockUser} 
        organization={mockOrganization} 
        onLogout={mockOnLogout} 
      />
    );
    
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('Test Organization')).toBeInTheDocument();
  });

  it('handles logout action', () => {
    render(
      <Navigation 
        user={mockUser} 
        organization={mockOrganization} 
        onLogout={mockOnLogout} 
      />
    );
    
    const logoutButton = screen.getByText('Logout');
    fireEvent.click(logoutButton);
    
    expect(mockOnLogout).toHaveBeenCalledTimes(1);
  });

  it('highlights active navigation item', () => {
    // Mock window.location.pathname
    Object.defineProperty(window, 'location', {
      value: { pathname: '/agents' },
      writable: true
    });

    render(
      <Navigation 
        user={mockUser} 
        organization={mockOrganization} 
        onLogout={mockOnLogout} 
      />
    );
    
    const agentsNavItem = screen.getByText('AI Agents').closest('a');
    expect(agentsNavItem).toHaveClass('active');
  });

  it('shows navigation descriptions when not collapsed', () => {
    render(
      <Navigation 
        user={mockUser} 
        organization={mockOrganization} 
        onLogout={mockOnLogout} 
      />
    );
    
    expect(screen.getByText('Dashboard overview')).toBeInTheDocument();
    expect(screen.getByText('Intelligent automation')).toBeInTheDocument();
    expect(screen.getByText('Manage clusters')).toBeInTheDocument();
  });

  it('hides navigation descriptions when collapsed', () => {
    render(
      <Navigation 
        user={mockUser} 
        organization={mockOrganization} 
        onLogout={mockOnLogout} 
      />
    );
    
    const collapseButton = screen.getByTestId('nav-collapse-toggle');
    fireEvent.click(collapseButton);
    
    expect(screen.queryByText('Dashboard overview')).not.toBeInTheDocument();
    expect(screen.queryByText('Intelligent automation')).not.toBeInTheDocument();
  });
});
