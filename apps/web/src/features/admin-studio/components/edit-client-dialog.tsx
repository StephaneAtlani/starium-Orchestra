'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type {
  AdminClientSummary,
  AdminClientUserSummary,
} from '../types/admin-studio.types';
import { useUpdateClientMutation } from '../hooks/use-clients-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { getClientUsers } from '../api/get-client-users';
import { XIcon } from 'lucide-react';

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export function EditClientDialog({ client }: { client: AdminClientSummary }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(client.name);
  const [slug, setSlug] = useState(client.slug);
  const [error, setError] = useState<string | null>(null);
  const [clientUsers, setClientUsers] = useState<AdminClientUserSummary[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);

  const { mutateAsync, isPending } = useUpdateClientMutation();
  const authenticatedFetch = useAuthenticatedFetch();

  const defaultSlug = useMemo(() => slugify(name), [name]);

  useEffect(() => {
    if (!open) return;
    // reset quand on ouvre, pour refléter l’état actuel du client
    setName(client.name);
    setSlug(client.slug);
    setError(null);
    setUsersError(null);
    setIsLoadingUsers(true);
    let cancelled = false;

    (async () => {
      try {
        const res = await getClientUsers(authenticatedFetch, client.id);
        if (!cancelled) {
          setClientUsers(res.users ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setUsersError(
            err instanceof Error
              ? err.message
              : "Impossible de charger les utilisateurs rattachés à ce client",
          );
          setClientUsers([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingUsers(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, client.id, client.name, client.slug, authenticatedFetch]);

  const handleDetachUser = async (user: AdminClientUserSummary) => {
    try {
      setUsersError(null);
      const res = await authenticatedFetch(
        `/api/clients/${client.id}/users/${user.userId}`,
        {
          method: 'DELETE',
        },
      );
      if (!res.ok) {
        throw new Error("Impossible de dissocier cet utilisateur du client");
      }
      setClientUsers((prev) => prev.filter((u) => u.userId !== user.userId));
    } catch (err) {
      setUsersError(
        err instanceof Error
          ? err.message
          : "Impossible de dissocier cet utilisateur du client",
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const finalSlug = slug || defaultSlug;
      await mutateAsync({
        clientId: client.id,
        payload: { name, slug: finalSlug },
      });
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            Modifier
          </Button>
        }
      />
      <DialogContent showCloseButton className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Modifier le client</DialogTitle>
            <DialogDescription>
              Met à jour le nom et le slug utilisés dans l’interface et les URLs.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor={`edit-client-name-${client.id}`}>Nom</Label>
              <Input
                id={`edit-client-name-${client.id}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`edit-client-slug-${client.id}`}>Slug</Label>
              <Input
                id={`edit-client-slug-${client.id}`}
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder={defaultSlug}
              />
              <p className="text-xs text-muted-foreground">
                Laissez vide pour utiliser automatiquement :{' '}
                <span className="font-medium">{defaultSlug || '—'}</span>
              </p>
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <div className="grid gap-2">
              <Label>Utilisateurs rattachés</Label>
              {isLoadingUsers ? (
                <p className="text-xs text-muted-foreground">
                  Chargement des utilisateurs…
                </p>
              ) : clientUsers.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Aucun utilisateur rattaché à ce client pour le moment.
                </p>
              ) : (
                <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
                  {clientUsers.map((u) => (
                    <div
                      key={u.userId}
                      className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-muted/40 px-2 py-1.5 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium">
                          {u.firstName || u.lastName
                            ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim()
                            : u.email}
                        </div>
                        <div className="truncate text-[0.7rem] text-muted-foreground">
                          {u.email} — Rôle: {u.role}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => void handleDetachUser(u)}
                        aria-label="Dissocier cet utilisateur du client"
                      >
                        <XIcon className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {usersError && (
                <p className="text-xs text-destructive" role="alert">
                  {usersError}
                </p>
              )}
            </div>
          </div>

          <DialogFooter showCloseButton={false}>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

