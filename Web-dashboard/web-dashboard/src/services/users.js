import { apiService } from './api';

const API_NAME = 'incidentApi';

// User service for managing security personnel
export const userService = {
  /**
   * Get all security personnel
   * @param {Object} filters - Query parameters for filtering
   * @returns {Promise<Array>} - List of users
   */
  async getUsers(filters = {}) {
    return await apiService.get(API_NAME, '/users', filters);
  },

  /**
   * Get user by ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - User data
   */
  async getUserById(userId) {
    return await apiService.get(API_NAME, `/users/${userId}`);
  },

  /**
   * Get current user profile
   * @returns {Promise<Object>} - User profile
   */
  async getCurrentUser() {
    return await apiService.get(API_NAME, '/users/me');
  },

  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {Object} userData - Updated user data
   * @returns {Promise<Object>} - Updated user
   */
  async updateUser(userId, userData) {
    return await apiService.put(API_NAME, `/users/${userId}`, userData);
  },

  /**
   * Delete a user
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async deleteUser(userId) {
    return await apiService.delete(API_NAME, `/users/${userId}`);
  },

  /**
   * Get user activity logs
   * @param {string} userId - User ID
   * @param {Object} timeRange - Time range for logs
   * @returns {Promise<Array>} - Activity logs
   */
  async getUserActivityLogs(userId, timeRange = {}) {
    return await apiService.get(API_NAME, `/users/${userId}/activity`, timeRange);
  },

  /**
   * Get available security personnel for assignment
   * @param {Object} filters - Query parameters for filtering (e.g., by role, availability)
   * @returns {Promise<Array>} - List of available users
   */
  async getAvailablePersonnel(filters = {}) {
    return await apiService.get(API_NAME, '/users/available', filters);
  },

  /**
   * Update user roles and permissions
   * @param {string} userId - User ID
   * @param {Object} roleData - Role and permission data
   * @returns {Promise<Object>} - Updated user roles
   */
  async updateUserRoles(userId, roleData) {
    return await apiService.put(API_NAME, `/users/${userId}/roles`, roleData);
  }
};

export default userService;