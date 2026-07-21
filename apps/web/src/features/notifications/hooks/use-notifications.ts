'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import {
  clearAllNotifications,
  clearNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  NotificationsApiError,
  type NotificationListResponse,
} from '@/services/notifications';

export const notificationsKeys = {
  root: (clientId: string) => ['notifications', clientId] as const,
};

export function useNotificationsQuery() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  return useQuery({
    queryKey: notificationsKeys.root(clientId),
    queryFn: async (): Promise<NotificationListResponse> => {
      try {
        return await listNotifications(authFetch, { limit: 20, offset: 0 });
      } catch (error) {
        // Some users/clients don't have notifications module enabled yet.
        // Keep the bell usable with an empty state instead of a hard error panel.
        if (
          error instanceof NotificationsApiError &&
          (error.status === 403 || error.status === 404)
        ) {
          return {
            items: [],
            total: 0,
            unread: 0,
            limit: 20,
            offset: 0,
          };
        }
        throw error;
      }
    },
    enabled: Boolean(clientId),
    retry: 1,
  });
}

function useInvalidateNotifications() {
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.invalidateQueries({
      queryKey: notificationsKeys.root(clientId),
    });
  };
}

export function useMarkNotificationReadMutation() {
  const authFetch = useAuthenticatedFetch();
  const invalidate = useInvalidateNotifications();

  return useMutation({
    mutationFn: (notificationId: string) =>
      markNotificationRead(authFetch, notificationId),
    onSuccess: async () => {
      await invalidate();
    },
  });
}

export function useMarkAllNotificationsReadMutation() {
  const authFetch = useAuthenticatedFetch();
  const invalidate = useInvalidateNotifications();

  return useMutation({
    mutationFn: () => markAllNotificationsRead(authFetch),
    onSuccess: async () => {
      await invalidate();
    },
  });
}

export function useClearAllNotificationsMutation() {
  const authFetch = useAuthenticatedFetch();
  const invalidate = useInvalidateNotifications();

  return useMutation({
    mutationFn: () => clearAllNotifications(authFetch),
    onSuccess: async () => {
      await invalidate();
    },
  });
}

export function useClearNotificationMutation() {
  const authFetch = useAuthenticatedFetch();
  const invalidate = useInvalidateNotifications();

  return useMutation({
    mutationFn: (notificationId: string) =>
      clearNotification(authFetch, notificationId),
    onSuccess: async () => {
      await invalidate();
    },
  });
}
