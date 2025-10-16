const { lambdaAuthenticate, lambdaAuthorize } = require('../auth/authMiddleware');
const authHandlers = require('../handlers/auth-handlers');
const incidentHandlers = require('../handlers/incident-handlers');
const userHandlers = require('../handlers/user-handlers');
const mlHandlers = require('../handlers/ml-handlers');
const notificationHandlers = require('../handlers/notification-handlers');
const s3Handlers = require('../handlers/s3-handler');
const emergencyHandlers = require('../handlers/emergency-handlers');
const { USER_ROLES } = require('../config/config');
const { Logger } = require('@aws-lambda-powertools/logger');

const logger = new Logger({ serviceName: 'security-incident-reporting' });

// Logging middleware for request and response
const loggingMiddleware = (handler) => async (event, context) => {
  logger.info('Incoming request', {
    path: event.path,
    method: event.httpMethod,
    headers: event.headers,
    body: event.body ? JSON.parse(event.body) : null,
    queryStringParameters: event.queryStringParameters,
  });

  try {
    const response = await handler(event, context);
    logger.info('Request completed', {
      path: event.path,
      method: event.httpMethod,
      statusCode: response.statusCode,
      response: response.body ? JSON.parse(response.body) : null,
    });
    return response;
  } catch (error) {
    logger.error('Request failed', {
      path: event.path,
      method: event.httpMethod,
      error: error.message,
      stack: error.stack,
      statusCode: error.statusCode || 500,
    });
    throw error;
  }
};

