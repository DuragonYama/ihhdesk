import { api } from './api';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

// Deduplicate concurrent calls (React StrictMode fires effects twice in dev)
let _subscribePromise: Promise<void> | null = null;

/** Subscribe this browser to Web Push and register the subscription with the backend.
 *  Throws on any failure so the caller can show an error to the user. */
export function subscribeToPush(): Promise<void> {
  if (!_subscribePromise) {
    _subscribePromise = _doSubscribe().finally(() => { _subscribePromise = null; });
  }
  return _subscribePromise;
}

async function _doSubscribe(): Promise<void> {
  console.log('[push] subscribeToPush start');
  if (!('serviceWorker' in navigator)) throw new Error('Service workers not supported');
  if (!('PushManager' in window)) throw new Error('Web Push not supported in this browser');

  // Wait for SW to be ready (timeout after 10s to avoid hanging)
  console.log('[push] waiting for SW ready...');
  const reg = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Service worker timed out')), 10_000)
    ),
  ]);
  console.log('[push] SW ready, state:', reg.active?.state);

  // Fetch VAPID public key
  console.log('[push] fetching VAPID key...');
  const { data } = await api.get<{ public_key: string }>('/api/notifications/vapid-public-key');
  if (!data.public_key) throw new Error('Server heeft geen VAPID sleutel geconfigureerd');
  console.log('[push] VAPID key ok, length:', data.public_key.length);

  const applicationServerKey = urlBase64ToUint8Array(data.public_key);

  // Check for existing subscription
  let sub = await reg.pushManager.getSubscription();
  console.log('[push] existing subscription:', sub ? sub.endpoint.slice(0, 40) + '...' : 'none');

  if (sub) {
    const existingKey = sub.options?.applicationServerKey;
    if (existingKey) {
      const existingBytes = new Uint8Array(existingKey as ArrayBuffer);
      const newBytes = applicationServerKey;
      const mismatch = existingBytes.length !== newBytes.length ||
        existingBytes.slice(0, 8).some((b, i) => b !== newBytes[i]);
      if (mismatch) {
        console.log('[push] VAPID key mismatch, unsubscribing old subscription');
        await sub.unsubscribe();
        sub = null;
      }
    }
  }

  if (!sub) {
    console.log('[push] calling pushManager.subscribe()...');
    try {
      // Timeout after 30s — pushManager.subscribe() contacts FCM and can hang
      sub = await Promise.race([
        reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Abonneer verzoek verlopen (FCM timeout)')), 30_000)
        ),
      ]);
      console.log('[push] subscribed, endpoint:', sub.endpoint.slice(0, 40) + '...');
    } catch (err: any) {
      console.error('[push] pushManager.subscribe failed:', err);
      throw new Error(`Abonneren mislukt: ${err?.message || err}`);
    }
  }

  const json = sub.toJSON();
  console.log('[push] toJSON keys:', Object.keys(json), 'has keys:', !!json.keys);
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error('Ongeldig abonnement ontvangen van de browser');
  }

  console.log('[push] posting to backend...');
  try {
    await api.post('/api/notifications/subscribe', {
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    });
    console.log('[push] backend POST success!');
  } catch (err: any) {
    const detail = err?.response?.data?.detail;
    console.error('[push] backend POST failed:', err?.response?.status, detail || err?.message);
    throw new Error(`Backend registratie mislukt: ${detail || err?.message || err}`);
  }
}

/** Unsubscribe this browser and remove the subscription from the backend. */
export async function unsubscribeFromPush(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;

  const json = sub.toJSON();
  try {
    await api.delete('/api/notifications/subscribe', {
      data: { endpoint: json.endpoint, p256dh: json.keys?.p256dh, auth: json.keys?.auth },
    });
  } catch {
    // Best-effort
  }
  await sub.unsubscribe();
}

/** Returns true if this browser has an active push subscription. */
export async function isPushSubscribed(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  return sub !== null;
}
