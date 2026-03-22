'use client';

import React from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { buttonVariants } from '@/components/ui/button';
import { useRoles } from '../hooks/use-roles';
import { useDeleteRole } from '../hooks/use-delete-role';
import type { RoleListItem } from '../types';
import { Pencil, KeyRound, Trash2 } from 'lucide-react';

function RoleActions({
  role,
  canDelete,
  deleteTooltip,
  onDelete,
}: {
  role: RoleListItem;
  canDelete: boolean;
  deleteTooltip: string;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/client/roles/${role.id}`}
        className={buttonVariants({ variant: 'ghost', size: 'sm' })}
      >
        <Pencil className="size-4" />
        <span className="sr-only">Modifier</span>
      </Link>
      <Link
        href={`/client/roles/${role.id}`}
        className={buttonVariants({ variant: 'ghost', size: 'sm' })}
      >
        <KeyRound className="size-4" />
        <span className="sr-only">Permissions</span>
      </Link>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger render={<span className="inline-block" />}>
            <Button
              asChild
              variant="ghost"
              size="sm"
              disabled={!canDelete}
              onClick={() => onDelete(role.id)}
              className="text-destructive hover:text-destructive"
            >
              <span>
                <Trash2 className="size-4" />
                <span className="sr-only">Supprimer</span>
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>{deleteTooltip}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

export function RolesList() {
  const { data: roles = [], isLoading, error, refetch } = useRoles();
  const deleteRole = useDeleteRole();

  return (
    <PageContainer>
      <PageHeader
        title="Rôles"
        description="Gérez les rôles et permissions du client."
        actions={
          <Link
            href="/client/roles/new"
            className={buttonVariants()}
          >
            Créer un rôle
          </Link>
        }
      />
      <Card>
        <CardContent className="pt-4">
          {isLoading && (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Chargement…
            </p>
          )}
          {error && (
            <div className="py-8 text-center">
              <p className="text-sm text-destructive mb-2">
                Erreur lors du chargement des rôles.
              </p>
              <Button variant="outline" size="sm" onClick={() => void refetch()}>
                Réessayer
              </Button>
            </div>
          )}
          {!isLoading && !error && roles.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Aucun rôle. Créez un rôle pour commencer.
            </p>
          )}
          {!isLoading && !error && roles.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => {
                  const isSystem = role.isSystem;
                  const canDelete = !isSystem;
                  const deleteTooltip = isSystem
                    ? 'Impossible de supprimer un rôle système.'
                    : canDelete
                      ? 'Supprimer le rôle'
                      : 'Impossible de supprimer : rôle encore assigné à au moins un utilisateur.';
                  return (
                    <TableRow key={role.id}>
                      <TableCell>
                        <span className="font-medium">{role.name}</span>
                        {role.isSystem && (
                          <Badge variant="secondary" className="ml-2">
                            Système
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">
                        {role.description ?? '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <RoleActions
                          role={role}
                          canDelete={canDelete}
                          deleteTooltip={deleteTooltip}
                          onDelete={(id) => deleteRole.mutate(id)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
