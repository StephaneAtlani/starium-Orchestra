'use client';

import React, { useState } from 'react';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { AdminPlatformUserSummary } from '../types/admin-studio.types';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { KeyIcon } from 'lucide-react';

export function ChangeUserPasswordDialog({
  user,
}: {
  user: AdminPlatformUserSummary;
}) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authenticatedFetch = useAuthenticatedFetch();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await authenticatedFetch(
        `/api/platform/users/${user.id}/password`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ password }),
        },
      );
      if (!res.ok) {
        throw new Error("Impossible de mettre à jour le mot de passe");
      }
      setOpen(false);
      setPassword('');
      setConfirm('');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de mettre à jour le mot de passe",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        className="text-muted-foreground hover:text-foreground"
        aria-label="Changer le mot de passe"
        onClick={() => setOpen(true)}
      >
        <KeyIcon className="size-4" />
      </Button>
      <StariumModal
        open={open}
        onOpenChange={setOpen}
        title="Changer le mot de passe"
        description={
          <>
            Définissez un nouveau mot de passe pour{' '}
            <span className="font-medium">
              {user.firstName || user.lastName || user.email}
            </span>
            .
          </>
        }
        icon={KeyIcon}
        size="sm"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 sm:min-h-9"
              onClick={() => setOpen(false)}
              disabled={isSaving}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              form={`pwd-form-${user.id}`}
              className="min-h-11 sm:min-h-9"
              disabled={isSaving}
            >
              {isSaving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </>
        }
      >
        <form id={`pwd-form-${user.id}`} onSubmit={handleSubmit}>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <label className="text-xs font-medium" htmlFor={`pwd-${user.id}`}>
                Nouveau mot de passe
              </label>
              <Input
                id={`pwd-${user.id}`}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            <div className="grid gap-2">
              <label
                className="text-xs font-medium"
                htmlFor={`pwd-confirm-${user.id}`}
              >
                Confirmation
              </label>
              <Input
                id={`pwd-confirm-${user.id}`}
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>
        </form>
      </StariumModal>
    </>
  );
}
