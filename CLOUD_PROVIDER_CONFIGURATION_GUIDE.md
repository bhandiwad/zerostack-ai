# ZeroStack AI - Cloud Provider Configuration Guide

## 🌐 Adding New Cloud Providers

This guide explains how to integrate new cloud providers into ZeroStack AI's multi-cloud intelligence platform.

## 📋 Prerequisites

- Understanding of the target cloud provider's API
- Access to provider documentation and SDK
- Development environment setup
- Basic knowledge of Python Flask and React

## 🏗️ Architecture Overview

ZeroStack AI uses a modular provider system that allows seamless integration of new cloud platforms:

```
Backend (Python/Flask)
├── src/providers/
│   ├── base_provider.py          # Abstract base class
│   ├── aws_provider.py           # AWS implementation
│   ├── gcp_provider.py           # Google Cloud implementation
│   ├── azure_provider.py         # Azure implementation
│   └── your_provider.py          # New provider implementation
├── src/models/
│   └── cloud_account.py          # Cloud account model
└── src/routes/
    └── provider_routes.py        # API endpoints

Frontend (React)
├── src/components/providers/
│   ├── ProviderConfig.jsx        # Provider configuration UI
│   ├── CloudAccountForm.jsx      # Account creation form
│   └── ProviderSelector.jsx      # Provider selection component
└── src/api/
    └── providers.js              # Provider API client
```

## 🔧 Backend Implementation

### Step 1: Create Provider Class

Create a new file `src/providers/your_provider.py`:

```python
from .base_provider import BaseCloudProvider
from typing import List, Dict, Any
import requests

class YourCloudProvider(BaseCloudProvider):
    """
    Your Cloud Provider implementation for ZeroStack AI
    """
    
    def __init__(self, credentials: Dict[str, Any]):
        super().__init__(credentials)
        self.provider_name = "your-cloud"
        self.display_name = "Your Cloud"
        self.api_base_url = "https://api.yourcloud.com/v1"
        
    def validate_credentials(self) -> Dict[str, Any]:
        """Validate provider credentials"""
        try:
            # Implement credential validation logic
            response = requests.get(
                f"{self.api_base_url}/auth/validate",
                headers=self._get_auth_headers()
            )
            
            if response.status_code == 200:
                return {
                    "valid": True,
                    "message": "Credentials validated successfully",
                    "account_info": response.json()
                }
            else:
                return {
                    "valid": False,
                    "message": f"Invalid credentials: {response.text}"
                }
        except Exception as e:
            return {
                "valid": False,
                "message": f"Validation error: {str(e)}"
            }
    
    def get_regions(self) -> List[Dict[str, Any]]:
        """Get available regions"""
        try:
            response = requests.get(
                f"{self.api_base_url}/regions",
                headers=self._get_auth_headers()
            )
            
            regions = []
            for region in response.json().get('regions', []):
                regions.append({
                    'id': region['id'],
                    'name': region['name'],
                    'display_name': region['display_name'],
                    'location': region.get('location', ''),
                    'available': region.get('status') == 'available'
                })
            
            return regions
        except Exception as e:
            raise Exception(f"Failed to fetch regions: {str(e)}")
    
    def get_instance_types(self, region: str = None) -> List[Dict[str, Any]]:
        """Get available instance types/flavors"""
        try:
            url = f"{self.api_base_url}/instance-types"
            if region:
                url += f"?region={region}"
                
            response = requests.get(url, headers=self._get_auth_headers())
            
            instance_types = []
            for instance in response.json().get('instance_types', []):
                instance_types.append({
                    'id': instance['id'],
                    'name': instance['name'],
                    'display_name': instance['display_name'],
                    'vcpus': instance['vcpus'],
                    'memory_gb': instance['memory_gb'],
                    'storage_gb': instance.get('storage_gb', 0),
                    'gpu_count': instance.get('gpu_count', 0),
                    'gpu_type': instance.get('gpu_type'),
                    'price_per_hour': instance.get('price_per_hour', 0),
                    'category': instance.get('category', 'general'),
                    'available': instance.get('available', True)
                })
            
            return instance_types
        except Exception as e:
            raise Exception(f"Failed to fetch instance types: {str(e)}")
    
    def get_kubernetes_versions(self) -> List[Dict[str, Any]]:
        """Get supported Kubernetes versions"""
        try:
            response = requests.get(
                f"{self.api_base_url}/kubernetes/versions",
                headers=self._get_auth_headers()
            )
            
            versions = []
            for version in response.json().get('versions', []):
                versions.append({
                    'version': version['version'],
                    'display_name': f"Kubernetes {version['version']}",
                    'supported': version.get('supported', True),
                    'default': version.get('default', False),
                    'deprecated': version.get('deprecated', False)
                })
            
            return sorted(versions, key=lambda x: x['version'], reverse=True)
        except Exception as e:
            raise Exception(f"Failed to fetch Kubernetes versions: {str(e)}")
    
    def create_cluster(self, cluster_config: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new cluster"""
        try:
            # Transform ZeroStack config to provider-specific format
            provider_config = self._transform_cluster_config(cluster_config)
            
            response = requests.post(
                f"{self.api_base_url}/clusters",
                json=provider_config,
                headers=self._get_auth_headers()
            )
            
            if response.status_code in [200, 201]:
                cluster_data = response.json()
                return {
                    'success': True,
                    'cluster_id': cluster_data['id'],
                    'status': cluster_data.get('status', 'creating'),
                    'message': 'Cluster creation initiated successfully'
                }
            else:
                return {
                    'success': False,
                    'message': f"Cluster creation failed: {response.text}"
                }
        except Exception as e:
            return {
                'success': False,
                'message': f"Cluster creation error: {str(e)}"
            }
    
    def get_cluster_status(self, cluster_id: str) -> Dict[str, Any]:
        """Get cluster status and details"""
        try:
            response = requests.get(
                f"{self.api_base_url}/clusters/{cluster_id}",
                headers=self._get_auth_headers()
            )
            
            if response.status_code == 200:
                cluster = response.json()
                return {
                    'id': cluster['id'],
                    'name': cluster['name'],
                    'status': cluster['status'],
                    'kubernetes_version': cluster.get('kubernetes_version'),
                    'node_count': cluster.get('node_count', 0),
                    'region': cluster.get('region'),
                    'created_at': cluster.get('created_at'),
                    'endpoint': cluster.get('endpoint'),
                    'nodes': cluster.get('nodes', [])
                }
            else:
                raise Exception(f"Failed to get cluster status: {response.text}")
        except Exception as e:
            raise Exception(f"Cluster status error: {str(e)}")
    
    def delete_cluster(self, cluster_id: str) -> Dict[str, Any]:
        """Delete a cluster"""
        try:
            response = requests.delete(
                f"{self.api_base_url}/clusters/{cluster_id}",
                headers=self._get_auth_headers()
            )
            
            if response.status_code in [200, 202, 204]:
                return {
                    'success': True,
                    'message': 'Cluster deletion initiated successfully'
                }
            else:
                return {
                    'success': False,
                    'message': f"Cluster deletion failed: {response.text}"
                }
        except Exception as e:
            return {
                'success': False,
                'message': f"Cluster deletion error: {str(e)}"
            }
    
    def _get_auth_headers(self) -> Dict[str, str]:
        """Get authentication headers for API requests"""
        # Implement based on your provider's authentication method
        return {
            'Authorization': f"Bearer {self.credentials.get('api_token')}",
            'Content-Type': 'application/json',
            'User-Agent': 'ZeroStack-AI/1.0'
        }
    
    def _transform_cluster_config(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Transform ZeroStack cluster config to provider-specific format"""
        # Implement transformation logic based on your provider's API
        return {
            'name': config['name'],
            'region': config['region'],
            'kubernetes_version': config['kubernetes_version'],
            'node_pools': [
                {
                    'name': pool['name'],
                    'instance_type': pool['instance_type'],
                    'min_nodes': pool['min_nodes'],
                    'max_nodes': pool['max_nodes'],
                    'desired_nodes': pool['desired_nodes']
                }
                for pool in config.get('node_pools', [])
            ]
        }
```

