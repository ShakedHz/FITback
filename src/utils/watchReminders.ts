export interface WatchReminderSettings {
  enabled: boolean;
  leadMinutes: number;
  atStart: boolean;
  /** Once a day, the first time the app runs after 6:00: today's classes in one notification. */
  dailySummary: boolean;
}

export const LEAD_OPTIONS = [5, 10, 15, 30] as const;

const SETTINGS_KEY = 'fitback.watchReminders';
const SENT_KEY = 'fitback.watchReminders.sent';
const CHANGE_EVENT = 'fitback:watch-reminders';

const DEFAULTS: WatchReminderSettings = {
  enabled: false,
  leadMinutes: 10,
  atStart: true,
  dailySummary: true,
};

export function readWatchSettings(): WatchReminderSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export function writeWatchSettings(next: WatchReminderSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function onWatchSettingsChange(listener: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener('storage', listener);
  };
}

export type NotifyAvailability = 'unsupported' | 'needs-install' | 'default' | 'granted' | 'denied';

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function notifyAvailability(): NotifyAvailability {
  // iOS only exposes notifications to apps added to the home screen.
  if (isIos() && !isStandalone()) return 'needs-install';
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return Promise.resolve(null);
  return navigator.serviceWorker.register('/sw.js').catch(() => null);
}

export async function requestNotifyPermission(): Promise<NotifyAvailability> {
  const current = notifyAvailability();
  if (current !== 'default') return current;
  await registerServiceWorker();
  await Notification.requestPermission();
  return notifyAvailability();
}

export async function showWatchNotification(
  title: string,
  body: string,
  tag: string,
  url = '/live'
): Promise<boolean> {
  if (notifyAvailability() !== 'granted') return false;
  const options: NotificationOptions & { vibrate?: number[] } = {
    body,
    tag,
    icon: '/fitback-logo-192.png',
    badge: '/fitback-logo-192.png',
    vibrate: [200, 100, 200],
    data: { url },
  };
  const reg = await registerServiceWorker();
  if (reg) {
    await navigator.serviceWorker.ready;
    await reg.showNotification(title, options);
    return true;
  }
  new Notification(title, options);
  return true;
}

/** Remembers which reminders already fired today, so reopening the app doesn't repeat them. */
export function markReminderSent(tag: string, dayKey: string): boolean {
  let sent: { day: string; tags: string[] } = { day: dayKey, tags: [] };
  try {
    const raw = localStorage.getItem(SENT_KEY);
    if (raw) sent = JSON.parse(raw);
  } catch {
    /* start fresh */
  }
  if (sent.day !== dayKey) sent = { day: dayKey, tags: [] };
  if (sent.tags.includes(tag)) return false;
  sent.tags.push(tag);
  localStorage.setItem(SENT_KEY, JSON.stringify(sent));
  return true;
}
