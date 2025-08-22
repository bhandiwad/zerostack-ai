import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const [loading, setLoading] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Sify InfinitAI Platform</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 text-gray-600 hover:text-gray-900">
              🔔 Notifications
            </button>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              + Add Cluster
            </button>
          </div>
        </div>

        {/* Top Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 text-center shadow-sm">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M12,2A2,2 0 0,1 14,4C14,4.74 13.6,5.39 13,5.73V7H14A7,7 0 0,1 21,14H22A1,1 0 0,1 23,15V18A1,1 0 0,1 22,19H21V20A2,2 0 0,1 19,22H5A2,2 0 0,1 3,20V19H2A1,1 0 0,1 1,18V15A1,1 0 0,1 2,14H3A7,7 0 0,1 10,7H11V5.73C10.4,5.39 10,4.74 10,4A2,2 0 0,1 12,2Z"/>
              </svg>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">12</div>
            <div className="text-sm text-gray-600 mb-1">Running Blueprints</div>
            <div className="text-xs text-green-600">+2 this week</div>
          </div>

          <div className="bg-white rounded-lg p-6 text-center shadow-sm">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z"/>
              </svg>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">8</div>
            <div className="text-sm text-gray-600 mb-1">Active Agents</div>
            <div className="text-xs text-green-600">+2 today</div>
          </div>

          <div className="bg-white rounded-lg p-6 text-center shadow-sm">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M5,12H14M5,12A2,2 0 0,1 3,10V6A2,2 0 0,1 5,4H14A2,2 0 0,1 16,6V10A2,2 0 0,1 14,12M5,12A2,2 0 0,0 3,14V18A2,2 0 0,0 5,20H14A2,2 0 0,0 16,18V14A2,2 0 0,0 14,12"/>
              </svg>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">5</div>
            <div className="text-sm text-gray-600 mb-1">K8s Clusters</div>
            <div className="text-xs text-gray-600">All healthy</div>
          </div>

          <div className="bg-white rounded-lg p-6 text-center shadow-sm">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M3,3V21H21V3H3M9,17H7V10H9V17M13,17H11V7H13V17M17,17H15V13H17V17Z"/>
              </svg>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">78%</div>
            <div className="text-sm text-gray-600 mb-1">GPU Utilization</div>
            <div className="text-xs text-green-600">+5% from yesterday</div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Running Blueprints */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Running Blueprints</h3>
            <p className="text-sm text-gray-600 mb-6">Active AI solutions by vertical</p>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">P</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-gray-900">Predictive Maintenance</h4>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">RUNNING</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">Manufacturing</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">AVG USAGE</span>
                    <span className="font-medium">85% utilization</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                    <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: '85%' }}></div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
                <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">F</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-gray-900">Fraud Detection</h4>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">RUNNING</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">BFSI</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Sify CI</span>
                    <span className="font-medium">73% utilization</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                    <div className="bg-green-600 h-1.5 rounded-full" style={{ width: '73%' }}></div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
                <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">M</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-gray-900">Medical Imaging</h4>
                    <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">SCALING</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">Healthcare</p>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                    <div className="bg-red-600 h-1.5 rounded-full" style={{ width: '45%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Active Agents */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Active Agents</h3>
            <p className="text-sm text-gray-600 mb-6">AI agents and their performance</p>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
                <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">C</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-gray-900">Customer Support</h4>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">ACTIVE</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">24/7 Support Agent</p>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-gray-500">Requests Today</span>
                    <span className="font-medium">ACCURACY</span>
                  </div>
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span>1.2k</span>
                    <span>98%</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
                <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">D</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-gray-900">Data Analyst</h4>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">ACTIVE</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">Business Intelligence</p>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-gray-500">Reports Generated</span>
                    <span className="font-medium">ACCURACY</span>
                  </div>
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span>45</span>
                    <span>95%</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
                <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">S</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-gray-900">Security Monitor</h4>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">ACTIVE</span>
                  </div>
                  <p className="text-sm text-gray-600">Threat Detection</p>
                </div>
              </div>
            </div>
          </div>

          {/* K8s Clusters */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">K8s Clusters</h3>
            <p className="text-sm text-gray-600 mb-6">Multi-cloud infrastructure status</p>
            
            <div className="space-y-4">
              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">Sify CI Production</h4>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">HEALTHY</span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  <span>CPU</span>
                  <span>MEMORY</span>
                </div>
                <div className="flex items-center justify-between text-sm font-medium mb-2">
                  <span>38%</span>
                  <span>85%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '85%' }}></div>
                </div>
              </div>

              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">AWS US-East-1</h4>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">HEALTHY</span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  <span>CPU</span>
                  <span>MEMORY</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
