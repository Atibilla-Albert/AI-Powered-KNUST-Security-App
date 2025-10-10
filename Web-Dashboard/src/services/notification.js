import { apiService } from './api';
import { authService } from './auth';

const API_NAME = 'notificationApi';

// Notification service for managing alerts and subscriptions
export const notificationService = {
  /**
   * Create a notification configuration
   * @param {Object} config - Notification configuration
   * @returns {Promise<Object>} - Created configuration
   */
  async createNotificationConfig(config) {
    try {
      return await apiService.post(
        API_NAME,
        '/notifications/configs',
        config
      );
    } catch (error) {
      console.error('Error creating notification config:', error);
      throw error;
    }
  },

  /**
   * Get notification configurations for current user
   * @returns {Promise<Array>} - List of configurations
   */
  async getNotificationConfigs() {
    try {
      const user = await authService.getCurrentAuthenticatedUser();
      return await apiService.get(
        API_NAME,
        `/notifications/configs`,
        { userId: user.username }
      );
    } catch (error) {
      console.error('Error getting notification configs:', error);
      throw error;
    }
  },

  /**
   * Subscribe to notifications
   * @param {string} topicArn - SNS topic ARN
   * @param {string} protocol - Subscription protocol (email, sms, etc.)
   * @param {string} endpoint - Subscription endpoint (email address, phone number)
   * @returns {Promise<Object>} - Subscription confirmation
   */
  async subscribeToNotifications(topicArn, protocol, endpoint) {
    try {
      const user = await authService.getCurrentAuthenticatedUser();
      
      return await apiService.post(
        API_NAME,
        '/notifications/subscribe',
        {
          topicArn,
          protocol,
          endpoint,
          userId: user.username
        }
      );
    } catch (error) {
      console.error('Error subscribing to notifications:', error);
      throw error;
    }
  },

  /**
   * Get user's notification subscriptions
   * @returns {Promise<Array>} - List of subscriptions
   */
  async getUserSubscriptions() {
    try {
      const user = await authService.getCurrentAuthenticatedUser();
      return await apiService.get(
        API_NAME,
        `/notifications/subscriptions`,
        { userId: user.username }
      );
    } catch (error) {
      console.error('Error getting user subscriptions:', error);
      throw error;
    }
  },

  /**
   * Unsubscribe from notifications
   * @param {string} subscriptionArn - Subscription ARN
   * @returns {Promise<Object>} - Unsubscription result
   */
  async unsubscribe(subscriptionArn) {
    try {
      return await apiService.delete(
        API_NAME,
        `/notifications/unsubscribe/${subscriptionArn}`
      );
    } catch (error) {
      console.error('Error unsubscribing:', error);
      throw error;
    }
  },

  /**
   * Send test notification
   * @param {string} configId - Configuration ID
   * @returns {Promise<Object>} - Test result
   */
  async sendTestNotification(configId) {
    try {
      return await apiService.post(
        API_NAME,
        `/notifications/test/${configId}`
      );
    } catch (error) {
      console.error('Error sending test notification:', error);
      throw error;
    }
  },

  /**
   * Get notification history
   * @param {Object} [filters={}] - Time range and other filters
   * @returns {Promise<Array>} - Notification history
   */
  async getNotificationHistory(filters = {}) {
    try {
      const user = await authService.getCurrentAuthenticatedUser();
      return await apiService.get(
        API_NAME,
        '/notifications/history',
        { ...filters, userId: user.username }
      );
    } catch (error) {
      console.error('Error getting notification history:', error);
      throw error;
    }
  },

  /**
   * Process high priority incident alert
   * @param {string} incidentId - Incident ID
   * @returns {Promise<Object>} - Alert result
   */
  async processHighPriorityAlert(incidentId) {
    try {
      return await apiService.post(
        API_NAME,
        '/notifications/alert/high-priority',
        { incidentId }
      );
    } catch (error) {
      console.error('Error processing high priority alert:', error);
      throw error;
    }
  }
};

export default notificationService;