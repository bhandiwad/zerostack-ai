import React, { useState } from 'react';
import { 
  ClockIcon, 
  CpuChipIcon, 
  CurrencyDollarIcon, 
  ChevronRightIcon, 
  CheckIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  CloudIcon,
  CodeBracketIcon
} from '@heroicons/react/24/outline';

const DeploymentTemplates = ({ userPreferences, onDeploy, onTemplateSelect }) => {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showCostBreakdown, setShowCostBreakdown] = useState(false);

  const templates = [
    {
      id: 'dev-low-cost',
      name: 'Development',
      description: 'Perfect for development and testing environments',
      category: 'Development',
      badge: 'Most Popular',
      badgeColor: 'bg-green-100 text-green-800',
      accentColor: 'border-green-500',
      estimatedCost: '$18',
      deployTime: '3 min',
      resources: {
        nodes: 2,
        cpu: '2 vCPUs',
        memory: '4 GB RAM',
        storage: '20 GB SSD'
      },
      features: [
        'Basic monitoring',
        'Auto-scaling disabled',
        'Single availability zone',
        'Standard networking'
      ],
      useCases: ['Development', 'Testing', 'Learning', 'Prototyping'],
      costBreakdown: {
        compute: '$12/month',
        storage: '$3/month',
        networking: '$2/month',
        monitoring: '$1/month'
      },
      tags: ['cost-optimized', 'development', 'beginner-friendly']
    },
    {
      id: 'production-ready',
      name: 'Production',
      description: 'High-availability setup with monitoring and security',
      category: 'Production',
      badge: 'Recommended',
      badgeColor: 'bg-blue-100 text-blue-800',
      accentColor: 'border-blue-500',
      estimatedCost: '$85',
      deployTime: '5 min',
      resources: {
        nodes: 3,
        cpu: '8 vCPUs',
        memory: '16 GB RAM',
        storage: '100 GB SSD'
      },
      features: [
        'Multi-zone deployment',
        'Advanced monitoring & alerting',
        'Automated backups',
        'Security scanning',
        'Load balancing',
        'SSL certificates'
      ],
      useCases: ['Production apps', 'E-commerce', 'SaaS platforms', 'Critical workloads'],
      costBreakdown: {
        compute: '$60/month',
        storage: '$15/month',
        networking: '$5/month',
        monitoring: '$3/month',
        backup: '$2/month'
      },
      tags: ['production', 'high-availability', 'secure']
    },
    {
      id: 'auto-scaling',
      name: 'Auto-Scaling',
      description: 'Intelligent scaling based on traffic patterns',
      category: 'Web Apps',
      badge: 'Smart',
      badgeColor: 'bg-purple-100 text-purple-800',
      accentColor: 'border-purple-500',
      estimatedCost: '$35-120',
      deployTime: '4 min',
      resources: {
        nodes: '1-5 (auto)',
        cpu: '2-10 vCPUs',
        memory: '4-20 GB RAM',
        storage: '50 GB SSD'
      },
      features: [
        'Horizontal pod autoscaling',
        'Cluster autoscaling',
        'Traffic-based scaling',
        'Cost monitoring',
        'Performance optimization'
      ],
      useCases: ['Variable traffic apps', 'Seasonal businesses', 'Growing startups'],
      costBreakdown: {
        'compute (min)': '$25/month',
        'compute (max)': '$90/month',
        storage: '$10/month',
        networking: '$3/month',
        monitoring: '$2/month'
      },
      tags: ['auto-scaling', 'cost-efficient', 'performance']
    },
    {
      id: 'microservices',
      name: 'Microservices',
      description: 'Service mesh with observability for complex apps',
      category: 'Enterprise',
      badge: 'Advanced',
      badgeColor: 'bg-orange-100 text-orange-800',
      accentColor: 'border-orange-500',
      estimatedCost: '$95',
      deployTime: '6 min',
      resources: {
        nodes: 4,
        cpu: '12 vCPUs',
        memory: '24 GB RAM',
        storage: '150 GB SSD'
      },
      features: [
        'Istio service mesh',
        'Distributed tracing',
        'API gateway',
        'Circuit breakers',
        'Canary deployments'
      ],
      useCases: ['Microservices', 'Complex applications', 'Enterprise systems'],
      costBreakdown: {
        compute: '$70/month',
        storage: '$15/month',
        networking: '$6/month',
        'service mesh': '$4/month'
      },
      tags: ['microservices', 'enterprise', 'advanced']
    },
    {
      id: 'ml-workload',
      name: 'ML/AI',
      description: 'GPU-enabled cluster for machine learning workloads',
      category: 'AI/ML',
      badge: 'GPU',
      badgeColor: 'bg-teal-100 text-teal-800',
      accentColor: 'border-teal-500',
      estimatedCost: '$180',
      deployTime: '7 min',
      resources: {
        nodes: 2,
        cpu: '8 vCPUs + GPU',
        memory: '32 GB RAM',
        storage: '200 GB SSD'
      },
      features: [
        'GPU node pools',
        'Jupyter notebooks',
        'ML frameworks pre-installed',
        'Model serving',
        'Distributed training'
      ],
      useCases: ['ML training', 'AI inference', 'Data science', 'Research'],
      costBreakdown: {
        'gpu compute': '$140/month',
        'cpu compute': '$20/month',
        storage: '$15/month',
        networking: '$5/month'
      },
      tags: ['machine-learning', 'gpu', 'data-science']
    },
    {
      id: 'edge-computing',
      name: 'Edge Computing',
      description: 'Multi-region deployment for low-latency apps',
      category: 'Edge',
      badge: 'Global',
      badgeColor: 'bg-gray-100 text-gray-800',
      accentColor: 'border-gray-500',
      estimatedCost: '$65',
      deployTime: '8 min',
      resources: {
        nodes: '2 per region',
        cpu: '4 vCPUs',
        memory: '8 GB RAM',
        storage: '40 GB SSD'
      },
      features: [
        'Multi-region deployment',
        'Edge optimization',
        'CDN integration',
        'Geo-routing',
        'Low-latency networking'
      ],
      useCases: ['Global apps', 'Gaming', 'IoT', 'Real-time services'],
      costBreakdown: {
        'compute (3 regions)': '$45/month',
        'storage (3 regions)': '$12/month',
        'inter-region traffic': '$8/month'
      },
      tags: ['edge-computing', 'multi-region', 'low-latency']
    }
  ];

  // Filter templates based on user preferences
  const getRecommendedTemplates = () => {
    if (!userPreferences) return templates;

    const { primary_pain, team_size, experience_level } = userPreferences;
    let recommended = [...templates];

    // Sort based on pain points
    if (primary_pain === 'cost_waste') {
      recommended.sort((a, b) => {
        const aHasCostTag = a.tags.includes('cost-optimized') || a.tags.includes('cost-efficient');
        const bHasCostTag = b.tags.includes('cost-optimized') || b.tags.includes('cost-efficient');
        if (aHasCostTag && !bHasCostTag) return -1;
        if (!aHasCostTag && bHasCostTag) return 1;
        return 0;
      });
    } else if (primary_pain === 'learning_curve') {
      recommended.sort((a, b) => {
        const aIsBeginner = a.tags.includes('beginner-friendly') || a.tags.includes('development');
        const bIsBeginner = b.tags.includes('beginner-friendly') || b.tags.includes('development');
        if (aIsBeginner && !bIsBeginner) return -1;
        if (!aIsBeginner && bIsBeginner) return 1;
        return 0;
      });
    }

    return recommended;
  };

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    if (onTemplateSelect) {
      onTemplateSelect(template);
    }
  };

  const handleDeploy = () => {
    if (selectedTemplate && onDeploy) {
      onDeploy(selectedTemplate);
    }
  };

  const recommendedTemplates = getRecommendedTemplates();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-10">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Quick-Start Templates
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Deploy production-ready Kubernetes clusters in minutes with our AI-optimized templates
            </p>
          </div>
          {userPreferences?.primary_pain && (
            <div className="max-w-2xl mx-auto">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-sm">💡</span>
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-800">
                      <span className="font-medium">Personalized for you:</span> Templates optimized for{' '}
                      <span className="font-semibold text-blue-900">
                        {userPreferences.primary_pain.replace('_', ' ')}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Template Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {recommendedTemplates.map((template) => (
            <div
              key={template.id}
              className={`bg-white rounded-lg border-l-4 ${template.accentColor} shadow-sm p-5 cursor-pointer transition-all duration-200 hover:shadow-md ${
                selectedTemplate?.id === template.id 
                  ? 'ring-2 ring-blue-400 shadow-md' 
                  : 'hover:border-l-4'
              }`}
              onClick={() => handleTemplateSelect(template)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${template.badgeColor}`}>
                      {template.badge}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{template.category}</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">{template.estimatedCost}</div>
                  <div className="text-xs text-gray-500">per month</div>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">{template.description}</p>

              {/* Quick Stats */}
              <div className="flex items-center justify-between text-xs text-gray-600 mb-4 p-2 bg-gray-50 rounded">
                <div className="flex items-center">
                  <ClockIcon className="h-3 w-3 mr-1" />
                  <span>{template.deployTime}</span>
                </div>
                <div className="flex items-center">
                  <CpuChipIcon className="h-3 w-3 mr-1" />
                  <span>{template.resources.nodes} nodes</span>
                </div>
                <div className="text-xs font-medium text-gray-700">
                  {template.resources.cpu}
                </div>
              </div>

              {/* Use Cases */}
              <div className="border-t pt-3">
                <p className="text-xs text-gray-500 mb-1">Best for:</p>
                <p className="text-xs text-gray-700">{template.useCases.slice(0, 2).join(', ')}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Selected Template Quick Deploy */}
        {selectedTemplate && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className={`w-3 h-8 rounded-full ${selectedTemplate.accentColor.replace('border-', 'bg-')}`}></div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedTemplate.name}</h3>
                  <p className="text-sm text-gray-600">{selectedTemplate.category} • {selectedTemplate.deployTime} deploy</p>
                </div>
              </div>
              <button
                onClick={handleDeploy}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <span>Deploy</span>
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-lg font-bold text-gray-900">{selectedTemplate.resources.nodes}</div>
                <div className="text-xs text-gray-600">Nodes</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-lg font-bold text-gray-900">{selectedTemplate.resources.cpu}</div>
                <div className="text-xs text-gray-600">CPU</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-lg font-bold text-gray-900">{selectedTemplate.resources.memory}</div>
                <div className="text-xs text-gray-600">Memory</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-lg font-bold text-blue-600">{selectedTemplate.estimatedCost}</div>
                <div className="text-xs text-gray-600">per month</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {selectedTemplate.features.slice(0, 4).map((feature, index) => (
                <span key={index} className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 text-xs rounded-md">
                  <CheckIcon className="h-3 w-3 mr-1" />
                  {feature}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeploymentTemplates;
