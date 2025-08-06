from flask import Blueprint, request, jsonify
from src.extensions import db
from src.models.cluster import Cluster, ClusterMetrics, Alert, CloudAccount, ProviderFlavor
from src.services.kubernetes_client import KubernetesClient, ClusterAPIManager
import uuid
import json
from datetime import datetime, timedelta
import random

clusters_bp = Blueprint('clusters', __name__)

# Initialize Kubernetes client and Cluster-API manager
k8s_client = None  # Initialize as None, will be instantiated on demand
cluster_api_manager = None

def get_cluster_api_manager():
    """Get a singleton instance of the ClusterAPIManager."""
    global k8s_client, cluster_api_manager
    if k8s_client is None:
        k8s_client = KubernetesClient()
    if cluster_api_manager is None:
        cluster_api_manager = ClusterAPIManager(k8s_client)
    return cluster_api_manager

# Cluster CRUD operations
@clusters_bp.route('/clusters', methods=['GET'])
def get_clusters():
    """Get all clusters with optional filtering"""
    try:
        provider = request.args.get('provider')
        status = request.args.get('status')
        search = request.args.get('search')
        
        try:
            query = Cluster.query
            
            if provider and provider != 'all':
                query = query.filter(Cluster.provider == provider)
            
            if status and status != 'all':
                query = query.filter(Cluster.status == status)
                
            if search:
                query = query.filter(Cluster.name.contains(search))
            
            clusters = query.order_by(Cluster.created_at.desc()).all()
            
            return jsonify({
                'success': True,
                'data': [cluster.to_dict() for cluster in clusters],
                'total': len(clusters)
            })
        except Exception as db_error:
            # If database error, return empty list for development
            print(f"Database error: {db_error}")
            return jsonify({
                'success': True,
                'data': [],
                'total': 0
            })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@clusters_bp.route('/clusters', methods=['POST'])
