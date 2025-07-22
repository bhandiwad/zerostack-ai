"""
JWT Authentication Service
Handles user authentication, JWT token generation, and role-based access control
"""

import jwt
import bcrypt
import uuid
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify, current_app
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine

from models.organization import User, Organization, UserRole, UserStatus, AuditLog

class AuthService:
    def __init__(self, database_url='sqlite:///cluster_api_multitenant.db', jwt_secret_key='your-jwt-secret-key'):
        self.engine = create_engine(database_url)
        self.Session = sessionmaker(bind=self.engine)
        self.jwt_secret = jwt_secret_key
        self.jwt_algorithm = 'HS256'
        self.token_expiry_hours = 24
        
    def hash_password(self, password):
        """Hash password using bcrypt"""
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    def verify_password(self, password, hashed_password):
        """Verify password against hash"""
        return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))
    
    def generate_jwt_token(self, user):
        """Generate JWT token for authenticated user"""
        payload = {
            'user_id': user.id,
            'email': user.email,
            'organization_id': user.organization_id,
            'role': user.role.value if user.role else None,
            'exp': datetime.utcnow() + timedelta(hours=self.token_expiry_hours),
            'iat': datetime.utcnow()
        }
        
        token = jwt.encode(payload, self.jwt_secret, algorithm=self.jwt_algorithm)
        return token
    
    def decode_jwt_token(self, token):
        """Decode and validate JWT token"""
        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=[self.jwt_algorithm])
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    def authenticate_user(self, email, password, ip_address=None, user_agent=None):
        """Authenticate user with email and password"""
        session = self.Session()
        try:
            user = session.query(User).filter(User.email == email).first()
            
            if not user:
                self._log_auth_attempt(session, None, 'login_failed', 'user_not_found', 
                                     ip_address, user_agent)
                return None, "Invalid email or password"
            
            if not user.is_active():
                self._log_auth_attempt(session, user.organization_id, 'login_failed', 
                                     'user_inactive', ip_address, user_agent, user.id)
                return None, "Account is inactive or locked"
            
            if not self.verify_password(password, user.password_hash):
                # Increment failed login attempts
                user.failed_login_attempts += 1
                if user.failed_login_attempts >= 5:
                    user.locked_until = datetime.utcnow() + timedelta(minutes=30)
                
                session.commit()
                self._log_auth_attempt(session, user.organization_id, 'login_failed', 
                                     'invalid_password', ip_address, user_agent, user.id)
                return None, "Invalid email or password"
            
            # Reset failed attempts on successful login
            user.failed_login_attempts = 0
            user.locked_until = None
            user.last_login_at = datetime.utcnow()
            session.commit()
            
            # Generate JWT token
            token = self.generate_jwt_token(user)
            
            self._log_auth_attempt(session, user.organization_id, 'login_success', 
                                 'authenticated', ip_address, user_agent, user.id)
            
            return {
                'token': token,
                'user': user.to_dict(),
                'organization': user.organization.to_dict() if user.organization else None
            }, None
            
        except Exception as e:
            session.rollback()
            return None, f"Authentication error: {str(e)}"
        finally:
            session.close()
    
    def create_user(self, email, password, first_name, last_name, organization_id, 
                   role=UserRole.DEVELOPER, invited_by=None):
        """Create new user account"""
        session = self.Session()
        try:
            # Check if user already exists
            existing_user = session.query(User).filter(User.email == email).first()
            if existing_user:
                return None, "User with this email already exists"
            
            # Check organization limits
            organization = session.query(Organization).filter(Organization.id == organization_id).first()
            if not organization:
                return None, "Organization not found"
            
            if not organization.can_add_user():
                return None, f"Organization has reached the user limit ({organization.max_users})"
            
            # Create user
            user = User(
                id=str(uuid.uuid4()),
                email=email,
                password_hash=self.hash_password(password),
                first_name=first_name,
                last_name=last_name,
                organization_id=organization_id,
                role=role,
                status=UserStatus.ACTIVE,
                activated_at=datetime.utcnow(),
                invited_by=invited_by
            )
            
            session.add(user)
            session.commit()
            
            self._log_action(session, organization_id, 'user.create', 'user', user.id, 
                           invited_by, 'success')
            
            return user.to_dict(), None
            
        except Exception as e:
            session.rollback()
            return None, f"User creation error: {str(e)}"
        finally:
            session.close()
    
    def invite_user(self, email, first_name, last_name, organization_id, role, invited_by):
        """Send user invitation"""
        session = self.Session()
        try:
            # Check if user already exists
            existing_user = session.query(User).filter(User.email == email).first()
            if existing_user:
                return None, "User with this email already exists"
            
            # Check organization limits
            organization = session.query(Organization).filter(Organization.id == organization_id).first()
            if not organization:
                return None, "Organization not found"
            
            if not organization.can_add_user():
                return None, f"Organization has reached the user limit ({organization.max_users})"
            
            # Generate invitation token
            invitation_token = str(uuid.uuid4())
            
            # Create pending user
            user = User(
                id=str(uuid.uuid4()),
                email=email,
                password_hash="",  # Will be set when user accepts invitation
                first_name=first_name,
                last_name=last_name,
                organization_id=organization_id,
                role=role,
                status=UserStatus.PENDING,
                invitation_token=invitation_token,
                invitation_sent_at=datetime.utcnow(),
                invited_by=invited_by
            )
            
            session.add(user)
            session.commit()
            
            self._log_action(session, organization_id, 'user.invite', 'user', user.id, 
                           invited_by, 'success')
            
            # In a real implementation, you would send an email here
            invitation_link = f"https://your-domain.com/accept-invitation?token={invitation_token}"
            
            return {
                'user': user.to_dict(),
                'invitation_token': invitation_token,
                'invitation_link': invitation_link
            }, None
            
        except Exception as e:
            session.rollback()
            return None, f"Invitation error: {str(e)}"
        finally:
            session.close()
    
    def accept_invitation(self, invitation_token, password):
        """Accept user invitation and set password"""
        session = self.Session()
        try:
            user = session.query(User).filter(
                User.invitation_token == invitation_token,
                User.status == UserStatus.PENDING
            ).first()
            
            if not user:
                return None, "Invalid or expired invitation token"
            
            # Check if invitation is still valid (e.g., within 7 days)
            if user.invitation_sent_at:
                expiry_date = user.invitation_sent_at + timedelta(days=7)
                if datetime.utcnow() > expiry_date:
                    return None, "Invitation has expired"
            
            # Activate user
            user.password_hash = self.hash_password(password)
            user.status = UserStatus.ACTIVE
            user.activated_at = datetime.utcnow()
            user.invitation_token = None
            
            session.commit()
            
            self._log_action(session, user.organization_id, 'user.activate', 'user', 
                           user.id, user.id, 'success')
            
            return user.to_dict(), None
            
        except Exception as e:
            session.rollback()
            return None, f"Invitation acceptance error: {str(e)}"
        finally:
            session.close()
    
    def get_user_by_id(self, user_id):
        """Get user by ID"""
        session = self.Session()
        try:
            user = session.query(User).filter(User.id == user_id).first()
            return user.to_dict() if user else None
        finally:
            session.close()
    
    def get_organization_users(self, organization_id, current_user_id=None):
        """Get all users in an organization"""
        session = self.Session()
        try:
            users = session.query(User).filter(User.organization_id == organization_id).all()
            return [user.to_dict() for user in users]
        finally:
            session.close()
    
    def update_user_role(self, user_id, new_role, updated_by):
        """Update user role"""
        session = self.Session()
        try:
            user = session.query(User).filter(User.id == user_id).first()
            if not user:
                return None, "User not found"
            
            old_role = user.role
            user.role = new_role
            user.updated_at = datetime.utcnow()
            
            session.commit()
            
            self._log_action(session, user.organization_id, 'user.role_update', 'user', 
                           user.id, updated_by, 'success', 
                           f"Role changed from {old_role.value} to {new_role.value}")
            
            return user.to_dict(), None
            
        except Exception as e:
            session.rollback()
            return None, f"Role update error: {str(e)}"
        finally:
            session.close()
    
    def deactivate_user(self, user_id, deactivated_by):
        """Deactivate user account"""
        session = self.Session()
        try:
            user = session.query(User).filter(User.id == user_id).first()
            if not user:
                return None, "User not found"
            
            user.status = UserStatus.INACTIVE
            user.updated_at = datetime.utcnow()
            
            session.commit()
            
            self._log_action(session, user.organization_id, 'user.deactivate', 'user', 
                           user.id, deactivated_by, 'success')
            
            return user.to_dict(), None
            
        except Exception as e:
            session.rollback()
            return None, f"User deactivation error: {str(e)}"
        finally:
            session.close()
    
    def _log_auth_attempt(self, session, organization_id, action, status, 
                         ip_address=None, user_agent=None, user_id=None):
        """Log authentication attempt"""
        try:
            log_entry = AuditLog(
                id=str(uuid.uuid4()),
                organization_id=organization_id,
                user_id=user_id,
                action=action,
                resource_type='authentication',
                ip_address=ip_address,
                user_agent=user_agent,
                status=status
            )
            session.add(log_entry)
            session.commit()
        except Exception:
            # Don't fail the main operation if logging fails
            pass
    
    def _log_action(self, session, organization_id, action, resource_type, 
                   resource_id, user_id, status, metadata=None):
        """Log user action"""
        try:
            log_entry = AuditLog(
                id=str(uuid.uuid4()),
                organization_id=organization_id,
                user_id=user_id,
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                status=status,
                metadata=metadata
            )
            session.add(log_entry)
            session.commit()
        except Exception:
            # Don't fail the main operation if logging fails
            pass

