import React from 'react';
import { render, screen, fireEvent, waitFor } from '../../../tests/utils/test-utils';
import ClusterManagement from '../ClusterManagement';
import { mockFetch, mockApiResponses } from '../../../tests/utils/test-utils';

global.fetch = jest.fn(mockFetch);

describe('ClusterManagement Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders cluster management header', () => {
    render(<ClusterManagement />);
    
    expect(screen.getByText('Cluster Management')).toBeInTheDocument();
    expect(screen.getByText('Manage your Kubernetes clusters with AI-powered intelligence')).toBeInTheDocument();
  });

  it('displays cluster statistics cards', async () => {
    render(<ClusterManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('Total Clusters')).toBeInTheDocument();
      expect(screen.getByText('Running')).toBeInTheDocument();
      expect(screen.getByText('Nodes')).toBeInTheDocument();
      expect(screen.getByText('Providers')).toBeInTheDocument();
    });
  });

  it('renders cluster table with data', async () => {
    render(<ClusterManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('test-cluster-1')).toBeInTheDocument();
      expect(screen.getByText('test-cluster-2')).toBeInTheDocument();
      expect(screen.getByText('running')).toBeInTheDocument();
      expect(screen.getByText('creating')).toBeInTheDocument();
    });
  });

  it('opens create cluster dialog when create button is clicked', async () => {
    render(<ClusterManagement />);
    
    const createButton = screen.getByText('Create Cluster');
    fireEvent.click(createButton);
    
    await waitFor(() => {
      expect(screen.getByText('Create New Cluster')).toBeInTheDocument();
      expect(screen.getByLabelText('Cluster Name')).toBeInTheDocument();
    });
  });

  it('handles cluster scaling', async () => {
    render(<ClusterManagement />);
    
    await waitFor(() => {
      const scaleButton = screen.getAllByText('Scale')[0];
      fireEvent.click(scaleButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Scale Cluster')).toBeInTheDocument();
      expect(screen.getByLabelText('Target Node Count')).toBeInTheDocument();
    });
  });

  it('handles maintenance mode toggle', async () => {
    render(<ClusterManagement />);
    
    await waitFor(() => {
      const maintenanceButton = screen.getAllByText('Maintenance')[0];
      fireEvent.click(maintenanceButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Maintenance Mode')).toBeInTheDocument();
      expect(screen.getByLabelText('Reason')).toBeInTheDocument();
    });
  });

  it('handles cluster deletion with confirmation', async () => {
    render(<ClusterManagement />);
    
    await waitFor(() => {
      const deleteButton = screen.getAllByText('Delete')[0];
      fireEvent.click(deleteButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Delete Cluster')).toBeInTheDocument();
      expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();
    });
  });

  it('filters clusters by status', async () => {
    render(<ClusterManagement />);
    
    await waitFor(() => {
      const statusFilter = screen.getByLabelText('Filter by status');
      fireEvent.change(statusFilter, { target: { value: 'running' } });
    });
    
    await waitFor(() => {
      expect(screen.getByText('test-cluster-1')).toBeInTheDocument();
      expect(screen.queryByText('test-cluster-2')).not.toBeInTheDocument();
    });
  });

  it('searches clusters by name', async () => {
    render(<ClusterManagement />);
    
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search clusters...');
      fireEvent.change(searchInput, { target: { value: 'test-cluster-1' } });
    });
    
    await waitFor(() => {
      expect(screen.getByText('test-cluster-1')).toBeInTheDocument();
      expect(screen.queryByText('test-cluster-2')).not.toBeInTheDocument();
    });
  });

  it('handles refresh action', async () => {
    render(<ClusterManagement />);
    
    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/clusters'),
        expect.any(Object)
      );
    });
  });

  it('displays loading state', () => {
    render(<ClusterManagement />);
    
    expect(screen.queryByTestId('cluster-management-loading')).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('API Error'));
    
    render(<ClusterManagement />);
    
    await waitFor(() => {
      expect(screen.getByText(/error loading clusters/i)).toBeInTheDocument();
    });
  });
});