const defineRoutes = () => ({
  // Auth routes
  '/auth/register': { post: { handler: loggingMiddleware(authHandlers.register) } },
  '/auth/confirm': { post: { handler: loggingMiddleware(authHandlers.confirmRegistration) } },
  '/auth/login': { post: { handler: loggingMiddleware(authHandlers.login) } },
  '/auth/refresh': { post: { handler: loggingMiddleware(authHandlers.refreshToken) } },
  '/auth/forgot-password': { post: { handler: loggingMiddleware(authHandlers.forgotPassword) } },
  '/auth/confirm-forgot-password': { post: { handler: loggingMiddleware(authHandlers.confirmForgotPassword) } },
  '/auth/resend-confirmation': { post: { handler: loggingMiddleware(authHandlers.resendConfirmationCode) } },

  // Users
  '/users': {
    post: { handler: loggingMiddleware(userHandlers.createUser) },
    get: { handler: loggingMiddleware(userHandlers.listUsers) },
  },
  '/users/:id': {
    get: { handler: loggingMiddleware(userHandlers.getUser) },
    put: { handler: loggingMiddleware(userHandlers.updateUser) },
    delete: { handler: loggingMiddleware(userHandlers.deleteUser) },
  },

  // Incidents
  '/incidents': {
    post: { handler: loggingMiddleware(incidentHandlers.reportIncident), middleware: [lambdaAuthenticate] },
    get: { handler: loggingMiddleware(incidentHandlers.listIncidents), middleware: [lambdaAuthenticate] },
  },
  '/incidents/:id': { // Changed from :incidentId to :id for consistency
    get: { handler: loggingMiddleware(incidentHandlers.getIncident), middleware: [lambdaAuthenticate] },
    put: { handler: loggingMiddleware(incidentHandlers.updateIncidentStatus), middleware: [lambdaAuthenticate] },
    delete: { handler: loggingMiddleware(incidentHandlers.deleteIncident), middleware: [lambdaAuthenticate] },
  },
  '/incidents/:id/assign': {
    post: { 
      handler: loggingMiddleware(incidentHandlers.assignIncidentToDepartment), 
      middleware: [lambdaAuthenticate, lambdaAuthorize([USER_ROLES.SECURITY_PERSONNEL, USER_ROLES.ADMIN])] 
    },
  },
  '/incidents/my': {
    get: {
      handler: loggingMiddleware(incidentHandlers.listMyIncidents),
      middleware: [lambdaAuthenticate],
    },
  },
  '/departments': {
    get: { 
      handler: loggingMiddleware(incidentHandlers.getDepartments), 
      middleware: [lambdaAuthenticate] 
    },
  },

  // S3 Upload
  '/incidents/:id/media/upload-url': { // Changed from :incidentId to :id
    post: { handler: loggingMiddleware(s3Handlers.getIncidentMediaUploadUrl), middleware: [lambdaAuthenticate] },
  },

  // S3 Add Attachment
  '/incidents/:id/media': {
    post: { handler: loggingMiddleware(s3Handlers.addIncidentAttachment), middleware: [lambdaAuthenticate] },
  },

  // S3 Download
  '/incidents/:id/media/download-url': { // Changed from :incidentId to :id
    get: { handler: loggingMiddleware(s3Handlers.getIncidentMediaDownloadUrl), middleware: [lambdaAuthenticate] },
  },

  // Security
  '/security/incidents': {
    get: {
      handler: loggingMiddleware(incidentHandlers.listAllIncidents),
      middleware: [lambdaAuthenticate, lambdaAuthorize([USER_ROLES.SECURITY_PERSONNEL, USER_ROLES.ADMIN])],
    },
  },
  '/security/incidents/:id': { // Changed from :incidentId to :id
    get: {
      handler: loggingMiddleware(incidentHandlers.getIncident),
      middleware: [lambdaAuthenticate, lambdaAuthorize([USER_ROLES.SECURITY_PERSONNEL, USER_ROLES.ADMIN])],
    },
    put: {
      handler: loggingMiddleware(incidentHandlers.updateIncidentStatus),
      middleware: [lambdaAuthenticate, lambdaAuthorize([USER_ROLES.SECURITY_PERSONNEL, USER_ROLES.ADMIN])],
    },
  },

  // Admin
  '/admin/users': {
    get: {
      handler: loggingMiddleware(userHandlers.listUsers),
      middleware: [lambdaAuthenticate, lambdaAuthorize([USER_ROLES.ADMIN])],
    },
    post: {
      handler: loggingMiddleware(userHandlers.createUser),
      middleware: [lambdaAuthenticate, lambdaAuthorize([USER_ROLES.ADMIN])],
    },
  },
  '/admin/users/:id': {
    get: {
      handler: loggingMiddleware(userHandlers.getUser),
      middleware: [lambdaAuthenticate, lambdaAuthorize([USER_ROLES.ADMIN])],
    },
    put: {
      handler: loggingMiddleware(userHandlers.updateUser),
      middleware: [lambdaAuthenticate, lambdaAuthorize([USER_ROLES.ADMIN])],
    },
    delete: {
      handler: loggingMiddleware(userHandlers.deleteUser),
      middleware: [lambdaAuthenticate, lambdaAuthorize([USER_ROLES.ADMIN])],
    },
  },

 '/ml/analyze-risk': {
    post: {
      handler: loggingMiddleware(mlHandlers.analyzeRisk),
      middleware: [lambdaAuthenticate],
    },
  },
  '/ml/analyze-text': {
    post: {
      handler: loggingMiddleware(mlHandlers.analyzeText),
      middleware: [lambdaAuthenticate],
    },
  },

  // Notifications
  '/notifications': {
    get: {
      handler: loggingMiddleware(notificationHandlers.getNotifications),
      middleware: [lambdaAuthenticate],
    },
  },
  '/notifications/mark-as-read': {
    post: {
      handler: loggingMiddleware(notificationHandlers.markAsRead),
      middleware: [lambdaAuthenticate],
    },
  },
  '/notifications/send': {
    post: {
      handler: loggingMiddleware(notificationHandlers.sendNotification),
      middleware: [lambdaAuthenticate, lambdaAuthorize([USER_ROLES.ADMIN])],
    },
  },

  // SOS Alert
  '/emergency/alert': {
    post: {
      handler: loggingMiddleware(emergencyHandlers.receiveEmergencyAlert),
      middleware: [lambdaAuthenticate],
    },
  },
});

module.exports = {
  defineRoutes,
};