import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import DeploymentTemplates from './DeploymentTemplates';
import ClusterTemplates from './ClusterTemplates';
import CostEstimator from './CostEstimator';
import DeploymentOrchestrator from './DeploymentOrchestrator';

const TemplateHub = () => {
  const [currentView, setCurrentView] = useState('templates');
  const [templateType, setTemplateType] = useState('applications'); // 'applications' or 'clusters'
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [userPreferences, setUserPreferences] = useState(null);
  const [deploymentData, setDeploymentData] = useState(null);

  useEffect(() => {
    // Load user preferences from onboarding
    const preferences = localStorage.getItem('user_preferences');
    if (preferences) {
      try {
        const parsed = JSON.parse(preferences);
        setUserPreferences(parsed.quizAnswers);
      } catch (error) {
        console.error('Error parsing user preferences:', error);
      }
    }
  }, []);

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
  };

  const handleDeploy = (template) => {
    setSelectedTemplate(template);
    setCurrentView('deploy');
  };

  const handleDeploymentComplete = (data) => {
    setDeploymentData(data);
    setCurrentView('success');
  };

  const handleBackToTemplates = () => {
    setCurrentView('templates');
    setSelectedTemplate(null);
    setDeploymentData(null);
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'templates':
        return (
          <div className="space-y-8">
            {/* Template Type Selector */}
            <div className="max-w-4xl mx-auto">
              <div className="flex justify-center mb-8">
                <div className="bg-gray-100 p-1 rounded-lg">
                  <button
                    onClick={() => setTemplateType('clusters')}
                    className={`px-6 py-2 rounded-md font-medium transition-colors ${
                      templateType === 'clusters'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    🏗️ Cluster Templates
                  </button>
                  <button
                    onClick={() => setTemplateType('applications')}
                    className={`px-6 py-2 rounded-md font-medium transition-colors ${
                      templateType === 'applications'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    📦 Application Templates
                  </button>
                </div>
              </div>
            </div>

            {templateType === 'clusters' ? (
              <ClusterTemplates 
                userPreferences={userPreferences}
                onDeploy={handleDeploy}
                onTemplateSelect={handleTemplateSelect}
              />
            ) : (
              <DeploymentTemplates 
                userPreferences={userPreferences}
                onDeploy={handleDeploy}
                onTemplateSelect={handleTemplateSelect}
              />
            )}
            {selectedTemplate && (
              <CostEstimator template={selectedTemplate} />
            )}
          </div>
        );
      
      case 'deploy':
        return (
          <DeploymentOrchestrator
            template={selectedTemplate}
            onComplete={handleDeploymentComplete}
            onCancel={handleBackToTemplates}
          />
        );
      
      case 'success':
        return (
          <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
              <div className="mb-6">
                <div className="text-6xl mb-4">🎉</div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Cluster Deployed Successfully!
                </h1>
                <p className="text-lg text-gray-600">
                  Your {deploymentData?.template?.name} is ready to use
                </p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                  <div>
                    <div className="text-sm text-gray-600">Cluster ID</div>
                    <div className="font-mono text-sm bg-white p-2 rounded border">
                      {deploymentData?.clusterId}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Status</div>
                    <div className="font-semibold text-green-600">
                      {deploymentData?.status}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button 
                  onClick={() => window.open('/clusters', '_blank')}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700"
                >
                  Manage Cluster
                </button>
                <button 
                  onClick={handleBackToTemplates}
                  className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50"
                >
                  Deploy Another
                </button>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section with Stripe-inspired design */}
      {currentView === 'templates' && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">📦 Template Hub</h1>
              <p className="text-gray-600">Deploy production-ready Kubernetes clusters and applications</p>
            </div>
            <div className="text-right">
              <div className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">
                Template Library
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Production Ready
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <nav className="flex items-center space-x-2 text-sm">
          <button
            onClick={handleBackToTemplates}
            className={`hover:text-blue-600 ${currentView === 'templates' ? 'text-blue-600 font-semibold' : 'text-gray-500'}`}
          >
            Templates
          </button>
          {currentView !== 'templates' && (
            <>
              <span className="text-gray-400">/</span>
              <span className="text-gray-900 font-semibold">
                {currentView === 'deploy' ? 'Deploy' : 'Success'}
              </span>
            </>
          )}
        </nav>
        
        {userPreferences && (
          <div className="text-sm text-gray-600">
            Optimized for: <span className="font-semibold text-blue-600">
              {userPreferences.primary_pain?.replace('_', ' ') || 'your needs'}
            </span>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div>
        {renderCurrentView()}
      </div>
    </div>
  );
};

export default TemplateHub;
