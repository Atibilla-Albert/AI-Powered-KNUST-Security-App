const jwt = require("jsonwebtoken");
const jwkToPem = require("jwk-to-pem");
const axios = require("axios");
const { COGNITO } = require("../config/aws-config");
const { USER_ROLES } = require("../config/config");
const userRepo = require("../data/repositories/userRepo");
const { unauthorizedResponse, forbiddenResponse } = require("../utils/api-response");

let jwksCache = null;
let cacheTime = 0;
const CACHE_DURATION_MS = 60 * 60 * 1000;
const JWKS_RETRY_DELAY_MS = 500;
const MAX_JWKS_RETRIES = 2;

const getJwks = async (retryCount = 0) => {
  if (!COGNITO.JWKS_URL || !COGNITO.ISSUER_URL) {
    throw new Error("Cognito issuer/JWKS configuration is missing");
  }

  if (jwksCache && Date.now() - cacheTime < CACHE_DURATION_MS) {
    return jwksCache;
  }

  try {
    const response = await axios.get(COGNITO.JWKS_URL, {
      timeout: 3000,
      headers: { Accept: "application/json" },
    });
    if (!response.data || !Array.isArray(response.data.keys)) {
      throw new Error("Invalid JWKS response");
    }
    jwksCache = response.data;
    cacheTime = Date.now();
    return jwksCache;
  } catch (error) {
    if (retryCount < MAX_JWKS_RETRIES) {
      await new Promise((resolve) => setTimeout(resolve, JWKS_RETRY_DELAY_MS));
      return getJwks(retryCount + 1);
    }
    // Do not log request headers, tokens, or upstream response bodies.
    console.error("Cognito JWKS retrieval failed", { code: error.code || error.name });
    throw new Error("Unable to validate identity provider keys");
  }
};

const verifyToken = async (token) => {
  if (typeof token !== "string" || !token) {
    throw new Error("No token provided");
  }

  const sections = token.split(".");
  if (sections.length !== 3) throw new Error("Invalid JWT format");

  let header;
  try {
    header = JSON.parse(Buffer.from(sections[0], "base64url").toString("utf8"));
  } catch {
    throw new Error("Invalid JWT header");
  }

  if (!header.kid || header.alg !== "RS256") {
    throw new Error("Unsupported JWT header");
  }

  const jwks = await getJwks();
  const key = jwks.keys.find((candidate) => candidate.kid === header.kid && candidate.kty === "RSA");
  if (!key) throw new Error("Signing key not found");

  const claims = jwt.verify(token, jwkToPem(key), {
    algorithms: ["RS256"],
    issuer: COGNITO.ISSUER_URL,
    clockTolerance: 30,
  });

  // Cognito access tokens are required for API calls; ID tokens are not API credentials.
  if (claims.token_use !== "access") throw new Error("Access token required");
  if (!COGNITO.USER_POOL_CLIENT_ID || claims.client_id !== COGNITO.USER_POOL_CLIENT_ID) {
    throw new Error("Token was issued to an unexpected app client");
  }
  if (!claims.sub || !Number.isFinite(claims.exp) || !Number.isFinite(claims.iat)) {
    throw new Error("Required token claims are missing");
  }

  return claims;
};

const lambdaAuthenticate = async (event, context) => {
  const headers = event.headers || {};
  const authHeader = headers.Authorization || headers.authorization;
  const requestId = context?.awsRequestId || "local-dev";

  if (typeof authHeader !== "string" || !/^Bearer\s+\S+$/i.test(authHeader)) {
    return unauthorizedResponse("A valid Bearer access token is required", "INVALID_AUTH_HEADER", requestId);
  }

  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  try {
    const claims = await verifyToken(token);

    // Authorization roles are sourced from the server-controlled application record,
    // never from a client-writable Cognito custom attribute or UI-supplied value.
    const appUser = await userRepo.getUserById(claims.sub);
    if (!appUser) {
      return unauthorizedResponse("User profile is not provisioned", "USER_PROFILE_NOT_FOUND", requestId);
    }

    const role = Object.values(USER_ROLES).includes(appUser.role)
      ? appUser.role
      : USER_ROLES.REGULAR_USER;
    const groups = Array.isArray(claims["cognito:groups"]) ? claims["cognito:groups"] : [];

    return {
      isAuthorized: true,
      context: {
        user: {
          id: claims.sub,
          username: claims.username || claims["cognito:username"] || null,
          email: claims.email || null,
          role,
          groups,
          emailVerified: claims.email_verified === true || claims.email_verified === "true",
        },
        token: {
          issuedAt: new Date(claims.iat * 1000),
          expiresAt: new Date(claims.exp * 1000),
          scopes: claims.scope || "",
        },
      },
      policyDocument: generatePolicyDocument(claims.sub, "Allow", event.methodArn),
    };
  } catch (error) {
    // Never log the bearer token or full JWT claims.
    console.warn("Authentication rejected", {
      requestId,
      reason: error.name === "TokenExpiredError" ? "expired" : "invalid_or_unavailable",
    });
    return unauthorizedResponse("Authentication failed or token expired", "AUTH_FAILED", requestId);
  }
};

const lambdaAuthorize = (allowedRoles = [], allowedGroups = []) => async (event, context) => {
  const authResult = await lambdaAuthenticate(event, context);
  if (!authResult.isAuthorized) return authResult;

  const { user } = authResult.context;
  const roleAllowed = allowedRoles.length === 0 || allowedRoles.includes(user.role);
  const groupAllowed = allowedGroups.length === 0 ||
    user.groups.some((group) => allowedGroups.includes(group));

  // When both constraints are supplied, both must pass (least privilege).
  if ((allowedRoles.length > 0 && !roleAllowed) ||
      (allowedGroups.length > 0 && !groupAllowed)) {
    return forbiddenResponse(
      "Insufficient permissions",
      "INSUFFICIENT_PERMISSIONS",
      context?.awsRequestId
    );
  }

  return authResult;
};

const generatePolicyDocument = (principalId, effect, resource) => ({
  principalId,
  policyDocument: {
    Version: "2012-10-17",
    Statement: [{
      Action: "execute-api:Invoke",
      Effect: effect,
      Resource: resource,
    }],
  },
  context: { userId: principalId },
});

module.exports = {
  getJwks,
  verifyToken,
  lambdaAuthenticate,
  lambdaAuthorize,
  generatePolicyDocument,
};
