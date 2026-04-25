'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import {
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

export function useMarkNotificationReadMutation() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) =>
      markNotificationRead(authFetch, notificationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: notificationsKeys.root(clientId),
      });
    },
  });
}

export function useMarkAllNotificationsReadMutation() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => markAllNotificationsRead(authFetch),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: notificationsKeys.root(clientId),
      });
    },
  });
}
