// index.js (at the very top)
require('dotenv').config();

const { defineRoutes } = require('./routes/routes');
const { lambdaAuthenticate } = require('./auth/authMiddleware');
const routes = defineRoutes();


exports.api = async (event, context) => {
  const method = event.httpMethod ? event.httpMethod.toLowerCase() : 'get';
  let path = event.path;

  // Remove stage prefix if present (e.g., /dev/users -> /users)
  const stage = process.env.STAGE || 'dev';
  if (path.startsWith(`/${stage}`)) {
    path = path.replace(`/${stage}`, '');
    if (path === '') path = '/';
  }

  // Match dynamic routes (e.g., /users/:id, /incidents/:id, /auth/confirm-forgot-password)
  let routeKey = path;
  let routeParams = {};
  if (!routes[routeKey]) {
    for (const definedRoute of Object.keys(routes)) {
      const paramNames = [];
      const regexPath = definedRoute.replace(/:[^/]+/g, (match) => {
        paramNames.push(match.substring(1));
        return '([^/]+)';
      });
      const regex = new RegExp(`^${regexPath}$`);
      const match = path.match(regex);
      if (match) {
        routeKey = definedRoute;
        paramNames.forEach((name, idx) => {
          routeParams[name] = match[idx + 1];
        });
        break;
      }
    }
  }

  const route = routes[routeKey];
  if (!route || !route[method]) {
    return {
      statusCode: 404,
      body: JSON.stringify({ message: 'Not found', statusCode: 404, details: {} }),
    };
  }

  // Attach routeParams to event for handlers that need them
  event.pathParameters = routeParams;

  // If the route is an object with handler/middleware, use handler
  const handlerObj = typeof route[method] === 'function' ? { handler: route[method] } : route[method];

  // Only authentication endpoints are public. Every other route is authenticated
  // unless it explicitly declares stricter middleware above.
  const publicAuthPaths = new Set([
    '/auth/register', '/auth/confirm', '/auth/login', '/auth/refresh',
    '/auth/forgot-password', '/auth/confirm-forgot-password',
    '/auth/resend-confirmation'
  ]);
  const middleware = Array.isArray(handlerObj.middleware) ? handlerObj.middleware : [];
  if (middleware.length === 0 && !publicAuthPaths.has(routeKey)) {
    const authResult = await lambdaAuthenticate(event, context);
    if (!authResult.isAuthorized) return authResult;
  }

  for (const mw of middleware) {
    const mwResult = await mw(event, context);
    if (mwResult && mwResult.statusCode && mwResult.statusCode !== 200) {
      return mwResult;
    }
  }

  // Call the handler
  return await handlerObj.handler(event, context);
};
