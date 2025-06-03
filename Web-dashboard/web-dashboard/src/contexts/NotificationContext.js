import React, { createContext, useState, useEffect, useContext } from 'react';
import { notificationService } from '../services/notification';
import { useAuth } from './AuthContext';

// Create notification context
const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Subscribe to notifications when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchNotifications();
      subscribeToNotifications();

      // Refresh notifications every 5 minutes
      const interval = setInterval(() => {
        fetchNotifications();
      }, 5 * 60 * 1000);

      return () => {
        clearInterval(interval);
        unsubscribeFromNotifications();
      };
    }
  }, [isAuthenticated, user]);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    try {
      const response = await notificationService.getNotifications();
      setNotifications(response.notifications || []);
      setUnreadCount(response.unreadCount || 0);
    } catch (err) {
      setError(err.message || 'Failed to fetch notifications');
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  // Subscribe to real-time notifications
  const subscribeToNotifications = async () => {
    if (!user) return;

    try {
      // Use the userId as the subscription topic
      await notificationService.subscribe(
        user.username,
        (data) => {
          // Add the new notification to the state
          setNotifications(prevNotifications => [data, ...prevNotifications]);
          setUnreadCount(prevCount => prevCount + 1);
        }
      );
    } catch (err) {
      console.error('Error subscribing to notifications:', err);
    }
  };

  // Unsubscribe from notifications
  const unsubscribeFromNotifications = async () => {
    if (!user) return;

    try {
      await notificationService.unsubscribe(user.username);
    } catch (err) {
      console.error('Error unsubscribing from notifications:', err);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      
      // Update local state
      setNotifications(notifications.map(notification => 
        notification.notificationId === notificationId 
          ? { ...notification, isRead: true }
          : notification
      ));
      
      // Update unread count
      setUnreadCount(prevCount => Math.max(0, prevCount - 1));
    } catch (err) {
      setError(err.message || `Failed to mark notification ${notificationId} as read`);
      console.error(`Error marking notification ${notificationId} as read:`, err);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      
      // Update local state
      setNotifications(notifications.map(notification => ({
        ...notification,
        isRead: true
      })));
      
      // Reset unread count
      setUnreadCount(0);
    } catch (err) {
      setError(err.message || 'Failed to mark all notifications as read');
      console.error('Error marking all notifications as read:', err);
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId) => {
    try {
      await notificationService.deleteNotification(notificationId);
      
      // Update local state
      const deletedNotification = notifications.find(
        n => n.notificationId === notificationId
      );
      
      setNotifications(notifications.filter(
        notification => notification.notificationId !== notificationId
      ));
      
      // Update unread count if necessary
      if (deletedNotification && !deletedNotification.isRead) {
        setUnreadCount(prevCount => Math.max(0, prevCount - 1));
      }
    } catch (err) {
      setError(err.message || `Failed to delete notification ${notificationId}`);
      console.error(`Error deleting notification ${notificationId}:`, err);
    }
  };

  const value = {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

// Custom hook to use notification context
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext;