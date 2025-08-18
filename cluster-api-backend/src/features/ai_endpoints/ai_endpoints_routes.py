from flask import Blueprint, request, jsonify
import uuid
import time
from datetime import datetime
import logging
import json
import requests
from cryptography.fernet import Fernet
import os

logger = logging.getLogger(__name__)

ai_endpoints_bp = Blueprint('ai_endpoints', __name__)

# Encryption key for API keys (in production, use proper key management)
ENCRYPTION_KEY = os.environ.get('AI_ENDPOINT_ENCRYPTION_KEY', Fernet.generate_key())
cipher_suite = Fernet(ENCRYPTION_KEY)

# In-memory storage for demo purposes (use database in production)
endpoints_storage = {}

# Provider configurations with default settings
PROVIDER_CONFIGS = {
    'openai': {
        'name': 'OpenAI',
        'base_url': 'https://api.openai.com/v1',
        'models': ['gpt-4', 'gpt-3.5-turbo', 'gpt-4-turbo'],
        'test_endpoint': '/models',
        'headers_template': {
            'Authorization': 'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
    },
    'anthropic': {
        'name': 'Anthropic',
        'base_url': 'https://api.anthropic.com',
        'models': ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
        'test_endpoint': '/v1/messages',
        'headers_template': {
            'x-api-key': '{api_key}',
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01'
        }
    },
    'azure': {
        'name': 'Azure OpenAI',
        'base_url': 'https://{resource}.openai.azure.com',
        'models': ['gpt-4', 'gpt-35-turbo'],
        'test_endpoint': '/openai/deployments/{deployment}/chat/completions?api-version=2023-12-01-preview',
        'headers_template': {
            'api-key': '{api_key}',
            'Content-Type': 'application/json'
        }
    },
    'google': {
        'name': 'Google AI',
        'base_url': 'https://generativelanguage.googleapis.com',
        'models': ['gemini-pro', 'gemini-pro-vision'],
        'test_endpoint': '/v1/models',
        'headers_template': {
            'Authorization': 'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
    },
    'cohere': {
        'name': 'Cohere',
        'base_url': 'https://api.cohere.ai',
        'models': ['command', 'command-light', 'command-nightly'],
        'test_endpoint': '/v1/models',
        'headers_template': {
            'Authorization': 'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
    }
}

@ai_endpoints_bp.route('/ai/endpoints', methods=['GET'])
def get_endpoints():
    """Get all AI endpoints"""
    try:
        endpoints = []
        for endpoint_id, endpoint_data in endpoints_storage.items():
            # Don't expose encrypted API keys
            endpoint_copy = endpoint_data.copy()
            endpoint_copy['api_key'] = '***masked***'
            endpoint_copy['encrypted_key'] = None
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
        
        # Validate required fields
        required_fields = ['name', 'provider', 'api_key']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400
        
        provider = data['provider'].lower()
        if provider not in PROVIDER_CONFIGS:
            return jsonify({
                'success': False,
                'error': f'Unsupported provider: {provider}'
            }), 400
        
        # Generate endpoint ID
        endpoint_id = str(uuid.uuid4())
        
        # Encrypt API key
        encrypted_key = cipher_suite.encrypt(data['api_key'].encode())
        
        # Create endpoint record
        endpoint = {
            'id': endpoint_id,
            'name': data['name'],
            'provider': provider,
            'provider_config': PROVIDER_CONFIGS[provider],
            'api_key': data['api_key'],  # Store for immediate use
            'encrypted_key': encrypted_key,
            'base_url': data.get('base_url', PROVIDER_CONFIGS[provider]['base_url']),
            'models': data.get('models', PROVIDER_CONFIGS[provider]['models']),
            'priority': data.get('priority', 1),
            'max_requests_per_minute': data.get('max_requests_per_minute', 60),
            'timeout': data.get('timeout', 30),
            'enabled': data.get('enabled', True),
            'status': 'untested',
            'last_tested': None,
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat(),
            'metadata': data.get('metadata', {})
        }
        
        endpoints_storage[endpoint_id] = endpoint
        
        logger.info(f"Created AI endpoint {endpoint_id} for provider {provider}")
        
        # Return without sensitive data
        response_endpoint = endpoint.copy()
        response_endpoint['api_key'] = '***masked***'
        response_endpoint['encrypted_key'] = None
        
        return jsonify({
            'success': True,
            'endpoint': response_endpoint
        }), 201
        
    except Exception as e:
        logger.error(f"Error creating endpoint: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ai_endpoints_bp.route('/ai/endpoints/<endpoint_id>', methods=['GET'])
def get_endpoint(endpoint_id):
    """Get specific AI endpoint"""
    try:
        if endpoint_id not in endpoints_storage:
            return jsonify({
                'success': False,
                'error': 'Endpoint not found'
            }), 404
        
        endpoint = endpoints_storage[endpoint_id].copy()
        endpoint['api_key'] = '***masked***'
        endpoint['encrypted_key'] = None
        
        return jsonify({
            'success': True,
            'endpoint': endpoint
        })
        
    except Exception as e:
        logger.error(f"Error getting endpoint {endpoint_id}: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ai_endpoints_bp.route('/ai/endpoints/<endpoint_id>', methods=['PUT'])
def update_endpoint(endpoint_id):
    """Update AI endpoint"""
    try:
        if endpoint_id not in endpoints_storage:
            return jsonify({
                'success': False,
                'error': 'Endpoint not found'
            }), 404
        
        data = request.get_json()
        endpoint = endpoints_storage[endpoint_id]
        
        # Update fields
        updatable_fields = ['name', 'base_url', 'models', 'priority', 'max_requests_per_minute', 'timeout', 'enabled', 'metadata']
        for field in updatable_fields:
            if field in data:
                endpoint[field] = data[field]
        
        # Handle API key update
        if 'api_key' in data and data['api_key'] != '***masked***':
            endpoint['api_key'] = data['api_key']
            endpoint['encrypted_key'] = cipher_suite.encrypt(data['api_key'].encode())
            endpoint['status'] = 'untested'  # Reset status when key changes
        
        endpoint['updated_at'] = datetime.utcnow().isoformat()
        
        logger.info(f"Updated AI endpoint {endpoint_id}")
        
        # Return without sensitive data
        response_endpoint = endpoint.copy()
        response_endpoint['api_key'] = '***masked***'
        response_endpoint['encrypted_key'] = None
        
        return jsonify({
            'success': True,
            'endpoint': response_endpoint
        })
        
    except Exception as e:
        logger.error(f"Error updating endpoint {endpoint_id}: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ai_endpoints_bp.route('/ai/endpoints/<endpoint_id>', methods=['DELETE'])
def delete_endpoint(endpoint_id):
    """Delete AI endpoint"""
    try:
        if endpoint_id not in endpoints_storage:
            return jsonify({
                'success': False,
                'error': 'Endpoint not found'
            }), 404
        
        del endpoints_storage[endpoint_id]
        
        logger.info(f"Deleted AI endpoint {endpoint_id}")
        
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
def test_endpoint(endpoint_id):
    """Test AI endpoint connectivity"""
    try:
        if endpoint_id not in endpoints_storage:
            return jsonify({
                'success': False,
                'error': 'Endpoint not found'
            }), 404
        
        endpoint = endpoints_storage[endpoint_id]
        provider_config = endpoint['provider_config']
        
        # Prepare test request
        test_url = endpoint['base_url'] + provider_config['test_endpoint']
        headers = {}
        
        # Build headers from template
        for key, value in provider_config['headers_template'].items():
            headers[key] = value.format(api_key=endpoint['api_key'])
        
        start_time = time.time()
        
        try:
            # Make test request
            response = requests.get(
                test_url,
                headers=headers,
                timeout=endpoint['timeout']
            )
            
            response_time = (time.time() - start_time) * 1000  # Convert to ms
            
            if response.status_code == 200:
                endpoint['status'] = 'active'
                endpoint['last_tested'] = datetime.utcnow().isoformat()
                endpoint['last_response_time'] = response_time
                
                return jsonify({
                    'success': True,
                    'status': 'active',
                    'response_time': response_time,
                    'message': 'Endpoint is working correctly'
                })
            else:
                endpoint['status'] = 'error'
                endpoint['last_tested'] = datetime.utcnow().isoformat()
                
                return jsonify({
                    'success': False,
                    'status': 'error',
                    'error': f'HTTP {response.status_code}: {response.text}',
                    'response_time': response_time
                })
                
        except requests.exceptions.Timeout:
            endpoint['status'] = 'timeout'
            endpoint['last_tested'] = datetime.utcnow().isoformat()
            
            return jsonify({
                'success': False,
                'status': 'timeout',
                'error': 'Request timed out'
            })
            
        except requests.exceptions.RequestException as e:
            endpoint['status'] = 'error'
            endpoint['last_tested'] = datetime.utcnow().isoformat()
            
            return jsonify({
                'success': False,
                'status': 'error',
                'error': str(e)
            })
        
    except Exception as e:
        logger.error(f"Error testing endpoint {endpoint_id}: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ai_endpoints_bp.route('/ai/providers', methods=['GET'])
def get_providers():
    """Get available AI providers and their configurations"""
    try:
        providers = []
        for provider_id, config in PROVIDER_CONFIGS.items():
            providers.append({
                'id': provider_id,
                'name': config['name'],
                'base_url': config['base_url'],
                'models': config['models']
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

@ai_endpoints_bp.route('/ai/endpoints/health', methods=['GET'])
def get_endpoints_health():
    """Get health status of all endpoints"""
    try:
        health_data = []
        
        for endpoint_id, endpoint in endpoints_storage.items():
            health_data.append({
                'id': endpoint_id,
                'name': endpoint['name'],
                'provider': endpoint['provider'],
                'status': endpoint['status'],
                'enabled': endpoint['enabled'],
                'last_tested': endpoint['last_tested'],
                'last_response_time': endpoint.get('last_response_time'),
                'priority': endpoint['priority']
            })
        
        # Sort by priority
        health_data.sort(key=lambda x: x['priority'])
        
        return jsonify({
            'success': True,
            'endpoints': health_data,
            'summary': {
                'total': len(health_data),
                'active': len([e for e in health_data if e['status'] == 'active']),
                'error': len([e for e in health_data if e['status'] == 'error']),
                'untested': len([e for e in health_data if e['status'] == 'untested'])
            }
        })
        
    except Exception as e:
        logger.error(f"Error getting endpoints health: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
