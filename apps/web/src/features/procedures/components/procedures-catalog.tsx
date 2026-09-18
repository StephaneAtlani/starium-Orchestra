'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StariumTableWrap } from '@/components/ui/starium-table-wrap';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { usePermissions } from '@/hooks/use-permissions';
import { useClientMembers } from '@/features/client-rbac/hooks/use-client-members';
import { toast } from '@/lib/toast';
import { displayLabel } from '@/lib/display-label';
import { createProcedure, listProcedures } from '../api/procedures.api';
import { procedureQueryKeys } from '../lib/procedure-query-keys';
import {
  procedureCategoryLabel,
  procedureStatusLabel,
} from '../lib/procedure-labels';
import { ProcedureCreateDialog } from './procedure-create-dialog';

export function ProceduresCatalog() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const { has } = usePermissions();
  const canCreate = has('procedures.create');
  const queryClient = useQueryClient();
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const membersQ = useClientMembers();

  const listQ = useQuery({
    queryKey: procedureQueryKeys.list(clientId),
    queryFn: () => listProcedures(authFetch, { limit: 50, offset: 0 }),
    enabled: Boolean(clientId),
  });

  const createMut = useMutation({
    mutationFn: (input: Parameters<typeof createProcedure>[1]) =>
      createProcedure(authFetch, input),
    onSuccess: async (created) => {
      toast.success('Procédure créée');
      setCreateOpen(false);
      await queryClient.invalidateQueries({
        queryKey: procedureQueryKeys.all(clientId),
      });
      router.push(`/procedures/${created.id}/edit`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {canCreate ? (
          <Button
            type="button"
            size="sm"
            className="min-h-11 sm:min-h-9"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="size-4" aria-hidden />
            Nouvelle procédure
          </Button>
        ) : null}
      </div>

      {listQ.isLoading ? <LoadingState rows={4} /> : null}
      {listQ.isError ? (
        <ErrorState
          message="Impossible de charger les procédures."
          onRetry={() => void listQ.refetch()}
        />
      ) : null}

      {listQ.isSuccess && listQ.data.items.length === 0 ? (
        <EmptyState
          title="Aucune procédure"
          description="Créez la première procédure du client actif pour démarrer la rédaction."
          action={
            canCreate ? (
              <Button type="button" onClick={() => setCreateOpen(true)}>
                Nouvelle procédure
              </Button>
            ) : undefined
          }
        />
      ) : null}

      {listQ.isSuccess && listQ.data.items.length > 0 ? (
        <>
          <div className="flex flex-col gap-3 md:hidden" role="list">
            {listQ.data.items.map((row) => (
              <Link
                key={row.id}
                href={`/procedures/${row.id}/edit`}
                className="starium-section block rounded-[var(--radius-lg)] border border-border/70 bg-card p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]"
                role="listitem"
              >
                <p className="text-sm font-semibold text-foreground">
                  {displayLabel(row.title, 'Procédure')}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {displayLabel(row.code, 'Sans code')} ·{' '}
                  {procedureStatusLabel(row.status)} ·{' '}
                  {procedureCategoryLabel(row.category)}
                </p>
                {row.ownerLabel ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Propriétaire : {displayLabel(row.ownerLabel, 'Non assigné')}
                  </p>
                ) : null}
              </Link>
            ))}
          </div>

          <StariumTableWrap className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Titre</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Propriétaire</TableHead>
                  <TableHead className="w-[1%]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {listQ.data.items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      {displayLabel(row.code, 'Sans code')}
                    </TableCell>
                    <TableCell>
                      {displayLabel(row.title, 'Procédure')}
                    </TableCell>
                    <TableCell>{procedureStatusLabel(row.status)}</TableCell>
                    <TableCell>{procedureCategoryLabel(row.category)}</TableCell>
                    <TableCell>
                      {row.ownerLabel
                        ? displayLabel(row.ownerLabel, 'Non assigné')
                        : 'Non assigné'}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/procedures/${row.id}/edit`}
                        className={cn(
                          buttonVariants({ variant: 'outline', size: 'sm' }),
                          'min-h-9',
                        )}
                      >
                        Ouvrir
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </StariumTableWrap>
        </>
      ) : null}

      <ProcedureCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        members={membersQ.data ?? []}
        membersLoading={membersQ.isLoading}
        isSubmitting={createMut.isPending}
        onSubmit={(values) => createMut.mutate(values)}
      />
    </div>
  );
}