def create_cluster():
    """Create a new cluster"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'provider', 'region', 'version', 'topology']
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'error': f'Missing required field: {field}'}), 400
        
        # Check if cluster name already exists
        existing = Cluster.query.filter_by(name=data['name']).first()
        if existing:
            return jsonify({'success': False, 'error': 'Cluster name already exists'}), 400
        
        # Calculate cost based on flavor
        flavor_id = data.get('flavor')
        flavor = None
        if flavor_id:
            flavor = ProviderFlavor.query.get(flavor_id)
        
        # Create new cluster
        cluster = Cluster(
            id=str(uuid.uuid4()),
            name=data['name'],
            provider=data['provider'],
            region=data['region'],
            version=data['version'],
            topology=data['topology'],
            node_count=data.get('nodeCount', 1),
            cpu_cores=flavor.cpu_cores if flavor else data.get('cpuCores', 2),
            memory_gb=flavor.memory_gb if flavor else data.get('memoryGb', 4),
            storage_gb=flavor.storage_gb if flavor else data.get('storageGb', 20),
            gpu_count=flavor.gpu_count if flavor else data.get('gpuCount', 0),
            gpu_type=flavor.gpu_type if flavor else data.get('gpuType'),
            hourly_cost=flavor.hourly_cost if flavor else data.get('hourlyCost', 0.0),
            monthly_cost=flavor.monthly_cost if flavor else data.get('monthlyCost', 0.0),
            configuration=json.dumps(data.get('configuration', {})),
            cloud_account_id=data.get('cloudAccountId'),
            created_by=data.get('createdBy', 'admin'),
            status='pending'
        )
        
        db.session.add(cluster)
        db.session.commit()
        
        # Simulate cluster creation process
        # In real implementation, this would trigger Cluster-API operations
        
        return jsonify({
            'success': True,
            'data': cluster.to_dict(),
            'message': 'Cluster creation initiated'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@clusters_bp.route('/clusters/<cluster_id>', methods=['GET'])
def get_cluster(cluster_id):
    """Get specific cluster details"""
    try:
        cluster = Cluster.query.get(cluster_id)
        if not cluster:
            return jsonify({'success': False, 'error': 'Cluster not found'}), 404
        
        return jsonify({
            'success': True,
            'data': cluster.to_dict()
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@clusters_bp.route('/clusters/<cluster_id>', methods=['PUT'])
def update_cluster(cluster_id):
    """Update cluster configuration"""
    try:
        cluster = Cluster.query.get(cluster_id)
        if not cluster:
            return jsonify({'success': False, 'error': 'Cluster not found'}), 404
        
        data = request.get_json()
        
        # Update allowed fields
        if 'nodeCount' in data:
            cluster.node_count = data['nodeCount']
        if 'configuration' in data:
            cluster.configuration = json.dumps(data['configuration'])
        
        cluster.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': cluster.to_dict(),
            'message': 'Cluster updated successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@clusters_bp.route('/clusters/<string:cluster_id>', methods=['DELETE'])
def delete_cluster(cluster_id):
    """Delete a cluster"""
    try:
        cluster = Cluster.query.get(cluster_id)
        if not cluster:
            return jsonify({'success': False, 'error': 'Cluster not found'}), 404

        manager = get_cluster_api_manager()
        if not manager.k8s_client.is_connected():
            # For disconnected state, we can still remove it from our DB
            db.session.delete(cluster)
            db.session.commit()
            return jsonify({'success': True, 'message': 'Cluster removed from database (Kubernetes not connected)'})

        success, message = manager.delete_cluster(cluster.name, getattr(cluster, 'namespace', 'default'))
        if not success:
            return jsonify({'success': False, 'error': message}), 500

        db.session.delete(cluster)
        db.session.commit()

        return jsonify({'success': True, 'message': 'Cluster deletion initiated'})

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

# Cluster operations
@clusters_bp.route('/clusters/<string:cluster_id>/start', methods=['POST'])
def start_cluster(cluster_id):
    """Start a stopped cluster"""
    try:
        cluster = Cluster.query.get(cluster_id)
        if not cluster:
            return jsonify({'success': False, 'error': 'Cluster not found'}), 404

        if cluster.status == 'running':
            return jsonify({'success': False, 'error': 'Cluster is already running'}), 400

        # Placeholder for starting logic, as ClusterAPIManager doesn't have `start_cluster`
        cluster.status = 'starting'
        cluster.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Cluster start initiated',
            'data': cluster.to_dict()
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@clusters_bp.route('/clusters/<string:cluster_id>/stop', methods=['POST'])
def stop_cluster(cluster_id):
    """Stop a running cluster"""
    try:
        cluster = Cluster.query.get(cluster_id)
        if not cluster:
            return jsonify({'success': False, 'error': 'Cluster not found'}), 404

        if cluster.status == 'stopped':
            return jsonify({'success': False, 'error': 'Cluster is already stopped'}), 400

        # Placeholder for stopping logic, as ClusterAPIManager doesn't have `stop_cluster`
        cluster.status = 'stopping'
        cluster.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Cluster stop initiated',
            'data': cluster.to_dict()
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@clusters_bp.route('/clusters/<string:cluster_id>/scale', methods=['POST'])
def scale_cluster(cluster_id):
    """Scale cluster nodes"""
    try:
        cluster = Cluster.query.get(cluster_id)
        if not cluster:
            return jsonify({'success': False, 'error': 'Cluster not found'}), 404

        data = request.get_json()
        new_node_count = data.get('nodeCount')

        if not isinstance(new_node_count, int) or new_node_count < 0:
            return jsonify({'success': False, 'error': 'Invalid node count'}), 400

        manager = get_cluster_api_manager()
        if not manager.k8s_client.is_connected():
            return jsonify({'success': False, 'error': 'Kubernetes cluster not configured or accessible.'}), 503

        old_count = cluster.node_count
        success, message = manager.scale_cluster(
            cluster_name=cluster.name,
            namespace=getattr(cluster, 'namespace', 'default'),
            worker_count=new_node_count
        )

        if not success:
            return jsonify({'success': False, 'error': message}), 500

        cluster.node_count = new_node_count
        cluster.status = 'scaling'
        cluster.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Cluster scaling initiated',
            'data': cluster.to_dict()
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

# Metrics and monitoring
@clusters_bp.route('/metrics/clusters', methods=['GET'])
def get_cluster_metrics():
    """Get overall cluster metrics"""
    try:
        # Get cluster counts by status
        total_clusters = Cluster.query.count()
        running_clusters = Cluster.query.filter_by(status='running').count()
        pending_clusters = Cluster.query.filter_by(status='pending').count()
        failed_clusters = Cluster.query.filter_by(status='failed').count()
        
        # Get recent metrics for running clusters
        recent_metrics = ClusterMetrics.query.filter(
            ClusterMetrics.timestamp >= datetime.utcnow() - timedelta(hours=1)
        ).all()
        
        # Calculate average resource usage
        avg_cpu = sum(m.cpu_usage for m in recent_metrics) / len(recent_metrics) if recent_metrics else 0
        avg_memory = sum(m.memory_usage for m in recent_metrics) / len(recent_metrics) if recent_metrics else 0
        avg_storage = sum(m.storage_usage for m in recent_metrics) / len(recent_metrics) if recent_metrics else 0
        
        return jsonify({
            'success': True,
            'data': {
                'clusters': {
                    'total': total_clusters,
                    'running': running_clusters,
                    'pending': pending_clusters,
                    'failed': failed_clusters
                },
                'resources': {
                    'cpu': round(avg_cpu, 1),
                    'memory': round(avg_memory, 1),
                    'storage': round(avg_storage, 1)
                }
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@clusters_bp.route('/metrics/clusters/<cluster_id>', methods=['GET'])
def get_cluster_specific_metrics(cluster_id):
    """Get metrics for a specific cluster"""
    try:
        cluster = Cluster.query.get(cluster_id)
        if not cluster:
            return jsonify({'success': False, 'error': 'Cluster not found'}), 404
        
        # Get recent metrics
        time_range = request.args.get('range', '1h')
        hours = {'5m': 0.083, '1h': 1, '24h': 24, '7d': 168}.get(time_range, 1)
        
        metrics = ClusterMetrics.query.filter(
            ClusterMetrics.cluster_id == cluster_id,
            ClusterMetrics.timestamp >= datetime.utcnow() - timedelta(hours=hours)
        ).order_by(ClusterMetrics.timestamp.desc()).limit(100).all()
        
        return jsonify({
            'success': True,
            'data': [metric.to_dict() for metric in metrics]
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# Alerts
@clusters_bp.route('/alerts', methods=['GET'])
def get_alerts():
    """Get all alerts"""
    try:
        dismissed = request.args.get('dismissed', 'false').lower() == 'true'
        
        query = Alert.query
        if not dismissed:
            query = query.filter_by(dismissed=False)
        
        alerts = query.order_by(Alert.timestamp.desc()).limit(50).all()
        
        return jsonify({
            'success': True,
            'data': [alert.to_dict() for alert in alerts]
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@clusters_bp.route('/alerts/<alert_id>/dismiss', methods=['POST'])
def dismiss_alert(alert_id):
    """Dismiss an alert"""
    try:
        alert = Alert.query.get(alert_id)
        if not alert:
            return jsonify({'success': False, 'error': 'Alert not found'}), 404
        
        data = request.get_json()
        alert.dismissed = True
        alert.dismissed_at = datetime.utcnow()
        alert.dismissed_by = data.get('dismissedBy', 'admin')
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Alert dismissed successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

