import { Router } from 'express';
import { PushNotificationController } from '../controllers/push-notification.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const controller = new PushNotificationController();

// Subscribe to push notifications
router.post('/push/subscribe', authenticate, (req, res) => controller.subscribe(req, res));

// Unsubscribe from push notifications
router.post('/push/unsubscribe', authenticate, (req, res) => controller.unsubscribe(req, res));

// Get VAPID public key
router.get('/push/public-key', authenticate, (req, res) => controller.getPublicKey(req, res));

// Send test notification
router.post('/push/test', authenticate, (req, res) => controller.sendTestNotification(req, res));

export default router;
