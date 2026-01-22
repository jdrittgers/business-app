import apiClient from './client';
import { Notification } from '@business-app/shared';

export const notificationApi = {
  // Get all notifications for current user
  getNotifications: async (unreadOnly: boolean = false): Promise<Notification[]> => {
    const params = unreadOnly ? { unreadOnly: 'true' } : {};
    const response = await apiClient.get('/api/notifications', { params });
    return response.data;
  },

  // Get unread notification count
  getUnreadCount: async (): Promise<number> => {
    const response = await apiClient.get('/api/notifications/unread-count');
    return response.data.count;
  },

  // Mark a notification as read
  markAsRead: async (id: string): Promise<void> => {
    await apiClient.put(`/api/notifications/${id}/read`);
  },

  // Mark all notifications as read
  markAllAsRead: async (): Promise<void> => {
    await apiClient.put('/api/notifications/read-all');
  },

  // Delete a notification
  deleteNotification: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/notifications/${id}`);
  }
};
