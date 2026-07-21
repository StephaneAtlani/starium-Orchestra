import type { NotificationItem } from '@/services/notifications';

export const BROWSER_NOTIFICATIONS_NOTIFIED_PREFIX = 'starium.notifications.browserNotified';
export const BROWSER_NOTIFICATION_ICON = '/brand/icon-starium.png';
export const BROWSER_NOTIFICATIONS_POLL_INTERVAL_MS = 60_000;
export const BROWSER_NOTIFICATIONS_NOTIFIED_CAP = 100;
export const BROWSER_NOTIFICATIONS_PERMISSION_CHANGED_EVENT =
  'starium:notifications-browser-permission-changed';

export type BrowserNotificationPermissionState = NotificationPermission | 'unsupported';

export function isBrowserNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getBrowserNotificationPermission(): BrowserNotificationPermissionState {
  if (!isBrowserNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export function notifyBrowserNotificationPermissionChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(BROWSER_NOTIFICATIONS_PERMISSION_CHANGED_EVENT));
}

export async function requestBrowserNotificationPermission(): Promise<BrowserNotificationPermissionState> {
  if (!isBrowserNotificationSupported()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  const result = await Notification.requestPermission();
  notifyBrowserNotificationPermissionChanged();
  return result;
}

export function buildNotifiedIdsStorageKey(userId: string, clientId: string): string {
  return `${BROWSER_NOTIFICATIONS_NOTIFIED_PREFIX}:${userId}:${clientId}`;
}

export function readNotifiedIds(userId: string, clientId: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(buildNotifiedIdsStorageKey(userId, clientId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === 'string'));
  } catch {
    return new Set();
  }
}

export function rememberNotifiedIds(
  userId: string,
  clientId: string,
  ids: Iterable<string>,
): void {
  if (typeof window === 'undefined') return;
  const next = new Set(readNotifiedIds(userId, clientId));
  for (const id of ids) next.add(id);
  const capped = [...next].slice(-BROWSER_NOTIFICATIONS_NOTIFIED_CAP);
  try {
    window.localStorage.setItem(
      buildNotifiedIdsStorageKey(userId, clientId),
      JSON.stringify(capped),
    );
  } catch {
    // ignore
  }
}

export function seedNotifiedIds(
  userId: string,
  clientId: string,
  notificationIds: string[],
): void {
  rememberNotifiedIds(userId, clientId, notificationIds);
}

export type ShowBrowserNotificationOptions = {
  onNavigate?: (url: string) => void;
};

export function showBrowserNotificationForItem(
  item: NotificationItem,
  options?: ShowBrowserNotificationOptions,
): boolean {
  if (!isBrowserNotificationSupported()) return false;
  if (Notification.permission !== 'granted') return false;

  const body = [item.message, item.entityLabel].filter(Boolean).join('\n');
  const notification = new Notification(item.title, {
    body: body || undefined,
    tag: item.id,
    icon: BROWSER_NOTIFICATION_ICON,
    data: {
      notificationId: item.id,
      actionUrl: item.actionUrl,
    },
  });

  notification.onclick = () => {
    window.focus();
    const actionUrl = item.actionUrl;
    if (actionUrl) {
      if (options?.onNavigate) {
        options.onNavigate(actionUrl);
      } else {
        window.location.assign(actionUrl);
      }
    }
    notification.close();
  };

  return true;
}

export function shouldSurfaceBrowserNotification(documentHidden: boolean): boolean {
  return documentHidden;
}

export function isBrowserNotificationActive(): boolean {
  return getBrowserNotificationPermission() === 'granted';
}
