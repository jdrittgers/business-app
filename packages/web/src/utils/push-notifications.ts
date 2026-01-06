import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Convert base64 string to Uint8Array for VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Register service worker
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers are not supported in this browser');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js');
    console.log('✅ Service Worker registered:', registration);
    return registration;
  } catch (error) {
    console.error('❌ Service Worker registration failed:', error);
    return null;
  }
}

// Check if notifications are supported
export function areNotificationsSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
}

// Get current notification permission
export function getNotificationPermission(): NotificationPermission {
  if (!areNotificationsSupported()) {
    return 'denied';
  }
  return Notification.permission;
}

// Request notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!areNotificationsSupported()) {
    throw new Error('Push notifications are not supported in this browser');
  }

  const permission = await Notification.requestPermission();
  console.log('Notification permission:', permission);
  return permission;
}

// Subscribe to push notifications
export async function subscribeToPushNotifications(): Promise<PushSubscription | null> {
  try {
    // Check support
    if (!areNotificationsSupported()) {
      throw new Error('Push notifications are not supported');
    }

    // Request permission
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return null;
    }

    // Get service worker registration
    let registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      registration = await registerServiceWorker();
    }

    if (!registration) {
      throw new Error('Service worker registration failed');
    }

    // Get VAPID public key from backend
    const { data } = await axios.get(`${API_URL}/api/push/public-key`, {
      withCredentials: true
    });

    const vapidPublicKey = data.publicKey;
    const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

    // Subscribe to push notifications
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey
    });

    console.log('✅ Push subscription created:', subscription);

    // Send subscription to backend
    await axios.post(
      `${API_URL}/api/push/subscribe`,
      { subscription: subscription.toJSON() },
      { withCredentials: true }
    );

    console.log('✅ Subscription saved to backend');

    return subscription;
  } catch (error) {
    console.error('❌ Failed to subscribe to push notifications:', error);
    throw error;
  }
}

// Unsubscribe from push notifications
export async function unsubscribeFromPushNotifications(): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      return;
    }

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      return;
    }

    // Unsubscribe from push manager
    await subscription.unsubscribe();

    // Remove subscription from backend
    await axios.post(
      `${API_URL}/api/push/unsubscribe`,
      { endpoint: subscription.endpoint },
      { withCredentials: true }
    );

    console.log('✅ Unsubscribed from push notifications');
  } catch (error) {
    console.error('❌ Failed to unsubscribe from push notifications:', error);
    throw error;
  }
}

// Check if user is subscribed
export async function isPushSubscribed(): Promise<boolean> {
  try {
    if (!areNotificationsSupported()) {
      return false;
    }

    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      return false;
    }

    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch (error) {
    console.error('Failed to check subscription status:', error);
    return false;
  }
}

// Send test notification
export async function sendTestNotification(): Promise<void> {
  try {
    await axios.post(
      `${API_URL}/api/push/test`,
      {},
      { withCredentials: true }
    );
    console.log('✅ Test notification sent');
  } catch (error) {
    console.error('❌ Failed to send test notification:', error);
    throw error;
  }
}
