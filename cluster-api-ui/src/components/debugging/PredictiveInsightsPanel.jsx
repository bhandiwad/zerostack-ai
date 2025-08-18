import React, { useState, useEffect } from 'react';
import { 
  LightBulbIcon, 
  ClockIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';

const PredictiveInsightsPanel = ({ predictiveData, setPredictiveData, API_BASE }) => {
  const [isLoading, setIsLoading] = useState(false);

  const loadPredictiveAnalysis = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/debugging/predictive-analysis`);
      const data = await response.json();
      if (data.success) {
        setPredictiveData(data.analysis);
      }
    } catch (error) {
      console.error('Failed to load predictive analysis:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPredictiveAnalysis();
  }, []);

  const getSeverityColor = (severity) => {
    const colors = {
      critical: 'text-red-600 bg-red-50 border-red-200',
      high: 'text-orange-600 bg-orange-50 border-orange-200',
      medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      low: 'text-blue-600 bg-blue-50 border-blue-200'
    };
    return colors[severity] || colors.medium;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <ClockIcon className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading predictive insights...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 border border-purple-200">
        <div className="flex items-center gap-3 mb-4">
          <LightBulbIcon className="h-6 w-6 text-purple-600" />
          <h2 className="text-xl font-semibold text-gray-900">Predictive Insights</h2>
        </div>
        <p className="text-gray-600">
          AI-powered predictions about potential cluster issues and resource trends
        </p>
      </div>

      {predictiveData && (
        <>
          {/* Health Score & Trends */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Overall Health Score</h3>
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600 mb-2">
                  {predictiveData.overall_health_score?.toFixed(0) || 'N/A'}
                </div>
                <div className="text-sm text-gray-500">Predicted Health Score</div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Health Trends</h3>
              <div className="space-y-3">
                {predictiveData.health_trends && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">CPU Trend</span>
                      <span className="text-sm font-medium">
                        {predictiveData.health_trends.cpu_trend?.direction || 'stable'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Memory Trend</span>
                      <span className="text-sm font-medium">
                        {predictiveData.health_trends.memory_trend?.direction || 'stable'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Performance</span>
                      <span className="text-sm font-medium">
                        {predictiveData.health_trends.performance_trend?.direction || 'stable'}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Predictive Insights */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Predicted Issues</h3>
            
            {predictiveData.predictive_insights?.length > 0 ? (
              <div className="space-y-4">
                {predictiveData.predictive_insights.map((insight, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg p-4 ${getSeverityColor(insight.severity)}`}
                  >
                    <div className="flex items-start gap-3">
                      <ExclamationTriangleIcon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">{insight.title}</h4>
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-1 rounded-full bg-white bg-opacity-50">
                              {(insight.probability * 100).toFixed(0)}% likely
                            </span>
                            <span className="text-xs text-gray-500">
                              {insight.time_to_occurrence}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm mb-3">{insight.description}</p>
                        
                        <div className="space-y-2">
                          <div className="text-xs font-medium text-gray-700">Recommended Actions:</div>
                          <ul className="list-disc list-inside text-xs text-gray-600 space-y-1">
                            {insight.recommended_actions?.map((action, actionIndex) => (
                              <li key={actionIndex}>{action}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <ChartBarIcon className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <p className="text-gray-500">No issues predicted. Your cluster looks healthy!</p>
              </div>
            )}
          </div>

          {/* Recommendations */}
          {predictiveData.recommendations?.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Priority Recommendations</h3>
              <div className="space-y-3">
                {predictiveData.recommendations.map((rec, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <ArrowTrendingUpIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-gray-900">{rec.title}</h4>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          rec.priority === 'critical' ? 'bg-red-100 text-red-700' :
                          rec.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {rec.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{rec.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!predictiveData && !isLoading && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-purple-900 mb-2">Enable Predictive Analytics</h3>
          <p className="text-purple-700 mb-4">
            Get AI-powered predictions about potential cluster issues before they occur.
          </p>
          <button
            onClick={loadPredictiveAnalysis}
            className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
          >
            Load Predictive Analysis
          </button>
        </div>
      )}
    </div>
  );
};

export default PredictiveInsightsPanel;
