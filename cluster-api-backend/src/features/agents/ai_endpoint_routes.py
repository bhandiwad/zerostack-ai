"""
AI Endpoint Management API Routes
Provides REST endpoints for managing AI service configurations
"""
from flask import Blueprint, request, jsonify
from typing import Dict, Any, List, Optional
import logging
from datetime import datetime
import asyncio
import aiohttp
from cryptography.fernet import Fernet
import os
from .enhanced_models import AIEndpointConfig, AIProvider
from pydantic import ValidationError
import json

logger = logging.getLogger(__name__)

ai_endpoints_bp = Blueprint('ai_endpoints', __name__)

# In-memory storage for demo (replace with database in production)
endpoints_storage: Dict[str, Dict[str, Any]] = {}
encryption_key = Fernet.generate_key()
cipher_suite = Fernet(encryption_key)

# AI Provider configurations
PROVIDER_CONFIGS = {
    AIProvider.OPENAI: {
        'base_url': 'https://api.openai.com/v1',
        'models': ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-4o', 'gpt-4o-mini'],
        'test_endpoint': '/models',
        'auth_header': 'Authorization',
        'auth_prefix': 'Bearer '
    },
    AIProvider.ANTHROPIC: {
        'base_url': 'https://api.anthropic.com/v1',
        'models': ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku', 'claude-3-5-sonnet'],
        'test_endpoint': '/messages',
        'auth_header': 'x-api-key',
        'auth_prefix': ''
    },
    AIProvider.AZURE: {
        'base_url': None,  # Custom base URL required
        'models': ['gpt-4', 'gpt-35-turbo', 'text-embedding-ada-002'],
        'test_endpoint': '/openai/deployments',
        'auth_header': 'api-key',
        'auth_prefix': ''
    },
    AIProvider.GOOGLE: {
        'base_url': 'https://generativelanguage.googleapis.com/v1',
        'models': ['gemini-pro', 'gemini-pro-vision', 'text-bison', 'chat-bison'],
        'test_endpoint': '/models',
        'auth_header': 'Authorization',
        'auth_prefix': 'Bearer '
    }
}

def encrypt_api_key(api_key: str) -> str:
    """Encrypt API key for secure storage"""
    return cipher_suite.encrypt(api_key.encode()).decode()

def decrypt_api_key(encrypted_key: str) -> str:
    """Decrypt API key for use"""
    return cipher_suite.decrypt(encrypted_key.encode()).decode()

async def test_ai_endpoint(config: AIEndpointConfig) -> Dict[str, Any]:
    """Test connectivity to an AI endpoint"""
    try:
        provider_config = PROVIDER_CONFIGS.get(config.provider)
        if not provider_config:
            return {'success': False, 'error': f'Unsupported provider: {config.provider}'}
        
        base_url = config.base_url or provider_config['base_url']
        if not base_url:
            return {'success': False, 'error': 'Base URL is required for this provider'}
        
        test_url = f"{base_url.rstrip('/')}{provider_config['test_endpoint']}"
        
        headers = {
            'Content-Type': 'application/json',
            provider_config['auth_header']: f"{provider_config['auth_prefix']}{config.api_key.get_secret_value()}"
        }
        
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=config.timeout)) as session:
            async with session.get(test_url, headers=headers) as response:
                if response.status == 200:
                    return {
                        'success': True,
                        'status_code': response.status,
                        'response_time': response.headers.get('X-Response-Time', 'N/A')
                    }
                else:
                    error_text = await response.text()
                    return {
                        'success': False,
                        'error': f'HTTP {response.status}: {error_text[:200]}',
                        'status_code': response.status
                    }
    
    except asyncio.TimeoutError:
        return {'success': False, 'error': 'Request timeout'}
    except Exception as e:
        return {'success': False, 'error': str(e)}

