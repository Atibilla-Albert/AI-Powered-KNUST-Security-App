import axios from 'axios';

const BASE_URL =
  (typeof process !== 'undefined' && process.env.REACT_APP_API_BASE_URL) ||
  (process.env.NODE_ENV === 'development' ? 'http://localhost:3000/dev' : '');

if (!BASE_URL) {
  throw new Error('REACT_APP_API_BASE_URL must be configured for production.');
}
if (process.env.NODE_ENV === 'production' && !BASE_URL.startsWith('https://')) {
  throw new Error('The production API URL must use HTTPS.');
}

let accessToken = null;
let currentUser = null;

const decodeClaimsForDisplayOnly = (token) => {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload));
  } catch {
    return {};
  }
};

export const authService = {
  async signIn(username, password) {
    try {
      const response = await axios.post(\`\${BASE_URL}/auth/login\`, {
        email: username,
        password
      });
      const tokens = response.data?.tokens;
      if (!tokens?.AccessToken) throw new Error('Authentication response did not include an access token.');

      // Claims here are only for display/navigation. Backend authorization independently
      // validates signature, issuer, token_use, client_id and group membership.
      const claims = decodeClaimsForDisplayOnly(tokens.AccessToken);
      const groups = Array.isArray(claims['cognito:groups']) ? claims['cognito:groups'] : [];
      const normalizedGroups = new Set(groups.map(group => String(group).toUpperCase()));
      const role = normalizedGroups.has('ADMIN') || normalizedGroups.has('ADMINISTRATORS')
        ? 'ADMIN'
        : normalizedGroups.has('SECURITY_PERSONNEL') || normalizedGroups.has('SECURITYSTAFF') || normalizedGroups.has('SUPERVISORS')
          ? 'SECURITY_PERSONNEL'
          : 'REGULAR_USER';

      if (role !== 'ADMIN') {
        accessToken = null;
        currentUser = null;
        throw new Error('Access denied: an administrator account is required.');
      }

      accessToken = tokens.AccessToken;
      currentUser = { email: claims.email || username, role, groups };
      return currentUser;
    } catch (error) {
      accessToken = null;
      currentUser = null;
      throw new Error(error?.response?.status === 401
        ? 'Invalid credentials.'
        : (error.message || 'Login failed.'));
    }
  },

  async signOut() {
    accessToken = null;
    currentUser = null;
  },

  async getCurrentAuthenticatedUser() {
    if (!accessToken || !currentUser) throw new Error('Please sign in again.');
    return currentUser;
  },

  async signUp() {
    throw new Error('Registration not allowed on web');
  },
  async confirmSignUp() {
    throw new Error('Confirmation is not supported on this dashboard.');
  },
  async forgotPassword() {
    throw new Error('Use the account recovery flow in the mobile app.');
  },
  async confirmForgotPassword() {
    throw new Error('Use the account recovery flow in the mobile app.');
  },

  async isAuthenticated() {
    if (!accessToken) return false;
    const claims = decodeClaimsForDisplayOnly(accessToken);
    return Number.isFinite(claims.exp) && claims.exp * 1000 > Date.now();
  },

  getAuthHeader() {
    return accessToken ? { Authorization: \`Bearer \${accessToken}\` } : {};
  },

  getCurrentUser() {
    return currentUser;
  }
};

export default authService;
