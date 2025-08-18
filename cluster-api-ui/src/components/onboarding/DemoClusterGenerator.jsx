import React, { useState, useEffect } from 'react';
import { 
  CpuChipIcon, 
  CurrencyDollarIcon, 
  ShieldCheckIcon, 
  RocketLaunchIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const DemoClusterGenerator = ({ quizAnswers, onClusterReady }) => {
  const [generationStep, setGenerationStep] = useState(0);
  const [clusterConfig, setClusterConfig] = useState(null);
  const [isGenerating, setIsGenerating] = useState(true);

  const generationSteps = [
    'Analyzing your requirements...',
    'Selecting optimal configuration...',
    'Calculating cost estimates...',
    'Preparing deployment templates...',
    'Finalizing your demo cluster...'
  ];

  useEffect(() => {
    generateClusterConfig();
  }, [quizAnswers]);

  const generateClusterConfig = async () => {
    // Simulate AI generation process
    for (let i = 0; i < generationSteps.length; i++) {
      setGenerationStep(i);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Generate configuration based on quiz answers
    const config = createTailoredConfig(quizAnswers);
    setClusterConfig(config);
    setIsGenerating(false);
    onClusterReady(config);
  };

  const createTailoredConfig = (answers) => {
    const { primary_pain, team_size, experience_level } = answers;

    let config = {
      name: 'Your Personalized Demo Cluster',
      description: '',
      templates: [],
      features: [],
      estimatedCost: '$45/month',
      deploymentTime: '3 minutes',
      recommendations: []
    };

    // Tailor based on primary pain point
    switch (primary_pain) {
      case 'learning_curve':
        config.name = 'Learning-Friendly Demo Cluster';
        config.description = 'Simplified setup with guided tutorials and explanations';
        config.templates = [
          { name: 'Hello World App', type: 'tutorial', difficulty: 'beginner' },
          { name: 'Simple Web Service', type: 'tutorial', difficulty: 'beginner' },
          { name: 'Database + API', type: 'tutorial', difficulty: 'intermediate' }
        ];
        config.features = [
          'Interactive K8s tutorials',
          'Step-by-step deployment guides',
          'Visual resource explanations',
          'Built-in troubleshooting help'
        ];
        config.recommendations = [
          'Start with the Hello World tutorial',
          'Use our visual YAML builder',
          'Enable guided mode for explanations'
        ];
        break;

      case 'cost_waste':
        config.name = 'Cost-Optimized Demo Cluster';
        config.description = 'Right-sized resources with cost monitoring and optimization';
        config.templates = [
          { name: 'Efficient Dev Environment', type: 'cost-optimized', difficulty: 'intermediate' },
          { name: 'Auto-scaling Web App', type: 'cost-optimized', difficulty: 'intermediate' },
          { name: 'Spot Instance Workload', type: 'cost-optimized', difficulty: 'advanced' }
        ];
        config.features = [
          'Real-time cost monitoring',
          'Auto-scaling recommendations',
          'Resource right-sizing',
          'Spot instance integration'
        ];
        config.estimatedCost = '$28/month';
        config.recommendations = [
          'Enable cost alerts at $50/month',
          'Use auto-scaling for variable workloads',
          'Consider spot instances for dev environments'
        ];
        break;

      case 'debugging_failures':
        config.name = 'Reliability-First Demo Cluster';
        config.description = 'Enhanced monitoring and AI-powered troubleshooting';
        config.templates = [
          { name: 'Monitored Web Service', type: 'reliability', difficulty: 'intermediate' },
          { name: 'Multi-Zone Application', type: 'reliability', difficulty: 'advanced' },
          { name: 'Self-Healing Workload', type: 'reliability', difficulty: 'advanced' }
        ];
        config.features = [
          'AI-powered diagnostics',
          'Comprehensive monitoring',
          'Automated health checks',
          'Failure prediction alerts'
        ];
        config.recommendations = [
          'Enable predictive monitoring',
          'Set up automated health checks',
          'Use our AI troubleshooting assistant'
        ];
        break;

      case 'operational_overhead':
        config.name = 'Automation-First Demo Cluster';
        config.description = 'Fully automated operations with minimal manual intervention';
        config.templates = [
          { name: 'GitOps Pipeline', type: 'automation', difficulty: 'intermediate' },
          { name: 'Auto-Updating Service', type: 'automation', difficulty: 'advanced' },
          { name: 'Self-Managing Database', type: 'automation', difficulty: 'advanced' }
        ];
        config.features = [
          'GitOps automation',
          'Auto-scaling and healing',
          'Automated backups',
          'Zero-downtime deployments'
        ];
        config.recommendations = [
          'Connect your Git repository',
          'Enable automated deployments',
          'Set up backup automation'
        ];
        break;

      default:
        config.templates = [
          { name: 'Getting Started', type: 'general', difficulty: 'beginner' },
          { name: 'Production Ready', type: 'general', difficulty: 'intermediate' }
        ];
    }

    // Adjust for team size
    if (team_size === 'solo' || team_size === 'small_team') {
      config.estimatedCost = config.estimatedCost.replace(/\d+/, (match) => Math.max(15, parseInt(match) * 0.7));
      config.features.push('Single-user workspace');
    } else {
      config.features.push('Team collaboration tools', 'Role-based access control');
    }

    // Adjust for experience level
    if (experience_level === 'beginner') {
      config.features.push('Beginner-friendly interface', 'Guided workflows');
      config.deploymentTime = '5 minutes';
    } else if (experience_level === 'expert') {
      config.features.push('Advanced configuration options', 'API access');
      config.deploymentTime = '1 minute';
    }

    return config;
  };

  if (isGenerating) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <div className="mb-8">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
            <CpuChipIcon className="h-8 w-8 text-blue-600 absolute top-4 left-1/2 transform -translate-x-1/2" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Creating Your Personalized Demo
          </h2>
          <p className="text-gray-600 mb-6">
            Our AI is analyzing your needs and preparing the perfect cluster configuration...
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-6">
          <div className="text-left">
            {generationSteps.map((step, index) => (
              <div key={index} className="flex items-center mb-3">
                {index < generationStep ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-500 mr-3" />
                ) : index === generationStep ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent mr-3 ml-0.5"></div>
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-gray-300 mr-3"></div>
                )}
                <span className={index <= generationStep ? 'text-gray-900' : 'text-gray-500'}>
                  {step}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="text-center mb-8">
        <RocketLaunchIcon className="h-16 w-16 text-blue-600 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {clusterConfig.name}
        </h1>
        <p className="text-lg text-gray-600">
          {clusterConfig.description}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <CurrencyDollarIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-green-900">{clusterConfig.estimatedCost}</div>
          <div className="text-sm text-green-700">Estimated monthly cost</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <RocketLaunchIcon className="h-8 w-8 text-blue-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-blue-900">{clusterConfig.deploymentTime}</div>
          <div className="text-sm text-blue-700">Deployment time</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 text-center">
          <ShieldCheckIcon className="h-8 w-8 text-purple-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-purple-900">{clusterConfig.templates.length}</div>
          <div className="text-sm text-purple-700">Ready-to-use templates</div>
        </div>
      </div>

      {/* Templates */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Recommended Templates</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {clusterConfig.templates.map((template, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <h3 className="font-semibold text-gray-900 mb-2">{template.name}</h3>
              <div className="flex items-center justify-between">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  template.difficulty === 'beginner' ? 'bg-green-100 text-green-800' :
                  template.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {template.difficulty}
                </span>
                <span className="text-xs text-gray-500 capitalize">{template.type}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Included Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {clusterConfig.features.map((feature, index) => (
            <div key={index} className="flex items-center">
              <CheckCircleIcon className="h-5 w-5 text-green-500 mr-3" />
              <span className="text-gray-700">{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">AI Recommendations</h2>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          {clusterConfig.recommendations.map((rec, index) => (
            <div key={index} className="flex items-start mb-3 last:mb-0">
              <ExclamationTriangleIcon className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
              <span className="text-blue-900">{rec}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl">
          Deploy Demo Cluster
        </button>
        <button className="border border-gray-300 text-gray-700 px-8 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors">
          Customize Configuration
        </button>
      </div>
    </div>
  );
};

export default DemoClusterGenerator;
