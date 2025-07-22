"""
Organization Management API Routes
Handles organization operations, resource usage, and subscription management
"""

from flask import Blueprint, request, jsonify
from services.auth_service import require_auth, require_role, require_organization_access
from services.organization_service import OrganizationService
from models.organization import SubscriptionTier, OrganizationStatus

org_bp = Blueprint('organization', __name__)

def get_organization_service():
    """Get OrganizationService instance"""
    return OrganizationService(database_url='sqlite:///cluster_api_multitenant.db')

@org_bp.route('/organization', methods=['GET'])
@require_auth
@require_organization_access
def get_current_organization(current_organization_id, current_user_id, current_user_role):
    """Get current user's organization information"""
    try:
        org_service = get_organization_service()
        organization, error = org_service.get_organization(current_organization_id)
        
        if error:
            return jsonify({
                'success': False,
                'error': error
            }), 404
        
        return jsonify({
            'success': True,
            'data': organization
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error fetching organization: {str(e)}'
        }), 500

@org_bp.route('/organization', methods=['PUT'])
@require_auth
@require_role(['org_admin', 'super_admin'])
@require_organization_access
def update_organization(current_organization_id, current_user_id, current_user_role):
    """Update organization information"""
    try:
        data = request.get_json()
        
        # Only allow updating specific fields
        allowed_updates = {}
        allowed_fields = ['name', 'description', 'contact_email', 'billing_email', 'phone', 'address']
        
        for field in allowed_fields:
            if field in data:
                allowed_updates[field] = data[field]
        
        if not allowed_updates:
            return jsonify({
                'success': False,
                'error': 'No valid fields to update'
            }), 400
        
        org_service = get_organization_service()
        organization, error = org_service.update_organization(
            current_organization_id, 
            allowed_updates, 
            current_user_id
        )
        
        if error:
            return jsonify({
                'success': False,
                'error': error
            }), 400
        
        return jsonify({
            'success': True,
            'data': organization
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Organization update error: {str(e)}'
        }), 500

@org_bp.route('/organization/usage', methods=['GET'])
@require_auth
@require_organization_access
def get_resource_usage(current_organization_id, current_user_id, current_user_role):
    """Get organization resource usage"""
    try:
        org_service = get_organization_service()
        usage, error = org_service.get_resource_usage(current_organization_id)
        
        if error:
            return jsonify({
                'success': False,
                'error': error
            }), 404
        
        return jsonify({
            'success': True,
            'data': usage
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error fetching resource usage: {str(e)}'
        }), 500

@org_bp.route('/organization/upgrade', methods=['POST'])
@require_auth
@require_role(['org_admin', 'super_admin'])
@require_organization_access
def upgrade_subscription(current_organization_id, current_user_id, current_user_role):
    """Upgrade organization subscription"""
    try:
        data = request.get_json()
        new_tier = data.get('subscription_tier')
        
        if not new_tier:
            return jsonify({
                'success': False,
                'error': 'Subscription tier is required'
            }), 400
        
        # Validate subscription tier
        try:
            tier = SubscriptionTier(new_tier)
        except ValueError:
            return jsonify({
                'success': False,
                'error': f'Invalid subscription tier: {new_tier}'
            }), 400
        
        org_service = get_organization_service()
        organization, error = org_service.upgrade_subscription(
            current_organization_id, 
            tier, 
            current_user_id
        )
        
        if error:
            return jsonify({
                'success': False,
                'error': error
            }), 400
        
        return jsonify({
            'success': True,
            'data': organization,
            'message': f'Successfully upgraded to {tier.value} tier'
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Subscription upgrade error: {str(e)}'
        }), 500

@org_bp.route('/organizations', methods=['GET'])
@require_auth
@require_role(['super_admin'])
def list_organizations():
    """List all organizations (super admin only)"""
    try:
        # Get query parameters
        limit = request.args.get('limit', 50, type=int)
        offset = request.args.get('offset', 0, type=int)
        status_filter = request.args.get('status')
        
        # Validate status filter
        if status_filter:
            try:
                OrganizationStatus(status_filter)
            except ValueError:
                return jsonify({
                    'success': False,
                    'error': f'Invalid status filter: {status_filter}'
                }), 400
        
        org_service = get_organization_service()
        result, error = org_service.list_organizations(limit, offset, status_filter)
        
        if error:
            return jsonify({
                'success': False,
                'error': error
            }), 500
        
        return jsonify({
            'success': True,
            'data': result
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error listing organizations: {str(e)}'
        }), 500

