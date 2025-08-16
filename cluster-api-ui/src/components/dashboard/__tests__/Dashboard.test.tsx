import React from 'react';
import { render, screen, waitFor } from '../../../tests/utils/test-utils';
import Dashboard from '../Dashboard';
import { mockFetch } from '../../../tests/utils/test-utils';

// Mock fetch globally for this test file
global.fetch = jest.fn(mockFetch);

describe('Dashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders dashboard header with ZeroStack AI branding', async () => {
    render(<Dashboard organization={{ name: 'Test Org', subscription_tier: 'enterprise' }} />);
    
    expect(screen.getByText('🚀 ZeroStack AI – Zero Ops. Full Stack.')).toBeInTheDocument();
    expect(screen.getByText('Intelligent Kubernetes management with AI-powered automation')).toBeInTheDocument();
  });

  it('displays organization information', async () => {
    const mockOrg = { name: 'Test Organization', subscription_tier: 'enterprise' };
    render(<Dashboard organization={mockOrg} />);
    
    expect(screen.getByText('Test Organization')).toBeInTheDocument();
    expect(screen.getByText('enterprise')).toBeInTheDocument();
  });

  it('renders cluster statistics cards', async () => {
    render(<Dashboard organization={{ name: 'Test Org', subscription_tier: 'enterprise' }} />);
    
    await waitFor(() => {
      expect(screen.getByText('Total Clusters')).toBeInTheDocument();
      expect(screen.getByText('Active Nodes')).toBeInTheDocument();
      expect(screen.getByText('Monthly Cost')).toBeInTheDocument();
    });
  });

  it('displays AI Agent Hub section', async () => {
    render(<Dashboard organization={{ name: 'Test Org', subscription_tier: 'enterprise' }} />);
    
    expect(screen.getByText('🤖 ZeroStack AI Agent Hub')).toBeInTheDocument();
    expect(screen.getByText('Intelligent automation at your fingertips')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    render(<Dashboard organization={{ name: 'Test Org', subscription_tier: 'enterprise' }} />);
    
    // Should show loading indicators
    expect(screen.getByTestId('dashboard-loading')).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    // Mock fetch to return error
    global.fetch = jest.fn().mockRejectedValue(new Error('API Error'));
    
    render(<Dashboard organization={{ name: 'Test Org', subscription_tier: 'enterprise' }} />);
    
    await waitFor(() => {
      expect(screen.getByText(/error loading dashboard data/i)).toBeInTheDocument();
    });
  });

  it('renders recent clusters section', async () => {
    render(<Dashboard organization={{ name: 'Test Org', subscription_tier: 'enterprise' }} />);
    
    await waitFor(() => {
      expect(screen.getByText('Recent Clusters')).toBeInTheDocument();
    });
  });

  it('displays AI agent activity', async () => {
    render(<Dashboard organization={{ name: 'Test Org', subscription_tier: 'enterprise' }} />);
    
    await waitFor(() => {
      expect(screen.getByText('AI Agent Activity')).toBeInTheDocument();
    });
  });
});
