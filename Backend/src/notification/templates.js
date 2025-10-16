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

/**
 * Format department assignment notification
 * @param {Object} incident - Incident data
 * @param {Object} department - Department data
 * @param {string} assignedBy - User who assigned the incident
 * @returns {string} Formatted notification message
 */
const formatDepartmentAssignmentNotification = (incident, department, assignedBy) => {
  const location = incident.location || {};
  
  // Enhanced location formatting
  const formatLocationDetails = () => {
    let locationDetails = '';
    
    if (location.name) {
      locationDetails += `📍 Location Name: ${location.name}\n`;
    }
    
    if (location.address) {
      locationDetails += `🏠 Address: ${location.address}\n`;
    }
    
    if (location.latitude && location.longitude) {
      locationDetails += `🗺️  Coordinates: ${location.latitude}, ${location.longitude}\n`;
    }
    
    if (location.building) {
      locationDetails += `🏢 Building: ${location.building}\n`;
    }
    
    if (location.floor) {
      locationDetails += `🛗 Floor: ${location.floor}\n`;
    }
    
    if (location.room) {
      locationDetails += `🚪 Room: ${location.room}\n`;
    }
    
    if (location.landmarks) {
      locationDetails += `🏛️  Nearby Landmarks: ${location.landmarks}\n`;
    }
    
    return locationDetails || '📍 Location: Unknown location';
  };

  // Generate map route links for different map services
  const generateMapLinks = (lat, lon) => {
    if (!lat || !lon) return 'Map route not available - location coordinates missing';
    
    const googleMapsLink = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
    const appleMapsLink = `http://maps.apple.com/?daddr=${lat},${lon}`;
    const wazeLink = `https://waze.com/ul?ll=${lat},${lon}&navigate=yes`;
    const osmLink = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=-1|${lon}|${lat}`;
    
    return `
🗺️  NAVIGATION LINKS:
   Google Maps: ${googleMapsLink}
   Apple Maps: ${appleMapsLink}
   Waze: ${wazeLink}
   OpenStreetMap: ${osmLink}`;
  };

  const locationDetails = formatLocationDetails();
  const mapLinks = location.latitude && location.longitude ? 
    generateMapLinks(location.latitude, location.longitude) : 
    'Map route not available - location coordinates missing';

  const message = `
🚨 INCIDENT ASSIGNED TO DEPARTMENT 🚨

═══════════════════════════════════════════════════════════════

📋 INCIDENT DETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🆔 Incident ID: ${incident.incidentId || 'Unknown'}
📝 Type: ${incident.incidentType || incident.type}
⚠️  Severity: ${incident.severityLevel} (Scale 1-5)
📊 Status: ${incident.status}
🕐 Time Reported: ${formatDate(incident.createdAt || incident.timestamp || new Date())}
📄 Description: ${incident.description}

📍 INCIDENT LOCATION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${locationDetails}

${mapLinks}

═══════════════════════════════════════════════════════════════

👥 ASSIGNMENT DETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏢 Assigned Department: ${department.name}
📧 Department Email: ${department.email}
📞 Department Phone: ${department.phone}
👤 Assigned By: ${assignedBy}
🕐 Assignment Time: ${formatDate(new Date())}

═══════════════════════════════════════════════════════════════


📞 DEPARTMENT CONTACT INFORMATION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 Email: ${department.email}
📞 Phone: ${department.phone}

This is an automated notification from the Campus Security Incident Reporting System.
Please respond promptly to ensure campus safety.

═══════════════════════════════════════════════════════════════
`;

  return message;
};

module.exports = {
  formatIncidentForNotification,
  createIncidentSummary,
  formatDepartmentAssignmentNotification
};