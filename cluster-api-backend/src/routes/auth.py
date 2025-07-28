"""
Authentication API Routes
Handles login, registration, user management, and organization operations
"""

from flask import Blueprint, request, jsonify
from src.services.auth_service import AuthService, require_auth, require_role, require_organization_access
from src.models.organization import UserRole, UserStatus
import uuid

auth_bp = Blueprint('auth', __name__)

def get_auth_service():
    """Get AuthService instance"""
    return AuthService(
        database_url='sqlite:///cluster_api_multitenant.db',
        jwt_secret_key='your-jwt-secret-key-change-in-production'
    )

@auth_bp.route('/login', methods=['POST'])
def login():
    """User login endpoint"""
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({
                'success': False,
                'error': 'Email and password are required'
            }), 400
        
        auth_service = get_auth_service()
        result, error = auth_service.authenticate_user(
            email=email,
            password=password,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        
        if error:
            return jsonify({
                'success': False,
                'error': error
            }), 401
        
        return jsonify({
            'success': True,
            'data': result
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Login error: {str(e)}'
        }), 500

@auth_bp.route('/register', methods=['POST'])
def register():
    """User registration endpoint (creates new organization)"""
    try:
        data = request.get_json()
        
        # User information
        email = data.get('email')
        password = data.get('password')
        first_name = data.get('first_name')
        last_name = data.get('last_name')
        
        # Organization information
        org_name = data.get('organization_name')
        org_description = data.get('organization_description', '')
        
        if not all([email, password, first_name, last_name, org_name]):
            return jsonify({
                'success': False,
                'error': 'All required fields must be provided'
            }), 400
        
        # Create organization first
        from services.organization_service import OrganizationService
        org_service = OrganizationService()
        
        organization, org_error = org_service.create_organization(
            name=org_name,
            description=org_description,
            contact_email=email
        )
        
        if org_error:
            return jsonify({
                'success': False,
                'error': org_error
            }), 400
        
        # Create user as organization admin
        auth_service = get_auth_service()
        user, user_error = auth_service.create_user(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            organization_id=organization['id'],
            role=UserRole.ORG_ADMIN
        )
        
        if user_error:
            return jsonify({
                'success': False,
                'error': user_error
            }), 400
        
        # Generate JWT token for immediate login
        from models.organization import User
        from sqlalchemy.orm import sessionmaker
        from sqlalchemy import create_engine
        
        engine = create_engine('sqlite:///cluster_api_multitenant.db')
        Session = sessionmaker(bind=engine)
        session = Session()
        
        try:
            user_obj = session.query(User).filter(User.id == user['id']).first()
            token = auth_service.generate_jwt_token(user_obj)
            
            return jsonify({
                'success': True,
                'data': {
                    'token': token,
                    'user': user,
                    'organization': organization
                }
            }), 201
            
        finally:
            session.close()
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Registration error: {str(e)}'
        }), 500

@auth_bp.route('/me', methods=['GET'])
@require_auth
def get_current_user():
    """Get current user information"""
    try:
        auth_service = get_auth_service()
        user = auth_service.get_user_by_id(request.current_user['id'])
        
        if not user:
            return jsonify({
                'success': False,
                'error': 'User not found'
            }), 404
        
        return jsonify({
            'success': True,
            'data': user
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error fetching user: {str(e)}'
        }), 500

@auth_bp.route('/users', methods=['GET'])
@require_auth
@require_organization_access
def get_organization_users(current_organization_id, current_user_id, current_user_role):
    """Get all users in the current organization"""
    try:
        auth_service = get_auth_service()
        users = auth_service.get_organization_users(current_organization_id)
        
        return jsonify({
            'success': True,
            'data': users,
            'total': len(users)
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error fetching users: {str(e)}'
        }), 500

@auth_bp.route('/users/invite', methods=['POST'])
@require_auth
@require_role(['org_admin', 'super_admin'])
@require_organization_access
def invite_user(current_organization_id, current_user_id, current_user_role):
    """Invite a new user to the organization"""
    try:
        data = request.get_json()
        
        email = data.get('email')
        first_name = data.get('first_name')
        last_name = data.get('last_name')
        role = data.get('role', 'developer')
        
        if not all([email, first_name, last_name]):
            return jsonify({
                'success': False,
                'error': 'Email, first name, and last name are required'
            }), 400
        
        # Validate role
        try:
            user_role = UserRole(role)
        except ValueError:
            return jsonify({
                'success': False,
                'error': f'Invalid role: {role}'
            }), 400
        
        # Only super_admin can create org_admin or super_admin users
        if user_role in [UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN] and current_user_role != 'super_admin':
            return jsonify({
                'success': False,
                'error': 'Insufficient permissions to assign this role'
            }), 403
        
        auth_service = get_auth_service()
        result, error = auth_service.invite_user(
            email=email,
            first_name=first_name,
            last_name=last_name,
            organization_id=current_organization_id,
            role=user_role,
            invited_by=current_user_id
        )
        
        if error:
            return jsonify({
                'success': False,
                'error': error
            }), 400
        
        return jsonify({
            'success': True,
            'data': result
        }), 201
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Invitation error: {str(e)}'
        }), 500

