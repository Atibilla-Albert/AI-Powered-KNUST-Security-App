const jwt = require("jsonwebtoken");
const jwkToPem = require("jwk-to-pem");
const axios = require("axios");
const { COGNITO } = require("../config/aws-config");
const { USER_ROLES } = require("../config/config");
const { unauthorizedResponse, forbiddenResponse } = require("../utils/api-response");

let jwksCache = null;
let cacheTime = 0;
const CACHE_DURATION_MS = 60 * 60 * 1000;
const JWKS_RETRY_DELAY_MS = 500;
const MAX_JWKS_RETRIES = 2;

const issuer = COGNITO.ISSUER_URL;
const clientId = COGNITO.USER_POOL_CLIENT_ID;

function assertAuthConfiguration() {
  if (!issuer || !clientId || !COGNITO.USER_POOL_ID) {
    throw new Error("Cognito authentication configuration is incomplete");
  }
  const expectedIssuer = \`https://cognito-idp.\${COGNITO.REGION}.amazonaws.com/\${COGNITO.USER_POOL_ID}\`;
  if (issuer !== expectedIssuer) {
    throw new Error("COGNITO_ISSUER_URL does not match configured User Pool and region");
  }
}

async function getJwks(retryCount = 0) {
  assertAuthConfiguration();
  if (jwksCache && Date.now() - cacheTime < CACHE_DURATION_MS) return jwksCache;

  try {
    const response = await axios.get(\`\${issuer}/.well-known/jwks.json\`, {
      timeout: 3000,
      headers: { Accept: "application/json" }
    });
    if (!Array.isArray(response.data?.keys)) throw new Error("Invalid Cognito JWKS response");
    jwksCache = response.data;
    cacheTime = Date.now();
    return jwksCache;
  } catch (error) {
    if (retryCount < MAX_JWKS_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, JWKS_RETRY_DELAY_MS));
      return getJwks(retryCount + 1);
    }
    // Do not log tokens, headers, or request payloads.
    console.error("Unable to retrieve Cognito signing keys");
    throw new Error("Authentication service temporarily unavailable");
  }
}

function roleFromGroups(groups = []) {
  const normalized = new Set(groups.map(group => String(group).toUpperCase()));
  if (normalized.has("ADMIN") || normalized.has("ADMINISTRATORS") || normalized.has("ADMINISTRATOR")) {
    return USER_ROLES.ADMIN;
  }
  if (
    normalized.has("SECURITY_PERSONNEL") ||
    normalized.has("SECURITYPERSONNEL") ||
    normalized.has("SECURITYSTAFF") ||
    normalized.has("SUPERVISORS")
  ) {
    return USER_ROLES.SECURITY_PERSONNEL;
  }
  return USER_ROLES.REGULAR_USER;
}

async function verifyToken(token) {
  if (!token || typeof token !== "string") throw new Error("No token provided");
  assertAuthConfiguration();

  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT format");

  let header;
  try {
    header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
  } catch {
    throw new Error("Invalid JWT header");
  }

  if (header.alg !== "RS256" || !header.kid) throw new Error("Unsupported JWT signing key");

  const jwks = await getJwks();
  const key = jwks.keys.find(candidate => candidate.kid === header.kid && candidate.kty === "RSA");
  if (!key) {
    // Force one refresh for Cognito key rotation before rejecting the token.
    jwksCache = null;
    cacheTime = 0;
    const refreshed = await getJwks();
    const rotatedKey = refreshed.keys.find(candidate => candidate.kid === header.kid && candidate.kty === "RSA");
    if (!rotatedKey) throw new Error("Unknown JWT signing key");
    return verifyWithKey(token, rotatedKey);
  }
  return verifyWithKey(token, key);
}

function verifyWithKey(token, jwk) {
  const decoded = jwt.verify(token, jwkToPem(jwk), {
    algorithms: ["RS256"],
    issuer,
    clockTolerance: 30
  });

  // This API accepts access tokens only. ID tokens are not API credentials.
  if (decoded.token_use !== "access") throw new Error("Access token required");
  if (decoded.client_id !== clientId) throw new Error("Token was issued to an unexpected app client");
  if (!decoded.sub || !Number.isFinite(decoded.exp) || !Number.isFinite(decoded.iat)) {
    throw new Error("Required token claims are missing");
  }
  return decoded;
}

const lambdaAuthenticate = async (event, context) => {
  const requestId = context?.awsRequestId || "local-dev";
  const headers = event.headers || {};
  const authHeader = headers.Authorization || headers.authorization;

  if (!authHeader) {
    return unauthorizedResponse("Authorization header required", "MISSING_AUTH_HEADER", requestId);
  }
  if (typeof authHeader !== "string" || !/^Bearer\s+\S+$/i.test(authHeader)) {
    return unauthorizedResponse("Invalid authorization format", "INVALID_AUTH_FORMAT", requestId);
  }

  try {
    const decoded = await verifyToken(authHeader.replace(/^Bearer\s+/i, ""));
    const groups = Array.isArray(decoded["cognito:groups"]) ? decoded["cognito:groups"] : [];
    const user = {
      id: decoded.sub,
      username: decoded.username || decoded["cognito:username"] || null,
      email: decoded.email || null,
      groups,
      role: roleFromGroups(groups),
      emailVerified: decoded.email_verified === true || decoded.email_verified === "true"
    };
    event.authContext = user;
    return {
      isAuthorized: true,
      statusCode: 200,
      context: {
        user,
        token: {
          issuedAt: new Date(decoded.iat * 1000),
          expiresAt: new Date(decoded.exp * 1000),
          scopes: decoded.scope || ""
        }
      }
    };
  } catch (error) {
    const expired = error.name === "TokenExpiredError";
    // Avoid logging error stacks or JWT data.
    console.warn("Request authentication rejected", {
      requestId,
      reason: expired ? "expired_token" : "invalid_token"
    });
    if (expired) return unauthorizedResponse("Token expired", "TOKEN_EXPIRED", requestId);
    if (error.message === "Authentication service temporarily unavailable") {
      return {
        statusCode: 503,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Authentication service temporarily unavailable", requestId })
      };
    }
    return unauthorizedResponse("Invalid or expired access token", "INVALID_TOKEN", requestId);
  }
};

const lambdaAuthorize = (allowedRoles = [], allowedGroups = []) => async (event, context) => {
  const requestId = context?.awsRequestId || "local-dev";
  let user = event.authContext;

  if (!user) {
    const authResult = await lambdaAuthenticate(event, context);
    if (!authResult.isAuthorized) return authResult;
    user = authResult.context.user;
  }

  const roleAllowed = allowedRoles.length === 0 || allowedRoles.includes(user.role);
  const groupAllowed = allowedGroups.length === 0 || user.groups.some(group => allowedGroups.includes(group));
  if (!roleAllowed || !groupAllowed) {
    return forbiddenResponse("Insufficient permissions", "INSUFFICIENT_PERMISSIONS", requestId);
  }
  return { isAuthorized: true, statusCode: 200, context: { user } };
};

module.exports = { getJwks, verifyToken, lambdaAuthenticate, lambdaAuthorize, roleFromGroups };
