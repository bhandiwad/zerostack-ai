import React, { useState, useEffect } from 'react';
import { 
  BellIcon, 
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowUpIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';

const IntelligentAlertsPanel = ({ alerts, setAlerts, API_BASE }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [lastRefresh, setLastRefresh] = useState(null);

  const loadIntelligentAlerts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/debugging/intelligent-alerts`);
      const data = await response.json();
      if (data.success) {
        setAlerts(data.alerts);
        setLastRefresh(new Date().toLocaleTimeString());
      }
    } catch (error) {
      console.error('Failed to load intelligent alerts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadIntelligentAlerts();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadIntelligentAlerts, 30000);
    return () => clearInterval(interval);
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

  const getPriorityIcon = (priority) => {
    if (priority <= 2) return ArrowUpIcon;
    return BellIcon;
  };

  const filteredAlerts = alerts.filter(alert => 
    filterSeverity === 'all' || alert.severity === filterSeverity
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-lg p-6 border border-red-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <BellIcon className="h-6 w-6 text-red-600" />
            <h2 className="text-xl font-semibold text-gray-900">Intelligent Alerts</h2>
          </div>
          <button
            onClick={loadIntelligentAlerts}
            disabled={isLoading}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <ClockIcon className="h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <BellIcon className="h-4 w-4" />
                Refresh
              </>
            )}
          </button>
        </div>
        <p className="text-gray-600">
          Smart alert filtering, correlation, and prioritization to reduce noise and focus on critical issues
        </p>
        {lastRefresh && (
          <p className="text-sm text-gray-500 mt-2">Last refresh: {lastRefresh}</p>
        )}
      </div>

      {/* Alert Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-1">Total Alerts</h4>
          <div className="text-2xl font-bold text-gray-900">{alerts.length}</div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-1">High Priority</h4>
          <div className="text-2xl font-bold text-red-600">
            {alerts.filter(a => a.priority <= 2).length}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-1">Smart Filtered</h4>
          <div className="text-2xl font-bold text-blue-600">
            {alerts.filter(a => a.smart_filter_reason).length}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-1">Escalated</h4>
          <div className="text-2xl font-bold text-orange-600">
            {alerts.filter(a => a.escalation_level > 0).length}
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <FunnelIcon className="h-5 w-5 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Filter by severity:</span>
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1 text-sm"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <span className="text-sm text-gray-500">
            Showing {filteredAlerts.length} of {alerts.length} alerts
          </span>
        </div>
      </div>

      {/* Alerts List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Alerts</h3>
        
        {filteredAlerts.length > 0 ? (
          <div className="space-y-4">
            {filteredAlerts.map((alert, index) => {
              const PriorityIcon = getPriorityIcon(alert.priority);
              
              return (
                <div
                  key={index}
                  className={`border rounded-lg p-4 ${getSeverityColor(alert.severity)}`}
                >
                  <div className="flex items-start gap-3">
                    <PriorityIcon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{alert.title}</h4>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-1 rounded-full bg-white bg-opacity-50">
                            Priority {alert.priority}
                          </span>
                          <span className="text-xs px-2 py-1 rounded-full bg-white bg-opacity-50">
                            {alert.severity.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-sm mb-3">{alert.description}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3 text-sm">
                        <div>
                          <span className="font-medium">Category:</span>
                          <span className="ml-2">{alert.category.replace('_', ' ')}</span>
                        </div>
                        <div>
                          <span className="font-medium">Escalation Level:</span>
                          <span className="ml-2">{alert.escalation_level}</span>
                        </div>
                        <div>
                          <span className="font-medium">Time to Escalate:</span>
                          <span className="ml-2">{alert.time_to_escalate}</span>
                        </div>
                        <div>
                          <span className="font-medium">Correlation ID:</span>
                          <span className="ml-2 font-mono text-xs">{alert.correlation_id}</span>
                        </div>
                      </div>

                      {alert.affected_resources && alert.affected_resources.length > 0 && (
                        <div className="mb-3">
                          <div className="text-xs font-medium text-gray-700 mb-1">Affected Resources:</div>
                          <div className="flex flex-wrap gap-1">
                            {alert.affected_resources.map((resource, resourceIndex) => (
                              <span
                                key={resourceIndex}
                                className="text-xs px-2 py-1 bg-white bg-opacity-50 rounded-full"
                              >
                                {resource}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {alert.smart_filter_reason && (
                        <div className="mb-3 p-2 bg-blue-50 rounded-lg">
                          <div className="text-xs font-medium text-blue-700 mb-1">Smart Filter Applied:</div>
                          <div className="text-xs text-blue-600">{alert.smart_filter_reason}</div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="text-xs font-medium text-gray-700">Recommended Actions:</div>
                        <ul className="list-disc list-inside text-xs text-gray-600 space-y-1">
                          {alert.recommended_actions?.map((action, actionIndex) => (
                            <li key={actionIndex}>{action}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200">
                        <div className="text-xs text-gray-500">
                          Created: {new Date(alert.created_at).toLocaleString()}
                        </div>
                        <div className="flex gap-2">
                          <button className="text-xs bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700">
                            Acknowledge
                          </button>
                          <button className="text-xs bg-gray-600 text-white px-3 py-1 rounded-md hover:bg-gray-700">
                            Snooze
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="text-gray-500">
              {filterSeverity === 'all' 
                ? 'No active alerts. Your cluster is running smoothly!' 
                : `No ${filterSeverity} severity alerts found.`}
            </p>
          </div>
        )}
      </div>

      {/* Smart Filtering Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Intelligent Alert Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-blue-700 text-sm">
          <div>
            <h4 className="font-medium mb-2">Smart Filtering</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Duplicate alert suppression</li>
              <li>Noise reduction algorithms</li>
              <li>Context-aware filtering</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">Intelligent Features</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Alert correlation and grouping</li>
              <li>Priority-based escalation</li>
              <li>Predictive alert generation</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntelligentAlertsPanel;
