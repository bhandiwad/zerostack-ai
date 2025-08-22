import { API_BASE_URL } from '../config';

export const apiCall = async (endpoint, options = {}) => {
  // Normalize endpoint to ensure consistent path
  let normalizedEndpoint = endpoint;
  
  // Convert /mt/ to /multitenant/
  normalizedEndpoint = normalizedEndpoint.replace(/^\/mt\//, '/multitenant/');
  
  // Ensure cluster endpoints use the correct prefix
  if (normalizedEndpoint.startsWith('/clusters/') || normalizedEndpoint === '/clusters') {
    normalizedEndpoint = normalizedEndpoint.replace(/^\/clusters/, '/multitenant/clusters');
  }
  
  const url = `${API_BASE_URL}${normalizedEndpoint}`;
  
  // Get or create a development token
  let token = localStorage.getItem('jwt_token');
  if (!token) {
    // Create a development token for demo purposes
    token = 'dev-token-' + Date.now();
    localStorage.setItem('jwt_token', token);
  }
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...(options.headers || {})
      },
      credentials: 'include'
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`API call failed: ${response.status} ${response.statusText}`, error);
      throw new Error(error || 'API request failed');
    }

    // Handle empty responses
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return { success: true };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API call error:', error);
    throw error;
  }
};

// Helper methods for common operations
export const api = {
  get: (endpoint) => apiCall(endpoint, { method: 'GET' }),
  post: (endpoint, data) => apiCall(endpoint, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  put: (endpoint, data) => apiCall(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  delete: (endpoint) => apiCall(endpoint, { method: 'DELETE' })
};
