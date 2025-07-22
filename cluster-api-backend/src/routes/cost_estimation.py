from flask import Blueprint, request, jsonify, current_app
from src.services.infrastructure_provisioner import InfrastructureProvisioner
import logging

logger = logging.getLogger(__name__)

cost_bp = Blueprint('cost_estimation', __name__)

def get_infra_provisioner():
    """Get infrastructure provisioner with proper app context"""
    return InfrastructureProvisioner()

@cost_bp.route('/cost/estimate', methods=['POST'])
def estimate_cluster_cost():
    """Estimate cost for cluster configuration"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['provider', 'region']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400
        
        # Prepare cluster configuration for cost estimation
        cluster_config = {
            'name': data.get('name', 'cost-estimate'),
            'provider': data['provider'],
            'region': data['region'],
            'control_plane_replicas': data.get('control_plane_replicas', 1),
            'worker_replicas': data.get('worker_replicas', 2),
            'enable_gpu': data.get('enable_gpu', False)
        }
        
        # Add provider-specific configuration for cost calculation
        if data['provider'] == 'aws':
            cluster_config.update({
                'control_plane_instance_type': data.get('control_plane_instance_type', 't3.medium'),
                'worker_instance_type': data.get('worker_instance_type', 't3.medium'),
                'gpu_instance_type': data.get('gpu_instance_type', 'p3.2xlarge')
            })
        elif data['provider'] == 'gcp':
            cluster_config.update({
                'control_plane_machine_type': data.get('control_plane_machine_type', 'e2-medium'),
                'worker_machine_type': data.get('worker_machine_type', 'e2-medium'),
                'gpu_machine_type': data.get('gpu_machine_type', 'a2-highgpu-1g')
            })
        elif data['provider'] == 'azure':
            cluster_config.update({
                'control_plane_vm_size': data.get('control_plane_vm_size', 'Standard_B2s'),
                'worker_vm_size': data.get('worker_vm_size', 'Standard_B2s'),
                'gpu_vm_size': data.get('gpu_vm_size', 'Standard_NC6')
            })
        elif data['provider'] == 'sify':
            cluster_config.update({
                'control_plane_flavor': data.get('control_plane_flavor', 'sify.medium'),
                'worker_flavor': data.get('worker_flavor', 'sify.medium'),
                'gpu_flavor': data.get('gpu_flavor', 'sify.gpu.t4')
            })
        elif data['provider'] == 'vsphere':
            cluster_config.update({
                'control_plane_cpu': data.get('control_plane_cpu', 2),
                'control_plane_memory': data.get('control_plane_memory', 4096),
                'worker_cpu': data.get('worker_cpu', 2),
                'worker_memory': data.get('worker_memory', 4096)
            })
        
        # Calculate cost estimate
        infra_provisioner = get_infra_provisioner()
        cost_result = infra_provisioner.estimate_cost(cluster_config, data['provider'])
        
        if cost_result.get('success'):
            # Add additional cost insights
            cost_data = cost_result.copy()
            
            # Calculate savings for different commitment levels
            hourly_cost = cost_data['cost_per_hour']
            cost_data['savings_estimates'] = {
                'monthly_commitment': {
                    'cost_per_hour': round(hourly_cost * 0.85, 4),  # 15% discount
                    'cost_per_month': round(hourly_cost * 0.85 * 24 * 30, 2),
                    'savings_percent': 15
                },
                'annual_commitment': {
                    'cost_per_hour': round(hourly_cost * 0.70, 4),  # 30% discount
                    'cost_per_month': round(hourly_cost * 0.70 * 24 * 30, 2),
                    'savings_percent': 30
                }
            }
            
            # Add cost optimization recommendations
            cost_data['recommendations'] = []
            
            if data['provider'] == 'aws':
                if cluster_config.get('worker_instance_type', 't3.medium') in ['t3.large', 't3.xlarge']:
                    cost_data['recommendations'].append({
                        'type': 'instance_optimization',
                        'message': 'Consider using m5 instances for better price/performance ratio',
                        'potential_savings': '10-15%'
                    })
                
                if cluster_config.get('enable_gpu'):
                    cost_data['recommendations'].append({
                        'type': 'gpu_optimization',
                        'message': 'Use Spot instances for GPU workloads to save up to 70%',
                        'potential_savings': '50-70%'
                    })
            
            elif data['provider'] == 'sify':
                cost_data['recommendations'].append({
                    'type': 'sify_advantage',
                    'message': 'Sify Cloud offers competitive pricing with local data residency',
                    'potential_savings': '20-30% vs international providers'
                })
                
                if cluster_config.get('enable_gpu'):
                    cost_data['recommendations'].append({
                        'type': 'gpu_advantage',
                        'message': 'Sify GPU instances include optimized AI/ML frameworks',
                        'potential_savings': 'Reduced setup time and costs'
                    })
            
            # Add regional cost variations
            if data['provider'] in ['aws', 'gcp', 'azure']:
                cost_data['regional_variations'] = {
                    'current_region': data['region'],
                    'cheaper_alternatives': [
                        {'region': 'us-east-1', 'savings': '5-10%'} if data['provider'] == 'aws' else
                        {'region': 'us-central1', 'savings': '5-8%'} if data['provider'] == 'gcp' else
                        {'region': 'Central US', 'savings': '3-7%'}
                    ]
                }
            
            return jsonify({
                'success': True,
                'data': cost_data
            })
        else:
            return jsonify({
                'success': False,
                'error': cost_result.get('error', 'Cost estimation failed')
            }), 500
    
    except Exception as e:
        logger.error(f"Error estimating cost: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@cost_bp.route('/cost/compare', methods=['POST'])
def compare_provider_costs():
    """Compare costs across different providers"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['providers', 'region']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400
        
        providers = data['providers']
        if not isinstance(providers, list) or len(providers) < 2:
            return jsonify({
                'success': False,
                'error': 'At least 2 providers required for comparison'
            }), 400
        
        # Base cluster configuration
        base_config = {
            'name': 'cost-comparison',
            'region': data['region'],
            'control_plane_replicas': data.get('control_plane_replicas', 1),
            'worker_replicas': data.get('worker_replicas', 2),
            'enable_gpu': data.get('enable_gpu', False)
        }
        
        comparison_results = []
        
        for provider in providers:
            cluster_config = base_config.copy()
            cluster_config['provider'] = provider
            
            # Set provider-specific defaults for fair comparison
            if provider == 'aws':
                cluster_config.update({
                    'control_plane_instance_type': 't3.medium',
                    'worker_instance_type': 't3.medium',
                    'gpu_instance_type': 'p3.2xlarge'
                })
            elif provider == 'gcp':
                cluster_config.update({
                    'control_plane_machine_type': 'e2-medium',
                    'worker_machine_type': 'e2-medium',
                    'gpu_machine_type': 'a2-highgpu-1g'
                })
            elif provider == 'azure':
                cluster_config.update({
                    'control_plane_vm_size': 'Standard_B2s',
                    'worker_vm_size': 'Standard_B2s',
                    'gpu_vm_size': 'Standard_NC6'
                })
            elif provider == 'sify':
                cluster_config.update({
                    'control_plane_flavor': 'sify.medium',
                    'worker_flavor': 'sify.medium',
                    'gpu_flavor': 'sify.gpu.t4'
                })
            elif provider == 'vsphere':
                cluster_config.update({
                    'control_plane_cpu': 2,
                    'control_plane_memory': 4096,
                    'worker_cpu': 2,
                    'worker_memory': 4096
                })
            
            # Calculate cost for this provider
            infra_provisioner = get_infra_provisioner()
            cost_result = infra_provisioner.estimate_cost(cluster_config, provider)
            
            if cost_result.get('success'):
                comparison_results.append({
                    'provider': provider,
                    'cost_per_hour': cost_result['cost_per_hour'],
                    'cost_per_month': cost_result['cost_per_month'],
                    'breakdown': cost_result['breakdown']
                })
            else:
                comparison_results.append({
                    'provider': provider,
                    'error': cost_result.get('error', 'Cost calculation failed')
                })
        
        # Sort by cost (lowest first)
        valid_results = [r for r in comparison_results if 'cost_per_hour' in r]
        valid_results.sort(key=lambda x: x['cost_per_hour'])
        
        # Calculate savings compared to most expensive
        if len(valid_results) > 1:
            most_expensive = max(valid_results, key=lambda x: x['cost_per_hour'])
            for result in valid_results:
                if result['provider'] != most_expensive['provider']:
                    savings = most_expensive['cost_per_hour'] - result['cost_per_hour']
                    savings_percent = (savings / most_expensive['cost_per_hour']) * 100
                    result['savings_vs_most_expensive'] = {
                        'amount': round(savings, 4),
                        'percent': round(savings_percent, 1)
                    }
        
        return jsonify({
            'success': True,
            'data': {
                'comparison': comparison_results,
                'cheapest': valid_results[0] if valid_results else None,
                'most_expensive': valid_results[-1] if valid_results else None,
                'configuration': base_config
            }
        })
    
    except Exception as e:
        logger.error(f"Error comparing costs: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@cost_bp.route('/cost/optimization', methods=['POST'])
def get_cost_optimization():
    """Get cost optimization recommendations"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['provider', 'current_config']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400
        
        provider = data['provider']
        current_config = data['current_config']
        
        recommendations = []
        
        # Provider-specific optimization recommendations
        if provider == 'aws':
            # Instance type optimization
            current_instance = current_config.get('worker_instance_type', 't3.medium')
            if current_instance.startswith('t3'):
                recommendations.append({
                    'type': 'instance_type',
                    'title': 'Consider M5 instances for consistent workloads',
                    'description': 'M5 instances offer better price/performance for steady-state workloads',
                    'potential_savings': '10-15%',
                    'recommendation': current_instance.replace('t3', 'm5')
                })
            
            # Spot instance recommendation
            if current_config.get('enable_gpu'):
                recommendations.append({
                    'type': 'spot_instances',
                    'title': 'Use Spot instances for GPU workloads',
                    'description': 'GPU Spot instances can reduce costs significantly for fault-tolerant workloads',
                    'potential_savings': '50-70%',
                    'recommendation': 'Enable Spot instances for worker nodes'
                })
            
            # Reserved instance recommendation
            recommendations.append({
                'type': 'reserved_instances',
                'title': 'Consider Reserved Instances for long-term workloads',
                'description': '1-year or 3-year commitments can provide significant savings',
                'potential_savings': '30-60%',
                'recommendation': 'Evaluate Reserved Instance options'
            })
        
        elif provider == 'gcp':
            # Sustained use discounts
            recommendations.append({
                'type': 'sustained_use',
                'title': 'Automatic sustained use discounts',
                'description': 'GCP automatically applies discounts for sustained usage',
                'potential_savings': '20-30%',
                'recommendation': 'No action needed - automatic discounts apply'
            })
            
            # Committed use discounts
            recommendations.append({
                'type': 'committed_use',
                'title': 'Committed use discounts',
                'description': '1-year or 3-year commitments for predictable workloads',
                'potential_savings': '35-55%',
                'recommendation': 'Consider committed use contracts'
            })
        
        elif provider == 'azure':
            # Azure Reserved VM Instances
            recommendations.append({
                'type': 'reserved_instances',
                'title': 'Azure Reserved VM Instances',
                'description': 'Pre-pay for VM usage to get significant discounts',
                'potential_savings': '40-60%',
                'recommendation': 'Evaluate 1-year or 3-year reservations'
            })
            
            # Azure Hybrid Benefit
            recommendations.append({
                'type': 'hybrid_benefit',
                'title': 'Azure Hybrid Benefit',
                'description': 'Use existing Windows Server licenses on Azure',
                'potential_savings': '40%',
                'recommendation': 'Apply existing licenses if available'
            })
        
        elif provider == 'sify':
            # Sify-specific optimizations
            recommendations.append({
                'type': 'local_advantage',
                'title': 'Local data residency benefits',
                'description': 'Sify Cloud offers competitive pricing with data staying in India',
                'potential_savings': '20-30%',
                'recommendation': 'Leverage local presence for compliance and cost benefits'
            })
            
            # GPU optimization for AI/ML
            if current_config.get('enable_gpu'):
                recommendations.append({
                    'type': 'ai_ml_optimization',
                    'title': 'Optimized AI/ML stack',
                    'description': 'Sify GPU instances come with pre-configured AI/ML frameworks',
                    'potential_savings': 'Reduced setup time',
                    'recommendation': 'Use Sify AI/ML optimized images'
                })
        
        elif provider == 'vsphere':
            # On-premises optimization
            recommendations.append({
                'type': 'resource_pooling',
                'title': 'Optimize resource allocation',
                'description': 'Use resource pools and DRS for better utilization',
                'potential_savings': '15-25%',
                'recommendation': 'Enable DRS and create resource pools'
            })
            
            recommendations.append({
                'type': 'storage_optimization',
                'title': 'Storage tiering',
                'description': 'Use appropriate storage tiers for different workloads',
                'potential_savings': '20-40%',
                'recommendation': 'Implement storage policy-based management'
            })
        
        # General recommendations for all providers
        recommendations.extend([
            {
                'type': 'right_sizing',
                'title': 'Right-size your instances',
                'description': 'Monitor resource usage and adjust instance sizes accordingly',
                'potential_savings': '20-30%',
                'recommendation': 'Use monitoring tools to identify over-provisioned resources'
            },
            {
                'type': 'auto_scaling',
                'title': 'Implement auto-scaling',
                'description': 'Automatically scale resources based on demand',
                'potential_savings': '25-40%',
                'recommendation': 'Configure cluster autoscaler and HPA'
            },
            {
                'type': 'scheduling',
                'title': 'Optimize workload scheduling',
                'description': 'Use node affinity and resource requests/limits effectively',
                'potential_savings': '15-25%',
                'recommendation': 'Implement proper resource management policies'
            }
        ])
        
        return jsonify({
            'success': True,
            'data': {
                'provider': provider,
                'recommendations': recommendations,
                'total_potential_savings': '30-60%',
                'priority_actions': recommendations[:3]  # Top 3 recommendations
            }
        })
    
    except Exception as e:
        logger.error(f"Error getting cost optimization: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

