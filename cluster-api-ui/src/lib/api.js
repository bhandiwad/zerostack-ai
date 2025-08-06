const API_BASE_URL = 'http://localhost:5002/api';

const apiCall = async (endpoint, options = {}) => {
  const token = localStorage.getItem('jwt_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers
  };

  try {
    const { data: requestData, ...restOptions } = options;
    const body = requestData ? JSON.stringify(requestData) : undefined;

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...restOptions,
      headers,
      ...(body && { body }),
    });

    if (response.status === 401) {
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('user_data');
      window.location.reload();
      return null;
    }

    const data = await response.json();
    
    if (!response.ok && data) {
      return data;
    }
    
    return data;
  } catch (error) {
    console.error('API call failed:', error);
    return { success: false, error: error.message };
  }
};

export default apiCall;
