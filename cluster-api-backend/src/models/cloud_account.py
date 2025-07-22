from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json
from cryptography.fernet import Fernet
import os
import base64

db = SQLAlchemy()

class CloudAccount(db.Model):
    """Model for storing cloud provider account credentials"""
    __tablename__ = 'cloud_accounts'
    
    id = db.Column(db.String(36), primary_key=True)
    user_id = db.Column(db.String(36), nullable=False)  # For RBAC
    provider = db.Column(db.String(50), nullable=False)  # aws, gcp, azure, sify, vmware, onprem
    account_name = db.Column(db.String(100), nullable=False)
    account_id = db.Column(db.String(100), nullable=True)  # Provider account ID
    region = db.Column(db.String(50), nullable=True)  # Default region
    
    # Encrypted credentials
    credentials_encrypted = db.Column(db.Text, nullable=False)
    
    # Metadata
    status = db.Column(db.String(20), default='active')  # active, inactive, error
    last_validated = db.Column(db.DateTime, nullable=True)
    validation_error = db.Column(db.Text, nullable=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __init__(self, **kwargs):
        super(CloudAccount, self).__init__(**kwargs)
        if not self.id:
            import uuid
            self.id = str(uuid.uuid4())
    
    @staticmethod
    def get_encryption_key():
        """Get or create encryption key for credentials"""
        key_file = '/tmp/cluster_api_key.key'
        if os.path.exists(key_file):
            with open(key_file, 'rb') as f:
                return f.read()
        else:
            key = Fernet.generate_key()
            with open(key_file, 'wb') as f:
                f.write(key)
            return key
    
    def encrypt_credentials(self, credentials_dict):
        """Encrypt credentials dictionary"""
        key = self.get_encryption_key()
        fernet = Fernet(key)
        credentials_json = json.dumps(credentials_dict)
        encrypted = fernet.encrypt(credentials_json.encode())
        self.credentials_encrypted = base64.b64encode(encrypted).decode()
    
    def decrypt_credentials(self):
        """Decrypt and return credentials dictionary"""
        try:
            key = self.get_encryption_key()
            fernet = Fernet(key)
            encrypted_data = base64.b64decode(self.credentials_encrypted.encode())
            decrypted = fernet.decrypt(encrypted_data)
            return json.loads(decrypted.decode())
        except Exception as e:
            print(f"Error decrypting credentials: {e}")
            return {}
    
    def validate_credentials(self):
        """Validate credentials with the cloud provider"""
        credentials = self.decrypt_credentials()
        
        try:
            if self.provider == 'aws':
                return self._validate_aws_credentials(credentials)
            elif self.provider == 'gcp':
                return self._validate_gcp_credentials(credentials)
            elif self.provider == 'azure':
                return self._validate_azure_credentials(credentials)
            elif self.provider == 'sify':
                return self._validate_sify_credentials(credentials)
            elif self.provider == 'vmware':
                return self._validate_vmware_credentials(credentials)
            elif self.provider == 'onprem':
                return self._validate_onprem_credentials(credentials)
            else:
                return False, "Unsupported provider"
        except Exception as e:
            return False, str(e)
    
    def _validate_aws_credentials(self, credentials):
        """Validate AWS credentials"""
        try:
            import boto3
            from botocore.exceptions import ClientError
            
            session = boto3.Session(
                aws_access_key_id=credentials.get('access_key_id'),
                aws_secret_access_key=credentials.get('secret_access_key'),
                region_name=credentials.get('region', 'us-east-1')
            )
            
            # Test credentials by calling STS get-caller-identity
            sts = session.client('sts')
            response = sts.get_caller_identity()
            
            self.account_id = response.get('Account')
            self.last_validated = datetime.utcnow()
            self.validation_error = None
            self.status = 'active'
            
            return True, "AWS credentials validated successfully"
            
        except ClientError as e:
            error_msg = f"AWS validation failed: {e.response['Error']['Message']}"
            self.validation_error = error_msg
            self.status = 'error'
            return False, error_msg
        except Exception as e:
            error_msg = f"AWS validation error: {str(e)}"
            self.validation_error = error_msg
            self.status = 'error'
            return False, error_msg
    
    def _validate_gcp_credentials(self, credentials):
        """Validate GCP credentials"""
        try:
            from google.oauth2 import service_account
            from google.cloud import resource_manager
            
            if 'service_account_json' in credentials:
                # Service account key validation
                service_account_info = json.loads(credentials['service_account_json'])
                creds = service_account.Credentials.from_service_account_info(service_account_info)
                
                # Test credentials by listing projects
                client = resource_manager.Client(credentials=creds)
                projects = list(client.list_projects())
                
                self.account_id = service_account_info.get('project_id')
                self.last_validated = datetime.utcnow()
                self.validation_error = None
                self.status = 'active'
                
                return True, "GCP credentials validated successfully"
            else:
                return False, "GCP service account JSON required"
                
        except Exception as e:
            error_msg = f"GCP validation error: {str(e)}"
            self.validation_error = error_msg
            self.status = 'error'
            return False, error_msg
    
    def _validate_azure_credentials(self, credentials):
        """Validate Azure credentials"""
        try:
            from azure.identity import ClientSecretCredential
            from azure.mgmt.resource import ResourceManagementClient
            
            credential = ClientSecretCredential(
                tenant_id=credentials.get('tenant_id'),
                client_id=credentials.get('client_id'),
                client_secret=credentials.get('client_secret')
            )
            
            # Test credentials by listing resource groups
            resource_client = ResourceManagementClient(
                credential, 
                credentials.get('subscription_id')
            )
            
            # This will raise an exception if credentials are invalid
            list(resource_client.resource_groups.list())
            
            self.account_id = credentials.get('subscription_id')
            self.last_validated = datetime.utcnow()
            self.validation_error = None
            self.status = 'active'
            
            return True, "Azure credentials validated successfully"
            
        except Exception as e:
            error_msg = f"Azure validation error: {str(e)}"
            self.validation_error = error_msg
            self.status = 'error'
            return False, error_msg
    
    def _validate_sify_credentials(self, credentials):
        """Validate Sify Cloud credentials"""
        try:
            # For now, simulate validation
            # In production, this would call Sify's API
            api_key = credentials.get('api_key')
            api_secret = credentials.get('api_secret')
            
            if not api_key or not api_secret:
                return False, "Sify API key and secret required"
            
            # Simulate API call validation
            import time
            time.sleep(0.5)  # Simulate network call
            
            self.account_id = credentials.get('account_id', 'sify-account')
            self.last_validated = datetime.utcnow()
            self.validation_error = None
            self.status = 'active'
            
            return True, "Sify Cloud credentials validated successfully"
            
        except Exception as e:
            error_msg = f"Sify validation error: {str(e)}"
            self.validation_error = error_msg
            self.status = 'error'
            return False, error_msg
    
    def _validate_vmware_credentials(self, credentials):
        """Validate VMware vSphere credentials"""
        try:
            # For now, simulate validation
            # In production, this would connect to vCenter
            vcenter_host = credentials.get('vcenter_host')
            username = credentials.get('username')
            password = credentials.get('password')
            
            if not all([vcenter_host, username, password]):
                return False, "vCenter host, username, and password required"
            
            # Simulate vCenter connection validation
            import time
            time.sleep(0.5)  # Simulate network call
            
            self.account_id = vcenter_host
            self.last_validated = datetime.utcnow()
            self.validation_error = None
            self.status = 'active'
            
            return True, "VMware vSphere credentials validated successfully"
            
        except Exception as e:
            error_msg = f"VMware validation error: {str(e)}"
            self.validation_error = error_msg
            self.status = 'error'
            return False, error_msg
    
    def _validate_onprem_credentials(self, credentials):
        """Validate on-premises credentials"""
        try:
            # For on-premises, validate kubeconfig or SSH access
            kubeconfig = credentials.get('kubeconfig')
            ssh_host = credentials.get('ssh_host')
            
            if kubeconfig:
                # Validate kubeconfig
                import yaml
                config = yaml.safe_load(kubeconfig)
                if 'clusters' not in config:
                    return False, "Invalid kubeconfig format"
            elif ssh_host:
                # Validate SSH access (simplified)
                ssh_user = credentials.get('ssh_user')
                ssh_key = credentials.get('ssh_key')
                if not all([ssh_host, ssh_user, ssh_key]):
                    return False, "SSH host, user, and key required"
            else:
                return False, "Either kubeconfig or SSH credentials required"
            
            self.account_id = ssh_host or 'onprem-cluster'
            self.last_validated = datetime.utcnow()
            self.validation_error = None
            self.status = 'active'
            
            return True, "On-premises credentials validated successfully"
            
        except Exception as e:
            error_msg = f"On-premises validation error: {str(e)}"
            self.validation_error = error_msg
            self.status = 'error'
            return False, error_msg
    
    def to_dict(self, include_credentials=False):
        """Convert to dictionary for JSON response"""
        data = {
            'id': self.id,
            'user_id': self.user_id,
            'provider': self.provider,
            'account_name': self.account_name,
            'account_id': self.account_id,
            'region': self.region,
            'status': self.status,
            'last_validated': self.last_validated.isoformat() if self.last_validated else None,
            'validation_error': self.validation_error,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
        
        if include_credentials:
            data['credentials'] = self.decrypt_credentials()
        
        return data

class CloudAccountTemplate(db.Model):
    """Model for storing cloud account templates/presets"""
    __tablename__ = 'cloud_account_templates'
    
    id = db.Column(db.String(36), primary_key=True)
    provider = db.Column(db.String(50), nullable=False)
    template_name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    
    # Template configuration
    required_fields = db.Column(db.Text, nullable=False)  # JSON array of required fields
    optional_fields = db.Column(db.Text, nullable=True)   # JSON array of optional fields
    default_values = db.Column(db.Text, nullable=True)    # JSON object of default values
    
    # Metadata
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __init__(self, **kwargs):
        super(CloudAccountTemplate, self).__init__(**kwargs)
        if not self.id:
            import uuid
            self.id = str(uuid.uuid4())
    
    def to_dict(self):
        """Convert to dictionary for JSON response"""
        return {
            'id': self.id,
            'provider': self.provider,
            'template_name': self.template_name,
            'description': self.description,
            'required_fields': json.loads(self.required_fields) if self.required_fields else [],
            'optional_fields': json.loads(self.optional_fields) if self.optional_fields else [],
            'default_values': json.loads(self.default_values) if self.default_values else {},
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat()
        }

