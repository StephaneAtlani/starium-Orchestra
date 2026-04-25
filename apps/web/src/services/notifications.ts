export type AuthFetch = (
  input: RequestInfo,
  init?: RequestInit,
) => Promise<Response>;

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  status: 'UNREAD' | 'READ';
  createdAt: string;
  readAt: string | null;
  actionUrl: string | null;
  entityLabel: string | null;
  alertSeverity: 'INFO' | 'WARNING' | 'CRITICAL' | null;
};

export type NotificationListResponse = {
  items: NotificationItem[];
  total: number;
  unread: number;
  limit: number;
  offset: number;
};

export class NotificationsApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'NotificationsApiError';
  }
}

async function extractErrorMessage(
  res: Response,
  fallback: string,
): Promise<string> {
  try {
    const payload = (await res.json()) as { message?: string | string[] };
    if (Array.isArray(payload?.message) && payload.message.length > 0) {
      return payload.message[0] ?? fallback;
    }
    if (typeof payload?.message === 'string' && payload.message.trim().length > 0) {
      return payload.message;
    }
  } catch {
    // ignore JSON parse errors and keep fallback message
  }
  return fallback;
}

export async function listNotifications(
  authFetch: AuthFetch,
  params?: { status?: 'UNREAD' | 'READ'; limit?: number; offset?: number },
): Promise<NotificationListResponse> {
  const sp = new URLSearchParams();
  if (params?.status) sp.set('status', params.status);
  if (params?.limit != null) sp.set('limit', String(params.limit));
  if (params?.offset != null) sp.set('offset', String(params.offset));
  const q = sp.toString();
  const res = await authFetch(`/api/notifications${q ? `?${q}` : ''}`);
  if (!res.ok) {
    throw new NotificationsApiError(
      await extractErrorMessage(res, 'Chargement notifications impossible'),
      res.status,
    );
  }
  return res.json();
}

export async function markNotificationRead(
  authFetch: AuthFetch,
  id: string,
): Promise<{ updated: number }> {
  const res = await authFetch(`/api/notifications/${id}/read`, {
    method: 'PATCH',
  });
  if (!res.ok) {
    throw new NotificationsApiError(
      await extractErrorMessage(res, 'Mise a jour notification impossible'),
      res.status,
    );
  }
  return res.json();
}

export async function markAllNotificationsRead(
  authFetch: AuthFetch,
): Promise<{ updated: number }> {
  const res = await authFetch('/api/notifications/read-all', {
    method: 'PATCH',
  });
  if (!res.ok) {
    throw new NotificationsApiError(
      await extractErrorMessage(res, 'Mise a jour notifications impossible'),
      res.status,
    );
  }
  return res.json();
}
