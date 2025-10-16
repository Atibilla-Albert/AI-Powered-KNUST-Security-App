import { apiService } from './api';

// ML service aligned with backend /ml routes
export const sagemakerService = {
  // Analyze risk (text + features)
  async analyzeRisk(payload) {
    return await apiService.post('/ml/analyze-risk', payload);
  },

  // Analyze text (NLP)
  async analyzeText(payload) {
    return await apiService.post('/ml/analyze-text', payload);
  },

  // Shim used by incidentService to keep call site stable
  async getIncidentRiskAnalysis(incidentId) {
    return await this.analyzeRisk({ incidentId });
  },

  // Placeholder until backend provides a related incidents endpoint
  async getRelatedIncidents(incidentId, limit = 5) {
    return await this.analyzeText({ incidentId, limit });
  }
};

export default sagemakerService;