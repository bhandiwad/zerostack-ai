"""
Organization Management Service
Handles organization creation, management, and resource limits
"""

import uuid
import re
from datetime import datetime, timedelta
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine

from src.models.organization import Organization, SubscriptionTier, OrganizationStatus, AuditLog

class OrganizationService:
    def __init__(self, database_url='sqlite:///cluster_api.db'):
        self.engine = create_engine(database_url)
        self.Session = sessionmaker(bind=self.engine)
    
    def create_organization(self, name, contact_email, description="", 
                          subscription_tier=SubscriptionTier.FREE, created_by=None):
        """Create a new organization"""
        session = self.Session()
        try:
            # Generate URL-friendly slug
            slug = self._generate_slug(name)
            
            # Check if slug already exists
            existing_org = session.query(Organization).filter(Organization.slug == slug).first()
            if existing_org:
                # Add random suffix if slug exists
                slug = f"{slug}-{str(uuid.uuid4())[:8]}"
            
            # Set resource limits based on subscription tier
            limits = self._get_subscription_limits(subscription_tier)
            
            # Create organization
            organization = Organization(
                id=str(uuid.uuid4()),
                name=name,
                slug=slug,
                description=description,
                contact_email=contact_email,
                subscription_tier=subscription_tier,
                status=OrganizationStatus.TRIAL,
                trial_ends_at=datetime.utcnow() + timedelta(days=14),  # 14-day trial
                max_clusters=limits['max_clusters'],
                max_nodes_per_cluster=limits['max_nodes_per_cluster'],
                max_users=limits['max_users'],
                max_cloud_accounts=limits['max_cloud_accounts'],
                created_by=created_by
            )
            
            session.add(organization)
            session.commit()
            
            self._log_action(session, organization.id, 'organization.create', 
                           'organization', organization.id, created_by, 'success')
            
            return organization.to_dict(), None
            
        except Exception as e:
            session.rollback()
            return None, f"Organization creation error: {str(e)}"
        finally:
            session.close()
    
    def get_organization(self, organization_id):
        """Get organization by ID"""
        session = self.Session()
        try:
            organization = session.query(Organization).filter(
                Organization.id == organization_id
            ).first()
            
            if not organization:
                return None, "Organization not found"
            
            return organization.to_dict(), None
            
        except Exception as e:
            return None, f"Error fetching organization: {str(e)}"
        finally:
            session.close()
    
    def get_organization_by_slug(self, slug):
        """Get organization by slug"""
        session = self.Session()
        try:
            organization = session.query(Organization).filter(
                Organization.slug == slug
            ).first()
            
            if not organization:
                return None, "Organization not found"
            
            return organization.to_dict(), None
            
        except Exception as e:
            return None, f"Error fetching organization: {str(e)}"
        finally:
            session.close()
    
    def update_organization(self, organization_id, updates, updated_by):
        """Update organization information"""
        session = self.Session()
        try:
            organization = session.query(Organization).filter(
                Organization.id == organization_id
            ).first()
            
            if not organization:
                return None, "Organization not found"
            
            # Update allowed fields
            allowed_fields = ['name', 'description', 'contact_email', 'billing_email', 
                            'phone', 'address']
            
            for field, value in updates.items():
                if field in allowed_fields and hasattr(organization, field):
                    setattr(organization, field, value)
            
            organization.updated_at = datetime.utcnow()
            session.commit()
            
            self._log_action(session, organization_id, 'organization.update', 
                           'organization', organization_id, updated_by, 'success')
            
            return organization.to_dict(), None
            
        except Exception as e:
            session.rollback()
            return None, f"Organization update error: {str(e)}"
        finally:
            session.close()
    
    def upgrade_subscription(self, organization_id, new_tier, updated_by):
        """Upgrade organization subscription"""
        session = self.Session()
        try:
            organization = session.query(Organization).filter(
                Organization.id == organization_id
            ).first()
            
            if not organization:
                return None, "Organization not found"
            
            # Get new limits
            limits = self._get_subscription_limits(new_tier)
            
            # Update subscription
            old_tier = organization.subscription_tier
            organization.subscription_tier = new_tier
            organization.status = OrganizationStatus.ACTIVE
            organization.subscription_ends_at = datetime.utcnow() + timedelta(days=365)  # 1 year
            
            # Update resource limits
            organization.max_clusters = limits['max_clusters']
            organization.max_nodes_per_cluster = limits['max_nodes_per_cluster']
            organization.max_users = limits['max_users']
            organization.max_cloud_accounts = limits['max_cloud_accounts']
            
            organization.updated_at = datetime.utcnow()
            session.commit()
            
            self._log_action(session, organization_id, 'organization.subscription_upgrade', 
                           'organization', organization_id, updated_by, 'success',
                           f"Upgraded from {old_tier.value} to {new_tier.value}")
            
            return organization.to_dict(), None
            
        except Exception as e:
            session.rollback()
            return None, f"Subscription upgrade error: {str(e)}"
        finally:
            session.close()
    
    def get_resource_usage(self, organization_id):
        """Get organization resource usage"""
        session = self.Session()
        try:
            organization = session.query(Organization).filter(
                Organization.id == organization_id
            ).first()
            
            if not organization:
                return None, "Organization not found"
            
            usage = organization.get_resource_usage()
            
            # Add additional usage statistics
            from models.organization import Cluster, User, CloudAccount
            
            # Get cluster statistics
            clusters = session.query(Cluster).filter(
                Cluster.organization_id == organization_id
            ).all()
            
            cluster_stats = {
                'total_nodes': sum(cluster.node_count or 0 for cluster in clusters),
                'by_provider': {},
                'by_status': {}
            }
            
            for cluster in clusters:
                # Count by provider
                provider = cluster.provider
                if provider not in cluster_stats['by_provider']:
                    cluster_stats['by_provider'][provider] = 0
                cluster_stats['by_provider'][provider] += 1
                
                # Count by status
                status = cluster.status
                if status not in cluster_stats['by_status']:
                    cluster_stats['by_status'][status] = 0
                cluster_stats['by_status'][status] += 1
            
            usage['cluster_stats'] = cluster_stats
            
            return usage, None
            
        except Exception as e:
            return None, f"Error fetching resource usage: {str(e)}"
        finally:
            session.close()
    
    def list_organizations(self, limit=50, offset=0, status_filter=None):
        """List all organizations (super admin only)"""
        session = self.Session()
        try:
            query = session.query(Organization)
            
            if status_filter:
                query = query.filter(Organization.status == status_filter)
            
            total = query.count()
            organizations = query.offset(offset).limit(limit).all()
            
            return {
                'organizations': [org.to_dict() for org in organizations],
                'total': total,
                'limit': limit,
                'offset': offset
            }, None
            
        except Exception as e:
            return None, f"Error listing organizations: {str(e)}"
        finally:
            session.close()
    
    def suspend_organization(self, organization_id, suspended_by, reason=""):
        """Suspend organization"""
        session = self.Session()
        try:
            organization = session.query(Organization).filter(
                Organization.id == organization_id
            ).first()
            
            if not organization:
                return None, "Organization not found"
            
            organization.status = OrganizationStatus.SUSPENDED
            organization.updated_at = datetime.utcnow()
            
            session.commit()
            
            self._log_action(session, organization_id, 'organization.suspend', 
                           'organization', organization_id, suspended_by, 'success', reason)
            
            return organization.to_dict(), None
            
        except Exception as e:
            session.rollback()
            return None, f"Organization suspension error: {str(e)}"
        finally:
            session.close()
    
    def reactivate_organization(self, organization_id, reactivated_by):
        """Reactivate suspended organization"""
        session = self.Session()
        try:
            organization = session.query(Organization).filter(
                Organization.id == organization_id
            ).first()
            
            if not organization:
                return None, "Organization not found"
            
            organization.status = OrganizationStatus.ACTIVE
            organization.updated_at = datetime.utcnow()
            
            session.commit()
            
            self._log_action(session, organization_id, 'organization.reactivate', 
                           'organization', organization_id, reactivated_by, 'success')
            
            return organization.to_dict(), None
            
        except Exception as e:
            session.rollback()
            return None, f"Organization reactivation error: {str(e)}"
        finally:
            session.close()
    
    def delete_organization(self, organization_id, deleted_by):
        """Delete organization (soft delete by setting status)"""
        session = self.Session()
        try:
            organization = session.query(Organization).filter(
                Organization.id == organization_id
            ).first()
            
            if not organization:
                return None, "Organization not found"
            
            # Check if organization has active resources
            from models.organization import Cluster, User
            
            active_clusters = session.query(Cluster).filter(
                Cluster.organization_id == organization_id,
                Cluster.status.in_(['running', 'pending', 'creating'])
            ).count()
            
            if active_clusters > 0:
                return None, f"Cannot delete organization with {active_clusters} active clusters"
            
            active_users = session.query(User).filter(
                User.organization_id == organization_id,
                User.status == 'active'
            ).count()
            
            if active_users > 1:  # Allow deletion if only one user (the deleter)
                return None, f"Cannot delete organization with {active_users} active users"
            
            # Mark as expired instead of hard delete
            organization.status = OrganizationStatus.EXPIRED
            organization.updated_at = datetime.utcnow()
            
            session.commit()
            
            self._log_action(session, organization_id, 'organization.delete', 
                           'organization', organization_id, deleted_by, 'success')
            
            return organization.to_dict(), None
            
        except Exception as e:
            session.rollback()
            return None, f"Organization deletion error: {str(e)}"
        finally:
            session.close()
    
    def _generate_slug(self, name):
        """Generate URL-friendly slug from organization name"""
        # Convert to lowercase and replace spaces with hyphens
        slug = re.sub(r'[^a-zA-Z0-9\s-]', '', name.lower())
        slug = re.sub(r'\s+', '-', slug)
        slug = re.sub(r'-+', '-', slug)
        slug = slug.strip('-')
        
        # Ensure minimum length
        if len(slug) < 3:
            slug = f"org-{str(uuid.uuid4())[:8]}"
        
        return slug[:50]  # Limit length
    
    def _get_subscription_limits(self, tier):
        """Get resource limits for subscription tier"""
        limits = {
            SubscriptionTier.FREE: {
                'max_clusters': 3,
                'max_nodes_per_cluster': 5,
                'max_users': 5,
                'max_cloud_accounts': 2
            },
            SubscriptionTier.STARTER: {
                'max_clusters': 10,
                'max_nodes_per_cluster': 20,
                'max_users': 15,
                'max_cloud_accounts': 5
            },
            SubscriptionTier.PROFESSIONAL: {
                'max_clusters': 50,
                'max_nodes_per_cluster': 100,
                'max_users': 50,
                'max_cloud_accounts': 15
            },
            SubscriptionTier.ENTERPRISE: {
                'max_clusters': 999,
                'max_nodes_per_cluster': 500,
                'max_users': 200,
                'max_cloud_accounts': 50
            }
        }
        
        return limits.get(tier, limits[SubscriptionTier.FREE])
    
    def _log_action(self, session, organization_id, action, resource_type, 
                   resource_id, user_id, status, metadata=None):
        """Log organization action"""
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

