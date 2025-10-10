/**
 * Notification templates for SNS messages
 */

/**
 * Format incident data for notification
 * @param {Object} incident - Incident data
 * @param {Object} additionalInfo - Additional incident information
 * @returns {string} Formatted message
 */
const formatIncidentForNotification = (incident, additionalInfo = {}) => {
  const { id, severityLevel, isPotentialFraud } = additionalInfo;
  
  // Format location
  const location = incident.location || {};
  const locationText = location.name ? 
    `${location.name}${location.coordinates ? ` (${location.coordinates.latitude}, ${location.coordinates.longitude})` : ''}` : 
    'Unknown location';

  // Create message body
  let message = `
=== SECURITY INCIDENT ALERT ===

ID: ${id || 'Unknown'}
Type: ${incident.type}
Severity: ${severityLevel || incident.severityLevel} (Scale 1-5)
Status: ${incident.status || 'REPORTED'}
Time: ${formatDate(incident.timestamp || new Date())}
Location: ${locationText}

Description: ${incident.description}
`;

  // Add reporter information if available
  if (incident.reporter) {
    message += `
Reporter: ${incident.reporter.name || 'Anonymous'}
Reporter ID: ${incident.reporter.id || 'Unknown'}
`;
  }

  // Add fraud assessment warning if applicable
  if (isPotentialFraud) {
    message += `
⚠️ CAUTION: This report has been flagged for potential fraud. Verify before taking action.
`;
  }

  // Add action instructions
  message += `
REQUIRED ACTION: Security personnel should respond immediately and access the incident details at:
https://security-incident-system.example.com/incidents/${id}/details

`;

  return message;
};

/**
 * Format date for notification
 * @param {Date|string|number} date - Date to format
 * @returns {string} Formatted date
 */
const formatDate = (date) => {
  const d = new Date(date);
  return d.toLocaleString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short'
  });
};

/**
 * Create summary text for incident dashboard
 * @param {Object} incident - Incident data
 * @param {Object} fraudAssessment - Fraud assessment data
 * @returns {string} Summary text
 */
const createIncidentSummary = (incident, fraudAssessment = null) => {
  // Create a brief summary of the incident
  const summary = `${incident.type} incident reported at ${formatDate(incident.timestamp || new Date())}`;
  
  // Add fraud assessment if available
  if (fraudAssessment) {
    const fraudText = fraudAssessment.fraudProbability > 0.7 ? 
      'HIGH risk of fraudulent report' : 
      fraudAssessment.fraudProbability > 0.3 ? 
        'MODERATE risk of fraudulent report' : 
        'LOW risk of fraudulent report';
    
    return `${summary} (${fraudText})`;
  }
  
  return summary;
};

module.exports = {
  formatIncidentForNotification,
  createIncidentSummary
};