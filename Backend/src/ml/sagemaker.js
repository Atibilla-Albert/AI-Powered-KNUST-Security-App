/**
 * SageMaker service for interacting with ML models
 */
const { getToken } = require('../auth/cognito');

const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT || 'http://localhost:3000';

const getIncidentRiskAnalysis = async (data) => {
  try {
    console.info('Sending risk analysis request');
    const response = await fetch(`${API_ENDPOINT}/ml/analyze-risk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${await getToken()}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Risk analysis request failed', { status: response.status });
      throw new Error(errorData.error || 'Failed to analyze incident risk');
    }

    const result = await response.json();
    console.info('Risk analysis response received');
    return result;
  } catch (error) {
    console.error('Risk analysis operation failed', { name: error.name || 'Error' });
    throw error;
  }
};

module.exports = {
  getIncidentRiskAnalysis,
};