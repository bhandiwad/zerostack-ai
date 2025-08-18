import React, { useState, useEffect } from 'react';
import { 
  CurrencyDollarIcon, 
  ChartBarIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

const CostEstimator = ({ template, region = 'us-east-1', duration = 'monthly' }) => {
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedRegion, setSelectedRegion] = useState(region);
  const [selectedDuration, setSelectedDuration] = useState(duration);
  const [costData, setCostData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [optimizations, setOptimizations] = useState([]);

  // Regional pricing multipliers
  const regionMultipliers = {
    'us-east-1': 1.0,
    'us-west-2': 1.05,
    'eu-west-1': 1.15,
    'ap-southeast-1': 1.20,
    'ap-northeast-1': 1.25
  };

  // Duration multipliers (discounts for longer commitments)
  const durationMultipliers = {
    'hourly': 1.0,
    'monthly': 0.85,
    'yearly': 0.65
  };

  useEffect(() => {
    if (template) {
      calculateCosts();
    }
  }, [template, selectedRegion, selectedDuration]);

  const calculateCosts = async () => {
    setLoading(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const baseCost = parseFloat(template.estimatedCost.replace(/[^0-9.-]/g, ''));
    const regionMultiplier = regionMultipliers[selectedRegion] || 1.0;
    const durationMultiplier = durationMultipliers[selectedDuration] || 1.0;

    const adjustedCost = baseCost * regionMultiplier * durationMultiplier;

    // Calculate detailed breakdown
    const breakdown = {};
    Object.entries(template.costBreakdown).forEach(([key, value]) => {
      const itemCost = parseFloat(value.replace(/[^0-9.-]/g, ''));
      breakdown[key] = (itemCost * regionMultiplier * durationMultiplier).toFixed(2);
    });

    // Generate cost optimizations
    const opts = generateOptimizations(template, adjustedCost);

    setCostData({
      totalCost: adjustedCost.toFixed(2),
      breakdown,
      savings: (baseCost - adjustedCost).toFixed(2),
      currency: 'USD'
    });
    
    setOptimizations(opts);
    setLoading(false);
  };

  const generateOptimizations = (template, currentCost) => {
    const opts = [];

    // Spot instance optimization
    if (template.tags.includes('development') || template.tags.includes('cost-optimized')) {
      opts.push({
        type: 'spot-instances',
        title: 'Use Spot Instances',
        description: 'Save up to 70% on compute costs for non-critical workloads',
        savings: (currentCost * 0.4).toFixed(2),
        impact: 'high',
        effort: 'low',
        icon: <CurrencyDollarIcon className="h-5 w-5" />
      });
    }

    // Auto-scaling optimization
    if (!template.tags.includes('auto-scaling')) {
      opts.push({
        type: 'auto-scaling',
        title: 'Enable Auto-Scaling',
        description: 'Automatically adjust resources based on demand',
        savings: (currentCost * 0.25).toFixed(2),
        impact: 'medium',
        effort: 'low',
        icon: <ChartBarIcon className="h-5 w-5" />
      });
    }

    // Reserved instances for production
    if (template.tags.includes('production')) {
      opts.push({
        type: 'reserved-instances',
        title: 'Reserved Instances',
        description: 'Commit to 1-year term for significant discounts',
        savings: (currentCost * 0.35).toFixed(2),
        impact: 'high',
        effort: 'medium',
        icon: <ClockIcon className="h-5 w-5" />
      });
    }

    // Right-sizing recommendation
    opts.push({
      type: 'right-sizing',
      title: 'Resource Right-Sizing',
      description: 'Optimize CPU and memory allocation based on usage patterns',
      savings: (currentCost * 0.15).toFixed(2),
      impact: 'medium',
      effort: 'medium',
      icon: <CheckCircleIcon className="h-5 w-5" />
    });

    return opts.slice(0, 3); // Show top 3 recommendations
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            <div className="h-3 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!costData) return null;

  const impactColors = {
    high: 'text-green-600 bg-green-50 border-green-200',
    medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    low: 'text-blue-600 bg-blue-50 border-blue-200'
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
      <div className="flex items-center mb-8">
        <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mr-3">
          <span className="text-lg text-white">💰</span>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Cost Estimator</h2>
          <p className="text-sm text-gray-600">Get accurate pricing for your deployment</p>
        </div>
      </div>
      
      {/* Template Selection */}
      <div className="mb-8">
        <label className="block text-lg font-semibold text-gray-900 mb-3">
          Select Template
        </label>
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{template.name}</h3>
          <p className="text-sm text-gray-600">{template.description}</p>
        </div>
      </div>

      {/* Region and Duration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div>
          <label className="block text-lg font-semibold text-gray-900 mb-3">
            Region
          </label>
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 text-lg"
          >
            <option value="us-east-1">US East (N. Virginia)</option>
            <option value="us-west-2">US West (Oregon)</option>
            <option value="eu-west-1">Europe (Ireland)</option>
            <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
          </select>
        </div>
        <div>
          <label className="block text-lg font-semibold text-gray-900 mb-3">
            Duration
          </label>
          <select
            value={selectedDuration}
            onChange={(e) => setSelectedDuration(e.target.value)}
            className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 text-lg"
          >
            <option value="hourly">Hourly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
      </div>

      {/* Total Cost */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold text-gray-900">
              ${costData.totalCost}
              <span className="text-lg font-normal text-gray-600">/{duration.replace('ly', '')}</span>
            </div>
            {parseFloat(costData.savings) > 0 && (
              <div className="text-sm text-green-600 font-medium">
                ${costData.savings} saved from base pricing
              </div>
            )}
          </div>
          <CurrencyDollarIcon className="h-12 w-12 text-blue-500" />
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="mb-6">
        <h4 className="text-md font-semibold text-gray-900 mb-3">Cost Breakdown</h4>
        <div className="space-y-2">
          {Object.entries(costData.breakdown).map(([item, cost]) => (
            <div key={item} className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-700 capitalize">{item.replace(/-/g, ' ')}</span>
              <span className="font-semibold">${cost}/{duration.replace('ly', '')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Cost Optimizations */}
      <div>
        <h4 className="text-md font-semibold text-gray-900 mb-3">
          Cost Optimization Recommendations
        </h4>
        <div className="space-y-3">
          {optimizations.map((opt, index) => (
            <div key={index} className={`border rounded-lg p-4 ${impactColors[opt.impact]}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="mt-1">{opt.icon}</div>
                  <div>
                    <h5 className="font-semibold">{opt.title}</h5>
                    <p className="text-sm opacity-90">{opt.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">-${opt.savings}</div>
                  <div className="text-xs opacity-75">{opt.impact} impact</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Savings Summary */}
      <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center">
          <ExclamationTriangleIcon className="h-5 w-5 text-green-600 mr-2" />
          <div className="text-sm text-green-800">
            <strong>Potential Savings:</strong> Apply all recommendations to save up to{' '}
            <span className="font-bold">
              ${optimizations.reduce((sum, opt) => sum + parseFloat(opt.savings), 0).toFixed(2)}
            </span>{' '}
            per {duration.replace('ly', '')} (
            {Math.round((optimizations.reduce((sum, opt) => sum + parseFloat(opt.savings), 0) / parseFloat(costData.totalCost)) * 100)}% reduction)
          </div>
        </div>
      </div>
    </div>
  );
};

export default CostEstimator;