### Step 2: Register Provider

Update `src/providers/__init__.py`:

```python
from .aws_provider import AWSProvider
from .gcp_provider import GCPProvider
from .azure_provider import AzureProvider
from .your_provider import YourCloudProvider

PROVIDER_REGISTRY = {
    'aws': AWSProvider,
    'gcp': GCPProvider,
    'azure': AzureProvider,
    'your-cloud': YourCloudProvider,  # Add your provider
}

def get_provider_class(provider_type: str):
    """Get provider class by type"""
    return PROVIDER_REGISTRY.get(provider_type)

def get_available_providers():
    """Get list of available providers"""
    return [
        {
            'id': 'aws',
            'name': 'Amazon Web Services',
            'icon': 'aws-icon',
            'auth_fields': [
                {'name': 'access_key_id', 'label': 'Access Key ID', 'type': 'text', 'required': True},
                {'name': 'secret_access_key', 'label': 'Secret Access Key', 'type': 'password', 'required': True},
                {'name': 'region', 'label': 'Default Region', 'type': 'text', 'required': True}
            ]
        },
        {
            'id': 'gcp',
            'name': 'Google Cloud Platform',
            'icon': 'gcp-icon',
            'auth_fields': [
                {'name': 'service_account_json', 'label': 'Service Account JSON', 'type': 'textarea', 'required': True},
                {'name': 'project_id', 'label': 'Project ID', 'type': 'text', 'required': True}
            ]
        },
        {
            'id': 'azure',
            'name': 'Microsoft Azure',
            'icon': 'azure-icon',
            'auth_fields': [
                {'name': 'client_id', 'label': 'Client ID', 'type': 'text', 'required': True},
                {'name': 'client_secret', 'label': 'Client Secret', 'type': 'password', 'required': True},
                {'name': 'tenant_id', 'label': 'Tenant ID', 'type': 'text', 'required': True},
                {'name': 'subscription_id', 'label': 'Subscription ID', 'type': 'text', 'required': True}
            ]
        },
        {
            'id': 'your-cloud',
            'name': 'Your Cloud',
            'icon': 'your-cloud-icon',
            'auth_fields': [
                {'name': 'api_token', 'label': 'API Token', 'type': 'password', 'required': True},
                {'name': 'endpoint', 'label': 'API Endpoint', 'type': 'text', 'required': False},
                {'name': 'region', 'label': 'Default Region', 'type': 'text', 'required': True}
            ]
        }
    ]
```

### Step 3: Update Base Provider Class

Ensure `src/providers/base_provider.py` has the required abstract methods:

```python
from abc import ABC, abstractmethod
from typing import List, Dict, Any

class BaseCloudProvider(ABC):
    """Abstract base class for cloud providers"""
    
    def __init__(self, credentials: Dict[str, Any]):
        self.credentials = credentials
        self.provider_name = ""
        self.display_name = ""
    
    @abstractmethod
    def validate_credentials(self) -> Dict[str, Any]:
        """Validate provider credentials"""
        pass
    
    @abstractmethod
    def get_regions(self) -> List[Dict[str, Any]]:
        """Get available regions"""
        pass
    
    @abstractmethod
    def get_instance_types(self, region: str = None) -> List[Dict[str, Any]]:
        """Get available instance types"""
        pass
    
    @abstractmethod
    def get_kubernetes_versions(self) -> List[Dict[str, Any]]:
        """Get supported Kubernetes versions"""
        pass
    
    @abstractmethod
    def create_cluster(self, cluster_config: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new cluster"""
        pass
    
    @abstractmethod
    def get_cluster_status(self, cluster_id: str) -> Dict[str, Any]:
        """Get cluster status"""
        pass
    
    @abstractmethod
    def delete_cluster(self, cluster_id: str) -> Dict[str, Any]:
        """Delete a cluster"""
        pass
```

## 🎨 Frontend Implementation

### Step 1: Add Provider Icon

Add your provider's icon to `src/assets/icons/` and update the icon mapping in `src/components/providers/ProviderIcon.jsx`:

