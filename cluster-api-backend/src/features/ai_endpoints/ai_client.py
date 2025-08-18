import asyncio
import time
from typing import Dict, Any, Optional, List
import logging
import json
import aiohttp
from datetime import datetime

from .load_balancer import get_load_balancer, LoadBalancingStrategy

logger = logging.getLogger(__name__)

class AIClientError(Exception):
    """Base exception for AI client errors"""
    pass

class NoAvailableEndpointsError(AIClientError):
    """Raised when no endpoints are available"""
    pass

class AIClient:
    """Unified AI client with load balancing and failover"""
    
    def __init__(self):
        self.load_balancer = get_load_balancer()
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Send a chat completion request with automatic load balancing and failover
        """
        if not self.session:
            raise AIClientError("Client session not initialized. Use 'async with AIClient() as client:'")
        
        # Try up to 3 different endpoints
        max_retries = 3
        last_error = None
        
        for attempt in range(max_retries):
            endpoint = self.load_balancer.select_endpoint(model)
            
            if not endpoint:
                raise NoAvailableEndpointsError("No available AI endpoints")
            
            try:
                result = await self._make_request(
                    endpoint=endpoint,
                    messages=messages,
                    model=model,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    **kwargs
                )
                return result
                
            except Exception as e:
                last_error = e
                logger.warning(f"Request failed for endpoint {endpoint['id']}: {str(e)}")
                
                # Record the failure
                self.load_balancer.record_request_end(
                    endpoint['id'], 
                    success=False, 
                    response_time=0
                )
                
                # Try next endpoint
                continue
        
        # All endpoints failed
        if last_error:
            raise AIClientError(f"All endpoints failed. Last error: {str(last_error)}")
        else:
            raise AIClientError("All endpoints failed with unknown errors")
    
    async def _make_request(
        self,
        endpoint: Dict[str, Any],
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Make a request to a specific endpoint"""
        
        endpoint_id = endpoint['id']
        provider = endpoint['provider']
        
        # Record request start
        self.load_balancer.record_request_start(endpoint_id)
        start_time = time.time()
        
        try:
            if provider == 'openai':
                result = await self._openai_request(endpoint, messages, model, temperature, max_tokens, **kwargs)
            elif provider == 'anthropic':
                result = await self._anthropic_request(endpoint, messages, model, temperature, max_tokens, **kwargs)
            elif provider == 'azure':
                result = await self._azure_request(endpoint, messages, model, temperature, max_tokens, **kwargs)
            elif provider == 'google':
                result = await self._google_request(endpoint, messages, model, temperature, max_tokens, **kwargs)
            elif provider == 'cohere':
                result = await self._cohere_request(endpoint, messages, model, temperature, max_tokens, **kwargs)
            else:
                raise AIClientError(f"Unsupported provider: {provider}")
            
            # Record successful request
            response_time = (time.time() - start_time) * 1000
            self.load_balancer.record_request_end(endpoint_id, success=True, response_time=response_time)
            
            return result
            
        except Exception as e:
            # Record failed request
            response_time = (time.time() - start_time) * 1000
            self.load_balancer.record_request_end(endpoint_id, success=False, response_time=response_time)
            raise e
    
    async def _openai_request(
        self,
        endpoint: Dict[str, Any],
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Make OpenAI API request"""
        
        url = f"{endpoint['base_url']}/chat/completions"
        headers = {
            'Authorization': f"Bearer {endpoint['api_key']}",
            'Content-Type': 'application/json'
        }
        
        payload = {
            'model': model or endpoint['models'][0],
            'messages': messages,
            'temperature': temperature
        }
        
        if max_tokens:
            payload['max_tokens'] = max_tokens
        
        payload.update(kwargs)
        
        timeout = aiohttp.ClientTimeout(total=endpoint.get('timeout', 30))
        
        async with self.session.post(url, headers=headers, json=payload, timeout=timeout) as response:
            if response.status != 200:
                error_text = await response.text()
                raise AIClientError(f"OpenAI API error {response.status}: {error_text}")
            
            data = await response.json()
            return self._normalize_openai_response(data)
    
    async def _anthropic_request(
        self,
        endpoint: Dict[str, Any],
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Make Anthropic API request"""
        
        url = f"{endpoint['base_url']}/v1/messages"
        headers = {
            'x-api-key': endpoint['api_key'],
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01'
        }
        
        # Convert OpenAI format to Anthropic format
        system_message = None
        anthropic_messages = []
        
        for msg in messages:
            if msg['role'] == 'system':
                system_message = msg['content']
            else:
                anthropic_messages.append(msg)
        
        payload = {
            'model': model or endpoint['models'][0],
            'messages': anthropic_messages,
            'max_tokens': max_tokens or 1024,
            'temperature': temperature
        }
        
        if system_message:
            payload['system'] = system_message
        
        payload.update(kwargs)
        
        timeout = aiohttp.ClientTimeout(total=endpoint.get('timeout', 30))
        
        async with self.session.post(url, headers=headers, json=payload, timeout=timeout) as response:
            if response.status != 200:
                error_text = await response.text()
                raise AIClientError(f"Anthropic API error {response.status}: {error_text}")
            
            data = await response.json()
            return self._normalize_anthropic_response(data)
    
    async def _azure_request(
        self,
        endpoint: Dict[str, Any],
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Make Azure OpenAI API request"""
        
        # Azure uses deployment names instead of model names
        deployment = model or endpoint['models'][0]
        url = f"{endpoint['base_url']}/openai/deployments/{deployment}/chat/completions?api-version=2023-12-01-preview"
        
        headers = {
            'api-key': endpoint['api_key'],
            'Content-Type': 'application/json'
        }
        
        payload = {
            'messages': messages,
            'temperature': temperature
        }
        
        if max_tokens:
            payload['max_tokens'] = max_tokens
        
        payload.update(kwargs)
        
        timeout = aiohttp.ClientTimeout(total=endpoint.get('timeout', 30))
        
        async with self.session.post(url, headers=headers, json=payload, timeout=timeout) as response:
            if response.status != 200:
                error_text = await response.text()
                raise AIClientError(f"Azure OpenAI API error {response.status}: {error_text}")
            
            data = await response.json()
            return self._normalize_openai_response(data)  # Azure uses OpenAI format
    
    async def _google_request(
        self,
        endpoint: Dict[str, Any],
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Make Google AI API request"""
        
        model_name = model or endpoint['models'][0]
        url = f"{endpoint['base_url']}/v1/models/{model_name}:generateContent"
        
        headers = {
            'Authorization': f"Bearer {endpoint['api_key']}",
            'Content-Type': 'application/json'
        }
        
        # Convert to Google format
        contents = []
        for msg in messages:
            if msg['role'] == 'system':
                # Google doesn't have system role, prepend to first user message
                continue
            role = 'user' if msg['role'] in ['user', 'system'] else 'model'
            contents.append({
                'role': role,
                'parts': [{'text': msg['content']}]
            })
        
        payload = {
            'contents': contents,
            'generationConfig': {
                'temperature': temperature
            }
        }
        
        if max_tokens:
            payload['generationConfig']['maxOutputTokens'] = max_tokens
        
        timeout = aiohttp.ClientTimeout(total=endpoint.get('timeout', 30))
        
        async with self.session.post(url, headers=headers, json=payload, timeout=timeout) as response:
            if response.status != 200:
                error_text = await response.text()
                raise AIClientError(f"Google AI API error {response.status}: {error_text}")
            
            data = await response.json()
            return self._normalize_google_response(data)
    
    async def _cohere_request(
        self,
        endpoint: Dict[str, Any],
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Make Cohere API request"""
        
        url = f"{endpoint['base_url']}/v1/chat"
        headers = {
            'Authorization': f"Bearer {endpoint['api_key']}",
            'Content-Type': 'application/json'
        }
        
        # Convert to Cohere format
        chat_history = []
        message = ""
        
        for msg in messages:
            if msg['role'] == 'system':
                # Add system message as preamble
                continue
            elif msg['role'] == 'user':
                message = msg['content']
            elif msg['role'] == 'assistant':
                chat_history.append({
                    'role': 'CHATBOT',
                    'message': msg['content']
                })
        
        payload = {
            'model': model or endpoint['models'][0],
            'message': message,
            'temperature': temperature
        }
        
        if chat_history:
            payload['chat_history'] = chat_history
        
        if max_tokens:
            payload['max_tokens'] = max_tokens
        
        payload.update(kwargs)
        
        timeout = aiohttp.ClientTimeout(total=endpoint.get('timeout', 30))
        
        async with self.session.post(url, headers=headers, json=payload, timeout=timeout) as response:
            if response.status != 200:
                error_text = await response.text()
                raise AIClientError(f"Cohere API error {response.status}: {error_text}")
            
            data = await response.json()
            return self._normalize_cohere_response(data)
    
    def _normalize_openai_response(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize OpenAI response to standard format"""
        return {
            'content': data['choices'][0]['message']['content'],
            'model': data['model'],
            'usage': data.get('usage', {}),
            'finish_reason': data['choices'][0]['finish_reason'],
            'raw_response': data
        }
    
    def _normalize_anthropic_response(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize Anthropic response to standard format"""
        return {
            'content': data['content'][0]['text'],
            'model': data['model'],
            'usage': data.get('usage', {}),
            'finish_reason': data['stop_reason'],
            'raw_response': data
        }
    
    def _normalize_google_response(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize Google response to standard format"""
        content = ""
        if 'candidates' in data and len(data['candidates']) > 0:
            candidate = data['candidates'][0]
            if 'content' in candidate and 'parts' in candidate['content']:
                content = candidate['content']['parts'][0].get('text', '')
        
        return {
            'content': content,
            'model': 'gemini-pro',  # Google doesn't return model in response
            'usage': {},
            'finish_reason': data.get('candidates', [{}])[0].get('finishReason', 'stop'),
            'raw_response': data
        }
    
    def _normalize_cohere_response(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize Cohere response to standard format"""
        return {
            'content': data['text'],
            'model': 'command',  # Cohere doesn't return model in response
            'usage': {},
            'finish_reason': 'stop',
            'raw_response': data
        }

# Convenience function for simple usage
async def chat_completion(
    messages: List[Dict[str, str]],
    model: Optional[str] = None,
    temperature: float = 0.7,
    max_tokens: Optional[int] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Simple chat completion function with automatic load balancing
    
    Usage:
        response = await chat_completion([
            {"role": "user", "content": "Hello, how are you?"}
        ])
        print(response['content'])
    """
    async with AIClient() as client:
        return await client.chat_completion(
            messages=messages,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            **kwargs
        )
