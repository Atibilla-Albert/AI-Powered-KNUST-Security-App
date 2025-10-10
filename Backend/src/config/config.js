/**
 * General application configuration
 */

const { getEnvironmentVariable } = require('./environment');
const awsConfig = require('./aws-config'); // For future AWS-specific config overrides

// Application metadata
const APP_NAME = 'Security Incident Reporting System';
const APP_VERSION = '1.0.0';

// List of incident types (can be fetched dynamically later)
const INCIDENT_TYPES = [
  'PHYSICAL_SECURITY_BREACH',
  'CYBER_SECURITY_INCIDENT',
  'SUSPICIOUS_ACTIVITY',
  'SAFETY_HAZARD',
];

// Standardized severity levels
const SEVERITY_LEVELS = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

// User role definitions
const USER_ROLES = {
  REGULAR_USER: 'REGULAR_USER',
  SECURITY_PERSONNEL: 'SECURITY_PERSONNEL',
  ADMIN: 'ADMIN',
};

// Machine learning thresholds (configurable via environment variables)
const ML_THRESHOLDS = {
  FRAUD_DETECTION: parseFloat(getEnvironmentVariable('FRAUD_DETECTION_THRESHOLD', '0.7')),
  SEVERITY_OVERRIDE: parseFloat(getEnvironmentVariable('SEVERITY_OVERRIDE_THRESHOLD', '0.8')),
  CREDIBILITY_MINIMUM: parseFloat(getEnvironmentVariable('CREDIBILITY_MINIMUM', '0.5')),
};

// Notification retry and TTL config
const NOTIFICATION_SETTINGS = {
  HIGH_PRIORITY_SEVERITY_THRESHOLD: SEVERITY_LEVELS.HIGH,
  RETRY_ATTEMPTS: parseInt(getEnvironmentVariable('NOTIFICATION_RETRY_ATTEMPTS', '3'), 10),
  MESSAGE_TTL_SECONDS: parseInt(getEnvironmentVariable('MESSAGE_TTL_SECONDS', '3600'), 10),
};

// Cognito configuration
const cognitoUserPoolId = getEnvironmentVariable('COGNITO_USER_POOL_ID');
const cognitoClientId = getEnvironmentVariable('COGNITO_USER_POOL_CLIENT_ID');
const cognitoIssuer = getEnvironmentVariable('COGNITO_ISSUER_URL');

// DynamoDB table names (update with your actual table names)
const TABLES = {
  USERS: getEnvironmentVariable('USERS_TABLE_NAME', 'UsersTable'),
  INCIDENTS: getEnvironmentVariable('INCIDENTS_TABLE_NAME', 'IncidentsTable'),
  // Add more tables as needed
};

module.exports = {
  APP_NAME,
  APP_VERSION,
  INCIDENT_TYPES,
  SEVERITY_LEVELS,
  USER_ROLES,
  ML_THRESHOLDS,
  NOTIFICATION_SETTINGS,
  cognitoUserPoolId,
  cognitoClientId,
  cognitoIssuer,
  TABLES
};
