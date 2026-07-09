'use client';

import React, { useState } from 'react';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Button } from '@/components/ui/button';
import type { AdminPlatformUserSummary } from '../types/admin-studio.types';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { ShieldOffIcon } from 'lucide-react';

export function ResetUserMfaDialog({
  user,
}: {
  user: AdminPlatformUserSummary;
}) {
  const [open, setOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const authenticatedFetch = useAuthenticatedFetch();

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) {
      setError(null);
      setDone(false);
    }
  };

  const handleReset = async () => {
    setError(null);
    setIsResetting(true);
    try {
      const res = await authenticatedFetch(
        `/api/platform/users/${user.id}/reset-mfa`,
        { method: 'POST' },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          message?: string | string[];
        };
        const msg = Array.isArray(data.message)
          ? data.message.join(', ')
          : data.message;
        throw new Error(msg || 'Impossible de réinitialiser la 2FA');
      }
      setDone(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Impossible de réinitialiser la 2FA',
      );
    } finally {
      setIsResetting(false);
    }
  };

  const userLabel = user.firstName || user.lastName || user.email;

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        className="text-muted-foreground hover:text-destructive"
        aria-label="Réinitialiser la 2FA"
        onClick={() => setOpen(true)}
      >
        <ShieldOffIcon className="size-4" />
      </Button>
      <StariumModal
        open={open}
        onOpenChange={handleOpenChange}
        title="Réinitialiser la 2FA"
        description={
          done ? (
            <>
              La double authentification de{' '}
              <span className="font-medium">{userLabel}</span> a été réinitialisée.
              L&apos;utilisateur devra reconfigurer sa 2FA au prochain login.
            </>
          ) : (
            <>
              Cette action supprime toute la configuration 2FA (TOTP, codes
              de secours, appareils de confiance) et invalide toutes les
              sessions de <span className="font-medium">{userLabel}</span>.
            </>
          )
        }
        icon={ShieldOffIcon}
        size="sm"
        footer={
          done ? (
            <Button
              className="min-h-11 sm:min-h-9"
              onClick={() => setOpen(false)}
            >
              Fermer
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 sm:min-h-9"
                onClick={() => setOpen(false)}
                disabled={isResetting}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                className="min-h-11 sm:min-h-9"
                onClick={() => void handleReset()}
                disabled={isResetting}
              >
                {isResetting ? 'Réinitialisation…' : 'Réinitialiser la 2FA'}
              </Button>
            </>
          )
        }
      >
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </StariumModal>
    </>
  );
}
