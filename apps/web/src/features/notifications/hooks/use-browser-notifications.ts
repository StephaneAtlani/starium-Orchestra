'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { useActiveClient } from '@/hooks/use-active-client';
import {
  BROWSER_NOTIFICATIONS_PERMISSION_CHANGED_EVENT,
  BROWSER_NOTIFICATIONS_POLL_INTERVAL_MS,
  getBrowserNotificationPermission,
  readNotifiedIds,
  rememberNotifiedIds,
  shouldSurfaceBrowserNotification,
  showBrowserNotificationForItem,
  type BrowserNotificationPermissionState,
} from '../lib/browser-notifications';
import { useNotificationsQuery } from './use-notifications';

/**
 * Polling léger + alertes natives si Chrome a accordé la permission.
 * Pas d’opt-in applicatif : le consentement est géré par le navigateur.
 */
export function useBrowserNotifications() {
  const router = useRouter();
  const { user } = useAuth();
  const { activeClient } = useActiveClient();
  const userId = user?.id ?? '';
  const clientId = activeClient?.id ?? '';
  const [permission, setPermission] = useState<BrowserNotificationPermissionState>('default');

  useEffect(() => {
    const sync = () => setPermission(getBrowserNotificationPermission());
    sync();
    window.addEventListener(BROWSER_NOTIFICATIONS_PERMISSION_CHANGED_EVENT, sync);
    document.addEventListener('visibilitychange', sync);
    return () => {
      window.removeEventListener(BROWSER_NOTIFICATIONS_PERMISSION_CHANGED_EVENT, sync);
      document.removeEventListener('visibilitychange', sync);
    };
  }, []);

  const active = Boolean(userId && clientId) && permission === 'granted';

  const { data } = useNotificationsQuery({
    refetchInterval: active ? BROWSER_NOTIFICATIONS_POLL_INTERVAL_MS : false,
  });

  const notifiedRef = useRef<Set<string>>(new Set());
  const bootstrappedRef = useRef(false);

  useEffect(() => {
    if (!userId || !clientId) return;
    notifiedRef.current = readNotifiedIds(userId, clientId);
    bootstrappedRef.current = false;
  }, [userId, clientId]);

  useEffect(() => {
    if (!active || !data?.items?.length || !userId || !clientId) return;

    if (!bootstrappedRef.current) {
      for (const item of data.items) {
        notifiedRef.current.add(item.id);
      }
      rememberNotifiedIds(userId, clientId, notifiedRef.current);
      bootstrappedRef.current = true;
      return;
    }

    if (!shouldSurfaceBrowserNotification(document.hidden)) return;

    const freshUnread = data.items.filter(
      (item) => item.status === 'UNREAD' && !notifiedRef.current.has(item.id),
    );
    if (freshUnread.length === 0) return;

    for (const item of freshUnread) {
      const shown = showBrowserNotificationForItem(item, {
        onNavigate: (url) => router.push(url),
      });
      if (shown) notifiedRef.current.add(item.id);
    }

    rememberNotifiedIds(userId, clientId, freshUnread.map((item) => item.id));
  }, [active, data?.items, userId, clientId, router]);
}
