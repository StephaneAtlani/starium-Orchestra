'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { FilterBar } from '@/components/layout/filter-bar';
import { FilterBarField } from '@/components/layout/filter-bar-field';
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
  PROCEDURE_CATEGORY_LABELS,
  PROCEDURE_STATUS_LABELS,
  procedureCategoryLabel,
  procedureStatusLabel,
} from '../lib/procedure-labels';
import type {
  ProcedureCategoryApi,
  ProcedureStatusApi,
} from '../types/procedure.types';
import { ProcedureCreateDialog } from './procedure-create-dialog';

const PAGE_SIZE = 20;

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return '—';
  }
}

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

  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string>('__all__');
  const [category, setCategory] = useState<string>('__all__');
  const [offset, setOffset] = useState(0);

  const filters = useMemo(
    () => ({
      q: q || undefined,
      status:
        status !== '__all__' && status !== 'ARCHIVED'
          ? status
          : status === 'ARCHIVED'
            ? 'ARCHIVED'
            : undefined,
      category: category !== '__all__' ? category : undefined,
      includeArchived: status === 'ARCHIVED' || status === '__all_inc__',
      limit: PAGE_SIZE,
      offset,
    }),
    [q, status, category, offset],
  );

  const listQ = useQuery({
    queryKey: procedureQueryKeys.list(clientId, filters),
    queryFn: () =>
      listProcedures(authFetch, {
        limit: filters.limit,
        offset: filters.offset,
        q: filters.q,
        status: filters.status,
        category: filters.category,
        includeArchived:
          status === '__all_inc__' || status === 'ARCHIVED' || undefined,
      }),
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

  const total = listQ.data?.total ?? 0;
  const canPrev = offset > 0;
  const canNext = offset + PAGE_SIZE < total;

  const applySearch = () => {
    setOffset(0);
    setQ(qInput.trim());
  };

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

      <FilterBar asSearch aria-label="Filtres procédures" desktopColumns={4}>
        <FilterBarField id="procedures-q" label="Recherche">
          {({ controlId }) => (
            <div className="flex gap-2">
              <Input
                id={controlId}
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    applySearch();
                  }
                }}
                placeholder="Code ou titre"
                className="min-h-11"
              />
              <Button
                type="button"
                variant="outline"
                className="min-h-11 shrink-0"
                onClick={applySearch}
              >
                Filtrer
              </Button>
            </div>
          )}
        </FilterBarField>

        <FilterBarField id="procedures-status" label="Statut">
          {({ controlId }) => {
            const statusLabel =
              status === '__all__'
                ? 'Actives (hors archivées)'
                : status === '__all_inc__'
                  ? 'Toutes (y compris archivées)'
                  : PROCEDURE_STATUS_LABELS[status as ProcedureStatusApi] ??
                    'Statut';
            return (
              <Select
                value={status}
                onValueChange={(v) => {
                  setStatus(v ?? '__all__');
                  setOffset(0);
                }}
              >
                <SelectTrigger id={controlId} className="min-h-11 w-full">
                  <SelectValue placeholder="Statut">{statusLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Actives (hors archivées)</SelectItem>
                  <SelectItem value="__all_inc__">
                    Toutes (y compris archivées)
                  </SelectItem>
                  {(
                    Object.keys(PROCEDURE_STATUS_LABELS) as ProcedureStatusApi[]
                  ).map((s) => (
                    <SelectItem key={s} value={s}>
                      {PROCEDURE_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          }}
        </FilterBarField>

        <FilterBarField id="procedures-category" label="Catégorie">
          {({ controlId }) => {
            const categoryLabel =
              category === '__all__'
                ? 'Toutes'
                : PROCEDURE_CATEGORY_LABELS[category as ProcedureCategoryApi] ??
                  'Catégorie';
            return (
              <Select
                value={category}
                onValueChange={(v) => {
                  setCategory(v ?? '__all__');
                  setOffset(0);
                }}
              >
                <SelectTrigger id={controlId} className="min-h-11 w-full">
                  <SelectValue placeholder="Catégorie">
                    {categoryLabel}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Toutes</SelectItem>
                  {(
                    Object.keys(
                      PROCEDURE_CATEGORY_LABELS,
                    ) as ProcedureCategoryApi[]
                  ).map((c) => (
                    <SelectItem key={c} value={c}>
                      {PROCEDURE_CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          }}
        </FilterBarField>
      </FilterBar>

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
          description={
            q || status !== '__all__' || category !== '__all__'
              ? 'Aucun résultat pour ces filtres.'
              : 'Créez la première procédure du client actif pour démarrer la rédaction.'
          }
          action={
            canCreate && !q && status === '__all__' && category === '__all__' ? (
              <Button type="button" onClick={() => setCreateOpen(true)}>
                Nouvelle procédure
              </Button>
            ) : undefined
          }
        />
      ) : null}

      {listQ.isSuccess && listQ.data.items.length > 0 ? (
        <>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {total} procédure{total > 1 ? 's' : ''}
          </p>

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
                <p className="mt-1 text-xs text-muted-foreground">
                  Publiée :{' '}
                  {row.publishedVersionNumber != null
                    ? `v${row.publishedVersionNumber} (${formatDate(row.publishedAt)})`
                    : '—'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  MAJ {formatDate(row.updatedAt)}
                  {row.ownerLabel
                    ? ` · ${displayLabel(row.ownerLabel, 'Non assigné')}`
                    : ''}
                </p>
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
                  <TableHead>Version publiée</TableHead>
                  <TableHead>Propriétaire</TableHead>
                  <TableHead>Mise à jour</TableHead>
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
                    <TableCell className="tabular-nums">
                      {row.publishedVersionNumber != null
                        ? `v${row.publishedVersionNumber} · ${formatDate(row.publishedAt)}`
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {row.ownerLabel
                        ? displayLabel(row.ownerLabel, 'Non assigné')
                        : 'Non assigné'}
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {formatDate(row.updatedAt)}
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

          <div className="starium-table-footer flex flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-11 sm:min-h-9"
              disabled={!canPrev}
              onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
            >
              Précédent
            </Button>
            <span className="text-sm text-muted-foreground tabular-nums">
              {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} / {total}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-11 sm:min-h-9"
              disabled={!canNext}
              onClick={() => setOffset((o) => o + PAGE_SIZE)}
            >
              Suivant
            </Button>
          </div>
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
