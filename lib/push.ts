import { sendNotification, setVapidDetails } from 'web-push';

export type PushSubscriptionKeys = {
  p256dh: string;
  auth: string;
};

export type StoredPushSubscription = {
  endpoint: string;
  keys: PushSubscriptionKeys;
};

let configured = false;

export const getVapidPublicKey = (): string | null => {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  return key || null;
};

const ensureWebPush = () => {
  if (configured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim() || 'mailto:pockett@localhost';
  if (!publicKey || !privateKey) {
    throw new Error('VAPID keys are not configured');
  }
  setVapidDetails(subject, publicKey, privateKey);
  configured = true;
};

export const sendWebPush = async (
  subscription: StoredPushSubscription,
  payload: { title: string; body: string; url?: string }
): Promise<{ ok: true } | { ok: false; gone: boolean; statusCode?: number }> => {
  ensureWebPush();
  try {
    await sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      },
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        url: payload.url ?? '/',
      }),
      { TTL: 60 * 60 * 12, urgency: 'normal' }
    );
    return { ok: true };
  } catch (error: unknown) {
    const statusCode =
      typeof error === 'object' &&
      error &&
      'statusCode' in error &&
      typeof (error as { statusCode: unknown }).statusCode === 'number'
        ? (error as { statusCode: number }).statusCode
        : undefined;
    const gone = statusCode === 404 || statusCode === 410;
    console.error('[push] send failed', statusCode, error);
    return { ok: false, gone, statusCode };
  }
};
