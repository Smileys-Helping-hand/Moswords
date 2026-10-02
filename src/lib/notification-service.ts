/**
 * Notification Service for Moswords
 * Handles push notification registration and management
 */

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';

export class NotificationService {
  private static instance: NotificationService;
  private registration: ServiceWorkerRegistration | null = null;
  private nativePushInitialized = false;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initialize the service worker and request notification permission
   */
  async initialize(): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      try {
        const permission = await LocalNotifications.requestPermissions();
        if (permission.display !== 'granted') {
          return false;
        }

        // Create high-importance Android channel for banner popups and alerts
        try {
          await LocalNotifications.createChannel({
            id: 'moswords_messages',
            name: 'Messages',
            description: 'Direct messages and group chats',
            importance: 5, // High importance (heads-up popup)
            visibility: 1, // Public on lockscreen
            vibration: true,
            lights: true,
            lightColor: '#00F0FF',
          });
        } catch (chanErr) {
          console.warn('Could not create notification channel:', chanErr);
        }

        // Tap listener: deep link into conversation
        try {
          await LocalNotifications.removeAllListeners();
          await LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
            const targetUrl = (action.notification.extra as { url?: string } | undefined)?.url;
            if (typeof window !== 'undefined' && targetUrl) {
              window.location.href = targetUrl;
            }
          });
        } catch (listenErr) {
          console.warn('Could not attach local notification listener:', listenErr);
        }

        if (!this.nativePushInitialized) {
          this.nativePushInitialized = true;
          try {
            await PushNotifications.requestPermissions();
            await PushNotifications.register();

            PushNotifications.addListener('registration', (token) => {
              console.log('FCM registration token received');
              try {
                localStorage.setItem('moswords_fcm_token', token.value);
              } catch {
                // Ignore storage failures; token still exists in runtime.
              }
            });

            PushNotifications.addListener('registrationError', (error) => {
              console.error('FCM registration error:', error);
            });

            PushNotifications.addListener('pushNotificationReceived', async (notification) => {
              try {
                await this.showNotification(
                  notification.title || 'Moswords',
                  {
                    body: notification.body || '',
                    data: notification.data,
                  }
                );
              } catch (error) {
                console.error('Error handling received push notification:', error);
              }
            });

            PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
              const targetUrl = (action.notification.data as any)?.url;
              if (typeof window !== 'undefined' && targetUrl) {
                window.location.href = targetUrl;
              }
            });
          } catch (pushErr) {
            console.warn('Native push registration skipped or unavailable:', pushErr);
          }
        }

        return true;
      } catch (error) {
        console.error('Local notification permission failed:', error);
        return false;
      }
    }

    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.warn('Service Workers not supported');
      return false;
    }

    try {
      // Register service worker
      // updateViaCache 'none' + update(): phones still running an older worker
      // pick up the new one on the next launch instead of whenever the HTTP
      // cache expires.
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      });
      this.registration.update().catch(() => {});

      // Request notification permission
      const permission = await this.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return false;
    }
  }

  /**
   * Check current notification permission across native and web
   */
  async checkPermission(): Promise<NotificationPermission> {
    if (Capacitor.isNativePlatform()) {
      try {
        const res = await LocalNotifications.checkPermissions();
        return res.display === 'granted' ? 'granted' : res.display === 'denied' ? 'denied' : 'default';
      } catch {
        return 'default';
      }
    }

    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }

    return Notification.permission;
  }

  /**
   * Request notification permission from user across native and web
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (Capacitor.isNativePlatform()) {
      try {
        const res = await LocalNotifications.requestPermissions();
        return res.display === 'granted' ? 'granted' : 'denied';
      } catch {
        return 'denied';
      }
    }

    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }

  /**
   * Show a local notification
   */
  async showNotification(title: string, options?: NotificationOptions): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      try {
        const permission = await LocalNotifications.checkPermissions();
        if (permission.display !== 'granted') {
          const requested = await LocalNotifications.requestPermissions();
          if (requested.display !== 'granted') {
            return;
          }
        }

        const notificationId = Math.floor(Date.now() % 2147483647);
        const body = options?.body || '';
        const extra = options?.data || {};

        await LocalNotifications.schedule({
          notifications: [
            {
              id: notificationId,
              title,
              body,
              extra,
              channelId: 'moswords_messages',
              smallIcon: 'ic_stat_notify',
              iconColor: '#00F0FF',
              schedule: { at: new Date(Date.now() + 100) },
            },
          ],
        });
      } catch (error) {
        console.error('Error showing native notification:', error);
      }
      return;
    }

    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    if (Notification.permission !== 'granted') {
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        return;
      }
    }

    const defaultOptions: NotificationOptions = {
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      requireInteraction: false,
      ...options,
    };

    try {
      if (this.registration) {
        await this.registration.showNotification(title, defaultOptions);
      } else {
        new Notification(title, defaultOptions);
      }
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  /**
   * Subscribe to push notifications
   * Note: This requires VAPID keys configured on the server
   */
  async subscribeToPush(vapidPublicKey?: string): Promise<PushSubscription | null> {
    if (!this.registration) {
      await this.initialize();
    }

    if (!this.registration) {
      return null;
    }

    try {
      // Check if already subscribed
      let subscription = await this.registration.pushManager.getSubscription();

      if (!subscription && vapidPublicKey) {
        // Subscribe to push
        subscription = await this.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey) as unknown as any,
        });

        console.log('Push subscription created:', subscription);
      }

      return subscription;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      return null;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribeFromPush(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    try {
      const subscription = await this.registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error unsubscribing from push:', error);
      return false;
    }
  }

  /**
   * Get current push subscription
   */
  async getSubscription(): Promise<PushSubscription | null> {
    if (!this.registration) {
      return null;
    }

    try {
      return await this.registration.pushManager.getSubscription();
    } catch (error) {
      console.error('Error getting subscription:', error);
      return null;
    }
  }

  /**
   * Check if notifications are supported and enabled
   */
  isSupported(): boolean {
    if (Capacitor.isNativePlatform()) {
      return true;
    }
    return (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window
    );
  }

  /**
   * Get current notification permission status
   */
  getPermissionStatus(): NotificationPermission {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  }

  /**
   * Convert VAPID key from base64 to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Clear all notifications
   */
  async clearNotifications(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      try {
        await LocalNotifications.cancel({ notifications: [] });
      } catch (error) {
        console.error('Error clearing native notifications:', error);
      }
      return;
    }

    if (!this.registration) {
      return;
    }

    try {
      const notifications = await this.registration.getNotifications();
      notifications.forEach((notification) => notification.close());
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }

  /**
   * Send a test notification
   */
  async sendTestNotification(): Promise<void> {
    await this.showNotification('Moswords', {
      body: 'Push notifications are working! 🎉',
      icon: '/icon-192.png',
      tag: 'test-notification',
    });
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();
