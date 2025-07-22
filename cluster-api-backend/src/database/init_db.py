"""
Database Initialization Script
Creates all tables for the multi-tenant Cluster-API platform
"""

import os
import sys
import uuid
from datetime import datetime, timedelta

# Add the parent directory to the path so we can import our models
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.organization import Base, Organization, User, AuditLog, SubscriptionTier, OrganizationStatus, UserRole, UserStatus
from services.auth_service import AuthService

def create_database_tables(database_url='sqlite:///cluster_api_multitenant.db'):
    """Create all database tables"""
    print("Creating database tables...")
    
    engine = create_engine(database_url)
    Base.metadata.create_all(engine)
    
    print("✅ Database tables created successfully!")
    return engine

def create_sample_data(engine):
    """Create sample organizations and users for testing"""
    print("Creating sample data...")
    
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        # Create Sify Technologies organization
        sify_org = Organization(
            id=str(uuid.uuid4()),
            name="Sify Technologies",
            slug="sify-technologies",
            description="Leading cloud and digital services provider in India",
            contact_email="admin@sifytechnologies.com",
            subscription_tier=SubscriptionTier.ENTERPRISE,
            status=OrganizationStatus.ACTIVE,
            trial_ends_at=None,
            subscription_ends_at=datetime.utcnow() + timedelta(days=365),
            max_clusters=999,
            max_nodes_per_cluster=500,
            max_users=200,
            max_cloud_accounts=50
        )
        session.add(sify_org)
        
        # Create Demo Company organization
        demo_org = Organization(
            id=str(uuid.uuid4()),
            name="Demo Company",
            slug="demo-company",
            description="Demo organization for testing",
            contact_email="demo@example.com",
            subscription_tier=SubscriptionTier.PROFESSIONAL,
            status=OrganizationStatus.TRIAL,
            trial_ends_at=datetime.utcnow() + timedelta(days=14),
            max_clusters=50,
            max_nodes_per_cluster=100,
            max_users=50,
            max_cloud_accounts=15
        )
        session.add(demo_org)
        
        # Create Startup organization
        startup_org = Organization(
            id=str(uuid.uuid4()),
            name="Tech Startup",
            slug="tech-startup",
            description="Small tech startup",
            contact_email="founder@techstartup.com",
            subscription_tier=SubscriptionTier.FREE,
            status=OrganizationStatus.TRIAL,
            trial_ends_at=datetime.utcnow() + timedelta(days=14),
            max_clusters=3,
            max_nodes_per_cluster=5,
            max_users=5,
            max_cloud_accounts=2
        )
        session.add(startup_org)
        
        session.commit()
        
        # Create users with proper password hashing
        auth_service = AuthService(database_url='sqlite:///cluster_api_multitenant.db', 
                                 jwt_secret_key='your-jwt-secret-key')
        
        # Sify Super Admin
        sify_admin = User(
            id=str(uuid.uuid4()),
            email="admin@sifytechnologies.com",
            password_hash=auth_service.hash_password("SifyAdmin123!"),
            first_name="Sify",
            last_name="Administrator",
            organization_id=sify_org.id,
            role=UserRole.SUPER_ADMIN,
            status=UserStatus.ACTIVE,
            activated_at=datetime.utcnow()
        )
        session.add(sify_admin)
        
        # Sify Cluster Admin
        sify_cluster_admin = User(
            id=str(uuid.uuid4()),
            email="clusters@sifytechnologies.com",
            password_hash=auth_service.hash_password("ClusterAdmin123!"),
            first_name="Cluster",
            last_name="Administrator",
            organization_id=sify_org.id,
            role=UserRole.CLUSTER_ADMIN,
            status=UserStatus.ACTIVE,
            activated_at=datetime.utcnow()
        )
        session.add(sify_cluster_admin)
        
        # Demo Organization Admin
        demo_admin = User(
            id=str(uuid.uuid4()),
            email="admin@example.com",
            password_hash=auth_service.hash_password("DemoAdmin123!"),
            first_name="Demo",
            last_name="Admin",
            organization_id=demo_org.id,
            role=UserRole.ORG_ADMIN,
            status=UserStatus.ACTIVE,
            activated_at=datetime.utcnow()
        )
        session.add(demo_admin)
        
        # Demo Developer
        demo_dev = User(
            id=str(uuid.uuid4()),
            email="developer@example.com",
            password_hash=auth_service.hash_password("DevPassword123!"),
            first_name="Demo",
            last_name="Developer",
            organization_id=demo_org.id,
            role=UserRole.DEVELOPER,
            status=UserStatus.ACTIVE,
            activated_at=datetime.utcnow()
        )
        session.add(demo_dev)
        
        # Startup Founder
        startup_founder = User(
            id=str(uuid.uuid4()),
            email="founder@techstartup.com",
            password_hash=auth_service.hash_password("StartupFounder123!"),
            first_name="Tech",
            last_name="Founder",
            organization_id=startup_org.id,
            role=UserRole.ORG_ADMIN,
            status=UserStatus.ACTIVE,
            activated_at=datetime.utcnow()
        )
        session.add(startup_founder)
        
        session.commit()
        
        print("✅ Sample data created successfully!")
        print("\n📋 Sample Login Credentials:")
        print("=" * 50)
        print("🏢 Sify Technologies (Enterprise)")
        print("   Super Admin: admin@sifytechnologies.com / SifyAdmin123!")
        print("   Cluster Admin: clusters@sifytechnologies.com / ClusterAdmin123!")
        print()
        print("🏢 Demo Company (Professional - Trial)")
        print("   Org Admin: admin@example.com / DemoAdmin123!")
        print("   Developer: developer@example.com / DevPassword123!")
        print()
        print("🏢 Tech Startup (Free - Trial)")
        print("   Founder: founder@techstartup.com / StartupFounder123!")
        print("=" * 50)
        
        return {
            'sify_org': sify_org.to_dict(),
            'demo_org': demo_org.to_dict(),
            'startup_org': startup_org.to_dict(),
            'users': [
                sify_admin.to_dict(),
                sify_cluster_admin.to_dict(),
                demo_admin.to_dict(),
                demo_dev.to_dict(),
                startup_founder.to_dict()
            ]
        }
        
    except Exception as e:
        session.rollback()
        print(f"❌ Error creating sample data: {str(e)}")
        return None
    finally:
        session.close()

