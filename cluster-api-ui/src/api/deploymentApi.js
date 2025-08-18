const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:5002' 
  : 'http://localhost:5002';

class DeploymentAPI {
  async createDeployment(deploymentData) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/deployments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deploymentData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating deployment:', error);
      throw error;
    }
  }

  async getDeployment(deploymentId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/deployments/${deploymentId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting deployment:', error);
      throw error;
    }
  }

  async getDeploymentLogs(deploymentId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/deployments/${deploymentId}/logs`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting deployment logs:', error);
      throw error;
    }
  }

  async listDeployments() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/deployments`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error listing deployments:', error);
      throw error;
    }
  }

  // Utility method to poll deployment status
  async pollDeploymentStatus(deploymentId, onUpdate, intervalMs = 2000) {
    const poll = async () => {
      try {
        const result = await this.getDeployment(deploymentId);
        if (result.success) {
          onUpdate(result.deployment);
          
          // Continue polling if deployment is still in progress
          if (result.deployment.status === 'deploying' || result.deployment.status === 'initializing') {
            setTimeout(poll, intervalMs);
          }
        }
      } catch (error) {
        console.error('Error polling deployment status:', error);
        onUpdate({ status: 'error', error: error.message });
      }
    };

    // Start polling
    poll();
  }
}

export default new DeploymentAPI();
