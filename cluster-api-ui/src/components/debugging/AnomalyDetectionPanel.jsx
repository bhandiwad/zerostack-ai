import React, { useState, useEffect } from 'react';
import { 
  ExclamationTriangleIcon, 
  ClockIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';

const AnomalyDetectionPanel = ({ anomalies, setAnomalies, API_BASE }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [lastScan, setLastScan] = useState(null);

  const runAnomalyDetection = async () => {
    setIsScanning(true);
    try {
      const response = await fetch(`${API_BASE}/debugging/anomaly-detection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ metrics: {} })
      });
      const data = await response.json();
      if (data.success) {
        setAnomalies(data.anomalies);
        setLastScan(new Date().toLocaleTimeString());
      }
    } catch (error) {
      console.error('Failed to run anomaly detection:', error);
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    runAnomalyDetection();
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

  const getDeviationIcon = (deviation) => {
    return deviation > 0 ? ArrowTrendingUpIcon : ArrowTrendingDownIcon;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-6 border border-orange-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-orange-600" />
            <h2 className="text-xl font-semibold text-gray-900">Anomaly Detection</h2>
          </div>
          <button
            onClick={runAnomalyDetection}
            disabled={isScanning}
            className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 disabled:opacity-50"
          >
            {isScanning ? (
              <>
                <ClockIcon className="h-4 w-4 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <ChartBarIcon className="h-4 w-4" />
                Scan Now
              </>
            )}
          </button>
        </div>
        <p className="text-gray-600">
          Real-time detection of unusual patterns and deviations from normal cluster behavior
        </p>
        {lastScan && (
          <p className="text-sm text-gray-500 mt-2">Last scan: {lastScan}</p>
        )}
      </div>

      {/* Anomalies List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Detected Anomalies</h3>
        
        {anomalies.length > 0 ? (
          <div className="space-y-4">
            {anomalies.map((anomaly, index) => {
              const DeviationIcon = getDeviationIcon(anomaly.deviation_percentage);
              
              return (
                <div
                  key={index}
                  className={`border rounded-lg p-4 ${getSeverityColor(anomaly.severity)}`}
                >
                  <div className="flex items-start gap-3">
                    <DeviationIcon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">
                          {anomaly.metric_name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Anomaly
                        </h4>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-1 rounded-full bg-white bg-opacity-50">
                            {Math.abs(anomaly.deviation_percentage).toFixed(1)}% deviation
                          </span>
                          <span className="text-xs px-2 py-1 rounded-full bg-white bg-opacity-50">
                            {(anomaly.anomaly_score * 100).toFixed(0)}% confidence
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-sm mb-3">{anomaly.description}</p>
                      
                      <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                        <div>
                          <span className="font-medium">Current Value:</span>
                          <span className="ml-2">{anomaly.current_value.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="font-medium">Expected Value:</span>
                          <span className="ml-2">{anomaly.expected_value.toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-xs font-medium text-gray-700">Possible Causes:</div>
                        <ul className="list-disc list-inside text-xs text-gray-600 space-y-1">
                          {anomaly.possible_causes?.map((cause, causeIndex) => (
                            <li key={causeIndex}>{cause}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="space-y-2 mt-3">
                        <div className="text-xs font-medium text-gray-700">Recommended Actions:</div>
                        <ul className="list-disc list-inside text-xs text-gray-600 space-y-1">
                          {anomaly.recommended_actions?.map((action, actionIndex) => (
                            <li key={actionIndex}>{action}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <ChartBarIcon className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="text-gray-500">No anomalies detected. All metrics are within normal ranges.</p>
          </div>
        )}
      </div>

      {/* Anomaly Statistics */}
      {anomalies.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Total Anomalies</h4>
            <div className="text-2xl font-bold text-gray-900">{anomalies.length}</div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Critical Anomalies</h4>
            <div className="text-2xl font-bold text-red-600">
              {anomalies.filter(a => a.severity === 'critical').length}
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Avg Confidence</h4>
            <div className="text-2xl font-bold text-blue-600">
              {anomalies.length > 0 
                ? (anomalies.reduce((sum, a) => sum + a.anomaly_score, 0) / anomalies.length * 100).toFixed(0)
                : 0}%
            </div>
          </div>
        </div>
      )}

      {/* Getting Started */}
      {anomalies.length === 0 && !isScanning && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-orange-900 mb-2">Anomaly Detection</h3>
          <p className="text-orange-700 mb-4">
            Continuously monitor your cluster for unusual patterns and deviations from normal behavior.
          </p>
          <ul className="list-disc list-inside text-orange-700 text-sm space-y-1">
            <li>Automatic detection of metric anomalies</li>
            <li>Statistical analysis of resource usage patterns</li>
            <li>Early warning system for potential issues</li>
            <li>Confidence scoring for detected anomalies</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default AnomalyDetectionPanel;
