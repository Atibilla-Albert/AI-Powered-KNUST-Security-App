import { apiService } from './api';
import { sagemakerService } from './sagemaker';

export const incidentService = {
  async createIncident(incidentData, mediaFiles = [], token) {
    try {
      const incident = await apiService.post('/incidents', incidentData, { headers: { Authorization: `Bearer ${token}` } });

      if (mediaFiles.length > 0) {
        const uploadPromises = mediaFiles.map(file =>
          this.uploadIncidentMedia(incident.incidentId, file, token)
        );
        await Promise.all(uploadPromises);
      }

      const analysis = await sagemakerService.getIncidentRiskAnalysis(incident.incidentId, token);
      return { ...incident, analysis };
    } catch (error) {
      console.error('Error creating incident:', error?.response?.data || error.message);
      throw error;
    }
  },

  async uploadIncidentMedia(incidentId, file, token) {
    try {
      const formData = new FormData();
      formData.append('file', file);

      return await apiService.post(
        `/incidents/${incidentId}/media`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
    } catch (error) {
      console.error(`Error uploading media for incident ${incidentId}:`, error?.response?.data || error.message);
      throw error;
    }
  },

  async getIncidentById(incidentId, token) {
    try {
      console.log(`Fetching incident by ID: ${incidentId} with token: ${token ? 'present' : 'missing'}`);
      const response = await apiService.get(`/incidents/${incidentId}`);
      console.log(`Fetched incident by ID ${incidentId}:`, response);
      return response;
    } catch (error) {
      console.error(`Error fetching incident by ID ${incidentId}:`, {
        message: error?.response?.data?.message || error.message,
        status: error?.response?.status,
        stack: error.stack,
      });
      throw error;
    }
  },

  async getIncidents(filters = {}, token) {
    try {
      console.log('Fetching incidents with filters:', filters);
      const response = await apiService.get('/incidents', filters);
      console.log('Fetched incidents:', response);
      return response;
    } catch (error) {
      console.error('Error fetching incidents:', error?.response?.data || error.message);
      throw error;
    }
  },

  async updateIncident(incidentId, updateData, token) {
    try {
      return await apiService.put(`/incidents/${incidentId}`, updateData);
    } catch (error) {
      console.error(`Error updating incident ${incidentId}:`, error?.response?.data || error.message);
      throw error;
    }
  },

  async assignIncident(incidentId, department, notes = '') {
    try {
      return await apiService.put(`/incidents/${incidentId}/assign`, {
        assignedTo: department,
        notes
      });
    } catch (error) {
      console.error(`Error assigning incident ${incidentId} to department ${department}:`, error?.response?.data || error.message);
      throw error;
    }
  },

  async changeStatus(incidentId, status, notes = '', token) {
    try {
      return await apiService.put(`/incidents/${incidentId}/status`, {
        status,
        notes
      });
    } catch (error) {
      console.error(`Error changing status for incident ${incidentId}:`, error?.response?.data || error.message);
      throw error;
    }
  },

  async addResponse(incidentId, responseData, token) {
    try {
      return await apiService.post(`/incidents/${incidentId}/responses`, responseData);
    } catch (error) {
      console.error(`Error adding response to incident ${incidentId}:`, error?.response?.data || error.message);
      throw error;
    }
  },

  async getIncidentStats(filters = {}, token) {
    try {
      return await apiService.get('/incidents/stats', filters);
    } catch (error) {
      console.error('Error fetching incident stats:', error?.response?.data || error.message);
      throw error;
    }
  },

  async getRelatedIncidents(incidentId, limit = 5, token) {
    try {
      return await sagemakerService.getRelatedIncidents(incidentId, limit, token);
    } catch (error) {
      console.error(`Error fetching related incidents for ${incidentId}:`, error?.response?.data || error.message);
      throw error;
    }
  }
};

export default incidentService;