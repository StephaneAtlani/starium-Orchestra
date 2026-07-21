'use client';

import { useBrowserNotifications } from '../hooks/use-browser-notifications';

/** Monte le polling + affichage natif navigateur (sans rendu visuel). */
export function BrowserNotificationsBridge() {
  useBrowserNotifications();
  return null;
}
