/**
 * SageMaker service for interacting with ML models
 */
const { getToken } = require('../auth/cognito');

const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT || 'http://localhost:3000';

const getIncidentRiskAnalysis = async (data) => {
  try {
    console.log('Sending risk analysis request:', JSON.stringify(data, null, 2));
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
      console.error('Risk analysis error:', {
        status: response.status,
        error: errorData.error,
      });
      throw new Error(errorData.error || 'Failed to analyze incident risk');
    }

    const result = await response.json();
    console.log('Risk analysis response:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('Error in getIncidentRiskAnalysis:', {
      message: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

module.exports = {
  getIncidentRiskAnalysis,
};