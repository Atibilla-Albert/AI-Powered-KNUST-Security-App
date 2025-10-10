/**
 * Alert rules for incident notifications
 */

const { INCIDENT_TYPES, SEVERITY_LEVELS } = require('../config/config');

/**
 * Determine if an incident should trigger an alert
 * @param {Object} incident - Incident data
 * @param {Object} fraudAssessment - Fraud assessment results
 * @returns {boolean} True if incident should trigger alert
 */
const shouldTriggerAlert = (incident, fraudAssessment = null) => {
  // High severity incidents always trigger alert (levels 4-5)
  if (incident.severityLevel >= 4) {
    return true;
  }

  // Medium severity (level 3) incidents trigger alert if specific conditions are met
  if (incident.severityLevel === 3) {
    // Physical security breach or direct safety threat
    if (
      incident.type === INCIDENT_TYPES.PHYSICAL_BREACH ||
      incident.type === INCIDENT_TYPES.SAFETY_HAZARD
    ) {
      return true;
    }

    // Any incident with high fraud probability
    if (fraudAssessment && fraudAssessment.fraudProbability < 0.3) {
      return true;
    }
  }

  // Low severity incidents don't trigger alerts
  return false;
};

/**
 * Calculate incident priority level
 * @param {Object} incident - Incident data
 * @param {Object} fraudAssessment - Fraud assessment results
 * @returns {string} Priority level (HIGH, MEDIUM, LOW)
 */
const calculatePriorityLevel = (incident, fraudAssessment = null) => {
  // Use fraud assessment to potentially lower priority for suspicious reports
  const fraudRiskFactor = fraudAssessment ? fraudAssessment.fraudProbability : 0;

  // Very high severity (level 5) is always high priority unless very high fraud risk
  if (incident.severityLevel === 5 && fraudRiskFactor < 0.8) {
    return 'HIGH';
  }

  // High severity (level 4) is high priority unless significant fraud risk
  if (incident.severityLevel === 4 && fraudRiskFactor < 0.6) {
    return 'HIGH';
  }

  // Medium severity (level 3) with low fraud risk
  if (incident.severityLevel === 3 && fraudRiskFactor < 0.3) {
    return 'MEDIUM';
  }

  // Low severity or high fraud probability
  if (incident.severityLevel <= 2 || fraudRiskFactor >= 0.6) {
    return 'LOW';
  }

  // Default to medium priority
  return 'MEDIUM';
};

/**
 * Determine alert distribution scope based on incident data
 * @param {Object} incident - Incident data
 * @param {string} priorityLevel - Priority level
 * @returns {Object} Distribution settings
 */
const getAlertDistributionScope = (incident, priorityLevel) => {
  // Base distribution scope
  const distribution = {
    toSecurityTeam: true,
    toManagement: false,
    toAllEmployees: false,
    toEmergencyServices: false
  };

  // High priority incident distribution
  if (priorityLevel === 'HIGH') {
    distribution.toManagement = true;
    
    // Life-threatening situations require emergency services
    if (incident.severityLevel === 5 && 
        (incident.type === INCIDENT_TYPES.PHYSICAL_BREACH || 
         incident.type === INCIDENT_TYPES.SAFETY_HAZARD)) {
      distribution.toEmergencyServices = true;
    }
  }

  return distribution;
};

module.exports = {
  shouldTriggerAlert,
  calculatePriorityLevel,
  getAlertDistributionScope
};