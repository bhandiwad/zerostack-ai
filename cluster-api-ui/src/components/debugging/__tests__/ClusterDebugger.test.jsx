/**
 * Test suite for ClusterDebugger component
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ClusterDebugger from '../ClusterDebugger';

// Mock the child components
jest.mock('../PredictiveInsightsPanel', () => {
  return function MockPredictiveInsightsPanel({ predictiveData, setPredictiveData, API_BASE }) {
    return (
      <div data-testid="predictive-insights-panel">
        Predictive Insights Panel - API: {API_BASE}
      </div>
    );
  };
});

jest.mock('../AnomalyDetectionPanel', () => {
  return function MockAnomalyDetectionPanel({ anomalies, setAnomalies, API_BASE }) {
    return (
      <div data-testid="anomaly-detection-panel">
        Anomaly Detection Panel - Anomalies: {anomalies.length}
      </div>
    );
  };
});

jest.mock('../IntelligentAlertsPanel', () => {
  return function MockIntelligentAlertsPanel({ alerts, setAlerts, API_BASE }) {
    return (
      <div data-testid="intelligent-alerts-panel">
        Intelligent Alerts Panel - Alerts: {alerts.length}
      </div>
    );
  };
});

// Mock fetch
global.fetch = jest.fn();

describe('ClusterDebugger', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  test('renders main title and description', () => {
    render(<ClusterDebugger />);
    
    expect(screen.getByText('AI-Powered Cluster Debugger')).toBeInTheDocument();
    expect(screen.getByText(/Intelligent analysis, predictive insights, and proactive issue detection/)).toBeInTheDocument();
  });

  test('renders tab navigation', () => {
    render(<ClusterDebugger />);
    
    expect(screen.getByText('🔍 Cluster Analysis')).toBeInTheDocument();
    expect(screen.getByText('🔮 Predictive Insights')).toBeInTheDocument();
    expect(screen.getByText('⚠️ Anomaly Detection')).toBeInTheDocument();
    expect(screen.getByText('🚨 Intelligent Alerts')).toBeInTheDocument();
  });

  test('switches tabs correctly', () => {
    render(<ClusterDebugger />);
    
    // Initially on analysis tab
    expect(screen.getByText('Analysis Controls')).toBeInTheDocument();
    
    // Switch to predictive insights
    fireEvent.click(screen.getByText('🔮 Predictive Insights'));
    expect(screen.getByTestId('predictive-insights-panel')).toBeInTheDocument();
    
    // Switch to anomaly detection
    fireEvent.click(screen.getByText('⚠️ Anomaly Detection'));
    expect(screen.getByTestId('anomaly-detection-panel')).toBeInTheDocument();
    
    // Switch to intelligent alerts
    fireEvent.click(screen.getByText('🚨 Intelligent Alerts'));
    expect(screen.getByTestId('intelligent-alerts-panel')).toBeInTheDocument();
  });

  test('renders analysis controls', () => {
    render(<ClusterDebugger />);
    
    expect(screen.getByText('Analysis Controls')).toBeInTheDocument();
    expect(screen.getByText('Simulation Type:')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Healthy Cluster')).toBeInTheDocument();
    expect(screen.getByText('Run Analysis')).toBeInTheDocument();
  });

  test('handles simulation type change', () => {
    render(<ClusterDebugger />);
    
    const select = screen.getByDisplayValue('Healthy Cluster');
    fireEvent.change(select, { target: { value: 'cpu_high' } });
    
    expect(select.value).toBe('cpu_high');
  });

  test('handles analysis execution', async () => {
    const mockResponse = {
      success: true,
      simulation_type: 'healthy',
      issues: [],
      overall_health: { score: 95, status: 'excellent' },
      simulated_metrics: {
        cpu_usage: 25.3,
        memory_usage: 35.7,
        failed_pods: 0
      },
      issues_detected: 0
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    render(<ClusterDebugger />);
    
    const runButton = screen.getByText('Run Analysis');
    fireEvent.click(runButton);

    // Should show analyzing state
    expect(screen.getByText('Analyzing...')).toBeInTheDocument();

    // Wait for analysis to complete
    await waitFor(() => {
      expect(screen.getByText('Cluster Health')).toBeInTheDocument();
    });

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:5002/api/debugging/simulate-issues',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'healthy' })
      })
    );
  });

  test('displays health score correctly', async () => {
    const mockResponse = {
      success: true,
      issues: [],
      overall_health: { score: 85, status: 'good' },
      simulated_metrics: {
        cpu_usage: 45.2,
        memory_usage: 60.1,
        failed_pods: 1
      },
      issues_detected: 0
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    render(<ClusterDebugger />);
    
    fireEvent.click(screen.getByText('Run Analysis'));

    await waitFor(() => {
      expect(screen.getByText('85')).toBeInTheDocument();
      expect(screen.getByText('Good')).toBeInTheDocument();
    });
  });

  test('displays issues when detected', async () => {
    const mockResponse = {
      success: true,
      issues: [
        {
          id: 'issue_1',
          title: 'High CPU Usage',
          description: 'CPU usage is above recommended threshold',
          severity: 'high',
          category: 'resource_exhaustion',
          confidence: 0.85,
          auto_fixable: true,
          recommendations: ['Scale out nodes', 'Optimize workloads']
        }
      ],
      overall_health: { score: 65, status: 'fair' },
      simulated_metrics: {
        cpu_usage: 85.5,
        memory_usage: 45.2,
        failed_pods: 0
      },
      issues_detected: 1
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    render(<ClusterDebugger />);
    
    fireEvent.click(screen.getByText('Run Analysis'));

    await waitFor(() => {
      expect(screen.getByText('High CPU Usage')).toBeInTheDocument();
      expect(screen.getByText('CPU usage is above recommended threshold')).toBeInTheDocument();
      expect(screen.getByText('HIGH')).toBeInTheDocument();
      expect(screen.getByText('85% confidence')).toBeInTheDocument();
      expect(screen.getByText('• Auto-fixable')).toBeInTheDocument();
    });
  });

  test('opens issue detail modal', async () => {
    const mockResponse = {
      success: true,
      issues: [
        {
          id: 'issue_1',
          title: 'Memory Pressure',
          description: 'Memory usage is critically high',
          severity: 'critical',
          category: 'resource_exhaustion',
          confidence: 0.92,
          auto_fixable: false,
          recommendations: ['Add more memory', 'Optimize applications']
        }
      ],
      overall_health: { score: 45, status: 'poor' },
      simulated_metrics: {
        cpu_usage: 65.3,
        memory_usage: 98.7,
        failed_pods: 3
      },
      issues_detected: 1
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    render(<ClusterDebugger />);
    
    fireEvent.click(screen.getByText('Run Analysis'));

    await waitFor(() => {
      expect(screen.getByText('Memory Pressure')).toBeInTheDocument();
    });

    // Click on the issue to open modal
    fireEvent.click(screen.getByText('Memory Pressure'));

    // Modal should be visible
    expect(screen.getAllByText('Memory Pressure')[0]).toBeInTheDocument();
    expect(screen.getByText('Memory usage is critically high')).toBeInTheDocument();
  });

  test('shows getting started message when no analysis data', () => {
    render(<ClusterDebugger />);
    
    expect(screen.getByText('Getting Started')).toBeInTheDocument();
    expect(screen.getByText(/Run your first cluster analysis/)).toBeInTheDocument();
  });

  test('handles API errors gracefully', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<ClusterDebugger />);
    
    fireEvent.click(screen.getByText('Run Analysis'));

    await waitFor(() => {
      expect(screen.getByText('Run Analysis')).toBeInTheDocument();
    });

    expect(consoleSpy).toHaveBeenCalledWith('Analysis request failed:', expect.any(Error));
    
    consoleSpy.mockRestore();
  });

  test('passes correct API_BASE to child components', () => {
    render(<ClusterDebugger />);
    
    // Switch to predictive insights
    fireEvent.click(screen.getByText('🔮 Predictive Insights'));
    expect(screen.getByText('Predictive Insights Panel - API: http://localhost:5002/api')).toBeInTheDocument();
  });

  test('maintains state across tab switches', async () => {
    render(<ClusterDebugger />);
    
    // Set some state by running analysis
    const mockResponse = {
      success: true,
      issues: [],
      overall_health: { score: 90, status: 'excellent' },
      simulated_metrics: { cpu_usage: 30, memory_usage: 40, failed_pods: 0 },
      issues_detected: 0
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    fireEvent.click(screen.getByText('Run Analysis'));

    await waitFor(() => {
      expect(screen.getByText('90')).toBeInTheDocument();
    });

    // Switch tabs and back
    fireEvent.click(screen.getByText('🔮 Predictive Insights'));
    fireEvent.click(screen.getByText('🔍 Cluster Analysis'));

    // State should be maintained
    expect(screen.getByText('90')).toBeInTheDocument();
  });
});
