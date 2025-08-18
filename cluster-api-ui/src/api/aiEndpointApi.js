const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:5002' 
  : 'http://localhost:5002';

class AIEndpointAPI {
  async getEndpoints() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/endpoints`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error getting endpoints:', error);
      throw error;
    }
  }

  async createEndpoint(endpointData) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/endpoints`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(endpointData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating endpoint:', error);
      throw error;
    }
  }

  async updateEndpoint(endpointId, endpointData) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/endpoints/${endpointId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(endpointData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating endpoint:', error);
      throw error;
    }
  }

  async deleteEndpoint(endpointId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/endpoints/${endpointId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting endpoint:', error);
      throw error;
    }
  }

  async testEndpoint(endpointId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/endpoints/${endpointId}/test`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error testing endpoint:', error);
      throw error;
    }
  }

  async getProviders() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/providers`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error getting providers:', error);
      throw error;
    }
  }

  async getEndpointsHealth() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/endpoints/health`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error getting endpoints health:', error);
      throw error;
    }
  }
}

export default new AIEndpointAPI();
