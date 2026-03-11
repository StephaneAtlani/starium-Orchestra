'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useClientsQuery } from '../hooks/use-clients-query';
import type { AdminPlatformUserSummary } from '../types/admin-studio.types';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PencilIcon } from 'lucide-react';

type ClientRole = 'CLIENT_ADMIN' | 'CLIENT_USER';

interface UserClientAssignment {
  clientId: string;
  role: ClientRole;
}

interface UserClientsResponse {
  assignments?: UserClientAssignment[];
  clientIds?: string[];
}

export function ManageUserClientsDialog({
  user,
}: {
  user: AdminPlatformUserSummary;
}) {
  const [open, setOpen] = useState(false);
  const [assignments, setAssignments] = useState<UserClientAssignment[]>([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const { data: clients = [] } = useClientsQuery();
  const authenticatedFetch = useAuthenticatedFetch();

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q),
    );
  }, [clients, search]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);
    setIsLoadingAssignments(true);
    (async () => {
      try {
        const res = await authenticatedFetch(
          `/api/platform/users/${user.id}/clients`,
        );
        if (!res.ok) {
          throw new Error(
            "Impossible de charger les clients associés à cet utilisateur",
          );
        }
        const json = (await res.json()) as UserClientsResponse;
        if (!cancelled) {
          if (Array.isArray(json.assignments)) {
            setAssignments(json.assignments);
          } else if (Array.isArray(json.clientIds)) {
            setAssignments(
              json.clientIds.map((id) => ({
                clientId: id,
                role: 'CLIENT_USER',
              })),
            );
          } else {
            setAssignments([]);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Erreur lors du chargement des associations',
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingAssignments(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, authenticatedFetch, user.id]);

  function toggleClient(clientId: string) {
    setAssignments((prev) => {
      const existing = prev.find((a) => a.clientId === clientId);
      if (existing) {
        return prev.filter((a) => a.clientId !== clientId);
      }
      return [...prev, { clientId, role: 'CLIENT_USER' }];
    });
  }

  function updateRole(clientId: string, role: ClientRole) {
    setAssignments((prev) => {
      const existing = prev.find((a) => a.clientId === clientId);
      if (!existing) {
        return [...prev, { clientId, role }];
      }
      return prev.map((a) =>
        a.clientId === clientId ? { ...a, role } : a,
      );
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      const res = await authenticatedFetch(
        `/api/platform/users/${user.id}/clients`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ assignments }),
        },
      );
      if (!res.ok) {
        throw new Error(
          "Impossible d'enregistrer les associations utilisateur / client",
        );
      }
      setOpen(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors de l'enregistrement des associations",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-foreground"
            aria-label="Gérer les clients de cet utilisateur"
          >
            <PencilIcon className="size-4" />
          </Button>
        }
      />
      <DialogContent showCloseButton className="sm:max-w-md">
        <form onSubmit={handleSave}>
          <DialogHeader>
            <DialogTitle>Associer des clients</DialogTitle>
            <DialogDescription>
              Sélectionnez les clients et le rôle (client admin ou utilisateur
              simple) pour lesquels{' '}
              <span className="font-medium">
                {user.firstName || user.lastName || user.email}
              </span>{' '}
              doit être associé.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-4">
            <div className="space-y-3">
              <Input
                placeholder="Filtrer les clients (nom, slug, id)…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 text-xs"
              />
              {isLoadingAssignments ? (
                <p className="text-sm text-muted-foreground">
                  Chargement des clients…
                </p>
              ) : clients.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucun client disponible. Créez d&apos;abord un client.
                </p>
              ) : filteredClients.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucun client ne correspond à ce filtre.
                </p>
              ) : (
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1 text-sm">
                  {filteredClients.map((client) => {
                    const current = assignments.find(
                      (a) => a.clientId === client.id,
                    );
                    const checked = !!current;
                    return (
                      <div
                        key={client.id}
                        className="flex flex-col gap-2 rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-sm hover:bg-muted"
                      >
                        <label className="flex items-center justify-between gap-3 cursor-pointer">
                          <div className="min-w-0">
                            <div className="truncate font-medium">
                              {client.name}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">
                              {client.slug}
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-input text-primary"
                            checked={checked}
                            onChange={() => toggleClient(client.id)}
                          />
                        </label>
                        <div className="flex flex-col gap-1">
                          <span className="text-right text-[0.7rem] text-muted-foreground">
                            Rôle pour ce client
                          </span>
                          <Select
                            value={current?.role ?? 'CLIENT_USER'}
                            onValueChange={(value) =>
                              updateRole(client.id, value as ClientRole)
                            }
                            disabled={!checked}
                          >
                            <SelectTrigger
                              size="sm"
                              className="w-full justify-between text-xs"
                            >
                              <SelectValue placeholder="Choisir un rôle" />
                            </SelectTrigger>
                            <SelectContent side="bottom" align="start">
                              <SelectItem value="CLIENT_USER">
                                Client user
                              </SelectItem>
                              <SelectItem value="CLIENT_ADMIN">
                                Client admin
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>

          <DialogFooter showCloseButton={false}>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSaving}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isSaving || isLoadingAssignments}>
              {isSaving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

