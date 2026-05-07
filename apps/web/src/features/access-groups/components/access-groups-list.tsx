'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
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
import { useAccessGroups } from '../hooks/use-access-groups';
import { useDeleteAccessGroup } from '../hooks/use-delete-access-group';
import { CreateGroupDialog } from './create-group-dialog';
import type { AccessGroupListItem } from '../api/access-groups';
import { Pencil, Trash2 } from 'lucide-react';
import { useActiveClient } from '@/hooks/use-active-client';

function GroupActions({
  group,
  onDelete,
  canWrite,
}: {
  group: AccessGroupListItem;
  onDelete: (id: string) => void;
  canWrite: boolean;
}) {
  return (
    <div className="flex items-center justify-end gap-2">
      <Link
        href={`/client/administration/access-groups/${group.id}`}
        className={buttonVariants({ variant: 'ghost', size: 'sm' })}
      >
        <Pencil className="size-4" />
        <span className="sr-only">Modifier / membres</span>
      </Link>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger render={<span className="inline-block" />}>
            <Button
              variant="ghost"
              size="sm"
              disabled={!canWrite}
              onClick={() => {
                if (
                  typeof window !== 'undefined' &&
                  window.confirm(
                    `Supprimer le groupe « ${group.name} » ? Les rattachements membres seront retirés.`,
                  )
                ) {
                  onDelete(group.id);
                }
              }}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="size-4" />
              <span className="sr-only">Supprimer</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Supprimer le groupe</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

export function AccessGroupsList() {
  const [createOpen, setCreateOpen] = useState(false);
  const { data: groups = [], isLoading, error, refetch } = useAccessGroups();
  const deleteGroup = useDeleteAccessGroup();
  const { activeClient } = useActiveClient();
  const canWrite = activeClient?.role === 'CLIENT_ADMIN';

  return (
    <PageContainer>
      <PageHeader
        title="Groupes d'accès"
        description="Regroupez des utilisateurs pour cibler visibilité et ACL (évolutions futures)."
        actions={
          <Button type="button" onClick={() => setCreateOpen(true)} disabled={!canWrite}>
            Créer un groupe
          </Button>
        }
      />
      <p className="mb-3 text-xs text-muted-foreground">
        Dépendance RBAC : aucun code permission dédié `access-groups` exposé côté API ;
        l&apos;UI applique donc un verrouillage en écriture basé sur le rôle
        `CLIENT_ADMIN`, le backend restant source de vérité.
      </p>
      <CreateGroupDialog open={createOpen} onOpenChange={setCreateOpen} />
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
                Erreur lors du chargement des groupes.
              </p>
              <Button variant="outline" size="sm" onClick={() => void refetch()}>
                Réessayer
              </Button>
            </div>
          )}
          {!isLoading && !error && groups.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Aucun groupe. Créez un groupe pour commencer.
            </p>
          )}
          {!isLoading && !error && groups.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead className="text-right">Membres</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell>
                      <Link
                        href={`/client/administration/access-groups/${group.id}`}
                        className="font-medium hover:underline"
                      >
                        {group.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {group.memberCount}
                    </TableCell>
                    <TableCell className="text-right">
                      <GroupActions
                        group={group}
                        canWrite={canWrite}
                        onDelete={(id) => deleteGroup.mutate(id)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
