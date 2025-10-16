import { apiService } from './api';
import { sagemakerService } from './sagemaker';

export const incidentService = {
  async createIncident(incidentData, mediaFiles = [], token) {
    try {
      // Create incident
      const incident = await apiService.post('/incidents', incidentData, { headers: { Authorization: `Bearer ${token}` } });

      // Upload media files via presigned URLs if provided
      if (mediaFiles.length > 0) {
        const uploadTasks = mediaFiles.map(async (file) => {
          const uploadMeta = await apiService.post(
            `/incidents/${incident.incidentId}/media/upload-url`,
            { filename: file.name, contentType: file.type }
          );
          // PUT directly to S3 signed URL
          await fetch(uploadMeta.url, {
            method: 'PUT',
            headers: {
              'Content-Type': file.type
            },
            body: file
          });
          // Add attachment to incident after successful upload
          await apiService.post(
            `/incidents/${incident.incidentId}/media`,
            { key: uploadMeta.key }
          );
          return uploadMeta.key;
        });
        await Promise.all(uploadTasks);
      }

      // Optional ML analysis
      const analysis = await sagemakerService.getIncidentRiskAnalysis(incident.incidentId);
      return { ...incident, analysis };
    } catch (error) {
      console.error('Error creating incident:', error?.response?.data || error.message);
      throw error;
    }
  },

  async getIncidentById(incidentId) {
    try {
      const response = await apiService.get(`/incidents/${incidentId}`);
      return response;
    } catch (error) {
      console.error(`Error fetching incident by ID ${incidentId}:`, error?.response?.data || error.message);
      throw error;
    }
  },

  async getIncidents(filters = {}) {
    try {
      return await apiService.get('/incidents', filters);
    } catch (error) {
      console.error('Error fetching incidents:', error?.response?.data || error.message);
      throw error;
    }
  },

  async updateIncident(incidentId, updateData) {
    try {
      return await apiService.put(`/incidents/${incidentId}`, updateData);
    } catch (error) {
      console.error(`Error updating incident ${incidentId}:`, error?.response?.data || error.message);
      throw error;
    }
  },

  async assignIncident(incidentId, departmentId, notes = '') {
    try {
      // Backend expects POST /incidents/:id/assign with { departmentId, notes }
      return await apiService.post(`/incidents/${incidentId}/assign`, { departmentId, notes });
    } catch (error) {
      console.error(`Error assigning incident ${incidentId} to department ${departmentId}:`, error?.response?.data || error.message);
      throw error;
    }
  },

  async changeStatus(incidentId, status, notes = '') {
    try {
      // Backend updates via PUT /incidents/:id with fields to update
      return await apiService.put(`/incidents/${incidentId}`, { status, notes });
    } catch (error) {
      console.error(`Error changing status for incident ${incidentId}:`, error?.response?.data || error.message);
      throw error;
    }
  },

  async deleteIncident(incidentId) {
    try {
      return await apiService.delete(`/incidents/${incidentId}`);
    } catch (error) {
      console.error(`Error deleting incident ${incidentId}:`, error?.response?.data || error.message);
      throw error;
    }
  },

  async getDepartments() {
    try {
      return await apiService.get('/departments');
    } catch (error) {
      console.error('Error fetching departments:', error?.response?.data || error.message);
      throw error;
    }
  },

  async getRelatedIncidents(incidentId, limit = 5) {
    try {
      return await sagemakerService.getRelatedIncidents(incidentId, limit);
    } catch (error) {
      console.error(`Error fetching related incidents for ${incidentId}:`, error?.response?.data || error.message);
      throw error;
    }
  }
};

export default incidentService;