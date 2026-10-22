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

// Department definitions (keys are IDs expected by the API/UI)
const DEPARTMENTS = {
  SECURITY: {
    name: 'Security',
    email: 'Atibillaalbert66@gmail.com',
    phone: '+1-555-0101',
    description: 'Handles physical security incidents and safety hazards'
  },
  WOODWORK: {
    name: 'Woodwork',
    email: 'woodwork@campus.edu',
    phone: '+1-555-0201',
    description: 'Carpentry and woodworks-related requests and incidents'
  },
  ELECTRICAL: {
    name: 'Electrical',
    email: 'electrical@campus.edu',
    phone: '+1-555-0202',
    description: 'Electrical faults and power-related issues'
  },
  ROADWORTHY: {
    name: 'Roadworthy',
    email: 'roadworthy@campus.edu',
    phone: '+1-555-0203',
    description: 'Road, traffic, and vehicular safety'
  },
  MECHANICAL: {
    name: 'Mechanical',
    email: 'mechanical@campus.edu',
    phone: '+1-555-0204',
    description: 'Mechanical systems and maintenance'
  },
  BUILDING_CONSTRUCTION: {
    name: 'Building & Construction',
    email: 'construction@campus.edu',
    phone: '+1-555-0205',
    description: 'Building integrity and construction-related issues'
  },
  INFORMATION_TECHNOLOGY: {
    name: 'Information Technology',
    email: 'it@campus.edu',
    phone: '+1-555-0206',
    description: 'IT support and systems'
  },
  ADMINISTRATION: {
    name: 'Administration',
    email: 'administration@campus.edu',
    phone: '+1-555-0207',
    description: 'Administrative and policy-related matters'
  },
  STUDENT_AFFAIRS: {
    name: 'Student Affairs',
    email: 'studentaffairs@campus.edu',
    phone: '+1-555-0208',
    description: 'Student welfare and services'
  },
  FACILITIES_MANAGEMENT: {
    name: 'Facilities Management',
    email: 'facilities@campus.edu',
    phone: '+1-555-0209',
    description: 'Campus facilities and utilities'
  },
  HEALTH_SERVICES: {
    name: 'Health Services',
    email: 'health@campus.edu',
    phone: '+1-555-0210',
    description: 'Health and medical services'
  },
  TRANSPORTATION: {
    name: 'Transportation',
    email: 'transport@campus.edu',
    phone: '+1-555-0211',
    description: 'Campus transport and logistics'
  },
  CATERING: {
    name: 'Catering',
    email: 'catering@campus.edu',
    phone: '+1-555-0212',
    description: 'Food services and catering'
  },
  LIBRARY: {
    name: 'Library',
    email: 'library@campus.edu',
    phone: '+1-555-0213',
    description: 'Library services and resources'
  },
  SPORTS_RECREATION: {
    name: 'Sports & Recreation',
    email: 'sports@campus.edu',
    phone: '+1-555-0214',
    description: 'Sports facilities and recreation'
  },
  ACADEMIC_AFFAIRS: {
    name: 'Academic Affairs',
    email: 'academics@campus.edu',
    phone: '+1-555-0215',
    description: 'Academic programs and affairs'
  },
  RESEARCH_DEVELOPMENT: {
    name: 'Research & Development',
    email: 'research@campus.edu',
    phone: '+1-555-0216',
    description: 'Research programs and innovation'
  },
  HUMAN_RESOURCES: {
    name: 'Human Resources',
    email: 'hr@campus.edu',
    phone: '+1-555-0217',
    description: 'Staffing and HR services'
  },
  LEGAL_SERVICES: {
    name: 'Legal Services',
    email: 'legal@campus.edu',
    phone: '+1-555-0218',
    description: 'Legal counsel and compliance'
  },
  PUBLIC_RELATIONS: {
    name: 'Public Relations',
    email: 'pr@campus.edu',
    phone: '+1-555-0219',
    description: 'Communications and public relations'
  },
  ENVIRONMENTAL_SERVICES: {
    name: 'Environmental Services',
    email: 'environment@campus.edu',
    phone: '+1-555-0220',
    description: 'Environmental health and sanitation'
  },
  EMERGENCY_RESPONSE: {
    name: 'Emergency Response',
    email: 'emergency@campus.edu',
    phone: '+1-555-0221',
    description: 'Critical emergency response coordination'
  },
  QUALITY_ASSURANCE: {
    name: 'Quality Assurance',
    email: 'qa@campus.edu',
    phone: '+1-555-0222',
    description: 'Quality standards and oversight'
  },
  IT_SECURITY: {
    name: 'IT Security',
    email: 'itsecurity@campus.edu',
    phone: '+1-555-0223',
    description: 'Cybersecurity and digital threat response'
  }
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
  DEPARTMENTS,
  ML_THRESHOLDS,
  NOTIFICATION_SETTINGS,
  cognitoUserPoolId,
  cognitoClientId,
  cognitoIssuer,
  TABLES,
};
