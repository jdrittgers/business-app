import { broadcastToBusinessRoom, emitToUser } from '../config/socket';
import { CalendarEvent, Task } from '@business-app/shared';
import { PushNotificationService } from '../services/push-notification.service';

const pushNotificationService = new PushNotificationService();

// Calendar event emitters
export const CalendarEvents = {
  // Broadcast when a calendar event is created
  eventCreated: (businessId: string, event: CalendarEvent) => {
    broadcastToBusinessRoom(businessId, 'calendar:event-created', event);

    // Send push notification to business members (except creator)
    pushNotificationService.sendToBusiness(
      businessId,
      {
        title: '📅 New Calendar Event',
        body: `${event.title} - ${new Date(event.startTime).toLocaleString()}`,
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        tag: `calendar-event-${event.id}`,
        data: { type: 'calendar', eventId: event.id, businessId }
      },
      event.userId // Exclude creator
    ).catch(err => console.error('Failed to send push notification:', err));
  },

  // Broadcast when a calendar event is updated
  eventUpdated: (businessId: string, event: CalendarEvent) => {
    broadcastToBusinessRoom(businessId, 'calendar:event-updated', event);
  },

  // Broadcast when a calendar event is deleted
  eventDeleted: (businessId: string, eventId: string) => {
    broadcastToBusinessRoom(businessId, 'calendar:event-deleted', { eventId });
  },

  // Broadcast bulk refresh (when filters change, etc.)
  eventsRefresh: (businessId: string) => {
    broadcastToBusinessRoom(businessId, 'calendar:refresh', {});
  }
};

// Task event emitters
export const TaskEvents = {
  // Broadcast when a task is created
  taskCreated: (businessId: string, task: Task) => {
    broadcastToBusinessRoom(businessId, 'task:created', task);

    // Send push notification to business members (except creator)
    pushNotificationService.sendToBusiness(
      businessId,
      {
        title: '✅ New Task Created',
        body: task.title,
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        tag: `task-${task.id}`,
        data: { type: 'task', taskId: task.id, businessId }
      },
      task.createdBy // Exclude creator
    ).catch(err => console.error('Failed to send push notification:', err));
  },

  // Broadcast when a task is updated
  taskUpdated: (businessId: string, task: Task) => {
    broadcastToBusinessRoom(businessId, 'task:updated', task);
  },

  // Broadcast when a task is deleted
  taskDeleted: (businessId: string, taskId: string) => {
    broadcastToBusinessRoom(businessId, 'task:deleted', { taskId });
  },

  // Broadcast when a task is claimed
  taskClaimed: (businessId: string, task: Task) => {
    broadcastToBusinessRoom(businessId, 'task:claimed', task);

    // Send push notification to task creator
    if (task.createdBy && task.assignedTo) {
      pushNotificationService.sendToUser(task.createdBy, {
        title: '👋 Task Claimed',
        body: `${task.title} was claimed`,
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        tag: `task-claimed-${task.id}`,
        data: { type: 'task-claimed', taskId: task.id, businessId: task.businessId }
      }).catch(err => console.error('Failed to send push notification:', err));
    }
  },

  // Broadcast when a task is completed
  taskCompleted: (businessId: string, task: Task) => {
    broadcastToBusinessRoom(businessId, 'task:completed', task);

    // Send push notification to task creator
    if (task.createdBy && task.assignedTo) {
      pushNotificationService.sendToUser(task.createdBy, {
        title: '🎉 Task Completed',
        body: `${task.title} was completed`,
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        tag: `task-completed-${task.id}`,
        data: { type: 'task-completed', taskId: task.id, businessId: task.businessId }
      }).catch(err => console.error('Failed to send push notification:', err));
    }
  },

  // Send notification to specific user about task assignment
  taskAssigned: async (userId: string, task: Task) => {
    await emitToUser(userId, 'notification:task-assigned', {
      message: `You have been assigned to task: ${task.title}`,
      task
    });

    // Send push notification to assigned user
    pushNotificationService.sendToUser(userId, {
      title: '🎯 Task Assigned to You',
      body: task.title,
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      tag: `task-assigned-${task.id}`,
      requireInteraction: true,
      data: { type: 'task-assigned', taskId: task.id, businessId: task.businessId }
    }).catch(err => console.error('Failed to send push notification:', err));
  }
};

// User notification emitters
export const NotificationEvents = {
  // Send notification to specific user
  sendToUser: async (userId: string, notification: { type: string; message: string; data?: any }) => {
    await emitToUser(userId, 'notification', notification);
  },

  // Broadcast notification to entire business
  sendToBusiness: (businessId: string, notification: { type: string; message: string; data?: any }) => {
    broadcastToBusinessRoom(businessId, 'notification', notification);
  }
};
