'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  AdminClientSummary,
  AdminClientUserSummary,
} from '../types/admin-studio.types';
import { useUpdateClientMutation } from '../hooks/use-clients-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { getClientUsers } from '../api/get-client-users';
import { getHumanResourcesCatalogForClient } from '../api/get-human-resources-catalog';
import { patchPlatformClientUserHumanResource } from '../api/patch-platform-client-user-human-resource';
import { PencilIcon, XIcon } from 'lucide-react';

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
  const [hrDraftByUser, setHrDraftByUser] = useState<Record<string, string>>({});

  const { mutateAsync, isPending } = useUpdateClientMutation();
  const authenticatedFetch = useAuthenticatedFetch();

  const catalogQ = useQuery({
    queryKey: ['admin-studio', 'human-catalog', client.id, open],
    queryFn: () => getHumanResourcesCatalogForClient(authenticatedFetch, client.id),
    enabled: open && !!client.id,
    staleTime: 60_000,
  });

  const linkMutation = useMutation({
    mutationFn: (args: { userId: string; humanResourceId: string | null }) =>
      patchPlatformClientUserHumanResource(authenticatedFetch, client.id, args.userId, {
        humanResourceId: args.humanResourceId,
      }),
    onSuccess: (updated, variables) => {
      setClientUsers((prev) =>
        prev.map((row) =>
          row.userId === variables.userId
            ? {
                ...row,
                humanResourceSummary: updated.humanResourceSummary ?? null,
              }
            : row,
        ),
      );
      setHrDraftByUser((d) => ({
        ...d,
        [variables.userId]: updated.humanResourceSummary?.resourceId ?? '__none__',
      }));
    },
  });

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

  useEffect(() => {
    if (!open || clientUsers.length === 0) {
      setHrDraftByUser({});
      return;
    }
    const next: Record<string, string> = {};
    for (const u of clientUsers) {
      next[u.userId] = u.humanResourceSummary?.resourceId ?? '__none__';
    }
    setHrDraftByUser(next);
  }, [open, clientUsers]);

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
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-foreground"
            aria-label="Modifier le client"
          >
            <PencilIcon className="size-4" />
          </Button>
        }
      />
      <DialogContent showCloseButton className="sm:max-w-lg">
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
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {catalogQ.isError ? (
                    <p className="text-xs text-destructive">
                      Impossible de charger le catalogue Humain (lien membre).
                    </p>
                  ) : null}
                  {clientUsers.map((u) => {
                    const draft = hrDraftByUser[u.userId] ?? '__none__';
                    const initialId = u.humanResourceSummary?.resourceId ?? null;
                    const targetId = draft === '__none__' ? null : draft;
                    const unchanged = (initialId ?? null) === (targetId ?? null);
                    const catalogItems = catalogQ.data?.items ?? [];
                    return (
                      <div
                        key={u.userId}
                        className="space-y-2 rounded-md border border-border/60 bg-muted/40 px-2 py-2 text-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate font-medium">
                              {u.firstName || u.lastName
                                ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim()
                                : u.email}
                            </div>
                            <div className="truncate text-[0.7rem] text-muted-foreground">
                              {u.email} — Rôle: {u.role}
                            </div>
                            <div className="mt-1 truncate text-[0.7rem] text-muted-foreground">
                              Fiche liée :{' '}
                              <span className="font-medium text-foreground">
                                {u.humanResourceSummary?.displayName ?? '—'}
                              </span>
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
                        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
                          <Select
                            value={draft}
                            onValueChange={(v) =>
                              setHrDraftByUser((prev) => ({
                                ...prev,
                                [u.userId]: v ?? '__none__',
                              }))
                            }
                            disabled={catalogQ.isLoading || linkMutation.isPending}
                          >
                            <SelectTrigger className="h-8 w-full min-w-0 flex-1 text-left text-[0.7rem]">
                              <SelectValue placeholder="Choisir une fiche Humaine" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Aucune fiche (délier)</SelectItem>
                              {u.humanResourceSummary?.resourceId &&
                              !catalogItems.some(
                                (item) => item.id === u.humanResourceSummary?.resourceId,
                              ) ? (
                                <SelectItem value={u.humanResourceSummary.resourceId}>
                                  {u.humanResourceSummary.displayName}
                                </SelectItem>
                              ) : null}
                              {catalogItems.map((item) => (
                                <SelectItem key={item.id} value={item.id}>
                                  {item.displayName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="h-8 shrink-0 text-[0.65rem]"
                            disabled={
                              unchanged || linkMutation.isPending || catalogQ.isLoading
                            }
                            onClick={() =>
                              void linkMutation.mutateAsync({
                                userId: u.userId,
                                humanResourceId: targetId,
                              })
                            }
                          >
                            {linkMutation.isPending ? '…' : 'Appliquer lien'}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
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

