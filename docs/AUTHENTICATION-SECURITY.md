# Authentication and Authorization Security

## Authentication model

- Amazon Cognito is the sole authentication provider for the mobile app, dashboard, and API.
- Public endpoints are limited to registration, confirmation, login, token refresh, and password recovery.
- All other API routes require a valid Cognito **access token** in `Authorization: Bearer <token>`.
- Backend validation checks the RSA signature against the configured Cognito JWKS, issuer, `token_use=access`, and `client_id`. An ID token is not accepted as an API credential.
- Native mobile tokens are stored with Expo SecureStore. The web dashboard keeps its access token in memory only; a page reload requires a new login.
- Client-side roles are for UI behavior only. The backend is authoritative.

## Required deployment configuration

Set these values in the deployment environment. For Serverless Framework variable resolution, export the required values in the shell or configure your CI/CD secrets before running deployment; the backend's runtime `dotenv` loading does not necessarily make `.env` values available while Serverless parses `serverless.yml`. Keep local `.env` files untracked.

- `COGNITO_USER_POOL_ID`: the User Pool that actually contains the app's users.
- `COGNITO_USER_POOL_CLIENT_ID`: the public app client used by the mobile app and dashboard.
- `GEOCODING_API_KEY`: only if the geocoding integration needs it.
- `EXPO_PUBLIC_API_BASE_URL`: mobile API base URL; production must be HTTPS.
- `REACT_APP_API_BASE_URL`: dashboard API base URL; production must be HTTPS.

The issuer is derived from the configured region and User Pool ID. The User Pool ID, client ID, and issuer must all refer to the same pool. Deployment intentionally fails when the required Cognito environment variables are missing.

## Privileged roles

Authorization is based on membership in Cognito groups in the configured User Pool—not a user-supplied `custom:role` attribute.

Supported group names (case-insensitive):
- `Administrators` or `Admin` → `ADMIN`
- `SecurityStaff`, `Security_Personnel`, or `Supervisors` → `SECURITY_PERSONNEL`
- No privileged group → `REGULAR_USER`

Only a trusted administrator should assign or remove Cognito group membership. Never expose administrative Cognito credentials to the client. Review group membership before granting access to the dashboard or security workflows.

## Route policy

- Public: `/auth/register`, `/auth/confirm`, `/auth/login`, `/auth/refresh`, `/auth/forgot-password`, `/auth/confirm-forgot-password`, `/auth/resend-confirmation`.
- Authenticated users can report incidents and list their own incidents.
- Incident detail reads are limited to the reporter, security personnel, and administrators.
- Listing all incidents and changing incident status require security personnel or administrators.
- Deleting incidents and user administration require administrators.
- Media upload, attachment, and download handlers verify incident ownership or a privileged role. Download keys must belong to the incident and exist in its attachment list.

Keep route middleware and handler-level ownership checks in place. Do not add development-only authentication bypasses to deployed code.

## Logging and secrets

Never log request bodies, passwords, authorization headers, JWTs, refresh tokens, full incident records, precise locations, or pre-signed S3 URLs. Log request IDs, route, method, status, and sanitized error codes instead. Tracing must not capture response bodies or exception payloads.

**Action required:** a geocoding API key was previously committed in the repository. Removing it from the current file does not remove it from Git history. Revoke/rotate that key in the provider console, review usage, and supply the replacement through `GEOCODING_API_KEY` in the deployment environment. If any other real secrets were committed, rotate them as well.

## Before deployment

1. Set the required Cognito environment variables and confirm they all identify the same existing User Pool and app client. Do not switch to a different User Pool without planning user migration.
2. Set `EXPO_PUBLIC_API_BASE_URL` and `REACT_APP_API_BASE_URL` to the deployed HTTPS API endpoint.
3. Install native secure storage with `cd Mobile-App && npx expo install expo-secure-store`, then run `npm install` to synchronize the lockfile.
4. Run backend and dashboard builds, mobile dependency validation, and authentication integration tests.
5. Verify public auth routes work without a token; all protected routes reject missing, expired, ID, wrong-pool, and wrong-client tokens.
6. Verify a regular user cannot access another user's incident/media, assign incidents, update status, delete incidents, or administer users.
7. Confirm logs and traces contain no credentials, tokens, incident payloads, or pre-signed URLs.
8. Enable and verify Cognito advanced security/adaptive authentication and MFA for administrators in the actual configured User Pool.
9. Add AWS WAF rate-based protections for public authentication endpoints and alarms for repeated failed logins; do not embed API keys in the app as a substitute for rate limiting.
10. Deploy to a staging environment and run smoke tests before production.

This hardening reduces common authentication and authorization risks, but production readiness still requires automated tests, review of all remaining handlers and IAM permissions, and verification against the deployed AWS configuration.
