import axios from 'axios';

const BASE_URL = 'http://localhost:3000/dev'; // Update if your backend is deployed elsewhere

export const authService = {
  /**
   * Admin login — checks credentials against backend and ensures only ADMIN can access
   */
  async signIn(username, password) {
    try {
      const response = await axios.post(`${BASE_URL}/auth/login`, {
        email: username,
        password
      });

      const tokens = response.data.tokens;

      // ✅ Ensure user is an ADMIN
      if (tokens.role !== 'ADMIN') {
        throw new Error('Access denied: Only admin users can access this application');
      }

      // ✅ Save token and user to localStorage
      const accessToken = tokens.AccessToken;
      localStorage.setItem('authToken', accessToken); // Store only AccessToken
      localStorage.setItem('authUser', JSON.stringify({ // Store minimal user data
        email: username,
        role: tokens.role
      }));

      // ✅ Return mock Cognito-style session
      return {
        ...tokens,
        signInUserSession: {
          accessToken: {
            payload: {
              'cognito:groups': ['Administrators'],
              'email': username
            }
          }
        }
      };
    } catch (error) {
      console.error('Login error:', {
        message: error?.response?.data?.message || error.message,
        status: error?.response?.status,
        stack: error.stack
      });
      throw new Error(error?.response?.data?.message || 'Invalid credentials');
    }
  },

  /**
   * Sign out admin user
   */
  async signOut() {
    localStorage.removeItem('authUser');
    localStorage.removeItem('authToken');
    return Promise.resolve();
  },

  /**
   * Get currently authenticated user from localStorage
   */
  async getCurrentAuthenticatedUser() {
    const user = localStorage.getItem('authUser');
    if (user) return JSON.parse(user);
    throw new Error('No authenticated user');
  },

  /**
   * Sign-up is disabled on web
   */
  async signUp() {
    throw new Error('Registration not allowed on web');
  },

  /**
   * Placeholder for confirmation code flow (unused on web)
   */
  async confirmSignUp() {
    return Promise.resolve();
  },

  /**
   * Placeholder for password recovery flow (unused on web)
   */
  async forgotPassword() {
    return Promise.resolve();
  },

  async confirmForgotPassword() {
    return Promise.resolve();
  },

  /**
   * Returns true if user is authenticated (has authToken in storage)
   */
  async isAuthenticated() {
    const token = localStorage.getItem('authToken');
    return !!token;
  },

  /**
   * Returns Authorization header with saved token
   */
  getAuthHeader() {
    const token = localStorage.getItem('authToken');
    console.log('getAuthHeader called, token:', token ? 'present' : 'missing');
    if (token) {
      console.log('Token length:', token.length);
      console.log('Token starts with:', token.substring(0, 20) + '...');
    }
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
};

export default authService;