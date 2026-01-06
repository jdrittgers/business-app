import { useState, useEffect } from 'react';
import {
  areNotificationsSupported,
  getNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  isPushSubscribed,
  sendTestNotification
} from '../utils/push-notifications';

export default function NotificationSettings() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkNotificationStatus();
  }, []);

  const checkNotificationStatus = async () => {
    setIsSupported(areNotificationsSupported());
    setPermission(getNotificationPermission());

    if (areNotificationsSupported()) {
      const subscribed = await isPushSubscribed();
      setIsSubscribed(subscribed);
    }
  };

  const handleEnableNotifications = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const subscription = await subscribeToPushNotifications();
      if (subscription) {
        setIsSubscribed(true);
        setPermission('granted');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to enable notifications');
      console.error('Enable notifications error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisableNotifications = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await unsubscribeFromPushNotifications();
      setIsSubscribed(false);
    } catch (err: any) {
      setError(err.message || 'Failed to disable notifications');
      console.error('Disable notifications error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestNotification = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await sendTestNotification();
      alert('Test notification sent! Check your notifications.');
    } catch (err: any) {
      setError(err.message || 'Failed to send test notification');
      console.error('Test notification error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupported) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              Notifications not supported
            </h3>
            <p className="mt-1 text-sm text-yellow-700">
              Your browser doesn't support push notifications. Try using Chrome, Firefox, or Edge.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Push Notifications</h3>
          <p className="text-sm text-gray-600 mt-1">
            Get notified when tasks are assigned or calendar events are created
          </p>
        </div>
        <div>
          {permission === 'granted' && isSubscribed ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
              Enabled
            </span>
          ) : permission === 'denied' ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
              Blocked
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
              Disabled
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {permission === 'denied' && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">
            You have blocked notifications for this site. To enable them:
            <br />
            1. Click the lock icon in your browser's address bar
            <br />
            2. Find "Notifications" and set it to "Allow"
            <br />
            3. Reload this page
          </p>
        </div>
      )}

      <div className="flex gap-3">
        {!isSubscribed && permission !== 'denied' && (
          <button
            onClick={handleEnableNotifications}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isLoading ? 'Enabling...' : 'Enable Notifications'}
          </button>
        )}

        {isSubscribed && (
          <>
            <button
              onClick={handleTestNotification}
              disabled={isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isLoading ? 'Sending...' : 'Send Test Notification'}
            </button>

            <button
              onClick={handleDisableNotifications}
              disabled={isLoading}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isLoading ? 'Disabling...' : 'Disable Notifications'}
            </button>
          </>
        )}
      </div>

      <div className="mt-4 text-xs text-gray-500">
        <p>💡 Tip: Notifications work even when this tab is closed (on supported browsers)</p>
      </div>
    </div>
  );
}
