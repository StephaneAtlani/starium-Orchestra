'use client';

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useRoles } from '../hooks/use-roles';
import { useUserRoles } from '../hooks/use-user-roles';
import { useUpdateUserRoles } from '../hooks/use-update-user-roles';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { useActiveClient } from '@/hooks/use-active-client';
import { PERMISSIONS_QUERY_KEY } from '@/hooks/use-permissions';
import { useAuth } from '@/context/auth-context';

export interface UserRolesDialogProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserRolesDialog({
  userId,
  open,
  onOpenChange,
}: UserRolesDialogProps) {
  const { data: roles = [], isLoading: rolesLoading, error: rolesError } = useRoles();
  const {
    data: userRoles = [],
    isLoading: userRolesLoading,
    error: userRolesError,
  } = useUserRoles(open ? userId : undefined);
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const { activeClient } = useActiveClient();
  const updateUserRoles = useUpdateUserRoles(userId);
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(new Set());

  const isLoading = rolesLoading || userRolesLoading;
  const error = rolesError ?? userRolesError;
  const globalRoles = roles.filter((role) => role.scope === 'GLOBAL');
  const clientRoles = roles.filter((role) => role.scope === 'CLIENT');

  useEffect(() => {
    if (userRoles.length >= 0) {
      setSelectedRoleIds(new Set(userRoles.map((r) => r.id)));
    }
  }, [userRoles]);

  const handleToggle = (roleId: string) => {
    setSelectedRoleIds((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) next.delete(roleId);
      else next.add(roleId);
      return next;
    });
  };

  const handleSubmit = () => {
    updateUserRoles.mutate(
      { roleIds: Array.from(selectedRoleIds) },
      {
        onSuccess: () => {
          const cid = activeClient?.id;
          if (cid && authUser?.id === userId) {
            void queryClient.invalidateQueries({
              queryKey: [...PERMISSIONS_QUERY_KEY, cid],
            });
          }
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Rôles de l&apos;utilisateur</DialogTitle>
          <DialogDescription>
            Cochez les rôles à assigner à cet utilisateur.
          </DialogDescription>
        </DialogHeader>
        {isLoading && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Chargement…
          </p>
        )}
        {error && !isLoading && (
          <div className="py-4">
            <p className="text-sm text-destructive mb-2">
              Impossible de charger les rôles de l&apos;utilisateur.
            </p>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fermer
            </Button>
          </div>
        )}
        {!isLoading && !error && (
          <>
            <Card size="sm" className="border border-border/70 bg-card shadow-sm">
              <CardContent className="space-y-4 p-3">
                {globalRoles.length > 0 && (
                  <section className="space-y-2">
                    <div className="flex items-center justify-between border-b border-border/70 pb-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Rôles globaux
                      </p>
                      <Badge variant="secondary">{globalRoles.length}</Badge>
                    </div>
                    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 max-h-56 overflow-y-auto pr-1">
                      {globalRoles.map((role) => (
                        <li key={role.id} className="flex items-center gap-2 text-sm min-w-0">
                          <input
                            type="checkbox"
                            id={`role-${role.id}`}
                            checked={selectedRoleIds.has(role.id)}
                            onChange={() => handleToggle(role.id)}
                            className="rounded border-input"
                          />
                          <label
                            htmlFor={`role-${role.id}`}
                            className={cn('cursor-pointer flex items-center gap-2 min-w-0')}
                          >
                            <span className="truncate">{role.name}</span>
                            <Badge variant="secondary">Global</Badge>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {clientRoles.length > 0 && (
                  <section className="space-y-2">
                    <div className="flex items-center justify-between border-b border-border/70 pb-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Rôles client
                      </p>
                      <Badge variant="outline">{clientRoles.length}</Badge>
                    </div>
                    <ul className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {clientRoles.map((role) => (
                        <li key={role.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            id={`role-${role.id}`}
                            checked={selectedRoleIds.has(role.id)}
                            onChange={() => handleToggle(role.id)}
                            className="rounded border-input"
                          />
                          <label
                            htmlFor={`role-${role.id}`}
                            className={cn('cursor-pointer flex items-center gap-2')}
                          >
                            <span>{role.name}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </CardContent>
            </Card>
            <DialogFooter showCloseButton={false}>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={updateUserRoles.isPending}
              >
                {updateUserRoles.isPending ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
