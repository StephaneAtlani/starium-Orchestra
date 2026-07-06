'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RegistryBadge } from '@/lib/ui/registry-badge';
import { DataTable } from '@/components/data-table/data-table';
import type { DataTableColumn } from '@/components/data-table/data-table';
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
import { Pencil, Trash2 } from 'lucide-react';

function RoleActions({
  role,
  readOnly,
  canDelete,
  deleteTooltip,
  onDelete,
}: {
  role: RoleListItem;
  readOnly: boolean;
  canDelete: boolean;
  deleteTooltip: string;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {!readOnly && (
        <Link
          href={`/client/roles/${role.id}`}
          className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'min-h-11' })}
        >
          <Pencil className="size-4" />
          <span className="sr-only">Modifier</span>
        </Link>
      )}
      {canDelete && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger render={<span className="inline-block" />}>
              <Button
                asChild
                variant="ghost"
                size="sm"
                onClick={() => onDelete(role.id)}
                className="min-h-11 text-destructive hover:text-destructive"
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
      )}
    </div>
  );
}

export function RolesList() {
  const { data: roles = [], isLoading, error, refetch } = useRoles();
  const deleteRole = useDeleteRole();

  const columns = useMemo<DataTableColumn<RoleListItem>[]>(
    () => [
      {
        key: 'name',
        header: 'Nom',
        mobilePriority: 'primary',
        cell: (role) => (
          <>
            <span className="font-medium">{role.name}</span>
            {role.scope === 'GLOBAL' && (
              <RegistryBadge className="ml-2 bg-secondary text-secondary-foreground">
                Global
              </RegistryBadge>
            )}
          </>
        ),
      },
      {
        key: 'description',
        header: 'Description',
        mobilePriority: 'secondary',
        cell: (role) => (
          <span className="whitespace-normal break-words text-muted-foreground">
            {role.description ?? '—'}
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        mobilePriority: 'actions',
        cell: (role) => {
          const isReadOnly =
            role.isReadOnly || role.isInherited || role.scope === 'GLOBAL';
          const canDelete = !isReadOnly;
          const deleteTooltip = isReadOnly
            ? 'Rôle global hérité : suppression impossible dans le contexte client.'
            : canDelete
              ? 'Supprimer le rôle'
              : 'Impossible de supprimer : rôle encore assigné à au moins un utilisateur.';
          return (
            <RoleActions
              role={role}
              readOnly={isReadOnly}
              canDelete={canDelete}
              deleteTooltip={deleteTooltip}
              onDelete={(id) => deleteRole.mutate(id)}
            />
          );
        },
      },
    ],
    [deleteRole],
  );

  return (
    <PageContainer>
      <PageHeader
        title="Rôles"
        description="Gérez les rôles et permissions du client."
        actions={
          <Link href="/client/roles/new" className={buttonVariants({ className: 'w-full sm:w-auto' })}>
            Créer un rôle
          </Link>
        }
      />
      <Card>
        <CardContent className="pt-4">
          <DataTable
            columns={columns}
            data={roles}
            isLoading={isLoading}
            error={error ?? null}
            onRetry={() => void refetch()}
            getRowId={(role) => role.id}
            mobileCardsAriaLabel="Liste des rôles client"
            emptyTitle="Aucun rôle"
            emptyDescription="Créez un rôle pour commencer."
          />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