@ai_endpoints_bp.route('/ai/endpoints', methods=['GET'])
def get_endpoints():
    """Get all AI endpoints"""
    try:
        endpoints = []
        for endpoint_id, endpoint_data in endpoints_storage.items():
            # Don't expose encrypted API keys
            endpoint_copy = endpoint_data.copy()
            endpoint_copy['api_key'] = '***masked***'
            endpoints.append(endpoint_copy)
        
        return jsonify({
            'success': True,
            'endpoints': endpoints,
            'count': len(endpoints)
        })
    
    except Exception as e:
        logger.error(f"Error getting endpoints: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ai_endpoints_bp.route('/ai/endpoints', methods=['POST'])
def create_endpoint():
    """Create a new AI endpoint"""
    try:
        data = request.get_json()
        
        # Validate using Pydantic model
        config = AIEndpointConfig(**data)
        
        # Encrypt API key
        encrypted_key = encrypt_api_key(config.api_key.get_secret_value())
        
        # Store endpoint
        endpoint_data = config.dict()
        endpoint_data['api_key'] = encrypted_key
        endpoint_data['created_at'] = datetime.utcnow().isoformat()
        endpoint_data['updated_at'] = datetime.utcnow().isoformat()
        
        # If this is set as default, unset others
        if config.is_default:
            for existing_id, existing_data in endpoints_storage.items():
                existing_data['is_default'] = False
        
        endpoints_storage[config.id] = endpoint_data
        
        return jsonify({
            'success': True,
            'endpoint_id': config.id,
            'message': 'Endpoint created successfully'
        }), 201
    
    except ValidationError as e:
        return jsonify({
            'success': False,
            'error': 'Validation error',
            'details': e.errors()
        }), 400
    
    except Exception as e:
        logger.error(f"Error creating endpoint: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ai_endpoints_bp.route('/ai/endpoints/<endpoint_id>', methods=['GET'])
def get_endpoint(endpoint_id: str):
    """Get specific endpoint details"""
    try:
        if endpoint_id not in endpoints_storage:
            return jsonify({
                'success': False,
                'error': 'Endpoint not found'
            }), 404
        
        endpoint_data = endpoints_storage[endpoint_id].copy()
        endpoint_data['api_key'] = '***masked***'
        
        return jsonify({
            'success': True,
            'endpoint': endpoint_data
        })
    
    except Exception as e:
        logger.error(f"Error getting endpoint {endpoint_id}: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ai_endpoints_bp.route('/ai/endpoints/<endpoint_id>', methods=['PUT'])
def update_endpoint(endpoint_id: str):
    """Update an existing endpoint"""
    try:
        if endpoint_id not in endpoints_storage:
            return jsonify({
                'success': False,
                'error': 'Endpoint not found'
            }), 404
        
        data = request.get_json()
        data['id'] = endpoint_id  # Ensure ID matches
        
        # Validate using Pydantic model
        config = AIEndpointConfig(**data)
        
        # Encrypt API key
        encrypted_key = encrypt_api_key(config.api_key.get_secret_value())
        
        # Update endpoint
        endpoint_data = config.dict()
        endpoint_data['api_key'] = encrypted_key
        endpoint_data['updated_at'] = datetime.utcnow().isoformat()
        
        # Preserve creation time
        if 'created_at' in endpoints_storage[endpoint_id]:
            endpoint_data['created_at'] = endpoints_storage[endpoint_id]['created_at']
        
        # If this is set as default, unset others
        if config.is_default:
            for existing_id, existing_data in endpoints_storage.items():
                if existing_id != endpoint_id:
                    existing_data['is_default'] = False
        
        endpoints_storage[endpoint_id] = endpoint_data
        
        return jsonify({
            'success': True,
            'message': 'Endpoint updated successfully'
        })
    
    except ValidationError as e:
        return jsonify({
            'success': False,
            'error': 'Validation error',
            'details': e.errors()
        }), 400
    
    except Exception as e:
        logger.error(f"Error updating endpoint {endpoint_id}: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ai_endpoints_bp.route('/ai/endpoints/<endpoint_id>', methods=['DELETE'])
def delete_endpoint(endpoint_id: str):
    """Delete an endpoint"""
    try:
        if endpoint_id not in endpoints_storage:
            return jsonify({
                'success': False,
                'error': 'Endpoint not found'
            }), 404
        
        # Don't allow deletion of default endpoint if it's the only one
        endpoint_data = endpoints_storage[endpoint_id]
        if endpoint_data.get('is_default') and len(endpoints_storage) == 1:
            return jsonify({
                'success': False,
                'error': 'Cannot delete the only remaining endpoint'
            }), 400
        
        del endpoints_storage[endpoint_id]
        
        return jsonify({
            'success': True,
            'message': 'Endpoint deleted successfully'
        })
    
    except Exception as e:
        logger.error(f"Error deleting endpoint {endpoint_id}: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ai_endpoints_bp.route('/ai/endpoints/<endpoint_id>/test', methods=['POST'])
def test_endpoint_connectivity(endpoint_id: str):
    """Test endpoint connectivity"""
    try:
        if endpoint_id not in endpoints_storage:
            return jsonify({
                'success': False,
                'error': 'Endpoint not found'
            }), 404
        
        endpoint_data = endpoints_storage[endpoint_id].copy()
        
        # Decrypt API key for testing
        decrypted_key = decrypt_api_key(endpoint_data['api_key'])
        endpoint_data['api_key'] = decrypted_key
        
        # Create config object for testing
        config = AIEndpointConfig(**endpoint_data)
        
        # Run async test
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(test_ai_endpoint(config))
        finally:
            loop.close()
        
        # Update endpoint status based on test result
        if result['success']:
            endpoints_storage[endpoint_id]['status'] = 'active'
            endpoints_storage[endpoint_id]['last_used'] = datetime.utcnow().isoformat()
        else:
            endpoints_storage[endpoint_id]['status'] = 'error'
        
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"Error testing endpoint {endpoint_id}: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ai_endpoints_bp.route('/ai/endpoints/<endpoint_id>/default', methods=['POST'])
def set_default_endpoint(endpoint_id: str):
    """Set an endpoint as the default"""
    try:
        if endpoint_id not in endpoints_storage:
            return jsonify({
                'success': False,
                'error': 'Endpoint not found'
            }), 404
        
        # Unset all other defaults
        for existing_id, existing_data in endpoints_storage.items():
            existing_data['is_default'] = existing_id == endpoint_id
        
        return jsonify({
            'success': True,
            'message': 'Default endpoint updated successfully'
        })
    
    except Exception as e:
        logger.error(f"Error setting default endpoint {endpoint_id}: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ai_endpoints_bp.route('/ai/endpoints/providers', methods=['GET'])
def get_providers():
    """Get available AI providers and their models"""
    try:
        providers = []
        for provider, config in PROVIDER_CONFIGS.items():
            providers.append({
                'id': provider.value,
                'name': provider.value.title(),
                'models': config['models'],
                'default_base_url': config['base_url'],
                'requires_api_key': True
            })
        
        # Add custom provider
        providers.append({
            'id': 'custom',
            'name': 'Custom Endpoint',
            'models': [],
            'default_base_url': None,
            'requires_api_key': False
        })
        
        return jsonify({
            'success': True,
            'providers': providers
        })
    
    except Exception as e:
        logger.error(f"Error getting providers: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ai_endpoints_bp.route('/ai/endpoints/stats', methods=['GET'])
def get_endpoint_stats():
    """Get endpoint usage statistics"""
    try:
        stats = {
            'total_endpoints': len(endpoints_storage),
            'active_endpoints': len([e for e in endpoints_storage.values() if e.get('status') == 'active']),
            'providers': {},
            'default_endpoint': None
        }
        
        # Count by provider
        for endpoint_data in endpoints_storage.values():
            provider = endpoint_data.get('provider', 'unknown')
            stats['providers'][provider] = stats['providers'].get(provider, 0) + 1
            
            if endpoint_data.get('is_default'):
                stats['default_endpoint'] = endpoint_data.get('name', 'Unknown')
        
        return jsonify({
            'success': True,
            'stats': stats
        })
    
    except Exception as e:
        logger.error(f"Error getting endpoint stats: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
