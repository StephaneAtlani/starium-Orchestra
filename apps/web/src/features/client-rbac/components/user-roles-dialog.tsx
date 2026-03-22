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
      <DialogContent className="sm:max-w-md">
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
            <ul className="space-y-2 max-h-64 overflow-y-auto">
              {roles.map((role) => (
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
                    {role.name}
                    {role.isSystem && (
                      <span className="text-xs text-muted-foreground">
                        (Système)
                      </span>
                    )}
                  </label>
                </li>
              ))}
            </ul>
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
