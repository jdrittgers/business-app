import webpush from 'web-push';
import { prisma } from '../prisma/client';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@business-app.com';

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  VAPID_SUBJECT,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
  tag?: string;
  requireInteraction?: boolean;
}

export interface SubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export class PushNotificationService {
  // Subscribe a user to push notifications
  async subscribe(userId: string, subscription: SubscriptionData, userAgent?: string) {
    // Check if subscription already exists
    const existing = await prisma.pushSubscription.findUnique({
      where: { endpoint: subscription.endpoint }
    });

    if (existing) {
      // Update existing subscription
      return await prisma.pushSubscription.update({
        where: { endpoint: subscription.endpoint },
        data: {
          userId,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          userAgent
        }
      });
    }

    // Create new subscription
    return await prisma.pushSubscription.create({
      data: {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent
      }
    });
  }

  // Unsubscribe a user from push notifications
  async unsubscribe(endpoint: string) {
    await prisma.pushSubscription.delete({
      where: { endpoint }
    });
  }

  // Get all subscriptions for a user
  async getUserSubscriptions(userId: string) {
    return await prisma.pushSubscription.findMany({
      where: { userId }
    });
  }

  // Send push notification to a specific subscription
  async sendToSubscription(
    subscription: { endpoint: string; p256dh: string; auth: string },
    payload: PushNotificationPayload
  ): Promise<boolean> {
    try {
      const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth
        }
      };

      await webpush.sendNotification(
        pushSubscription,
        JSON.stringify(payload)
      );

      return true;
    } catch (error: any) {
      console.error('Failed to send push notification:', error);

      // If subscription is invalid or expired, delete it
      if (error.statusCode === 404 || error.statusCode === 410) {
        try {
          await this.unsubscribe(subscription.endpoint);
          console.log('Removed invalid subscription:', subscription.endpoint);
        } catch (deleteError) {
          console.error('Failed to delete invalid subscription:', deleteError);
        }
      }

      return false;
    }
  }

  // Send push notification to a user (all their devices)
  async sendToUser(userId: string, payload: PushNotificationPayload) {
    const subscriptions = await this.getUserSubscriptions(userId);

    const results = await Promise.allSettled(
      subscriptions.map(sub =>
        this.sendToSubscription(
          {
            endpoint: sub.endpoint,
            p256dh: sub.p256dh,
            auth: sub.auth
          },
          payload
        )
      )
    );

    const successCount = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
    console.log(`✉️  Sent push notification to ${successCount}/${subscriptions.length} devices for user ${userId}`);

    return {
      total: subscriptions.length,
      successful: successCount,
      failed: subscriptions.length - successCount
    };
  }

  // Send push notification to multiple users
  async sendToUsers(userIds: string[], payload: PushNotificationPayload) {
    const results = await Promise.allSettled(
      userIds.map(userId => this.sendToUser(userId, payload))
    );

    return results;
  }

  // Send notification to all members of a business
  async sendToBusiness(businessId: string, payload: PushNotificationPayload, excludeUserId?: string) {
    const members = await prisma.businessMember.findMany({
      where: {
        businessId,
        ...(excludeUserId && { userId: { not: excludeUserId } })
      },
      select: { userId: true }
    });

    const userIds = members.map(m => m.userId);
    return await this.sendToUsers(userIds, payload);
  }
}
