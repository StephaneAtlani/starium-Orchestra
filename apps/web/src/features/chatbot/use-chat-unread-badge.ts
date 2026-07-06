import { useEffect, useRef, useState } from 'react';

type UnreadLine = { role: 'USER' | 'ASSISTANT' };

/** Compteur de réponses assistant non lues (drawer fermé). */
export function useChatUnreadBadge(open: boolean, lines: UnreadLine[]): number {
  const [unreadCount, setUnreadCount] = useState(0);
  const openRef = useRef(open);

  useEffect(() => {
    openRef.current = open;
    if (open) setUnreadCount(0);
  }, [open]);

  useEffect(() => {
    const last = lines.at(-1);
    if (last?.role === 'ASSISTANT' && !openRef.current) {
      setUnreadCount((c) => c + 1);
    }
  }, [lines]);

  return unreadCount;
}
