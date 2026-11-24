import { fetchJson } from '@/lib/api-client';

const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
};

export type NotificationSupport = {
  supported: boolean;
  permission: NotificationPermission | 'unsupported';
};

export const getNotificationSupport = (): NotificationSupport => {
  if (
    typeof window === 'undefined' ||
    !('Notification' in window) ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in window)
  ) {
    return { supported: false, permission: 'unsupported' };
  }
  return { supported: true, permission: Notification.permission };
};

export const ensurePushSubscription = async (): Promise<
  | { ok: true }
  | { ok: false; reason: 'unsupported' | 'denied' | 'no_vapid' | 'failed'; message: string }
> => {
  const support = getNotificationSupport();
  if (!support.supported) {
    return {
      ok: false,
      reason: 'unsupported',
      message: 'Notifications are not supported in this browser',
    };
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  if (!publicKey) {
    return {
      ok: false,
      reason: 'no_vapid',
      message: 'Push is not configured on this deployment',
    };
  }

  let permission = Notification.permission;
  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }
  if (permission !== 'granted') {
    return {
      ok: false,
      reason: 'denied',
      message:
        'Notifications are blocked. Enable them in your browser or system settings for Pockett, then try again.',
    };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });
    }

    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      return { ok: false, reason: 'failed', message: 'Could not create push subscription' };
    }

    const result = await fetchJson<{ ok: boolean }>('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      }),
    });

    if (!result.ok) {
      return {
        ok: false,
        reason: 'failed',
        message: result.message || 'Could not save push subscription',
      };
    }
    return { ok: true };
  } catch (error) {
    console.error('[push-client] subscribe failed', error);
    return {
      ok: false,
      reason: 'failed',
      message: 'Could not enable notifications',
    };
  }
};

export const removePushSubscription = async (): Promise<void> => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe().catch(() => {});
      await fetchJson('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint }),
      });
    }
  } catch (error) {
    console.error('[push-client] unsubscribe failed', error);
  }
};
