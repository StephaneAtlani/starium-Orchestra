'use client';

import { useEffect, useRef } from 'react';

/**
 * Envoie `save()` après `debounceMs` quand `snapshot !== savedSnapshotRef.current`.
 * À utiliser avec un snapshot stable (ex. JSON string normalisé du payload).
 * Mettre à jour `savedSnapshotRef` après succès (dans le même flux que `save`).
 */
export function useDebouncedServerAutosave({
  enabled,
  debounceMs = 700,
  snapshot,
  savedSnapshotRef,
  canSave,
  isSaving,
  save,
}: {
  enabled: boolean;
  debounceMs?: number;
  snapshot: string;
  savedSnapshotRef: React.MutableRefObject<string>;
  canSave: boolean;
  isSaving: boolean;
  save: () => Promise<void>;
}) {
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    if (!enabled || !canSave || isSaving) return;
    if (snapshot === savedSnapshotRef.current) return;

    const id = window.setTimeout(() => {
      if (snapshot === savedSnapshotRef.current) return;
      void (async () => {
        try {
          await saveRef.current();
          savedSnapshotRef.current = snapshot;
        } catch {
          // Erreurs gérées par la mutation parente (toast, etc.)
        }
      })();
    }, debounceMs);

    return () => window.clearTimeout(id);
  }, [enabled, debounceMs, snapshot, canSave, isSaving, savedSnapshotRef]);
}