```jsx
import React from 'react';
import { 
  FaAws, 
  FaGoogle, 
  FaMicrosoft,
  FaCloud  // Generic cloud icon for new providers
} from 'react-icons/fa';
import YourCloudIcon from '../assets/icons/your-cloud-icon.svg';

const ProviderIcon = ({ provider, size = 24, className = "" }) => {
  const iconProps = {
    size,
    className: `provider-icon ${className}`
  };

  const iconMap = {
    'aws': <FaAws {...iconProps} style={{ color: '#FF9900' }} />,
    'gcp': <FaGoogle {...iconProps} style={{ color: '#4285F4' }} />,
    'azure': <FaMicrosoft {...iconProps} style={{ color: '#0078D4' }} />,
    'your-cloud': <img src={YourCloudIcon} alt="Your Cloud" {...iconProps} />,
  };

  return iconMap[provider] || <FaCloud {...iconProps} />;
};

export default ProviderIcon;
```

### Step 2: Update Provider Configuration

The existing `CloudAccountForm.jsx` should automatically support your new provider based on the auth_fields configuration from the backend.

### Step 3: Add Provider-Specific Styling

Update `src/components/providers/ProviderConfig.css`:

```css
.provider-card.your-cloud {
  border-left: 4px solid #your-brand-color;
}

.provider-card.your-cloud:hover {
  box-shadow: 0 4px 12px rgba(your-brand-color-rgb, 0.15);
}

.provider-icon.your-cloud {
  filter: drop-shadow(0 2px 4px rgba(your-brand-color-rgb, 0.3));
}
```

## 🧪 Testing Your Provider

### Step 1: Unit Tests

Create `tests/test_your_provider.py`:

```python
import unittest
from unittest.mock import patch, Mock
from src.providers.your_provider import YourCloudProvider

class TestYourCloudProvider(unittest.TestCase):
    
    def setUp(self):
        self.credentials = {
            'api_token': 'test-token',
            'endpoint': 'https://api.yourcloud.com/v1',
            'region': 'us-east-1'
        }
        self.provider = YourCloudProvider(self.credentials)
    
    @patch('requests.get')
    def test_validate_credentials_success(self, mock_get):
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {'account_id': 'test-account'}
        mock_get.return_value = mock_response
        
        result = self.provider.validate_credentials()
        
        self.assertTrue(result['valid'])
        self.assertEqual(result['message'], 'Credentials validated successfully')
    
    @patch('requests.get')
    def test_get_regions(self, mock_get):
        mock_response = Mock()
        mock_response.json.return_value = {
            'regions': [
                {'id': 'us-east-1', 'name': 'us-east-1', 'display_name': 'US East 1', 'status': 'available'},
                {'id': 'us-west-2', 'name': 'us-west-2', 'display_name': 'US West 2', 'status': 'available'}
            ]
        }
        mock_get.return_value = mock_response
        
        regions = self.provider.get_regions()
        
        self.assertEqual(len(regions), 2)
        self.assertEqual(regions[0]['id'], 'us-east-1')
        self.assertTrue(regions[0]['available'])

if __name__ == '__main__':
    unittest.main()
```

### Step 2: Integration Tests

Create `tests/integration/test_your_provider_integration.py`:

```python
import unittest
import os
from src.providers.your_provider import YourCloudProvider

class TestYourCloudProviderIntegration(unittest.TestCase):
    
    def setUp(self):
        # Only run if real credentials are provided
        if not os.getenv('YOUR_CLOUD_API_TOKEN'):
            self.skipTest("YOUR_CLOUD_API_TOKEN not set")
        
        self.credentials = {
            'api_token': os.getenv('YOUR_CLOUD_API_TOKEN'),
            'region': os.getenv('YOUR_CLOUD_REGION', 'us-east-1')
        }
        self.provider = YourCloudProvider(self.credentials)
    
    def test_real_credential_validation(self):
        result = self.provider.validate_credentials()
        self.assertTrue(result['valid'])
    
    def test_real_regions_fetch(self):
        regions = self.provider.get_regions()
        self.assertIsInstance(regions, list)
        self.assertGreater(len(regions), 0)

if __name__ == '__main__':
    unittest.main()
```