@auth_bp.route('/users/accept-invitation', methods=['POST'])
def accept_invitation():
    """Accept user invitation"""
    try:
        data = request.get_json()
        
        invitation_token = data.get('invitation_token')
        password = data.get('password')
        
        if not all([invitation_token, password]):
            return jsonify({
                'success': False,
                'error': 'Invitation token and password are required'
            }), 400
        
        auth_service = get_auth_service()
        user, error = auth_service.accept_invitation(invitation_token, password)
        
        if error:
            return jsonify({
                'success': False,
                'error': error
            }), 400
        
        return jsonify({
            'success': True,
            'data': user,
            'message': 'Invitation accepted successfully. You can now log in.'
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Invitation acceptance error: {str(e)}'
        }), 500

@auth_bp.route('/users/<user_id>/role', methods=['PUT'])
@require_auth
@require_role(['org_admin', 'super_admin'])
@require_organization_access
def update_user_role(user_id, current_organization_id, current_user_id, current_user_role):
    """Update user role"""
    try:
        data = request.get_json()
        new_role = data.get('role')
        
        if not new_role:
            return jsonify({
                'success': False,
                'error': 'Role is required'
            }), 400
        
        # Validate role
        try:
            user_role = UserRole(new_role)
        except ValueError:
            return jsonify({
                'success': False,
                'error': f'Invalid role: {new_role}'
            }), 400
        
        # Only super_admin can assign org_admin or super_admin roles
        if user_role in [UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN] and current_user_role != 'super_admin':
            return jsonify({
                'success': False,
                'error': 'Insufficient permissions to assign this role'
            }), 403
        
        auth_service = get_auth_service()
        user, error = auth_service.update_user_role(user_id, user_role, current_user_id)
        
        if error:
            return jsonify({
                'success': False,
                'error': error
            }), 400
        
        return jsonify({
            'success': True,
            'data': user
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Role update error: {str(e)}'
        }), 500

@auth_bp.route('/users/<user_id>/deactivate', methods=['PUT'])
@require_auth
@require_role(['org_admin', 'super_admin'])
@require_organization_access
def deactivate_user(user_id, current_organization_id, current_user_id, current_user_role):
    """Deactivate user account"""
    try:
        # Prevent self-deactivation
        if user_id == current_user_id:
            return jsonify({
                'success': False,
                'error': 'Cannot deactivate your own account'
            }), 400
        
        auth_service = get_auth_service()
        user, error = auth_service.deactivate_user(user_id, current_user_id)
        
        if error:
            return jsonify({
                'success': False,
                'error': error
            }), 400
        
        return jsonify({
            'success': True,
            'data': user
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'User deactivation error: {str(e)}'
        }), 500

@auth_bp.route('/change-password', methods=['PUT'])
@require_auth
def change_password():
    """Change user password"""
    try:
        data = request.get_json()
        
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        
        if not all([current_password, new_password]):
            return jsonify({
                'success': False,
                'error': 'Current password and new password are required'
            }), 400
        
        # Verify current password
        auth_service = get_auth_service()
        result, error = auth_service.authenticate_user(
            email=request.current_user['email'],
            password=current_password
        )
        
        if error:
            return jsonify({
                'success': False,
                'error': 'Current password is incorrect'
            }), 400
        
        # Update password
        from models.organization import User
        from sqlalchemy.orm import sessionmaker
        from sqlalchemy import create_engine
        from datetime import datetime
        
        engine = create_engine('sqlite:///cluster_api_multitenant.db')
        Session = sessionmaker(bind=engine)
        session = Session()
        
        try:
            user = session.query(User).filter(User.id == request.current_user['id']).first()
            if user:
                user.password_hash = auth_service.hash_password(new_password)
                user.password_changed_at = datetime.utcnow()
                session.commit()
                
                return jsonify({
                    'success': True,
                    'message': 'Password changed successfully'
                }), 200
            else:
                return jsonify({
                    'success': False,
                    'error': 'User not found'
                }), 404
                
        finally:
            session.close()
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Password change error: {str(e)}'
        }), 500

@auth_bp.route('/logout', methods=['POST'])
@require_auth
def logout():
    """User logout endpoint"""
    try:
        # In a real implementation, you might want to blacklist the token
        # For now, we'll just return success
        return jsonify({
            'success': True,
            'message': 'Logged out successfully'
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Logout error: {str(e)}'
        }), 500