def test_authentication(database_url='sqlite:///cluster_api_multitenant.db'):
    """Test the authentication system"""
    print("\n🔐 Testing Authentication System...")
    
    auth_service = AuthService(database_url, 'your-jwt-secret-key')
    
    # Test login
    result, error = auth_service.authenticate_user(
        email="admin@sifytechnologies.com",
        password="SifyAdmin123!"
    )
    
    if error:
        print(f"❌ Authentication test failed: {error}")
        return False
    
    print("✅ Authentication test passed!")
    print(f"   User: {result['user']['full_name']}")
    print(f"   Role: {result['user']['role']}")
    print(f"   Organization: {result['organization']['name']}")
    print(f"   JWT Token: {result['token'][:50]}...")
    
    # Test token validation
    payload = auth_service.decode_jwt_token(result['token'])
    if payload:
        print("✅ JWT token validation passed!")
        print(f"   Token expires: {datetime.fromtimestamp(payload['exp'])}")
    else:
        print("❌ JWT token validation failed!")
        return False
    
    return True

def main():
    """Main initialization function"""
    print("🚀 Initializing Multi-Tenant Cluster-API Database")
    print("=" * 60)
    
    # Create database tables
    database_url = 'sqlite:///cluster_api_multitenant.db'
    engine = create_database_tables(database_url)
    
    # Create sample data
    sample_data = create_sample_data(engine)
    
    if sample_data:
        # Test authentication
        auth_success = test_authentication(database_url)
        
        if auth_success:
            print("\n🎉 Multi-Tenant Database Initialization Complete!")
            print("✅ Database tables created")
            print("✅ Sample organizations and users created")
            print("✅ Authentication system tested and working")
            print("\n🌐 You can now start the Flask server and test the multi-tenant APIs!")
        else:
            print("\n❌ Authentication test failed. Please check the setup.")
    else:
        print("\n❌ Failed to create sample data. Please check the database setup.")

if __name__ == "__main__":
    main()