## 📚 Documentation

### Step 1: Provider Documentation

Create `docs/providers/your-cloud.md`:

```markdown
# Your Cloud Provider Integration

## Overview
This document describes the Your Cloud provider integration for ZeroStack AI.

## Authentication
Your Cloud uses API token-based authentication:
- **API Token**: Your Cloud API token with cluster management permissions
- **Endpoint**: (Optional) Custom API endpoint URL
- **Region**: Default region for resource operations

## Supported Features
- ✅ Credential validation
- ✅ Region listing
- ✅ Instance type discovery
- ✅ Kubernetes version support
- ✅ Cluster creation
- ✅ Cluster status monitoring
- ✅ Cluster deletion

## Configuration Example
```json
{
  "name": "My Your Cloud Account",
  "provider": "your-cloud",
  "credentials": {
    "api_token": "your-api-token",
    "endpoint": "https://api.yourcloud.com/v1",
    "region": "us-east-1"
  }
}
```

## API Mapping
| ZeroStack Operation | Your Cloud API |
|-------------------|----------------|
| Validate Credentials | GET /auth/validate |
| List Regions | GET /regions |
| List Instance Types | GET /instance-types |
| List K8s Versions | GET /kubernetes/versions |
| Create Cluster | POST /clusters |
| Get Cluster Status | GET /clusters/{id} |
| Delete Cluster | DELETE /clusters/{id} |

## Troubleshooting
Common issues and solutions...
```

### Step 2: Update Main Documentation

Add your provider to the main documentation files:
- `USER_DOCUMENTATION.md`
- `DESIGN_DOCUMENTATION.md`
- `README.md`

## 🚀 Deployment

### Step 1: Environment Variables

Add provider-specific environment variables to your deployment configuration:

```bash
# Your Cloud Provider Configuration
YOUR_CLOUD_DEFAULT_ENDPOINT=https://api.yourcloud.com/v1
YOUR_CLOUD_TIMEOUT=30
YOUR_CLOUD_RETRY_ATTEMPTS=3
```

### Step 2: Dependencies

Update `requirements.txt` if your provider needs additional dependencies:

```txt
# Existing dependencies...
your-cloud-sdk==1.2.3  # If available
```

### Step 3: Database Migration

If your provider requires additional database fields, create a migration:

```python
# migrations/versions/add_your_cloud_fields.py
from alembic import op
import sqlalchemy as sa

def upgrade():
    op.add_column('cloud_accounts', 
        sa.Column('your_cloud_config', sa.JSON(), nullable=True))

def downgrade():
    op.drop_column('cloud_accounts', 'your_cloud_config')
```

## ✅ Checklist

Before submitting your provider integration:

### Backend
- [ ] Provider class implements all abstract methods
- [ ] Provider registered in `__init__.py`
- [ ] Error handling for all API calls
- [ ] Credential validation works
- [ ] Unit tests written and passing
- [ ] Integration tests work with real credentials

### Frontend
- [ ] Provider icon added
- [ ] Authentication form fields configured
- [ ] Provider-specific styling added
- [ ] UI components handle provider data correctly

### Documentation
- [ ] Provider-specific documentation created
- [ ] Main documentation updated
- [ ] API endpoints documented
- [ ] Configuration examples provided

### Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Error scenarios tested

## 🆘 Support

For help with provider integration:

1. Check existing provider implementations for reference
2. Review the base provider class documentation
3. Test with the provider's API documentation
4. Create an issue in the GitHub repository

## 🎯 Best Practices

1. **Error Handling**: Always handle API errors gracefully
2. **Rate Limiting**: Respect provider API rate limits
3. **Caching**: Cache expensive operations when possible
4. **Security**: Never log sensitive credentials
5. **Documentation**: Keep documentation up to date
6. **Testing**: Write comprehensive tests
7. **Monitoring**: Add appropriate logging for debugging

---

**Ready to integrate your cloud provider with ZeroStack AI's intelligent multi-cloud platform!** 🚀
