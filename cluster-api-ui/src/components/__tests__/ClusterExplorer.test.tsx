import React from 'react';
import { render, screen, fireEvent, waitFor } from '../../tests/utils/test-utils';
import ClusterExplorer from '../ClusterExplorer';
import { mockFetch } from '../../tests/utils/test-utils';

global.fetch = jest.fn(mockFetch);

describe('ClusterExplorer Component', () => {
  const mockProps = {
    cluster: { id: '1', name: 'test-cluster' },
    apiCall: jest.fn(),
    showNotification: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders cluster explorer header', () => {
    render(<ClusterExplorer {...mockProps} />);
    
    expect(screen.getByText('Cluster Explorer')).toBeInTheDocument();
    expect(screen.getByText('Explore and manage Kubernetes resources with AI-powered insights')).toBeInTheDocument();
  });

  it('displays resource statistics dashboard', async () => {
    render(<ClusterExplorer {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Namespaces')).toBeInTheDocument();
      expect(screen.getByText('Resource Type')).toBeInTheDocument();
      expect(screen.getByText('Total Items')).toBeInTheDocument();
      expect(screen.getByText('Selected Namespace')).toBeInTheDocument();
    });
  });

  it('handles namespace selection', async () => {
    render(<ClusterExplorer {...mockProps} />);
    
    await waitFor(() => {
      const namespaceSelector = screen.getByLabelText('Select namespace');
      fireEvent.change(namespaceSelector, { target: { value: 'kube-system' } });
    });
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('kube-system')).toBeInTheDocument();
    });
  });

  it('switches between resource types', async () => {
    render(<ClusterExplorer {...mockProps} />);
    
    await waitFor(() => {
      const podsTab = screen.getByText('Pods');
      const servicesTab = screen.getByText('Services');
      
      fireEvent.click(servicesTab);
      expect(servicesTab).toHaveClass('active');
      
      fireEvent.click(podsTab);
      expect(podsTab).toHaveClass('active');
    });
  });

  it('filters resources by search term', async () => {
    render(<ClusterExplorer {...mockProps} />);
    
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search resources...');
      fireEvent.change(searchInput, { target: { value: 'nginx' } });
      expect(searchInput).toHaveValue('nginx');
    });
  });

  it('refreshes resource data', async () => {
    render(<ClusterExplorer {...mockProps} />);
    
    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/resources'),
        expect.any(Object)
      );
    });
  });

  it('displays resource cards', async () => {
    render(<ClusterExplorer {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('resource-cards')).toBeInTheDocument();
    });
  });

  it('handles resource actions', async () => {
    render(<ClusterExplorer {...mockProps} />);
    
    await waitFor(() => {
      const actionButton = screen.getAllByText('Actions')[0];
      fireEvent.click(actionButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('View Details')).toBeInTheDocument();
      expect(screen.getByText('Edit YAML')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });
  });

  it('opens YAML editor', async () => {
    render(<ClusterExplorer {...mockProps} />);
    
    await waitFor(() => {
      const viewYamlButton = screen.getAllByText('View YAML')[0];
      fireEvent.click(viewYamlButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Resource YAML')).toBeInTheDocument();
      expect(screen.getByTestId('yaml-editor')).toBeInTheDocument();
    });
  });

  it('handles loading states', () => {
    render(<ClusterExplorer {...mockProps} />);
    
    expect(screen.getByTestId('cluster-explorer-loading')).toBeInTheDocument();
  });

  it('handles API errors', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('API Error'));
    
    render(<ClusterExplorer {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText(/error loading resources/i)).toBeInTheDocument();
    });
  });
});
