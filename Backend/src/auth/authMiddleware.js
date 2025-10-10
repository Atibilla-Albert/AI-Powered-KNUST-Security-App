const jwt = require("jsonwebtoken");
const jwkToPem = require("jwk-to-pem");
const axios = require("axios");
const { COGNITO } = require("../config/aws-config");
const { USER_ROLES } = require("../config/config");
const { unauthorizedResponse, forbiddenResponse } = require("../utils/api-response");

// Cache configuration
let jwksCache = null;
let cacheTime = null;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour
const JWKS_RETRY_DELAY = 5000; // 5 seconds for retry
const MAX_JWKS_RETRIES = 3;

/**
 * Fetch JWKS with retry logic and cache
 */
const getJwks = async (retryCount = 0) => {
  const now = Date.now();
  console.log("COGNITO_ISSUER_URL:", process.env.COGNITO_ISSUER_URL);

  // Return cached JWKS if valid
  if (jwksCache && cacheTime && now - cacheTime < CACHE_DURATION_MS) {
    return jwksCache;
  }

  try {
    const jwksUrl = `https://cognito-idp.us-east-1.amazonaws.com/us-east-1_d5YngXjKC/.well-known/jwks.json`;
    const response = await axios.get(jwksUrl, {
      timeout: 3000, // 3 second timeout
      headers: { 'Accept-Encoding': 'gzip' } // Enable compression
    });
    
    jwksCache = response.data;
    cacheTime = now;
    return jwksCache;
  } catch (error) {
    if (retryCount < MAX_JWKS_RETRIES) {
      console.warn(`JWKS fetch failed, retrying (${retryCount + 1}/${MAX_JWKS_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, JWKS_RETRY_DELAY));
      return getJwks(retryCount + 1);
    }
    console.error("Failed to fetch JWKS after retries:", error.message);
    throw new Error("Unable to fetch JWKS");
  }
};
 

/**
 * Verify JWT token with enhanced validation
 */
const verifyToken = async (token) => {
  if (!token) throw new Error("No token provided");
  
  try {
    const tokenSections = token.split(".");
    if (tokenSections.length !== 3) {
      throw new Error("Invalid JWT token format");
    }

    // Decode header without verification
    const headerJSON = Buffer.from(tokenSections[0], "base64").toString("utf8");
    const header = JSON.parse(headerJSON);
    
    if (!header.kid) throw new Error("Token header missing key ID");
    if (header.alg !== "RS256") throw new Error("Unsupported algorithm");

    const jwks = await getJwks();
    const key = jwks.keys.find((k) => k.kid === header.kid);
    if (!key) throw new Error("Matching key not found in JWKS");

    const pem = jwkToPem(key);
    
    return jwt.verify(token, pem, { 
      issuer: COGNITO.ISSUER_URL,
      maxAge: "1h", // Token must not be older than 1 hour
      clockTolerance: 30, // 30 second leeway for clock skew
    });
  } catch (error) {
    console.error("Token verification error:", error.message);
    throw error;
  }
};


/**
 * Lambda authentication middleware
 */
const lambdaAuthenticate = async (event, context) => {
  const authHeader = event.headers?.Authorization || event.headers?.authorization;
  const requestId = context?.awsRequestId || "local-dev";

  if (!authHeader) {
    return unauthorizedResponse("Authorization header required", "MISSING_AUTH_HEADER", requestId);
  }

  if (!authHeader.startsWith("Bearer ")) {
    return unauthorizedResponse("Invalid authorization format", "INVALID_AUTH_FORMAT", requestId);
  }

  const token = authHeader.substring(7); // Remove "Bearer " prefix

  try {
    const decodedToken = await verifyToken(token);
    
    // Validate required claims
    if (!decodedToken.sub || (!decodedToken["cognito:username"] && !decodedToken.username)) {
  return unauthorizedResponse("Invalid token claims", "INVALID_TOKEN_CLAIMS", requestId);
}
    return {
      isAuthorized: true,
      context: {
        user: {
          id: decodedToken.sub,
          username: decodedToken["cognito:username"],
          email: decodedToken.email || null,
          role: decodedToken["custom:role"] || USER_ROLES.REGULAR_USER,
          groups: decodedToken["cognito:groups"] || [],
          emailVerified: decodedToken.email_verified || false,
        },
        token: {
          issuedAt: new Date(decodedToken.iat * 1000),
          expiresAt: new Date(decodedToken.exp * 1000),
          scopes: decodedToken.scope || "",
        }
      },
      policyDocument: generatePolicyDocument(decodedToken.sub, "Allow", event.methodArn)
    };
  } catch (error) {
    console.error("Authentication error:", {
      error: error.message,
      requestId,
      stack: error.stack
    });
    
    if (error.name === "TokenExpiredError") {
      return unauthorizedResponse("Token expired", "TOKEN_EXPIRED", requestId);
    }
    if (error.name === "JsonWebTokenError") {
      return unauthorizedResponse("Invalid token", "INVALID_TOKEN", requestId);
    }
    return unauthorizedResponse("Authentication failed", "AUTH_FAILED", requestId);
  }
};

/**
 * Role-based authorization middleware
 */
const lambdaAuthorize = (allowedRoles = [], allowedGroups = []) => async (event, context) => {
  const authResult = await lambdaAuthenticate(event, context);
  
  if (!authResult.isAuthorized) return authResult;

  const { user } = authResult.context;
  const hasRoleAccess = allowedRoles.length === 0 || allowedRoles.includes(user.role);
  const hasGroupAccess = allowedGroups.length === 0 || 
    user.groups.some(group => allowedGroups.includes(group));

  if (!hasRoleAccess && !hasGroupAccess) {
    return forbiddenResponse(
      "Insufficient permissions",
      "INSUFFICIENT_PERMISSIONS",
      context?.awsRequestId
    );
  }

  return authResult;
};

/**
 * Generate IAM policy for API Gateway authorizer
 */
const generatePolicyDocument = (principalId, effect, resource) => {
  return {
    principalId,
    policyDocument: {
      Version: "2012-10-17",
      Statement: [{
        Action: "execute-api:Invoke",
        Effect: effect,
        Resource: resource
      }]
    },
    context: {
      userId: principalId
    }
  };
};

module.exports = {
  getJwks,
  verifyToken,
  lambdaAuthenticate,
  lambdaAuthorize,
  generatePolicyDocument
};