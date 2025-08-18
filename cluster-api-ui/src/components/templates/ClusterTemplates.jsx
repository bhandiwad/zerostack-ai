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
  ServerIcon,
  WrenchScrewdriverIcon,
  CogIcon
} from '@heroicons/react/24/outline';

const ClusterTemplates = ({ userPreferences, onDeploy, onTemplateSelect }) => {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');

  const clusterTemplates = [
    {
      id: 'dev-cluster-basic',
      name: 'Development Cluster',
      description: 'Lightweight cluster for development and testing with automated setup',
      category: 'Development',
      badge: 'Quick Setup',
      badgeColor: 'bg-green-100 text-green-800',
      accentColor: 'border-green-500',
      estimatedCost: '$25',
      deployTime: '5 min',
      complexity: 'Beginner',
      resources: {
        nodes: '1 control + 2 worker',
        cpu: '6 vCPUs total',
        memory: '12 GB RAM',
        storage: '60 GB SSD'
      },
      features: [
        'Single-zone deployment',
        'Basic monitoring (Prometheus)',
        'Automated certificate management',
        'Standard CNI (Flannel)',
        'Local storage provisioner',
        'Basic RBAC setup'
      ],
      automatedTasks: [
        'Cluster initialization',
        'Node joining automation',
        'Basic security policies',
        'Development tools installation'
      ],
      maintenanceIncluded: [
        'Automated OS updates',
        'Certificate rotation',
        'Basic health checks',
        'Log rotation'
      ],
      useCases: ['Development', 'Testing', 'Learning K8s', 'CI/CD pipelines'],
      tags: ['development', 'beginner-friendly', 'cost-optimized', 'automated-setup']
    },
    {
      id: 'production-ha-cluster',
      name: 'Production HA Cluster',
      description: 'High-availability cluster with automated operations and enterprise features',
      category: 'Production',
      badge: 'Enterprise Ready',
      badgeColor: 'bg-blue-100 text-blue-800',
      accentColor: 'border-blue-500',
      estimatedCost: '$180',
      deployTime: '8 min',
      complexity: 'Intermediate',
      resources: {
        nodes: '3 control + 3 worker',
        cpu: '24 vCPUs total',
        memory: '48 GB RAM',
        storage: '300 GB SSD'
      },
      features: [
        'Multi-zone HA deployment',
        'Advanced monitoring stack',
        'Automated backup system',
        'Service mesh ready (Istio)',
        'Advanced networking (Calico)',
        'Enterprise RBAC',
        'Admission controllers',
        'Pod security policies'
      ],
      automatedTasks: [
        'HA control plane setup',
        'Load balancer configuration',
        'Backup scheduling',
        'Security hardening',
        'Monitoring setup'
      ],
      maintenanceIncluded: [
        'Rolling updates',
        'Automated patching',
        'Backup verification',
        'Performance optimization',
        'Security scanning'
      ],
      useCases: ['Production workloads', 'E-commerce', 'Financial services', 'Healthcare'],
      tags: ['production', 'high-availability', 'enterprise', 'automated-ops']
    },
    {
      id: 'auto-scaling-cluster',
      name: 'Auto-Scaling Cluster',
      description: 'Intelligent cluster that scales based on workload demands with cost optimization',
      category: 'Auto-Scaling',
      badge: 'Smart Scaling',
      badgeColor: 'bg-purple-100 text-purple-800',
      accentColor: 'border-purple-500',
      estimatedCost: '$45-200',
      deployTime: '6 min',
      complexity: 'Intermediate',
      resources: {
        nodes: '1-10 (auto)',
        cpu: '4-40 vCPUs',
        memory: '8-80 GB RAM',
        storage: '100-500 GB SSD'
      },
      features: [
        'Cluster autoscaler',
        'Horizontal pod autoscaler',
        'Vertical pod autoscaler',
        'Spot instance integration',
        'Cost monitoring dashboard',
        'Predictive scaling',
        'Multi-instance types'
      ],
      automatedTasks: [
        'Scaling policy configuration',
        'Cost optimization rules',
        'Instance type selection',
        'Spot instance management'
      ],
      maintenanceIncluded: [
        'Scaling optimization',
        'Cost analysis reports',
        'Performance tuning',
        'Resource rightsizing'
      ],
      useCases: ['Variable workloads', 'Seasonal traffic', 'Batch processing', 'Cost optimization'],
      tags: ['auto-scaling', 'cost-efficient', 'intelligent', 'spot-instances']
    },
    {
      id: 'edge-cluster',
      name: 'Edge Computing Cluster',
      description: 'Lightweight cluster optimized for edge locations with remote management',
      category: 'Edge',
      badge: 'Edge Optimized',
      badgeColor: 'bg-teal-100 text-teal-800',
      accentColor: 'border-teal-500',
      estimatedCost: '$35',
      deployTime: '4 min',
      complexity: 'Advanced',
      resources: {
        nodes: '1 control + 1 worker',
        cpu: '4 vCPUs total',
        memory: '8 GB RAM',
        storage: '40 GB SSD'
      },
      features: [
        'Minimal resource footprint',
        'Offline-capable operation',
        'Remote management',
        'Edge-optimized networking',
        'Local data processing',
        'Secure tunneling'
      ],
      automatedTasks: [
        'Edge node registration',
        'Secure tunnel setup',
        'Local storage configuration',
        'Connectivity monitoring'
      ],
      maintenanceIncluded: [
        'Remote updates',
        'Connectivity monitoring',
        'Local backup',
        'Performance optimization'
      ],
      useCases: ['IoT applications', 'Remote locations', 'Low-latency apps', 'Offline processing'],
      tags: ['edge-computing', 'lightweight', 'remote-management', 'offline-capable']
    },
    {
      id: 'ml-gpu-cluster',
      name: 'ML/AI GPU Cluster',
      description: 'GPU-accelerated cluster for machine learning with automated ML ops',
      category: 'AI/ML',
      badge: 'GPU Accelerated',
      badgeColor: 'bg-orange-100 text-orange-800',
      accentColor: 'border-orange-500',
      estimatedCost: '$320',
      deployTime: '10 min',
      complexity: 'Advanced',
      resources: {
        nodes: '1 control + 2 GPU worker',
        cpu: '16 vCPUs + 2 GPUs',
        memory: '64 GB RAM',
        storage: '500 GB NVMe'
      },
      features: [
        'GPU node pools',
        'NVIDIA GPU Operator',
        'Kubeflow integration',
        'Jupyter hub deployment',
        'Model serving (KServe)',
        'Distributed training support',
        'ML pipeline automation'
      ],
      automatedTasks: [
        'GPU driver installation',
        'ML framework setup',
        'Jupyter environment',
        'Model registry setup'
      ],
      maintenanceIncluded: [
        'GPU driver updates',
        'Framework updates',
        'Model lifecycle management',
        'Resource optimization'
      ],
      useCases: ['ML training', 'AI inference', 'Data science', 'Computer vision'],
      tags: ['machine-learning', 'gpu-accelerated', 'kubeflow', 'automated-mlops']
    },
    {
      id: 'security-hardened-cluster',
      name: 'Security Hardened Cluster',
      description: 'Maximum security cluster with compliance features and zero-trust networking',
      category: 'Security',
      badge: 'Zero Trust',
      badgeColor: 'bg-red-100 text-red-800',
      accentColor: 'border-red-500',
      estimatedCost: '$150',
      deployTime: '12 min',
      complexity: 'Expert',
      resources: {
        nodes: '3 control + 3 worker',
        cpu: '18 vCPUs total',
        memory: '36 GB RAM',
        storage: '200 GB encrypted SSD'
      },
      features: [
        'CIS Kubernetes benchmark',
        'Pod security standards',
        'Network policies (Calico)',
        'Admission controllers',
        'Image scanning (Trivy)',
        'Audit logging',
        'Secrets encryption at rest',
        'mTLS everywhere'
      ],
      automatedTasks: [
        'Security hardening',
        'Compliance scanning',
        'Certificate management',
        'Audit configuration'
      ],
      maintenanceIncluded: [
        'Security updates',
        'Compliance reporting',
        'Vulnerability scanning',
        'Policy enforcement'
      ],
      useCases: ['Financial services', 'Healthcare', 'Government', 'Compliance-heavy industries'],
      tags: ['security-hardened', 'compliance', 'zero-trust', 'encrypted']
    }
  ];

  const categories = [
    { id: 'all', name: 'All Templates', count: clusterTemplates.length },
    { id: 'Development', name: 'Development', count: clusterTemplates.filter(t => t.category === 'Development').length },
    { id: 'Production', name: 'Production', count: clusterTemplates.filter(t => t.category === 'Production').length },
    { id: 'Auto-Scaling', name: 'Auto-Scaling', count: clusterTemplates.filter(t => t.category === 'Auto-Scaling').length },
    { id: 'AI/ML', name: 'AI/ML', count: clusterTemplates.filter(t => t.category === 'AI/ML').length },
    { id: 'Security', name: 'Security', count: clusterTemplates.filter(t => t.category === 'Security').length },
    { id: 'Edge', name: 'Edge', count: clusterTemplates.filter(t => t.category === 'Edge').length }
  ];

  // Filter templates based on user preferences and category
  const getFilteredTemplates = () => {
    let filtered = clusterTemplates;
    
    if (activeCategory !== 'all') {
      filtered = filtered.filter(template => template.category === activeCategory);
    }

    if (!userPreferences) return filtered;

    const { primary_pain, team_size, experience_level } = userPreferences;
    
    // Sort based on pain points
    if (primary_pain === 'operational_overhead') {
      filtered.sort((a, b) => {
        const aHasAutomation = a.tags.includes('automated-ops') || a.tags.includes('automated-setup');
        const bHasAutomation = b.tags.includes('automated-ops') || b.tags.includes('automated-setup');
        if (aHasAutomation && !bHasAutomation) return -1;
        if (!aHasAutomation && bHasAutomation) return 1;
        return 0;
      });
    } else if (primary_pain === 'cost_waste') {
      filtered.sort((a, b) => {
        const aHasCostTag = a.tags.includes('cost-optimized') || a.tags.includes('cost-efficient');
        const bHasCostTag = b.tags.includes('cost-optimized') || b.tags.includes('cost-efficient');
        if (aHasCostTag && !bHasCostTag) return -1;
        if (!aHasCostTag && bHasCostTag) return 1;
        return 0;
      });
    } else if (primary_pain === 'learning_curve') {
      filtered.sort((a, b) => {
        const aIsBeginner = a.tags.includes('beginner-friendly');
        const bIsBeginner = b.tags.includes('beginner-friendly');
        if (aIsBeginner && !bIsBeginner) return -1;
        if (!aIsBeginner && bIsBeginner) return 1;
        return 0;
      });
    }

    return filtered;
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

  const getComplexityColor = (complexity) => {
    switch (complexity) {
      case 'Beginner': return 'text-green-600 bg-green-50';
      case 'Intermediate': return 'text-blue-600 bg-blue-50';
      case 'Advanced': return 'text-orange-600 bg-orange-50';
      case 'Expert': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const filteredTemplates = getFilteredTemplates();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-10">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              One-Click Cluster Templates
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Deploy production-ready Kubernetes clusters with automated operations and maintenance included
            </p>
          </div>

          {/* Pain Point Optimization Notice */}
          {userPreferences?.primary_pain && (
            <div className="max-w-2xl mx-auto mb-8">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <WrenchScrewdriverIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-800">
                      <span className="font-medium">Optimized for:</span> Reducing{' '}
                      <span className="font-semibold text-blue-900">
                        {userPreferences.primary_pain.replace('_', ' ')}
                      </span> with automated operations
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Category Filter */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === category.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                {category.name} ({category.count})
              </button>
            ))}
          </div>
        </div>

        {/* Template Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className={`bg-white rounded-lg border-l-4 ${template.accentColor} shadow-sm p-6 cursor-pointer transition-all duration-200 hover:shadow-md ${
                selectedTemplate?.id === template.id 
                  ? 'ring-2 ring-blue-400 shadow-md' 
                  : 'hover:border-l-4'
              }`}
              onClick={() => handleTemplateSelect(template)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-semibold text-gray-900">{template.name}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${template.badgeColor}`}>
                      {template.badge}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center">
                      <ClockIcon className="h-4 w-4 mr-1" />
                      {template.deployTime}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getComplexityColor(template.complexity)}`}>
                      {template.complexity}
                    </span>
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div className="text-xl font-bold text-gray-900">{template.estimatedCost}</div>
                  <div className="text-xs text-gray-500">per month</div>
                </div>
              </div>

              {/* Resources */}
              <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="text-sm font-semibold text-gray-900">{template.resources.nodes}</div>
                  <div className="text-xs text-gray-600">Nodes</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-gray-900">{template.resources.cpu}</div>
                  <div className="text-xs text-gray-600">CPU</div>
                </div>
              </div>

              {/* Key Features */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Automated Features:</h4>
                <div className="flex flex-wrap gap-1">
                  {template.automatedTasks.slice(0, 3).map((task, index) => (
                    <span key={index} className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 text-xs rounded-md">
                      <CogIcon className="h-3 w-3 mr-1" />
                      {task}
                    </span>
                  ))}
                  {template.automatedTasks.length > 3 && (
                    <span className="text-xs text-gray-500">+{template.automatedTasks.length - 3} more</span>
                  )}
                </div>
              </div>

              {/* Use Cases */}
              <div className="border-t pt-3">
                <p className="text-xs text-gray-500 mb-1">Best for:</p>
                <p className="text-xs text-gray-700">{template.useCases.slice(0, 3).join(', ')}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Selected Template Details */}
        {selectedTemplate && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className={`w-3 h-8 rounded-full ${selectedTemplate.accentColor.replace('border-', 'bg-')}`}></div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{selectedTemplate.name}</h3>
                  <p className="text-sm text-gray-600">{selectedTemplate.category} • {selectedTemplate.deployTime} deploy • {selectedTemplate.complexity}</p>
                </div>
              </div>
              <button
                onClick={handleDeploy}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <span>Deploy Cluster</span>
                <ChevronRightIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Detailed Features */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Automated Setup Includes:</h4>
                <div className="space-y-2">
                  {selectedTemplate.automatedTasks.map((task, index) => (
                    <div key={index} className="flex items-center text-sm text-gray-700">
                      <CheckIcon className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                      {task}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Ongoing Maintenance:</h4>
                <div className="space-y-2">
                  {selectedTemplate.maintenanceIncluded.map((maintenance, index) => (
                    <div key={index} className="flex items-center text-sm text-gray-700">
                      <WrenchScrewdriverIcon className="h-4 w-4 text-blue-500 mr-2 flex-shrink-0" />
                      {maintenance}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClusterTemplates;
