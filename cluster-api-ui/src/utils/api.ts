import { API_BASE_URL } from '../config';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  [key: string]: any;
}

interface ApiCallOptions extends Omit<RequestInit, 'body'> {
  data?: any;
  params?: Record<string, any>;
  headers?: Record<string, string>;
}

export const apiCall = async <T = any>(
  urlOrOptions: string | ApiCallOptions,
  options: ApiCallOptions = {}
): Promise<ApiResponse<T>> => {
  // Handle both string URL and options object patterns
  let url: string;
  let requestOptions: ApiCallOptions;
  
  if (typeof urlOrOptions === 'string') {
    // Legacy string URL pattern
    url = urlOrOptions;
    requestOptions = options;
  } else {
    // New options object pattern
    requestOptions = urlOrOptions;
    url = requestOptions.url || '';
  }
  
  // Construct full URL with query parameters if params are provided
  const queryString = requestOptions.params 
    ? `?${new URLSearchParams(requestOptions.params).toString()}` 
    : '';
  
  const fullUrl = `${url}${queryString}`;
  const token = localStorage.getItem('jwt_token');
  const headers = new Headers({
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...(requestOptions.headers || {})
  });

  // Handle request body
  const body = requestOptions.data ? JSON.stringify(requestOptions.data) : undefined;

  try {
    const response = await fetch(fullUrl.startsWith('http') ? fullUrl : `${API_BASE_URL}${fullUrl}`, {
      ...requestOptions,
      headers,
      body
    });

    if (response.status === 401) {
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('user_data');
      window.location.reload();
      return { success: false, error: 'Unauthorized' };
    }

    const responseData = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: responseData.message || 'Request failed',
        ...responseData
      };
    }
    
    // Return the response data with success flag
    return { 
      success: true,
      data: responseData.data || responseData, // Handle both { data: ... } and direct response formats
      ...(responseData.data ? {} : responseData) // Only spread if data is not already extracted
    };
  } catch (error) {
    console.error('API call failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};
