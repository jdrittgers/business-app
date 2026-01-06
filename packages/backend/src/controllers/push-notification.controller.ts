import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { PushNotificationService } from '../services/push-notification.service';

const pushNotificationService = new PushNotificationService();

export class PushNotificationController {
  // Subscribe to push notifications
  async subscribe(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { subscription } = req.body;

      if (!subscription || !subscription.endpoint || !subscription.keys) {
        res.status(400).json({ error: 'Invalid subscription data' });
        return;
      }

      const userAgent = req.headers['user-agent'];

      const result = await pushNotificationService.subscribe(
        req.user.userId,
        subscription,
        userAgent
      );

      res.status(201).json({
        message: 'Successfully subscribed to push notifications',
        subscription: result
      });
    } catch (error) {
      console.error('Subscribe error:', error);
      res.status(500).json({ error: 'Failed to subscribe to push notifications' });
    }
  }

  // Unsubscribe from push notifications
  async unsubscribe(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { endpoint } = req.body;

      if (!endpoint) {
        res.status(400).json({ error: 'Endpoint is required' });
        return;
      }

      await pushNotificationService.unsubscribe(endpoint);

      res.json({ message: 'Successfully unsubscribed from push notifications' });
    } catch (error) {
      console.error('Unsubscribe error:', error);
      res.status(500).json({ error: 'Failed to unsubscribe from push notifications' });
    }
  }

  // Get VAPID public key
  async getPublicKey(req: AuthRequest, res: Response): Promise<void> {
    try {
      const publicKey = process.env.VAPID_PUBLIC_KEY;

      if (!publicKey) {
        res.status(500).json({ error: 'VAPID public key not configured' });
        return;
      }

      res.json({ publicKey });
    } catch (error) {
      console.error('Get public key error:', error);
      res.status(500).json({ error: 'Failed to get public key' });
    }
  }

  // Send test notification
  async sendTestNotification(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const result = await pushNotificationService.sendToUser(req.user.userId, {
        title: 'Test Notification',
        body: 'This is a test notification from Business App!',
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        tag: 'test-notification'
      });

      res.json({
        message: 'Test notification sent',
        result
      });
    } catch (error) {
      console.error('Send test notification error:', error);
      res.status(500).json({ error: 'Failed to send test notification' });
    }
  }
}
