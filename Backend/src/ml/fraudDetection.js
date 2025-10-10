/**
 * Fraud detection service using AWS SageMaker
 */

const { invokeEndpoint } = require('../ml/sagemaker');
const { SAGEMAKER } = require('../config/aws-config');
const userRepo = require('../data/repositories/userRepo');

/**
 * Calculate fraud probability score for an incident report
 * @async
 * @param {Object} incidentData - Incident data
 * @param {string} reporterId - ID of the user who reported the incident
 * @returns {Promise<Object>} Fraud detection results
 */
const calculateFraudProbability = async (incidentData, reporterId) => {
  try {
    // Get reporter data to include credibility score
    const reporter = await userRepo.getUserById(reporterId);
    if (!reporter) {
      throw new Error(`Reporter with ID ${reporterId} not found`);
    }

    // Prepare payload for the ML model
    const payload = {
      incident: {
        description: incidentData.description,
        type: incidentData.type,
        severity: incidentData.severityLevel,
        location: incidentData.location,
        timestamp: incidentData.timestamp
      },
      reporter: {
        id: reporterId,
        credibilityScore: reporter.credibilityScore,
        totalReports: reporter.reportStats.totalReports,
        validatedReports: reporter.reportStats.validatedReports,
        falseReports: reporter.reportStats.falseReports
      }
    };

    // Call SageMaker endpoint
    const result = await invokeEndpoint(SAGEMAKER.ENDPOINTS.FRAUD_DETECTION, payload);

    return {
      fraudProbability: result.fraudProbability,
      confidenceScore: result.confidenceScore,
      riskFactors: result.riskFactors || [],
      isSuspicious: result.fraudProbability > 0.7, // Threshold for suspicious reports
      recommendation: getFraudRecommendation(result.fraudProbability)
    };
  } catch (error) {
    console.error('Error calculating fraud probability:', error);
    // Return default low-risk assessment in case of error to avoid blocking reports
    return {
      fraudProbability: 0.1,
      confidenceScore: 0.5,
      riskFactors: ['Service unavailable - default assessment provided'],
      isSuspicious: false,
      recommendation: 'PROCESS_NORMALLY'
    };
  }
};

/**
 * Analyze text content for suspicious patterns
 * @async
 * @param {string} text - Text to analyze
 * @returns {Promise<Object>} Text analysis results
 */
const analyzeTextContent = async (text) => {
  try {
    const payload = {
      text: text,
      analysisTypes: ['SENTIMENT', 'ENTITIES', 'SUSPICIOUS_PATTERNS']
    };

    const result = await invokeEndpoint(SAGEMAKER.ENDPOINTS.TEXT_ANALYSIS, payload);
    
    return {
      sentiment: result.sentiment,
      entities: result.entities || [],
      suspiciousPatterns: result.suspiciousPatterns || [],
      hasSuspiciousContent: result.hasSuspiciousContent || false
    };
  } catch (error) {
    console.error('Error analyzing text content:', error);
    return {
      sentiment: 'NEUTRAL',
      entities: [],
      suspiciousPatterns: [],
      hasSuspiciousContent: false
    };
  }
};

/**
 * Get recommendation based on fraud probability
 * @param {number} fraudProbability - Fraud probability score (0-1)
 * @returns {string} Recommendation code
 */
const getFraudRecommendation = (fraudProbability) => {
  if (fraudProbability < 0.3) {
    return 'PROCESS_NORMALLY';
  } else if (fraudProbability < 0.7) {
    return 'REVIEW_REQUIRED';
  } else {
    return 'POTENTIAL_FRAUD';
  }
};

/**
 * Update reporter credibility based on incident outcome
 * @async
 * @param {string} reporterId - Reporter user ID
 * @param {string} incidentOutcome - Incident outcome (VALIDATED, FALSE_REPORT, etc.)
 * @returns {Promise<Object>} Updated credibility information
 */
const updateReporterCredibility = async (reporterId, incidentOutcome) => {
  try {
    // Get current reporter data
    const reporter = await userRepo.getUserById(reporterId);
    if (!reporter) {
      throw new Error(`Reporter with ID ${reporterId} not found`);
    }

    // Prepare payload for the credibility model
    const payload = {
      reporter: {
        id: reporterId,
        currentCredibilityScore: reporter.credibilityScore,
        totalReports: reporter.reportStats.totalReports,
        validatedReports: reporter.reportStats.validatedReports,
        falseReports: reporter.reportStats.falseReports
      },
      outcome: incidentOutcome
    };

    // Call SageMaker endpoint
    const result = await invokeEndpoint(SAGEMAKER.ENDPOINTS.CREDIBILITY_SCORING, payload);
    
    // Update user credibility in database
    const updatedUser = await userRepo.updateUserCredibilityScore(reporterId, result.newCredibilityScore);
    
    return {
      previousScore: reporter.credibilityScore,
      newScore: result.newCredibilityScore,
      credibilityChange: result.credibilityChange,
      factors: result.factors || []
    };
  } catch (error) {
    console.error(`Error updating reporter credibility for user ${reporterId}:`, error);
    throw error;
  }
};

module.exports = {
  calculateFraudProbability,
  analyzeTextContent,
  updateReporterCredibility
};