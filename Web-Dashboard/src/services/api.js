import axios from 'axios';
import { authService } from './auth';

const BASE_URL = process.env.REACT_APP_API_BASE_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:3000/dev' : '');
if (!BASE_URL) throw new Error('REACT_APP_API_BASE_URL must be configured for production.');
if (process.env.NODE_ENV === 'production' && !BASE_URL.startsWith('https://')) throw new Error('The production API URL must use HTTPS.');

export const apiService = {
  async get(path, queryParams = {}, customConfig = {}) {
    try {
      const headers = {
        ...authService.getAuthHeader(),
        ...(customConfig.headers || {})
      };

      const response = await axios.get(`${BASE_URL}${path}`, {
        headers,
        params: queryParams
      });
      return response.data;
    } catch (error) {
      console.error(`GET ${path} failed`, { status: error?.response?.status });
      throw error;
    }
  },

  async post(path, data, customConfig = {}) {
    try {
      const headers = {
        ...authService.getAuthHeader(),
        ...(customConfig.headers || {})
      };
      const response = await axios.post(`${BASE_URL}${path}`, data, { headers });
      return response.data;
    } catch (error) {
      console.error(`POST ${path} failed`, { status: error?.response?.status });
      throw error;
    }
  },

  async put(path, data) {
    try {
      const headers = authService.getAuthHeader();
      const response = await axios.put(`${BASE_URL}${path}`, data, { headers });
      return response.data;
    } catch (error) {
      console.error(`PUT ${path} failed`, { status: error?.response?.status });
      throw error;
    }
  },

  async delete(path) {
    try {
      const headers = authService.getAuthHeader();
      const response = await axios.delete(`${BASE_URL}${path}`, { headers });
      return response.data;
    } catch (error) {
      console.error(`DELETE ${path} failed`, { status: error?.response?.status });
      throw error;
    }
  },

  // ✅ NEW: Get presigned download URL for media
  async getPresignedDownloadUrl(incidentId, key) {
    try {
      const headers = authService.getAuthHeader();
      const response = await axios.get(
        `${BASE_URL}/incidents/${incidentId}/media/download-url`,
        {
          headers,
          params: { key }
        }
      );
      return response.data.url;
    } catch (error) {
      console.error('GET media download URL failed', { status: error?.response?.status });
      throw error;
    }
  }
};

export default apiService;
