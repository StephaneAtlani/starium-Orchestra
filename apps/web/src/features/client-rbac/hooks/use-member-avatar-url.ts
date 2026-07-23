'use client';

import { useEffect, useState } from 'react';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';

/**
 * Charge la photo membre via GET /api/users/:id/avatar (blob URL, révoquée au unmount).
 */
export function useMemberAvatarUrl(userId: string, hasAvatar: boolean): string | null {
  const authFetch = useAuthenticatedFetch();
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!hasAvatar || !userId) {
      setUrl(null);
      return;
    }
    let cancelled = false;
    let objectUrl: string | null = null;

    void (async () => {
      try {
        const res = await authFetch(`/api/users/${userId}/avatar`);
        if (!res.ok) return;
        const blob = await res.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      } catch {
        if (!cancelled) setUrl(null);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [authFetch, hasAvatar, userId]);

  return url;
}
