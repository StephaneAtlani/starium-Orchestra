'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Ancienne modale de création — redirige vers le formulaire plein écran CDC (A2).
 * Conservée pour compatibilité des imports éventuels.
 */
export function CreateProjectRequestDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  navigateToDetailOnSuccess?: boolean;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    onOpenChange(false);
    router.push('/projects/requests/new');
  }, [open, onOpenChange, router]);

  return null;
}
