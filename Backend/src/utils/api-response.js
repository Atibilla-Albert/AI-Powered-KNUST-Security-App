/**
 * API response utilities for AWS Lambda
 * Provides consistent structure for all Lambda HTTP responses with enhanced features
 */

const defaultHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Requested-With,X-Correlation-ID',
  'X-Content-Type-Options': 'nosniff',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
};

/**
 * Generate a standard API Gateway response with enhanced features
 * @param {number} statusCode - HTTP status code
 * @param {object|string} body - Response body
 * @param {object} [headers={}] - Additional headers
 * @param {string} [requestId] - AWS request ID for tracing
 * @returns {object} Lambda-compatible HTTP response
 */
const generateApiResponse = (statusCode, body, headers = {}, requestId) => {
  const responseHeaders = { 
    ...defaultHeaders, 
    ...headers,
    'X-Request-ID': requestId || 'local-dev',
  };

  // Handle string bodies (e.g., for file downloads)
  const responseBody = typeof body === 'string' 
    ? body 
    : JSON.stringify(body, (key, value) => 
        typeof value === 'bigint' ? value.toString() : value);

  return {
    statusCode,
    headers: responseHeaders,
    body: responseBody,
    isBase64Encoded: !!headers['Content-Encoding'],
  };
};

/**
 * Standard success response (200 OK or other 2xx status)
 */
const successResponse = (data, statusCode = 200, meta = {}, requestId) => {
  const response = { success: true, data };
  if (Object.keys(meta).length > 0) {
    response.meta = meta;
  }
  return generateApiResponse(statusCode, response, {}, requestId);
};

/**
 * Paginated success response for list endpoints
 */
const paginatedResponse = (items, pagination, requestId) => {
  return successResponse(items, 200, { pagination }, requestId);
};

/**
 * General error response (500 Internal Server Error or other)
 */
const errorResponse = (message, statusCode = 500, details = {}, requestId) => {
  const errorDetails = {
    code: statusCode,
    message,
    ...details,
    timestamp: new Date().toISOString(),
  };

  // Log full error details including stack trace if available
  console.error(`[API Error ${statusCode}]`, {
    message,
    statusCode,
    details,
    requestId,
    stack: details.stack || new Error().stack,
  });

  return generateApiResponse(statusCode, {
    success: false,
    error: errorDetails,
  }, {}, requestId);
};

/**
 * Common error responses
 */
const notFoundResponse = (resource = 'Resource', requestId) => 
  errorResponse(`${resource} not found`, 404, { resource }, requestId);

const validationErrorResponse = (message = 'Validation failed', errors = {}, requestId) =>
  errorResponse(message, 400, { validationErrors: errors }, requestId);

const unauthorizedResponse = (message = 'Unauthorized', code = 'UNAUTHORIZED', requestId) =>
  errorResponse(message, 401, { code }, requestId);

const forbiddenResponse = (message = 'Forbidden', code = 'FORBIDDEN', requestId) =>
  errorResponse(message, 403, { code }, requestId);

const conflictResponse = (message = 'Conflict', details = {}, requestId) =>
  errorResponse(message, 409, details, requestId);

const rateLimitResponse = (message = 'Too many requests', requestId) =>
  errorResponse(message, 429, { retryAfter: '60s' }, requestId);

/**
 * CORS preflight response
 */
const corsPreflightResponse = () => generateApiResponse(204, '');

/**
 * Binary response for file downloads
 */
const binaryResponse = (buffer, contentType, filename, requestId) => {
  return {
    statusCode: 200,
    headers: {
      ...defaultHeaders,
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length.toString(),
    },
    body: buffer.toString('base64'),
    isBase64Encoded: true,
  };
};

/**
 * No Content response (204)
 */
const noContentResponse = (requestId) => generateApiResponse(204, '', {}, requestId);

module.exports = {
  generateApiResponse,
  successResponse,
  paginatedResponse,
  errorResponse,
  notFoundResponse,
  validationErrorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  conflictResponse,
  rateLimitResponse,
  corsPreflightResponse,
  binaryResponse,
  noContentResponse,
};