'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type UseFormAutosaveOptions<T> = {
  storageKey: string;
  value: T;
  enabled?: boolean;
  onRestore?: (value: T) => void;
  debounceMs?: number;
};

export function useFormAutosave<T>({
  storageKey,
  value,
  enabled = true,
  onRestore,
  debounceMs = 350,
}: UseFormAutosaveOptions<T>) {
  const restoredForKeyRef = useRef<string | null>(null);
  const [isRestored, setIsRestored] = useState(false);

  useEffect(() => {
    if (!enabled || !storageKey || typeof window === 'undefined') return;
    if (restoredForKeyRef.current === storageKey) return;

    restoredForKeyRef.current = storageKey;
    setIsRestored(false);

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw && onRestore) {
        onRestore(JSON.parse(raw) as T);
      }
    } catch {
      // Ignore corrupted draft payloads silently.
    } finally {
      setIsRestored(true);
    }
  }, [enabled, onRestore, storageKey]);

  useEffect(() => {
    if (!enabled || !storageKey || typeof window === 'undefined' || !isRestored) return;

    const timeoutId = window.setTimeout(() => {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(value));
      } catch {
        // Ignore quota / serialization errors silently.
      }
    }, debounceMs);

    return () => window.clearTimeout(timeoutId);
  }, [debounceMs, enabled, isRestored, storageKey, value]);

  const clearDraft = useCallback(() => {
    if (!storageKey || typeof window === 'undefined') return;
    window.localStorage.removeItem(storageKey);
  }, [storageKey]);

  return { clearDraft, isRestored };
}
