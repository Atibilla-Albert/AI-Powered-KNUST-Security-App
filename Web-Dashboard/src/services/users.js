import { apiService } from './api';

// User service aligned with backend /users routes
export const userService = {
  // List users (admin-only in backend)
  async listUsers(filters = {}) {
    return await apiService.get('/admin/users', filters);
  },

  // Create user (admin-only)
  async createUser(userData) {
    return await apiService.post('/admin/users', userData);
  },

  // Get user by id (admin-only)
  async getUser(userId) {
    return await apiService.get(`/admin/users/${userId}`);
  },

  // Update user (admin-only)
  async updateUser(userId, userData) {
    return await apiService.put(`/admin/users/${userId}`, userData);
  },

  // Delete user (admin-only)
  async deleteUser(userId) {
    return await apiService.delete(`/admin/users/${userId}`);
  }
};

export default userService;