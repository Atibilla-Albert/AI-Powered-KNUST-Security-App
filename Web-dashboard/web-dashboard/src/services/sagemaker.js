import { apiService } from './api';

const API_NAME = 'incidentApi';

// SageMaker service for incident analysis
export const sagemakerService = {
  /**
   * Get incident risk analysis
   * @param {string} incidentId - Incident ID
   * @returns {Promise<Object>} - Risk analysis results
   */
  async getIncidentRiskAnalysis(incidentId) {
    return await apiService.get(API_NAME, `/analysis/risk/${incidentId}`);
  },

  /**
   * Get related incidents based on ML analysis
   * @param {string} incidentId - Incident ID
   * @param {number} limit - Maximum number of related incidents to return
   * @returns {Promise<Array>} - List of related incidents
   */
  async getRelatedIncidents(incidentId, limit = 5) {
    return await apiService.get(API_NAME, `/analysis/related/${incidentId}`, { limit });
  },

  /**
   * Get incident priority recommendation
   * @param {Object} incidentData - Incident data
   * @returns {Promise<Object>} - Priority recommendation
   */
  async getIncidentPriorityRecommendation(incidentData) {
    return await apiService.post(API_NAME, '/analysis/priority-recommendation', incidentData);
  },

  /**
   * Get incident classification
   * @param {Object} incidentData - Incident data
   * @returns {Promise<Object>} - Classification results
   */
  async getIncidentClassification(incidentData) {
    return await apiService.post(API_NAME, '/analysis/classify', incidentData);
  },

  /**
   * Get anomaly detection results for a specific location
   * @param {string} locationId - Location ID
   * @param {Object} timeRange - Time range for analysis
   * @returns {Promise<Object>} - Anomaly detection results
   */
  async getLocationAnomalyDetection(locationId, timeRange) {
    return await apiService.get(API_NAME, `/analysis/anomaly/${locationId}`, timeRange);
  },

  /**
   * Get incident forecast for the next time period
   * @param {string} timeframe - Timeframe for forecast (day, week, month)
   * @param {Object} filters - Optional filters
   * @returns {Promise<Object>} - Incident forecast data
   */
  async getIncidentForecast(timeframe = 'week', filters = {}) {
    return await apiService.get(API_NAME, '/analysis/forecast', { 
      timeframe,
      ...filters
    });
  }
};

export default sagemakerService;