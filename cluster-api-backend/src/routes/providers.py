from flask import Blueprint, request, jsonify
from src.models.cluster import db, ProviderFlavor, CloudAccount
from src.services.cluster_api_service import cluster_api_service
import json
import asyncio

providers_bp = Blueprint('providers', __name__)

# Provider information
@providers_bp.route('/providers', methods=['GET'])
def get_providers():
    """Get all available cloud providers"""
    try:
        providers = [
            {
                'id': 'aws',
                'name': 'Amazon Web Services',
                'displayName': 'AWS',
                'icon': '☁️',
                'description': 'Amazon Web Services cloud platform',
                'regions': [
                    'us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1',
                    'us-east-2', 'us-west-1', 'eu-central-1', 'ap-northeast-1'
                ],
                'features': ['EKS', 'EC2', 'GPU Instances', 'Spot Instances']
            },
            {
                'id': 'gcp',
                'name': 'Google Cloud Platform',
                'displayName': 'Google Cloud',
                'icon': '☁️',
                'description': 'Google Cloud Platform services',
                'regions': [
                    'us-central1', 'us-east1', 'europe-west1', 'asia-southeast1',
                    'us-west1', 'europe-west2', 'asia-northeast1', 'australia-southeast1'
                ],
                'features': ['GKE', 'Compute Engine', 'TPU', 'Preemptible VMs']
            },
            {
                'id': 'azure',
                'name': 'Microsoft Azure',
                'displayName': 'Azure',
                'icon': '☁️',
                'description': 'Microsoft Azure cloud services',
                'regions': [
                    'eastus', 'westus2', 'westeurope', 'southeastasia',
                    'centralus', 'northeurope', 'eastasia', 'australiaeast'
                ],
                'features': ['AKS', 'Virtual Machines', 'GPU VMs', 'Spot VMs']
            },
            {
                'id': 'vmware',
                'name': 'VMware vSphere',
                'displayName': 'VMware',
                'icon': '🖥️',
                'description': 'VMware vSphere virtualization platform',
                'regions': [
                    'datacenter-1', 'datacenter-2', 'datacenter-3'
                ],
                'features': ['vSphere', 'vCenter', 'DRS', 'HA']
            },
            {
                'id': 'on-premises',
                'name': 'On-Premises',
                'displayName': 'On-Premises',
                'icon': '🏢',
                'description': 'On-premises bare metal infrastructure',
                'regions': [
                    'datacenter-1', 'datacenter-2', 'edge-location-1'
                ],
                'features': ['Bare Metal', 'Custom Hardware', 'Local Storage']
            },
            {
                'id': 'sify',
                'name': 'Sify Cloud',
                'displayName': 'Sify Cloud',
                'icon': '🟢',
                'description': 'Sify Technologies cloud platform with GPU acceleration',
                'regions': [
                    'mumbai-1', 'chennai-1', 'bangalore-1', 'delhi-1',
                    'pune-1', 'hyderabad-1', 'kolkata-1'
                ],
                'features': ['GPU Clusters', 'AI/ML Workloads', 'High Performance Computing', 'Edge Computing']
            }
        ]
        
        return jsonify({
            'success': True,
            'data': providers
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@providers_bp.route('/providers/<provider_id>/regions', methods=['GET'])
def get_provider_regions(provider_id):
    """Get regions for a specific provider from Cluster-API"""
    try:
        # Use asyncio to call the async service method
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            regions = loop.run_until_complete(
                cluster_api_service.get_provider_regions(provider_id)
            )
        finally:
            loop.close()
        
        return jsonify({
            'success': True,
            'data': regions,
            'cached': True,  # Indicate if data was from cache
            'provider': provider_id
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@providers_bp.route('/providers/<provider_id>/regions/refresh', methods=['POST'])
def refresh_provider_regions(provider_id):
    """Force refresh regions for a provider"""
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            regions = loop.run_until_complete(
                cluster_api_service.get_provider_regions(provider_id, force_refresh=True)
            )
        finally:
            loop.close()
        
        return jsonify({
            'success': True,
            'data': regions,
            'message': f'Regions refreshed for {provider_id}',
            'cached': False
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@providers_bp.route('/providers/<provider_id>/flavors', methods=['GET'])
def get_provider_flavors(provider_id):
    """Get available machine types/flavors for a provider from Cluster-API"""
    try:
        region = request.args.get('region')
        category = request.args.get('category')  # general, compute, memory, gpu, storage
        limit = request.args.get('limit', 20, type=int)
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            machine_types = loop.run_until_complete(
                cluster_api_service.get_provider_machine_types(provider_id, region)
            )
        finally:
            loop.close()
        
        # Filter by category if specified
        if category and category != 'all':
            machine_types = [
                mt for mt in machine_types 
                if mt.get('category') == category
            ]
        
        # Limit results
        if limit > 0:
            machine_types = machine_types[:limit]
        
        return jsonify({
            'success': True,
            'data': machine_types,
            'total': len(machine_types),
            'filters': {
                'region': region,
                'category': category,
                'limit': limit
            },
            'provider': provider_id
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@providers_bp.route('/providers/<provider_id>/flavors/refresh', methods=['POST'])
def refresh_provider_flavors(provider_id):
    """Force refresh machine types for a provider"""
    try:
        region = request.args.get('region')
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            machine_types = loop.run_until_complete(
                cluster_api_service.get_provider_machine_types(
                    provider_id, region, force_refresh=True
                )
            )
        finally:
            loop.close()
        
        return jsonify({
            'success': True,
            'data': machine_types,
            'message': f'Machine types refreshed for {provider_id}',
            'cached': False,
            'region': region
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@providers_bp.route('/providers/<provider_id>/versions', methods=['GET'])
def get_kubernetes_versions(provider_id):
    """Get supported Kubernetes versions for a provider"""
    try:
        region = request.args.get('region')
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            versions = loop.run_until_complete(
                cluster_api_service.get_kubernetes_versions(provider_id, region)
            )
        finally:
            loop.close()
        
        return jsonify({
            'success': True,
            'data': versions,
            'provider': provider_id,
            'region': region
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@providers_bp.route('/providers/<provider_id>/refresh', methods=['POST'])
def refresh_all_provider_data(provider_id):
    """Refresh all data for a provider (regions, flavors, versions)"""
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                cluster_api_service.refresh_provider_data(provider_id)
            )
        finally:
            loop.close()
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@providers_bp.route('/providers/<provider_id>/flavors', methods=['POST'])
def create_provider_flavor(provider_id):
    """Create a new flavor for a provider"""
    try:
        data = request.get_json()
        
        flavor = ProviderFlavor(
            id=f"{provider_id}-{data['name']}",
            provider=provider_id,
            name=data['name'],
            display_name=data['displayName'],
            cpu_cores=data['resources']['cpu'],
            memory_gb=data['resources']['memory'],
            storage_gb=data['resources']['storage'],
            gpu_count=data['resources'].get('gpu', {}).get('count', 0),
            gpu_type=data['resources'].get('gpu', {}).get('type'),
            gpu_memory_gb=data['resources'].get('gpu', {}).get('memory'),
            hourly_cost=data['pricing']['hourly'],
            monthly_cost=data['pricing']['monthly'],
            regions=json.dumps(data.get('regions', [])),
            category=data.get('category', 'general'),
            description=data.get('description', '')
        )
        
        db.session.add(flavor)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': flavor.to_dict(),
            'message': 'Flavor created successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@providers_bp.route('/cost/estimate', methods=['POST'])
def estimate_cost():
    """Estimate cost for cluster configuration using dynamic pricing"""
    try:
        data = request.get_json()
        
        provider = data.get('provider')
        flavor_id = data.get('flavor')
        node_count = data.get('nodeCount', 1)
        duration_hours = data.get('durationHours', 24)
        region = data.get('region')
        
        # Get machine type information from Cluster-API service
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            machine_types = loop.run_until_complete(
                cluster_api_service.get_provider_machine_types(provider, region)
            )
        finally:
            loop.close()
        
        # Find the specific flavor
        flavor = None
        for mt in machine_types:
            if mt.get('id') == flavor_id:
                flavor = mt
                break
        
        if not flavor:
            # Fallback to database or default pricing
            db_flavor = ProviderFlavor.query.get(flavor_id)
            if db_flavor:
                hourly_cost = db_flavor.hourly_cost
                monthly_cost = db_flavor.monthly_cost
            else:
                hourly_cost = 0.10  # Default fallback
                monthly_cost = 73.00
        else:
            hourly_cost = flavor.get('pricing', {}).get('hourly', 0.10)
            monthly_cost = flavor.get('pricing', {}).get('monthly', 73.00)
        
        # Calculate costs
        total_hourly = hourly_cost * node_count
        total_monthly = monthly_cost * node_count
        estimated_cost = total_hourly * duration_hours
        
        # Add additional costs based on provider
        networking_cost = total_hourly * 0.1  # 10% of compute cost
        storage_cost = node_count * 0.01 * duration_hours  # $0.01 per hour per node
        
        # Provider-specific additional costs
        if provider == 'aws':
            # AWS data transfer costs
            data_transfer_cost = node_count * 0.005 * duration_hours
        elif provider == 'gcp':
            # GCP network egress costs
            data_transfer_cost = node_count * 0.004 * duration_hours
        elif provider == 'azure':
            # Azure bandwidth costs
            data_transfer_cost = node_count * 0.006 * duration_hours
        elif provider == 'sify':
            # Sify has competitive pricing with lower data transfer costs
            data_transfer_cost = node_count * 0.002 * duration_hours
        else:
            data_transfer_cost = node_count * 0.005 * duration_hours
        
        total_estimated = estimated_cost + networking_cost + storage_cost + data_transfer_cost
        
        # Calculate savings for longer commitments
        savings = {}
        if duration_hours >= 24 * 30:  # Monthly commitment
            savings['monthly'] = total_estimated * 0.15  # 15% discount
        if duration_hours >= 24 * 365:  # Annual commitment
            savings['annual'] = total_estimated * 0.30  # 30% discount
        
        return jsonify({
            'success': True,
            'data': {
                'compute': {
                    'hourly': total_hourly,
                    'monthly': total_monthly,
                    'estimated': estimated_cost
                },
                'networking': networking_cost,
                'storage': storage_cost,
                'dataTransfer': data_transfer_cost,
                'total': total_estimated,
                'savings': savings,
                'breakdown': {
                    'nodeCount': node_count,
                    'durationHours': duration_hours,
                    'costPerNodeHour': hourly_cost,
                    'costPerNodeMonth': monthly_cost,
                    'provider': provider,
                    'region': region,
                    'flavor': flavor_id
                }
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

