import { API } from 'aws-amplify';
import { authService } from './auth';

// API service for making requests to API Gateway
export const apiService = {
  /**
   * Make a GET request to the API
   * @param {string} apiName - Name of the API as defined in aws-config.js
   * @param {string} path - API path
   * @param {Object} queryParams - Query parameters
   * @returns {Promise<any>} - Response data
   */
  async get(apiName, path, queryParams = {}) {
    try {
      const session = await authService.getCurrentSession();
      const token = session?.getIdToken().getJwtToken();
      
      const params = {
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
        },
        queryStringParameters: queryParams,
      };
      
      return await API.get(apiName, path, params);
    } catch (error) {
      console.error(`Error in GET request to ${path}:`, error);
      throw error;
    }
  },

  /**
   * Make a POST request to the API
   * @param {string} apiName - Name of the API as defined in aws-config.js
   * @param {string} path - API path
   * @param {Object} data - Request body
   * @returns {Promise<any>} - Response data
   */
  async post(apiName, path, data) {
    try {
      const session = await authService.getCurrentSession();
      const token = session?.getIdToken().getJwtToken();
      
      const params = {
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
        },
        body: data,
      };
      
      return await API.post(apiName, path, params);
    } catch (error) {
      console.error(`Error in POST request to ${path}:`, error);
      throw error;
    }
  },

  /**
   * Make a PUT request to the API
   * @param {string} apiName - Name of the API as defined in aws-config.js
   * @param {string} path - API path
   * @param {Object} data - Request body
   * @returns {Promise<any>} - Response data
   */
  async put(apiName, path, data) {
    try {
      const session = await authService.getCurrentSession();
      const token = session?.getIdToken().getJwtToken();
      
      const params = {
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
        },
        body: data,
      };
      
      return await API.put(apiName, path, params);
    } catch (error) {
      console.error(`Error in PUT request to ${path}:`, error);
      throw error;
    }
  },

  /**
   * Make a DELETE request to the API
   * @param {string} apiName - Name of the API as defined in aws-config.js
   * @param {string} path - API path
   * @returns {Promise<any>} - Response data
   */
  async delete(apiName, path) {
    try {
      const session = await authService.getCurrentSession();
      const token = session?.getIdToken().getJwtToken();
      
      const params = {
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
        },
      };
      
      return await API.del(apiName, path, params);
    } catch (error) {
      console.error(`Error in DELETE request to ${path}:`, error);
      throw error;
    }
  }
};

export default apiService;