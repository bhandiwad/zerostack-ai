#!/usr/bin/env python3
"""
Comprehensive test suite for AI Endpoints Phase 1 implementation
"""

import asyncio
import json
import time
from datetime import datetime
import requests
import pytest
from typing import Dict, Any, List

# Test configuration
API_BASE_URL = "http://localhost:5002"
TEST_ENDPOINTS = []

class TestAIEndpoints:
    """Test suite for AI Endpoints API"""
    
    @classmethod
    def setup_class(cls):
        """Setup test class"""
        cls.created_endpoints = []
    
    @classmethod
    def teardown_class(cls):
        """Cleanup test class"""
        # Clean up any created endpoints
        for endpoint_id in cls.created_endpoints:
            try:
                requests.delete(f"{API_BASE_URL}/api/ai/endpoints/{endpoint_id}")
            except:
                pass
    
    def test_get_providers(self):
        """Test getting available providers"""
        response = requests.get(f"{API_BASE_URL}/api/ai/providers")
        assert response.status_code == 200
        
        data = response.json()
        assert data['success'] == True
        assert 'providers' in data
        assert len(data['providers']) > 0
        
        # Check provider structure
        provider = data['providers'][0]
        assert 'id' in provider
        assert 'name' in provider
        assert 'base_url' in provider
        assert 'models' in provider
    
    def test_create_endpoint_openai(self):
        """Test creating OpenAI endpoint"""
        endpoint_data = {
            'name': 'Test OpenAI Endpoint',
            'provider': 'openai',
            'api_key': 'test-key-123',
            'priority': 1,
            'max_requests_per_minute': 60,
            'timeout': 30
        }
        
        response = requests.post(
            f"{API_BASE_URL}/api/ai/endpoints",
            json=endpoint_data
        )
        assert response.status_code == 201
        
        data = response.json()
        assert data['success'] == True
        assert 'endpoint' in data
        
        endpoint = data['endpoint']
        assert endpoint['name'] == endpoint_data['name']
        assert endpoint['provider'] == endpoint_data['provider']
        assert endpoint['api_key'] == '***masked***'  # Should be masked
        assert endpoint['priority'] == endpoint_data['priority']
        
        # Store for cleanup
        self.__class__.created_endpoints.append(endpoint['id'])
        
        return endpoint['id']
    
    def test_create_endpoint_anthropic(self):
        """Test creating Anthropic endpoint"""
        endpoint_data = {
            'name': 'Test Anthropic Endpoint',
            'provider': 'anthropic',
            'api_key': 'test-anthropic-key',
            'priority': 2
        }
        
        response = requests.post(
            f"{API_BASE_URL}/api/ai/endpoints",
            json=endpoint_data
        )
        assert response.status_code == 201
        
        data = response.json()
        assert data['success'] == True
        
        endpoint = data['endpoint']
        assert endpoint['provider'] == 'anthropic'
        assert 'claude' in str(endpoint['models']).lower()
        
        self.__class__.created_endpoints.append(endpoint['id'])
        return endpoint['id']
    
    def test_get_endpoints(self):
        """Test getting all endpoints"""
        # Create a test endpoint first
        endpoint_id = self.test_create_endpoint_openai()
        
        response = requests.get(f"{API_BASE_URL}/api/ai/endpoints")
        assert response.status_code == 200
        
        data = response.json()
        assert data['success'] == True
        assert 'endpoints' in data
        assert data['count'] >= 1
        
        # Find our test endpoint
        test_endpoint = None
        for endpoint in data['endpoints']:
            if endpoint['id'] == endpoint_id:
                test_endpoint = endpoint
                break
        
        assert test_endpoint is not None
        assert test_endpoint['api_key'] == '***masked***'
    
    def test_get_specific_endpoint(self):
        """Test getting specific endpoint"""
        endpoint_id = self.test_create_endpoint_openai()
        
        response = requests.get(f"{API_BASE_URL}/api/ai/endpoints/{endpoint_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data['success'] == True
        assert data['endpoint']['id'] == endpoint_id
    
    def test_update_endpoint(self):
        """Test updating endpoint"""
        endpoint_id = self.test_create_endpoint_openai()
        
        update_data = {
            'name': 'Updated Test Endpoint',
            'priority': 5,
            'max_requests_per_minute': 120
        }
        
        response = requests.put(
            f"{API_BASE_URL}/api/ai/endpoints/{endpoint_id}",
            json=update_data
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data['success'] == True
        
        endpoint = data['endpoint']
        assert endpoint['name'] == update_data['name']
        assert endpoint['priority'] == update_data['priority']
        assert endpoint['max_requests_per_minute'] == update_data['max_requests_per_minute']
    
    def test_delete_endpoint(self):
        """Test deleting endpoint"""
        endpoint_id = self.test_create_endpoint_openai()
        
        response = requests.delete(f"{API_BASE_URL}/api/ai/endpoints/{endpoint_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data['success'] == True
        
        # Verify it's deleted
        response = requests.get(f"{API_BASE_URL}/api/ai/endpoints/{endpoint_id}")
        assert response.status_code == 404
        
        # Remove from cleanup list
        if endpoint_id in self.__class__.created_endpoints:
            self.__class__.created_endpoints.remove(endpoint_id)
    
    def test_endpoints_health(self):
        """Test endpoints health check"""
        # Create test endpoints
        openai_id = self.test_create_endpoint_openai()
        anthropic_id = self.test_create_endpoint_anthropic()
        
        response = requests.get(f"{API_BASE_URL}/api/ai/endpoints/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data['success'] == True
        assert 'endpoints' in data
        assert 'summary' in data
        
        summary = data['summary']
        assert 'total' in summary
        assert 'active' in summary
        assert 'error' in summary
        assert 'untested' in summary
        assert summary['total'] >= 2
    
    def test_validation_errors(self):
        """Test validation errors"""
        # Missing required fields
        response = requests.post(
            f"{API_BASE_URL}/api/ai/endpoints",
            json={'name': 'Test'}
        )
        assert response.status_code == 400
        
        data = response.json()
        assert data['success'] == False
        assert 'error' in data
        
        # Invalid provider
        response = requests.post(
            f"{API_BASE_URL}/api/ai/endpoints",
            json={
                'name': 'Test',
                'provider': 'invalid_provider',
                'api_key': 'test'
            }
        )
        assert response.status_code == 400
    
    def test_endpoint_not_found(self):
        """Test endpoint not found scenarios"""
        fake_id = "00000000-0000-0000-0000-000000000000"
        
        # GET non-existent endpoint
        response = requests.get(f"{API_BASE_URL}/api/ai/endpoints/{fake_id}")
        assert response.status_code == 404
        
        # UPDATE non-existent endpoint
        response = requests.put(
            f"{API_BASE_URL}/api/ai/endpoints/{fake_id}",
            json={'name': 'Test'}
        )
        assert response.status_code == 404
        
        # DELETE non-existent endpoint
        response = requests.delete(f"{API_BASE_URL}/api/ai/endpoints/{fake_id}")
        assert response.status_code == 404

class TestLoadBalancer:
    """Test suite for Load Balancer"""
    
    def test_load_balancer_import(self):
        """Test load balancer can be imported"""
        from src.features.ai_endpoints.load_balancer import get_load_balancer, LoadBalancingStrategy
        
        lb = get_load_balancer()
        assert lb is not None
    
    def test_endpoint_registration(self):
        """Test endpoint registration with load balancer"""
        from src.features.ai_endpoints.load_balancer import get_load_balancer
        
        lb = get_load_balancer()
        
        # Test endpoint
        endpoint = {
            'id': 'test-endpoint-1',
            'name': 'Test Endpoint',
            'provider': 'openai',
            'models': ['gpt-4'],
            'priority': 1,
            'enabled': True,
            'max_requests_per_minute': 60
        }
        
        lb.register_endpoint(endpoint)
        
        # Check it's available
        available = lb.get_available_endpoints()
        assert len(available) >= 1
        
        # Test selection
        selected = lb.select_endpoint()
        assert selected is not None
        
        # Cleanup
        lb.unregister_endpoint('test-endpoint-1')

class TestA2AProtocol:
    """Test suite for A2A Protocol"""
    
    def test_a2a_imports(self):
        """Test A2A protocol imports"""
        from src.features.ai_endpoints.a2a_protocol import (
            A2AAgent, A2AMessage, A2AMessageBus, MessageType, MessagePriority
        )
        
        # Test agent creation
        agent = A2AAgent("test-agent-1", "test")
        assert agent.agent_id == "test-agent-1"
        assert agent.agent_type == "test"
        assert agent.public_key is not None
        assert agent.private_key is not None
    
    def test_message_creation(self):
        """Test A2A message creation"""
        from src.features.ai_endpoints.a2a_protocol import A2AMessage, MessageType, MessagePriority
        
        message = A2AMessage(
            type=MessageType.REQUEST,
            priority=MessagePriority.HIGH,
            sender_id="agent1",
            recipient_id="agent2",
            payload={"test": "data"}
        )
        
        assert message.type == MessageType.REQUEST
        assert message.priority == MessagePriority.HIGH
        assert message.payload["test"] == "data"
        
        # Test serialization
        data = message.to_dict()
        assert data['type'] == 'request'
        assert data['priority'] == 3
        
        # Test deserialization
        restored = A2AMessage.from_dict(data)
        assert restored.type == MessageType.REQUEST
        assert restored.priority == MessagePriority.HIGH
    
    def test_message_encryption(self):
        """Test message encryption/decryption"""
        from src.features.ai_endpoints.a2a_protocol import A2AAgent
        
        agent1 = A2AAgent("agent1")
        agent2 = A2AAgent("agent2")
        
        message = "This is a secret message"
        
        # Encrypt message
        encrypted = agent1.encrypt_message(message, agent2.public_key)
        assert encrypted != message
        assert ":" in encrypted  # Should have key:message format
        
        # Decrypt message
        decrypted = agent2.decrypt_message(encrypted)
        assert decrypted == message
    
    def test_message_signing(self):
        """Test message signing/verification"""
        from src.features.ai_endpoints.a2a_protocol import A2AAgent
        
        agent1 = A2AAgent("agent1")
        agent2 = A2AAgent("agent2")
        
        message = "This is a signed message"
        
        # Sign message
        signature = agent1.sign_message(message)
        assert signature is not None
        assert len(signature) > 0
        
        # Verify signature
        is_valid = agent2.verify_signature(message, signature, agent1.public_key)
        assert is_valid == True
        
        # Test invalid signature
        is_valid = agent2.verify_signature("different message", signature, agent1.public_key)
        assert is_valid == False

def run_performance_tests():
    """Run performance tests"""
    print("\n=== Performance Tests ===")
    
    # Test endpoint creation performance
    start_time = time.time()
    for i in range(10):
        endpoint_data = {
            'name': f'Perf Test Endpoint {i}',
            'provider': 'openai',
            'api_key': f'test-key-{i}',
            'priority': i % 5 + 1
        }
        
        response = requests.post(
            f"{API_BASE_URL}/api/ai/endpoints",
            json=endpoint_data
        )
        if response.status_code == 201:
            endpoint_id = response.json()['endpoint']['id']
            # Clean up immediately
            requests.delete(f"{API_BASE_URL}/api/ai/endpoints/{endpoint_id}")
    
    end_time = time.time()
    print(f"Created and deleted 10 endpoints in {end_time - start_time:.2f} seconds")
    
    # Test load balancer performance
    from src.features.ai_endpoints.load_balancer import get_load_balancer
    
    lb = get_load_balancer()
    
    # Register test endpoints
    for i in range(100):
        endpoint = {
            'id': f'perf-test-{i}',
            'name': f'Perf Test {i}',
            'provider': 'openai',
            'models': ['gpt-4'],
            'priority': i % 10 + 1,
            'enabled': True,
            'max_requests_per_minute': 60
        }
        lb.register_endpoint(endpoint)
    
    # Test selection performance
    start_time = time.time()
    for _ in range(1000):
        selected = lb.select_endpoint()
        assert selected is not None
    end_time = time.time()
    
    print(f"Performed 1000 endpoint selections in {end_time - start_time:.2f} seconds")
    
    # Cleanup
    for i in range(100):
        lb.unregister_endpoint(f'perf-test-{i}')

def run_integration_tests():
    """Run integration tests"""
    print("\n=== Integration Tests ===")
    
    # Test full workflow: create -> test -> update -> delete
    print("Testing full endpoint lifecycle...")
    
    # Create endpoint
    endpoint_data = {
        'name': 'Integration Test Endpoint',
        'provider': 'openai',
        'api_key': 'test-integration-key',
        'priority': 1
    }
    
    response = requests.post(f"{API_BASE_URL}/api/ai/endpoints", json=endpoint_data)
    assert response.status_code == 201
    endpoint_id = response.json()['endpoint']['id']
    
    # Get endpoint
    response = requests.get(f"{API_BASE_URL}/api/ai/endpoints/{endpoint_id}")
    assert response.status_code == 200
    
    # Update endpoint
    update_data = {'name': 'Updated Integration Test'}
    response = requests.put(f"{API_BASE_URL}/api/ai/endpoints/{endpoint_id}", json=update_data)
    assert response.status_code == 200
    
    # Check health
    response = requests.get(f"{API_BASE_URL}/api/ai/endpoints/health")
    assert response.status_code == 200
    
    # Delete endpoint
    response = requests.delete(f"{API_BASE_URL}/api/ai/endpoints/{endpoint_id}")
    assert response.status_code == 200
    
    print("✅ Integration test completed successfully")

if __name__ == "__main__":
    print("🧪 Running AI Endpoints Phase 1 Test Suite")
    print("=" * 50)
    
    # Check if backend is running
    try:
        response = requests.get(f"{API_BASE_URL}/api/health")
        if response.status_code != 200:
            print("❌ Backend is not running or not healthy")
            exit(1)
        print("✅ Backend is running and healthy")
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend. Make sure it's running on port 5002")
        exit(1)
    
    # Run tests
    try:
        # Run unit tests
        print("\n=== Unit Tests ===")
        pytest.main([__file__, "-v", "--tb=short"])
        
        # Run performance tests
        run_performance_tests()
        
        # Run integration tests
        run_integration_tests()
        
        print("\n🎉 All tests completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Tests failed: {str(e)}")
        exit(1)
