import axios from 'axios';
import { authService } from './auth';

const BASE_URL = 'http://localhost:3000/dev'; // 🔁 Change this for your deployed backend

export const apiService = {
  async get(path, queryParams = {}, customConfig = {}) {
    try {
      const headers = {
        ...authService.getAuthHeader(),
        ...(customConfig.headers || {})
      };
      console.log(`GET ${path} - Headers:`, headers);
      const response = await axios.get(`${BASE_URL}${path}`, {
        headers,
        params: queryParams
      });
      return response.data;
    } catch (error) {
      console.error(`GET ${path} failed:`, error?.response?.data || error.message);
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
      console.error(`POST ${path} failed:`, error?.response?.data || error.message);
      throw error;
    }
  },

  async put(path, data) {
    try {
      const headers = authService.getAuthHeader();
      const response = await axios.put(`${BASE_URL}${path}`, data, { headers });
      return response.data;
    } catch (error) {
      console.error(`PUT ${path} failed:`, error?.response?.data || error.message);
      throw error;
    }
  },

  async delete(path) {
    try {
      const headers = authService.getAuthHeader();
      const response = await axios.delete(`${BASE_URL}${path}`, { headers });
      return response.data;
    } catch (error) {
      console.error(`DELETE ${path} failed:`, error?.response?.data || error.message);
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
      console.error(`GET /media/download-url failed:`, error?.response?.data || error.message);
      throw error;
    }
  }
};

export default apiService;