@org_bp.route('/organizations/<organization_id>', methods=['GET'])
@require_auth
@require_role(['super_admin'])
def get_organization_by_id(organization_id):
    """Get organization by ID (super admin only)"""
    try:
        org_service = get_organization_service()
        organization, error = org_service.get_organization(organization_id)
        
        if error:
            return jsonify({
                'success': False,
                'error': error
            }), 404
        
        return jsonify({
            'success': True,
            'data': organization
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error fetching organization: {str(e)}'
        }), 500

@org_bp.route('/organizations/<organization_id>/suspend', methods=['PUT'])
@require_auth
@require_role(['super_admin'])
def suspend_organization(organization_id):
    """Suspend organization (super admin only)"""
    try:
        data = request.get_json()
        reason = data.get('reason', '') if data else ''
        
        org_service = get_organization_service()
        organization, error = org_service.suspend_organization(
            organization_id, 
            request.current_user['id'], 
            reason
        )
        
        if error:
            return jsonify({
                'success': False,
                'error': error
            }), 400
        
        return jsonify({
            'success': True,
            'data': organization,
            'message': 'Organization suspended successfully'
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Organization suspension error: {str(e)}'
        }), 500

@org_bp.route('/organizations/<organization_id>/reactivate', methods=['PUT'])
@require_auth
@require_role(['super_admin'])
def reactivate_organization(organization_id):
    """Reactivate suspended organization (super admin only)"""
    try:
        org_service = get_organization_service()
        organization, error = org_service.reactivate_organization(
            organization_id, 
            request.current_user['id']
        )
        
        if error:
            return jsonify({
                'success': False,
                'error': error
            }), 400
        
        return jsonify({
            'success': True,
            'data': organization,
            'message': 'Organization reactivated successfully'
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Organization reactivation error: {str(e)}'
        }), 500

@org_bp.route('/organizations/<organization_id>/usage', methods=['GET'])
@require_auth
@require_role(['super_admin'])
def get_organization_usage(organization_id):
    """Get organization resource usage (super admin only)"""
    try:
        org_service = get_organization_service()
        usage, error = org_service.get_resource_usage(organization_id)
        
        if error:
            return jsonify({
                'success': False,
                'error': error
            }), 404
        
        return jsonify({
            'success': True,
            'data': usage
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error fetching resource usage: {str(e)}'
        }), 500

@org_bp.route('/subscription-tiers', methods=['GET'])
def get_subscription_tiers():
    """Get available subscription tiers and their limits"""
    try:
        tiers = {
            'free': {
                'name': 'Free',
                'price': 0,
                'max_clusters': 3,
                'max_nodes_per_cluster': 5,
                'max_users': 5,
                'max_cloud_accounts': 2,
                'features': [
                    'Basic cluster management',
                    'Community support',
                    'Standard monitoring'
                ]
            },
            'starter': {
                'name': 'Starter',
                'price': 49,
                'max_clusters': 10,
                'max_nodes_per_cluster': 20,
                'max_users': 15,
                'max_cloud_accounts': 5,
                'features': [
                    'Advanced cluster management',
                    'Email support',
                    'Enhanced monitoring',
                    'Backup & restore'
                ]
            },
            'professional': {
                'name': 'Professional',
                'price': 199,
                'max_clusters': 50,
                'max_nodes_per_cluster': 100,
                'max_users': 50,
                'max_cloud_accounts': 15,
                'features': [
                    'Enterprise cluster management',
                    'Priority support',
                    'Advanced monitoring & alerting',
                    'Automated backup & restore',
                    'RBAC & audit logs',
                    'Multi-cloud cost optimization'
                ]
            },
            'enterprise': {
                'name': 'Enterprise',
                'price': 999,
                'max_clusters': 999,
                'max_nodes_per_cluster': 500,
                'max_users': 200,
                'max_cloud_accounts': 50,
                'features': [
                    'Unlimited cluster management',
                    '24/7 dedicated support',
                    'Real-time monitoring & alerting',
                    'Automated backup & disaster recovery',
                    'Advanced RBAC & compliance',
                    'Multi-cloud cost optimization',
                    'Custom integrations',
                    'SLA guarantees'
                ]
            }
        }
        
        return jsonify({
            'success': True,
            'data': tiers
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error fetching subscription tiers: {str(e)}'
        }), 500

