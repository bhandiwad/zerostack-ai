import axios, { AxiosResponse } from 'axios';

const API_BASE_URL = 'http://localhost:5002/api';

// Create axios instance with base URL and default headers
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jwt_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('user_data');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Cluster Explorer API
export const clusterExplorerApi = {
    getResources: (clusterId: string, params: { resource_type: string; namespace?: string; }) => 
    api.get(`/v1/clusters/${clusterId}/resources`, { params }),
  
  getResource: (clusterId: string, resourceType: string, name: string, namespace?: string) => {
    const params = namespace ? { namespace } : {};
    return api.get(`/v1/clusters/${clusterId}/resources/${resourceType}/${name}`, { params });
  },
};

// Helm Charts API
export const helmChartsApi = {
  // Repositories
    listRepositories: (): Promise<AxiosResponse<unknown[]>> => api.get('/v1/helm/repositories'),
  addRepository: (name: string, url: string) => 
    api.post('/v1/helm/repositories', { name, url }),
  removeRepository: (name: string) => 
    api.delete(`/v1/helm/repositories/${name}`),
  
  // Charts
    listCharts: (): Promise<AxiosResponse<unknown[]>> => api.get('/v1/helm/charts'),
  
  // Releases
    listReleases: (namespace?: string): Promise<AxiosResponse<unknown[]>> => 
    api.get('/v1/helm/releases', { params: { namespace } }),
  installChart: (data: {
    release_name: string;
    chart_name: string;
    namespace: string;
    version?: string;
        values?: Record<string, unknown>;
  }) => api.post('/v1/helm/releases', data),
  
  getRelease: (releaseName: string) => 
    api.get(`/v1/helm/releases/${releaseName}`),
    
  deleteRelease: (releaseName: string) => 
    api.delete(`/v1/helm/releases/${releaseName}`),
    
  getReleaseHistory: (releaseName: string) => 
    api.get(`/v1/helm/releases/${releaseName}/history`),
    
  rollbackRelease: (releaseName: string, revision: number) => 
    api.post(`/v1/helm/releases/${releaseName}/rollback`, { revision }),
};

export default api;
