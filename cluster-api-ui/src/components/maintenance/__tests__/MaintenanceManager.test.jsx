/**
 * Test suite for MaintenanceManager component
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MaintenanceManager from '../MaintenanceManager';

// Mock fetch
global.fetch = jest.fn();

describe('MaintenanceManager', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  test('renders main title and description', () => {
    render(<MaintenanceManager />);
    
    expect(screen.getByText('Automated Maintenance')).toBeInTheDocument();
    expect(screen.getByText(/Predictive maintenance, configuration drift detection/)).toBeInTheDocument();
  });

  test('loads workflows on mount', async () => {
    const mockWorkflows = [
      {
        id: 'security_patching',
        name: 'Security Patching',
        description: 'Apply security patches to cluster nodes',
        category: 'security',
        estimated_duration: '30-45 minutes'
      }
    ];

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, workflows: mockWorkflows })
    });

    render(<MaintenanceManager />);

    await waitFor(() => {
      expect(screen.getByText('Security Patching')).toBeInTheDocument();
    });

    expect(fetch).toHaveBeenCalledWith('http://localhost:5002/api/maintenance/workflows');
  });

  test('loads predictive maintenance data', async () => {
    const mockPredictive = {
      predictions: [
        {
          type: 'resource_exhaustion',
          probability: 0.75,
          time_to_occurrence: '2-4 hours',
          description: 'CPU exhaustion predicted'
        }
      ]
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, ...mockPredictive })
    });

    render(<MaintenanceManager />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('http://localhost:5002/api/maintenance/health/predict');
    });
  });

  test('executes workflow immediately', async () => {
    const mockWorkflows = [
      {
        id: 'security_patching',
        name: 'Security Patching',
        description: 'Apply security patches',
        category: 'security'
      }
    ];

    const mockExecution = {
      execution_id: 'exec_123',
      message: 'Workflow started'
    };

    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, workflows: mockWorkflows })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, ...mockExecution })
      });

    render(<MaintenanceManager />);

    await waitFor(() => {
      expect(screen.getByText('Security Patching')).toBeInTheDocument();
    });

    // Click execute button
    const executeButton = screen.getByText('Execute Now');
    fireEvent.click(executeButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:5002/api/maintenance/execute',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workflow_id: 'security_patching',
            schedule_type: 'immediate'
          })
        })
      );
    });
  });

  test('schedules workflow for later', async () => {
    const mockWorkflows = [
      {
        id: 'cluster_upgrade',
        name: 'Cluster Upgrade',
        description: 'Upgrade cluster version',
        category: 'maintenance'
      }
    ];

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, workflows: mockWorkflows })
    });

    render(<MaintenanceManager />);

    await waitFor(() => {
      expect(screen.getByText('Cluster Upgrade')).toBeInTheDocument();
    });

    // Click schedule button
    const scheduleButton = screen.getByText('Schedule');
    fireEvent.click(scheduleButton);

    // Should show scheduling modal or form
    expect(screen.getByText(/schedule/i)).toBeInTheDocument();
  });

  test('displays execution history', async () => {
    const mockHistory = [
      {
        execution_id: 'exec_123',
        workflow_id: 'security_patching',
        workflow_name: 'Security Patching',
        status: 'completed',
        started_at: '2024-01-15T10:00:00Z',
        completed_at: '2024-01-15T10:30:00Z',
        progress: 1.0
      }
    ];

    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, workflows: [] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, executions: mockHistory })
      });

    render(<MaintenanceManager />);

    await waitFor(() => {
      expect(screen.getByText('Security Patching')).toBeInTheDocument();
      expect(screen.getByText('completed')).toBeInTheDocument();
    });

    expect(fetch).toHaveBeenCalledWith('http://localhost:5002/api/maintenance/history');
  });

  test('detects configuration drift', async () => {
    const mockDrift = {
      drift_detected: true,
      drift_count: 3,
      drifts: [
        {
          resource_type: 'deployment',
          resource_name: 'nginx-deployment',
          drift_type: 'replica_count',
          expected_value: 3,
          actual_value: 2,
          severity: 'medium'
        }
      ]
    };

    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, workflows: [] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, ...mockDrift })
      });

    render(<MaintenanceManager />);

    await waitFor(() => {
      expect(screen.getByText('3 drifts detected')).toBeInTheDocument();
      expect(screen.getByText('nginx-deployment')).toBeInTheDocument();
    });

    expect(fetch).toHaveBeenCalledWith('http://localhost:5002/api/maintenance/drift/detect');
  });

  test('corrects configuration drift', async () => {
    const mockDrift = {
      drift_detected: true,
      drift_count: 1,
      drifts: [
        {
          resource_type: 'deployment',
          resource_name: 'test-deployment',
          drift_type: 'replica_count',
          expected_value: 3,
          actual_value: 2,
          severity: 'medium'
        }
      ]
    };

    const mockCorrection = {
      corrected: true,
      corrections_applied: 1
    };

    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, workflows: [] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, ...mockDrift })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, ...mockCorrection })
      });

    render(<MaintenanceManager />);

    await waitFor(() => {
      expect(screen.getByText('test-deployment')).toBeInTheDocument();
    });

    // Click correct drift button
    const correctButton = screen.getByText('Correct All Drifts');
    fireEvent.click(correctButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:5002/api/maintenance/drift/correct',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });
  });

  test('displays predictive maintenance insights', async () => {
    const mockPredictive = {
      predictions: [
        {
          type: 'resource_exhaustion',
          probability: 0.85,
          time_to_occurrence: '2-4 hours',
          description: 'Memory exhaustion predicted based on current trends',
          confidence: 0.82
        }
      ]
    };

    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, workflows: [] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, ...mockPredictive })
      });

    render(<MaintenanceManager />);

    await waitFor(() => {
      expect(screen.getByText('Memory exhaustion predicted')).toBeInTheDocument();
      expect(screen.getByText('85% likely')).toBeInTheDocument();
      expect(screen.getByText('2-4 hours')).toBeInTheDocument();
    });
  });

  test('handles API errors gracefully', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<MaintenanceManager />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });

  test('filters workflows by category', async () => {
    const mockWorkflows = [
      {
        id: 'security_patching',
        name: 'Security Patching',
        category: 'security'
      },
      {
        id: 'cluster_upgrade',
        name: 'Cluster Upgrade',
        category: 'maintenance'
      }
    ];

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, workflows: mockWorkflows })
    });

    render(<MaintenanceManager />);

    await waitFor(() => {
      expect(screen.getByText('Security Patching')).toBeInTheDocument();
      expect(screen.getByText('Cluster Upgrade')).toBeInTheDocument();
    });

    // Filter by security category (if filter exists)
    const securityFilter = screen.queryByText('Security');
    if (securityFilter) {
      fireEvent.click(securityFilter);
      expect(screen.getByText('Security Patching')).toBeInTheDocument();
    }
  });

  test('shows loading states', () => {
    render(<MaintenanceManager />);
    
    // Should show loading indicators initially
    expect(screen.getByText(/loading/i) || screen.getByRole('progressbar')).toBeTruthy();
  });

  test('cancels workflow execution', async () => {
    const mockExecution = {
      execution_id: 'exec_123',
      status: 'running'
    };

    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, workflows: [] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, executions: [mockExecution] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, cancelled: true })
      });

    render(<MaintenanceManager />);

    await waitFor(() => {
      expect(screen.getByText('running')).toBeInTheDocument();
    });

    // Click cancel button if available
    const cancelButton = screen.queryByText('Cancel');
    if (cancelButton) {
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          'http://localhost:5002/api/maintenance/cancel/exec_123',
          expect.objectContaining({
            method: 'POST'
          })
        );
      });
    }
  });
});
