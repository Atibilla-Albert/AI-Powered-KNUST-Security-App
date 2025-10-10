/**
 * Handlers for machine learning operations
 */
const { calculateFraudProbability } = require('../ml/fraudDetection');
const incidentRepo = require('../data/repositories/incidentRepo');
const { successResponse, errorResponse } = require('../utils/api-response');
const { getIncident } = require('./incident-handlers');

module.exports.analyzeRisk = async (event) => {
  try {
    const data = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { incidentId, description, type, severityLevel, location, timestamp } = data;
    const userId = event.requestContext?.authorizer?.claims?.sub;

    if (!incidentId) {
      return errorResponse(400, 'Incident ID is required');
    }

    const incidentResponse = await getIncident({ pathParameters: { id: incidentId } });
    if (incidentResponse.statusCode !== 200 || !incidentResponse.body) {
      return errorResponse(404, 'Incident not found');
    }

    const incident = JSON.parse(incidentResponse.body);

    console.log('Analyzing risk for incident:', { incidentId, userId });
    const fraudResult = await calculateFraudProbability(
      {
        description: description || incident.description,
        type: type || incident.incidentType,
        severityLevel: severityLevel || incident.severityLevel,
        location: location || incident.location,
        timestamp: timestamp || incident.createdAt,
      },
      userId
    );

    const updatedIncident = await incidentRepo.getIncidentById(incidentId);
    if (!updatedIncident) {
      return errorResponse(404, 'Incident not found');
    }
    updatedIncident.setMLAnalysisResults(fraudResult);
    await incidentRepo.updateIncident(updatedIncident);

    console.log('Risk analysis completed:', fraudResult);
    return successResponse(200, fraudResult);
  } catch (error) {
    console.error('Error analyzing risk:', {
      message: error.message,
      stack: error.stack,
    });
    return errorResponse(500, 'Failed to analyze incident risk');
  }
};

module.exports.analyzeText = async (event) => {
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { description, type } = body;
    if (!description) {
      return errorResponse(400, 'Description is required for text analysis');
    }

    console.log('Analyzing text for:', { description, type });
    const textResult = await calculateFraudProbability({ description, type });
    const result = {
      sentiment: textResult.sentiment || 'NEUTRAL',
      suspiciousPatterns: textResult.riskFactors || [],
      entities: textResult.entities || [],
      hasSuspiciousContent: textResult.isSuspicious || false,
    };

    console.log('Text analysis completed:', result);
    return successResponse(200, result);
  } catch (error) {
    console.error('Error analyzing text:', {
      message: error.message,
      stack: error.stack,
    });
    return errorResponse(500, 'Failed to analyze text content');
  }
};