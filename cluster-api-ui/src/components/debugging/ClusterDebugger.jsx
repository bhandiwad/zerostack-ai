import React, { useState, useEffect } from 'react';
import { 
  ExclamationTriangleIcon, 
  CheckCircleIcon, 
  ClockIcon,
  CpuChipIcon,
  ServerIcon,
  ChartBarIcon,
  WrenchScrewdriverIcon,
  PlayIcon,
  StopIcon
} from '@heroicons/react/24/outline';
import PredictiveInsightsPanel from './PredictiveInsightsPanel';
import AnomalyDetectionPanel from './AnomalyDetectionPanel';
import IntelligentAlertsPanel from './IntelligentAlertsPanel';

const ClusterDebugger = () => {
  const [analysisData, setAnalysisData] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [simulationType, setSimulationType] = useState('healthy');
  const [aiConfigured, setAiConfigured] = useState(false);
  const [predictiveData, setPredictiveData] = useState(null);
  const [anomalies, setAnomalies] = useState([]);
  const [intelligentAlerts, setIntelligentAlerts] = useState([]);
  const [activeTab, setActiveTab] = useState('analysis');

  const severityColors = {
    critical: 'text-red-600 bg-red-50 border-red-200',
    high: 'text-orange-600 bg-orange-50 border-orange-200',
    medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    low: 'text-blue-600 bg-blue-50 border-blue-200',
    info: 'text-gray-600 bg-gray-50 border-gray-200'
  };

  const categoryIcons = {
    resource_exhaustion: CpuChipIcon,
    networking: ServerIcon,
    performance: ChartBarIcon,
    configuration: WrenchScrewdriverIcon,
    scaling: ChartBarIcon,
    storage: ServerIcon,
    security: ExclamationTriangleIcon
  };

  const API_BASE = 'http://localhost:5002/api';

  const runAnalysis = async (type = 'healthy') => {
    setIsAnalyzing(true);
    try {
      const response = await fetch(`${API_BASE}/debugging/simulate-issues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type })
      });

      const data = await response.json();
      if (data.success) {
        setAnalysisData(data);
      } else {
        console.error('Analysis failed:', data.error);
      }
    } catch (error) {
      console.error('Analysis request failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getHealthColor = (score) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-yellow-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  const getHealthStatus = (status) => {
    const statusConfig = {
      excellent: { color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
      good: { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
      fair: { color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
      poor: { color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
      critical: { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' }
    };
    return statusConfig[status] || statusConfig.fair;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">AI-Powered Cluster Debugger</h1>
        <p className="text-gray-600">Intelligent analysis, predictive insights, and proactive issue detection for Kubernetes clusters</p>
        
        {/* Tab Navigation */}
        <div className="mt-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'analysis', label: 'Cluster Analysis', icon: '🔍' },
              { id: 'predictive', label: 'Predictive Insights', icon: '🔮' },
              { id: 'anomalies', label: 'Anomaly Detection', icon: '⚠️' },
              { id: 'alerts', label: 'Intelligent Alerts', icon: '🚨' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Control Panel */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Analysis Controls</h2>
        
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Simulation Type:</label>
            <select 
              value={simulationType} 
              onChange={(e) => setSimulationType(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm"
            >
              <option value="healthy">Healthy Cluster</option>
              <option value="cpu_high">High CPU Usage</option>
              <option value="memory_critical">Memory Critical</option>
              <option value="pod_failures">Pod Failures</option>
            </select>
          </div>
          
          <button
            onClick={() => runAnalysis(simulationType)}
            disabled={isAnalyzing}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? (
              <>
                <ClockIcon className="h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <PlayIcon className="h-4 w-4" />
                Run Analysis
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'analysis' && (
        <>
          {/* Analysis Results */}
          {analysisData && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Health Overview */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Cluster Health</h3>
                  
                  <div className="text-center mb-6">
                    <div className={`text-4xl font-bold ${getHealthColor(analysisData.overall_health.score)}`}>
                      {analysisData.overall_health.score}
                    </div>
                    <div className="text-sm text-gray-500">Health Score</div>
                    
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-2 ${getHealthStatus(analysisData.overall_health.status).color} ${getHealthStatus(analysisData.overall_health.status).bg} ${getHealthStatus(analysisData.overall_health.status).border} border`}>
                      {analysisData.overall_health.status.charAt(0).toUpperCase() + analysisData.overall_health.status.slice(1)}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Issues Found</span>
                      <span className="font-semibold">{analysisData.issues_detected}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">CPU Usage</span>
                      <span className="font-semibold">{analysisData.simulated_metrics.cpu_usage}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Memory Usage</span>
                      <span className="font-semibold">{analysisData.simulated_metrics.memory_usage}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Failed Pods</span>
                      <span className="font-semibold">{analysisData.simulated_metrics.failed_pods}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Issues List */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Detected Issues</h3>
                  
                  {analysisData.issues.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-3" />
                      <p className="text-gray-500">No issues detected. Your cluster is healthy!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {analysisData.issues.map((issue, index) => {
                        const IconComponent = categoryIcons[issue.category] || ExclamationTriangleIcon;
                        
                        return (
                          <div
                            key={index}
                            className={`border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow ${severityColors[issue.severity]}`}
                            onClick={() => setSelectedIssue(issue)}
                          >
                            <div className="flex items-start gap-3">
                              <IconComponent className="h-5 w-5 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-semibold">{issue.title}</h4>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs px-2 py-1 rounded-full bg-white bg-opacity-50">
                                      {issue.severity.toUpperCase()}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {(issue.confidence * 100).toFixed(0)}% confidence
                                    </span>
                                  </div>
                                </div>
                                <p className="text-sm mb-3">{issue.description}</p>
                                
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 text-xs text-gray-600">
                                    <span>Category: {issue.category.replace('_', ' ')}</span>
                                    {issue.auto_fixable && (
                                      <span className="text-green-600">• Auto-fixable</span>
                                    )}
                                  </div>
                                  <button className="text-xs text-blue-600 hover:text-blue-800">
                                    View Details →
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Issue Detail Modal */}
      {selectedIssue && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">{selectedIssue.title}</h3>
                <button
                  onClick={() => setSelectedIssue(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                  <p className="text-gray-600">{selectedIssue.description}</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Recommendations</h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    {selectedIssue.recommendations.map((rec, index) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-900">Severity:</span>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs ${severityColors[selectedIssue.severity]}`}>
                      {selectedIssue.severity.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Auto-fixable:</span>
                    <span className="ml-2">{selectedIssue.auto_fixable ? 'Yes' : 'No'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Category:</span>
                    <span className="ml-2">{selectedIssue.category.replace('_', ' ')}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Confidence:</span>
                    <span className="ml-2">{(selectedIssue.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
                
                {selectedIssue.auto_fixable && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-medium text-green-900 mb-2">Auto-Fix Available</h4>
                    <p className="text-green-700 text-sm mb-3">
                      This issue can be automatically resolved. Click below to apply the recommended fix.
                    </p>
                    <button className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 text-sm">
                      Apply Auto-Fix
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Predictive Insights Tab */}
      {activeTab === 'predictive' && (
        <PredictiveInsightsPanel 
          predictiveData={predictiveData} 
          setPredictiveData={setPredictiveData}
          API_BASE={API_BASE}
        />
      )}

      {/* Anomaly Detection Tab */}
      {activeTab === 'anomalies' && (
        <AnomalyDetectionPanel 
          anomalies={anomalies} 
          setAnomalies={setAnomalies}
          API_BASE={API_BASE}
        />
      )}

      {/* Intelligent Alerts Tab */}
      {activeTab === 'alerts' && (
        <IntelligentAlertsPanel 
          alerts={intelligentAlerts} 
          setAlerts={setIntelligentAlerts}
          API_BASE={API_BASE}
        />
      )}

      {/* Getting Started */}
      {activeTab === 'analysis' && !analysisData && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Getting Started</h3>
          <p className="text-blue-700 mb-4">
            Run your first cluster analysis to detect issues and get AI-powered recommendations.
          </p>
          <ul className="list-disc list-inside text-blue-700 text-sm space-y-1">
            <li>Select a simulation type to test different scenarios</li>
            <li>Click "Run Analysis" to start the AI-powered health check</li>
            <li>Review detected issues and follow recommendations</li>
            <li>Use auto-fix features for supported issues</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default ClusterDebugger;
