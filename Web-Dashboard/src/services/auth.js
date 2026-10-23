import axios from 'axios';

const BASE_URL = (typeof process !== 'undefined' && process.env?.REACT_APP_API_BASE_URL)
  ? process.env.REACT_APP_API_BASE_URL
  : 'http://localhost:3000/dev';

// Memory-only storage is safer than localStorage for bearer tokens.
// Production browser deployments should prefer a BFF with HttpOnly, Secure, SameSite cookies.
let accessToken = null;
let authenticatedUser = null;

function decodeJwtPayload(token) {
  try {
    const value = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(value));
  } catch {
    return {};
  }
}

export const authService = {
  async signIn(username, password) {
    try {
      const response = await axios.post(`${BASE_URL}/auth/login`, { email: username, password });
      const tokens = response.data?.tokens;
      if (!tokens?.AccessToken) throw new Error('Authentication response was incomplete');
      if (tokens.role !== 'ADMIN') throw new Error('Access denied: administrator access is required');
      accessToken = tokens.AccessToken;
      const claims = decodeJwtPayload(accessToken);
      authenticatedUser = { email: claims.email || username, role: tokens.role };
      return authenticatedUser;
    } catch (error) {
      accessToken = null;
      authenticatedUser = null;
      throw new Error(error?.response?.status === 401 ? 'Invalid email or password' : error.message || 'Authentication failed');
    }
  },
  async signOut() { accessToken = null; authenticatedUser = null; },
  async getCurrentAuthenticatedUser() {
    if (accessToken && authenticatedUser) return authenticatedUser;
    throw new Error('No authenticated session');
  },
  async signUp() { throw new Error('Registration not allowed on web'); },
  async confirmSignUp() { throw new Error('Confirmation flow is not configured on web'); },
  async forgotPassword() { throw new Error('Password recovery is not configured on web'); },
  async confirmForgotPassword() { throw new Error('Password recovery is not configured on web'); },
  async isAuthenticated() { return Boolean(accessToken); },
  getAuthToken() { return accessToken; },
  getAuthHeader() { return accessToken ? { Authorization: `Bearer ${accessToken}` } : {}; },
};
export default authService;
