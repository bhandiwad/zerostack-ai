import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import PredictiveInsightsPanel from './PredictiveInsightsPanel';
import AnomalyDetectionPanel from './AnomalyDetectionPanel';
import IntelligentAlertsPanel from './IntelligentAlertsPanel';

// Icon components
const CpuChipIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
  </svg>
);

const ServerIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
  </svg>
);

const ChartBarIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const WrenchScrewdriverIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const ExclamationTriangleIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);

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

  const tabs = [
    { id: 'analysis', label: 'Analysis', icon: '🔍' },
    { id: 'predictive', label: 'Predictive', icon: '📊' },
    { id: 'anomalies', label: 'Anomalies', icon: '⚠️' },
    { id: 'alerts', label: 'Alerts', icon: '🔔' }
  ];

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
    <div className="space-y-6">
      {/* Header Section with Stripe-inspired design */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">🔍 AI-Powered Cluster Debugger</h1>
            <p className="text-gray-600">Intelligent analysis, predictive insights, and proactive issue detection</p>
          </div>
          <div className="text-right">
            <div className="bg-red-50 text-red-700 px-3 py-1 rounded-full text-sm font-medium">
              AI-Diagnostics
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Smart Detection
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center justify-between">
        <div></div>
        
        {/* Tab Navigation */}
        <nav className="flex bg-gray-100 rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Analysis Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">Simulation Type:</label>
              <select 
                value={simulationType} 
                onChange={(e) => setSimulationType(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="healthy">Healthy Cluster</option>
                <option value="cpu_high">High CPU Usage</option>
                <option value="memory_critical">Memory Critical</option>
                <option value="pod_failures">Pod Failures</option>
              </select>
            </div>
            
            <Button
              onClick={() => runAnalysis(simulationType)}
              disabled={isAnalyzing}
              loading={isAnalyzing}
              icon={!isAnalyzing && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M19 10a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            >
              {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
            </Button>
          </div>
        </CardContent>
      </Card>

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
