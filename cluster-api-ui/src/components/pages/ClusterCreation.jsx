import React from 'react';

const ClusterCreation = () => {
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Modern Header */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-8 border border-green-200">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M12,2A2,2 0 0,1 14,4C14,4.74 13.6,5.39 13,5.73V7H14A7,7 0 0,1 21,14H22A1,1 0 0,1 23,15V18A1,1 0 0,1 22,19H21V20A2,2 0 0,1 19,22H5A2,2 0 0,1 3,20V19H2A1,1 0 0,1 1,18V15A1,1 0 0,1 2,14H3A7,7 0 0,1 10,7H11V5.73C10.4,5.39 10,4.74 10,4A2,2 0 0,1 12,2M7.5,13A2.5,2.5 0 0,0 5,15.5A2.5,2.5 0 0,0 7.5,18A2.5,2.5 0 0,0 10,15.5A2.5,2.5 0 0,0 7.5,13M16.5,13A2.5,2.5 0 0,0 14,15.5A2.5,2.5 0 0,0 16.5,18A2.5,2.5 0 0,0 19,15.5A2.5,2.5 0 0,0 16.5,13Z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Create Cluster</h1>
            <p className="text-gray-600 mt-1">Deploy a new Kubernetes cluster with advanced configuration options</p>
          </div>
        </div>
      </div>

      {/* Coming Soon Card */}
      <div className="bg-white rounded-xl p-8 border border-gray-200 text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-blue-600">
            <circle cx="12" cy="12" r="10"/>
            <path d="m9 12 2 2 4-4"/>
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Comprehensive Cluster Creation Wizard</h2>
        <p className="text-gray-600 mb-6">
          This page will contain the full cluster creation wizard with advanced options for:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">🏗️ Infrastructure</h3>
            <p className="text-sm text-gray-600">Cloud provider selection, regions, and networking</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">⚙️ Configuration</h3>
            <p className="text-sm text-gray-600">Kubernetes version, node pools, and scaling</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">🔒 Security</h3>
            <p className="text-sm text-gray-600">RBAC, network policies, and encryption</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">🚀 Add-ons</h3>
            <p className="text-sm text-gray-600">Monitoring, logging, and service mesh</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">💰 Cost Management</h3>
            <p className="text-sm text-gray-600">Resource limits and budget controls</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">🤖 AI Integration</h3>
            <p className="text-sm text-gray-600">Intelligent recommendations and automation</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClusterCreation;

