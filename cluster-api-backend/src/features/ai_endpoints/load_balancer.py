import random
import time
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
import logging
from dataclasses import dataclass, field
from enum import Enum

logger = logging.getLogger(__name__)

class LoadBalancingStrategy(Enum):
    ROUND_ROBIN = "round_robin"
    WEIGHTED_ROUND_ROBIN = "weighted_round_robin"
    LEAST_CONNECTIONS = "least_connections"
    RESPONSE_TIME = "response_time"
    RANDOM = "random"

@dataclass
class EndpointStats:
    """Statistics for an AI endpoint"""
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    total_response_time: float = 0.0
    active_connections: int = 0
    last_request_time: Optional[datetime] = None
    consecutive_failures: int = 0
    circuit_breaker_open: bool = False
    circuit_breaker_open_time: Optional[datetime] = None

    @property
    def success_rate(self) -> float:
        if self.total_requests == 0:
            return 1.0
        return self.successful_requests / self.total_requests

    @property
    def average_response_time(self) -> float:
        if self.successful_requests == 0:
            return float('inf')
        return self.total_response_time / self.successful_requests

class AIEndpointLoadBalancer:
    """Advanced load balancer for AI endpoints with failover and circuit breaker"""
    
    def __init__(self, strategy: LoadBalancingStrategy = LoadBalancingStrategy.WEIGHTED_ROUND_ROBIN):
        self.strategy = strategy
        self.endpoints: Dict[str, Dict] = {}
        self.stats: Dict[str, EndpointStats] = {}
        self.round_robin_index = 0
        
        # Circuit breaker settings
        self.circuit_breaker_threshold = 5  # failures before opening circuit
        self.circuit_breaker_timeout = 60  # seconds before trying again
        
        # Rate limiting
        self.rate_limits: Dict[str, List[float]] = {}
        
    def register_endpoint(self, endpoint: Dict) -> None:
        """Register an AI endpoint for load balancing"""
        endpoint_id = endpoint['id']
        self.endpoints[endpoint_id] = endpoint
        self.stats[endpoint_id] = EndpointStats()
        self.rate_limits[endpoint_id] = []
        
        logger.info(f"Registered endpoint {endpoint_id} ({endpoint['provider']})")
    
    def unregister_endpoint(self, endpoint_id: str) -> None:
        """Unregister an AI endpoint"""
        if endpoint_id in self.endpoints:
            del self.endpoints[endpoint_id]
            del self.stats[endpoint_id]
            del self.rate_limits[endpoint_id]
            logger.info(f"Unregistered endpoint {endpoint_id}")
    
    def get_available_endpoints(self) -> List[Dict]:
        """Get list of available (enabled and healthy) endpoints"""
        available = []
        current_time = datetime.utcnow()
        
        for endpoint_id, endpoint in self.endpoints.items():
            if not endpoint.get('enabled', True):
                continue
                
            stats = self.stats[endpoint_id]
            
            # Check circuit breaker
            if stats.circuit_breaker_open:
                if (stats.circuit_breaker_open_time and 
                    current_time - stats.circuit_breaker_open_time > timedelta(seconds=self.circuit_breaker_timeout)):
                    # Reset circuit breaker
                    stats.circuit_breaker_open = False
                    stats.circuit_breaker_open_time = None
                    stats.consecutive_failures = 0
                    logger.info(f"Circuit breaker reset for endpoint {endpoint_id}")
                else:
                    continue
            
            # Check rate limits
            if self._is_rate_limited(endpoint_id):
                continue
                
            available.append(endpoint)
        
        return available
    
    def select_endpoint(self, model: Optional[str] = None) -> Optional[Dict]:
        """Select the best endpoint based on the load balancing strategy"""
        available_endpoints = self.get_available_endpoints()
        
        if not available_endpoints:
            logger.warning("No available endpoints for request")
            return None
        
        # Filter by model if specified
        if model:
            model_endpoints = [ep for ep in available_endpoints if model in ep.get('models', [])]
            if model_endpoints:
                available_endpoints = model_endpoints
        
        if len(available_endpoints) == 1:
            return available_endpoints[0]
        
        # Apply load balancing strategy
        if self.strategy == LoadBalancingStrategy.ROUND_ROBIN:
            return self._round_robin_select(available_endpoints)
        elif self.strategy == LoadBalancingStrategy.WEIGHTED_ROUND_ROBIN:
            return self._weighted_round_robin_select(available_endpoints)
        elif self.strategy == LoadBalancingStrategy.LEAST_CONNECTIONS:
            return self._least_connections_select(available_endpoints)
        elif self.strategy == LoadBalancingStrategy.RESPONSE_TIME:
            return self._response_time_select(available_endpoints)
        elif self.strategy == LoadBalancingStrategy.RANDOM:
            return random.choice(available_endpoints)
        else:
            return available_endpoints[0]
    
    def _round_robin_select(self, endpoints: List[Dict]) -> Dict:
        """Simple round-robin selection"""
        endpoint = endpoints[self.round_robin_index % len(endpoints)]
        self.round_robin_index += 1
        return endpoint
    
    def _weighted_round_robin_select(self, endpoints: List[Dict]) -> Dict:
        """Weighted round-robin based on priority and success rate"""
        weights = []
        for endpoint in endpoints:
            stats = self.stats[endpoint['id']]
            priority_weight = 10 - endpoint.get('priority', 5)  # Higher priority = lower number
            success_weight = stats.success_rate * 10
            combined_weight = max(1, priority_weight + success_weight)
            weights.append(combined_weight)
        
        # Weighted random selection
        total_weight = sum(weights)
        if total_weight == 0:
            return endpoints[0]
        
        r = random.uniform(0, total_weight)
        cumulative_weight = 0
        
        for i, weight in enumerate(weights):
            cumulative_weight += weight
            if r <= cumulative_weight:
                return endpoints[i]
        
        return endpoints[-1]
    
    def _least_connections_select(self, endpoints: List[Dict]) -> Dict:
        """Select endpoint with least active connections"""
        return min(endpoints, key=lambda ep: self.stats[ep['id']].active_connections)
    
    def _response_time_select(self, endpoints: List[Dict]) -> Dict:
        """Select endpoint with best average response time"""
        return min(endpoints, key=lambda ep: self.stats[ep['id']].average_response_time)
    
    def record_request_start(self, endpoint_id: str) -> None:
        """Record the start of a request"""
        if endpoint_id in self.stats:
            stats = self.stats[endpoint_id]
            stats.active_connections += 1
            stats.last_request_time = datetime.utcnow()
            
            # Update rate limiting
            current_time = time.time()
            self.rate_limits[endpoint_id].append(current_time)
    
    def record_request_end(self, endpoint_id: str, success: bool, response_time: float) -> None:
        """Record the end of a request"""
        if endpoint_id not in self.stats:
            return
            
        stats = self.stats[endpoint_id]
        stats.active_connections = max(0, stats.active_connections - 1)
        stats.total_requests += 1
        
        if success:
            stats.successful_requests += 1
            stats.total_response_time += response_time
            stats.consecutive_failures = 0
            
            # Close circuit breaker if it was open
            if stats.circuit_breaker_open:
                stats.circuit_breaker_open = False
                stats.circuit_breaker_open_time = None
                logger.info(f"Circuit breaker closed for endpoint {endpoint_id}")
        else:
            stats.failed_requests += 1
            stats.consecutive_failures += 1
            
            # Check if we should open circuit breaker
            if stats.consecutive_failures >= self.circuit_breaker_threshold:
                stats.circuit_breaker_open = True
                stats.circuit_breaker_open_time = datetime.utcnow()
                logger.warning(f"Circuit breaker opened for endpoint {endpoint_id}")
    
    def _is_rate_limited(self, endpoint_id: str) -> bool:
        """Check if endpoint is rate limited"""
        if endpoint_id not in self.endpoints:
            return True
            
        endpoint = self.endpoints[endpoint_id]
        max_requests = endpoint.get('max_requests_per_minute', 60)
        
        current_time = time.time()
        minute_ago = current_time - 60
        
        # Clean old requests
        self.rate_limits[endpoint_id] = [
            req_time for req_time in self.rate_limits[endpoint_id] 
            if req_time > minute_ago
        ]
        
        return len(self.rate_limits[endpoint_id]) >= max_requests
    
    def get_endpoint_stats(self, endpoint_id: str) -> Optional[Dict]:
        """Get statistics for a specific endpoint"""
        if endpoint_id not in self.stats:
            return None
            
        stats = self.stats[endpoint_id]
        return {
            'endpoint_id': endpoint_id,
            'total_requests': stats.total_requests,
            'successful_requests': stats.successful_requests,
            'failed_requests': stats.failed_requests,
            'success_rate': stats.success_rate,
            'average_response_time': stats.average_response_time,
            'active_connections': stats.active_connections,
            'circuit_breaker_open': stats.circuit_breaker_open,
            'consecutive_failures': stats.consecutive_failures,
            'last_request_time': stats.last_request_time.isoformat() if stats.last_request_time else None
        }
    
    def get_all_stats(self) -> Dict[str, Dict]:
        """Get statistics for all endpoints"""
        return {
            endpoint_id: self.get_endpoint_stats(endpoint_id)
            for endpoint_id in self.stats.keys()
        }
    
    def reset_stats(self, endpoint_id: Optional[str] = None) -> None:
        """Reset statistics for an endpoint or all endpoints"""
        if endpoint_id:
            if endpoint_id in self.stats:
                self.stats[endpoint_id] = EndpointStats()
                self.rate_limits[endpoint_id] = []
        else:
            for endpoint_id in self.stats.keys():
                self.stats[endpoint_id] = EndpointStats()
                self.rate_limits[endpoint_id] = []

# Global load balancer instance
load_balancer = AIEndpointLoadBalancer()

def get_load_balancer() -> AIEndpointLoadBalancer:
    """Get the global load balancer instance"""
    return load_balancer