def require_auth(f):
    """Decorator to require authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = None
        
        # Get token from Authorization header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]  # Bearer <token>
            except IndexError:
                return jsonify({'error': 'Invalid authorization header format'}), 401
        
        if not token:
            return jsonify({'error': 'Authentication token is missing'}), 401
        
        try:
            auth_service = AuthService(
                current_app.config.get('DATABASE_URL', 'sqlite:///cluster_api_multitenant.db'),
                current_app.config.get('JWT_SECRET_KEY', 'your-jwt-secret-key-change-in-production')
            )
            
            payload = auth_service.decode_jwt_token(token)
            if not payload:
                return jsonify({'error': 'Invalid or expired token'}), 401
            
            # Add user info to request context
            request.current_user = {
                'id': payload['user_id'],
                'email': payload['email'],
                'organization_id': payload['organization_id'],
                'role': payload['role']
            }
            
        except Exception as e:
            return jsonify({'error': f'Token validation error: {str(e)}'}), 401
        
        return f(*args, **kwargs)
    
    return decorated_function

def require_role(required_roles):
    """Decorator to require specific roles"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not hasattr(request, 'current_user'):
                return jsonify({'error': 'Authentication required'}), 401
            
            user_role = request.current_user.get('role')
            if user_role not in required_roles:
                return jsonify({'error': 'Insufficient permissions'}), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def require_organization_access(f):
    """Decorator to ensure user can only access their organization's resources"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not hasattr(request, 'current_user'):
            return jsonify({'error': 'Authentication required'}), 401
        
        # Add organization_id to kwargs for the route handler
        kwargs['current_organization_id'] = request.current_user['organization_id']
        kwargs['current_user_id'] = request.current_user['id']
        kwargs['current_user_role'] = request.current_user['role']
        
        return f(*args, **kwargs)
    
    return decorated_function



def log_audit_action(user_id, organization_id, action, resource_type, resource_id, details=None):
    """Log audit action for compliance tracking"""
    try:
        auth_service = AuthService()
        session = auth_service.Session()
        
        log_entry = AuditLog(
            id=str(uuid.uuid4()),
            organization_id=organization_id,
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            status='success',
            audit_metadata=str(details) if details else None
        )
        session.add(log_entry)
        session.commit()
        session.close()
    except Exception as e:
        # Don't fail the main operation if logging fails
        print(f"Audit logging failed: {e}")
        pass

