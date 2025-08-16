import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock context providers for testing
const MockAuthProvider = ({ children }: { children: React.ReactNode }) => {
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

  return (
    <div data-testid="auth-provider">
      {React.cloneElement(children as React.ReactElement, {
        user: mockUser,
        organization: mockOrganization
      })}
    </div>
  );
};

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <MockAuthProvider>
          {children}
        </MockAuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };

// Mock API responses
export const mockApiResponses = {
  clusters: [
    {
      id: '1',
      name: 'test-cluster-1',
      status: 'running',
      provider: 'aws',
      region: 'us-east-1',
      kubernetes_version: '1.28.0',
      node_count: 3,
      created_at: '2024-01-01T00:00:00Z'
    },
    {
      id: '2',
      name: 'test-cluster-2',
      status: 'creating',
      provider: 'gcp',
      region: 'us-central1',
      kubernetes_version: '1.27.0',
      node_count: 5,
      created_at: '2024-01-02T00:00:00Z'
    }
  ],
  agents: [
    {
      id: '1',
      name: 'Support Agent L1',
      type: 'support_l1',
      status: 'active',
      capabilities: ['faq', 'basic_troubleshooting'],
      last_active: '2024-01-01T12:00:00Z'
    },
    {
      id: '2',
      name: 'Auto Scaling Agent',
      type: 'auto_scaling',
      status: 'active',
      capabilities: ['predictive_scaling', 'cost_optimization'],
      last_active: '2024-01-01T11:30:00Z'
    }
  ],
  cloudAccounts: [
    {
      id: '1',
      name: 'AWS Production',
      provider: 'aws',
      status: 'connected',
      region: 'us-east-1',
      created_at: '2024-01-01T00:00:00Z'
    },
    {
      id: '2',
      name: 'GCP Development',
      provider: 'gcp',
      status: 'connected',
      region: 'us-central1',
      created_at: '2024-01-01T00:00:00Z'
    }
  ]
};

// Mock fetch implementation
export const mockFetch = (url: string, options?: RequestInit) => {
  const method = options?.method || 'GET';
  
  // Mock different API endpoints
  if (url.includes('/api/clusters')) {
    if (method === 'GET') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockApiResponses.clusters)
      });
    }
    if (method === 'POST') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ id: '3', status: 'creating' })
      });
    }
  }
  
  if (url.includes('/api/agents')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockApiResponses.agents)
    });
  }
  
  if (url.includes('/api/cloud-accounts')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockApiResponses.cloudAccounts)
    });
  }
  
  // Default mock response
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({})
  });
};

// Test utilities
export const waitForLoadingToFinish = () => 
  new Promise(resolve => setTimeout(resolve, 0));

export const mockLocalStorage = () => {
  const store: { [key: string]: string } = {};
  
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    })
  };
};
