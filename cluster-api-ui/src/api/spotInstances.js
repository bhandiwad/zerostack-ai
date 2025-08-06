import api from './api';

/**
 * Get spot instance configuration for a cluster
 * @param {string} accountId - Cloud account ID
 * @param {string} clusterId - Cluster ID
 * @returns {Promise<Object>} Spot instance configuration
 */
export const getSpotInstanceConfig = async (accountId, clusterId) => {
  try {
    const response = await api.get(
      `/api/cloud/accounts/${accountId}/clusters/${clusterId}/spot`
    );
    return response.data;
  } catch (error) {
    console.error('Error getting spot instance config:', error);
    throw error;
  }
};

/**
 * Update spot instance configuration for a cluster
 * @param {string} accountId - Cloud account ID
 * @param {string} clusterId - Cluster ID
 * @param {Object} config - New configuration
 * @returns {Promise<Object>} Updated configuration
 */
export const updateSpotInstanceConfig = async (accountId, clusterId, config) => {
  try {
    const response = await api.put(
      `/api/cloud/accounts/${accountId}/clusters/${clusterId}/spot`,
      config
    );
    return response.data;
  } catch (error) {
    console.error('Error updating spot instance config:', error);
    throw error;
  }
};

/**
 * Get spot instance savings report
 * @param {string} accountId - Cloud account ID
 * @param {string} clusterId - Cluster ID
 * @param {Object} params - Query parameters (startDate, endDate, granularity)
 * @returns {Promise<Object>} Savings report
 */
export const getSpotInstanceSavings = async (accountId, clusterId, params = {}) => {
  try {
    const response = await api.get(
      `/api/cloud/accounts/${accountId}/clusters/${clusterId}/spot/savings`,
      { params }
    );
    return response.data;
  } catch (error) {
    console.error('Error getting spot instance savings:', error);
    throw error;
  }
};

/**
 * Get spot instance interruption history
 * @param {string} accountId - Cloud account ID
 * @param {string} clusterId - Cluster ID
 * @param {Object} params - Query parameters (startDate, endDate, instanceType)
 * @returns {Promise<Array>} Interruption history
 */
export const getSpotInstanceInterruptions = async (accountId, clusterId, params = {}) => {
  try {
    const response = await api.get(
      `/api/cloud/accounts/${accountId}/clusters/${clusterId}/spot/interruptions`,
      { params }
    );
    return response.data;
  } catch (error) {
    console.error('Error getting spot instance interruptions:', error);
    throw error;
  }
};

/**
 * Get spot instance recommendations
 * @param {string} accountId - Cloud account ID
 * @param {string} clusterId - Cluster ID
 * @returns {Promise<Array>} List of recommendations
 */
export const getSpotInstanceRecommendations = async (accountId, clusterId) => {
  try {
    const response = await api.get(
      `/api/cloud/accounts/${accountId}/clusters/${clusterId}/spot/recommendations`
    );
    return response.data;
  } catch (error) {
    console.error('Error getting spot instance recommendations:', error);
    throw error;
  }
};

/**
 * Apply spot instance recommendation
 * @param {string} accountId - Cloud account ID
 * @param {string} clusterId - Cluster ID
 * @param {string} recommendationId - Recommendation ID
 * @returns {Promise<Object>} Result of applying the recommendation
 */
export const applySpotInstanceRecommendation = async (accountId, clusterId, recommendationId) => {
  try {
    const response = await api.post(
      `/api/cloud/accounts/${accountId}/clusters/${clusterId}/spot/recommendations/${recommendationId}/apply`
    );
    return response.data;
  } catch (error) {
    console.error('Error applying spot instance recommendation:', error);
    throw error;
  }
};
