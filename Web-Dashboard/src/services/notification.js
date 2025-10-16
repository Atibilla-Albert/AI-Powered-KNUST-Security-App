import { apiService } from './api';

// Notification service aligned with backend routes
export const notificationService = {
  // Get notifications for current user
  async getNotifications() {
    return await apiService.get('/notifications');
  },

  // Mark notifications as read
  async markAsRead(notificationIds = []) {
    return await apiService.post('/notifications/mark-as-read', { notificationIds });
  },

  // Send a notification (admin only)
  async sendNotification(payload) {
    return await apiService.post('/notifications/send', payload);
  }
};

export default notificationService;