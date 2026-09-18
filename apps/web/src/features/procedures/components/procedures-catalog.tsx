'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FilePlus2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { usePermissions } from '@/hooks/use-permissions';
import { useClientMembers } from '@/features/client-rbac/hooks/use-client-members';
import { toast } from '@/lib/toast';
import { displayLabel } from '@/lib/display-label';
import { cn } from '@/lib/utils';
import { createProcedure, listProcedureCategories, listProcedures } from '../api/procedures.api';
import { procedureQueryKeys } from '../lib/procedure-query-keys';
import {
  procedureCategoryLabel,
  procedureStatusLabel,
} from '../lib/procedure-labels';
import type { ProcedureListItem, ProcedureStatusApi } from '../types/procedure.types';
import { ProcedureCreateDialog } from './procedure-create-dialog';

const PAGE_SIZE = 48;

type SegFilter = 'all' | 'PUBLISHED' | 'IN_REVIEW' | 'DRAFT';

const SEGMENTS: { id: SegFilter; label: string }[] = [
  { id: 'all', label: 'Toutes' },
  { id: 'PUBLISHED', label: 'Publiées' },
  { id: 'IN_REVIEW', label: 'En revue' },
  { id: 'DRAFT', label: 'Brouillons' },
];

function formatRelativeFr(iso: string): string {
  try {
    const d = new Date(iso);
    const diffMs = Date.now() - d.getTime();
    const days = Math.floor(diffMs / 86_400_000);
    if (days <= 0) return "aujourd'hui";
    if (days === 1) return 'hier';
    if (days < 7) return `il y a ${days} j`;
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return '—';
  }
}

function ownerInitials(label: string | null): string {
  if (!label?.trim()) return '?';
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
  }
  return label.slice(0, 2).toUpperCase();
}

function statusBadgeClass(status: ProcedureStatusApi): string {
  switch (status) {
    case 'PUBLISHED':
      return 'bg-[var(--state-success-bg)] text-[var(--state-success)]';
    case 'IN_REVIEW':
      return 'bg-[var(--state-warning-bg)] text-[var(--state-warning)]';
    case 'ARCHIVED':
      return 'bg-muted text-muted-foreground';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function ProcedureCard({ row }: { row: ProcedureListItem }) {
  const ver =
    row.displayVersionNumber ??
    row.publishedVersionNumber ??
    row.draftVersionNumber;
  const summary =
    row.description?.trim() ||
    'Aucune description — ouvrez la procédure pour rédiger.';
  return (
    <Link
      href={`/procedures/${row.id}/edit`}
      className={cn(
        'group flex min-h-[170px] flex-col rounded-[var(--radius-lg)] border border-border/70 bg-card p-[18px_20px]',
        'transition-[box-shadow,transform] duration-[var(--duration-fast)]',
        'hover:-translate-y-px hover:shadow-[var(--shadow-2)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.06em] text-muted-foreground">
            {procedureCategoryLabel(row.category)}
          </p>
          <h3 className="mt-1 text-[15.5px] font-extrabold leading-snug text-foreground">
            {displayLabel(row.title, 'Procédure sans titre')}
          </h3>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-[var(--radius-pill)] px-2.5 py-1 text-[11px] font-bold',
            statusBadgeClass(row.status),
          )}
        >
          {procedureStatusLabel(row.status)}
        </span>
      </div>
      <p className="mt-2 line-clamp-2 flex-1 text-[12.5px] text-muted-foreground">
        {summary}
      </p>
      <div className="mt-3 flex items-center gap-2 border-t border-border/60 pt-3 text-[12px] text-muted-foreground">
        <span
          className="inline-flex size-6 items-center justify-center rounded-full bg-[var(--brand-ink)] text-[9px] font-extrabold text-[var(--brand-gold)]"
          title={displayLabel(row.ownerLabel, 'Non assigné')}
          aria-label={displayLabel(row.ownerLabel, 'Non assigné')}
        >
          {ownerInitials(row.ownerLabel)}
        </span>
        <span className="tabular-nums">
          {ver != null ? `v${ver}` : 'v—'}
        </span>
        <span className="ml-auto tabular-nums">
          {row.blockCount ?? 0} bloc{(row.blockCount ?? 0) > 1 ? 's' : ''} ·{' '}
          {formatRelativeFr(row.updatedAt)}
        </span>
      </div>
    </Link>
  );
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
  const [seg, setSeg] = useState<SegFilter>('all');
  const [offset, setOffset] = useState(0);

  const filters = useMemo(
    () => ({
      status: seg === 'all' ? undefined : seg,
      limit: PAGE_SIZE,
      offset,
    }),
    [seg, offset],
  );

  const listQ = useQuery({
    queryKey: procedureQueryKeys.list(clientId, filters),
    queryFn: () =>
      listProcedures(authFetch, {
        limit: filters.limit,
        offset: filters.offset,
        status: filters.status,
      }),
    enabled: Boolean(clientId),
  });

  const categoriesQ = useQuery({
    queryKey: procedureQueryKeys.categories(clientId, true),
    queryFn: () => listProcedureCategories(authFetch, { activeOnly: true }),
    enabled: Boolean(clientId) && createOpen,
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11 sm:min-h-9"
          disabled
          title="Bientôt disponible"
        >
          Exporter le recueil
        </Button>
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

      <div
        className="inline-flex w-fit flex-wrap gap-0.5 rounded-[var(--radius-pill)] border-[1.5px] border-border bg-card p-1"
        role="group"
        aria-label="Filtrer par statut"
      >
        {SEGMENTS.map((s) => {
          const on = seg === s.id;
          return (
            <button
              key={s.id}
              type="button"
              className={cn(
                'min-h-11 rounded-[var(--radius-pill)] px-3.5 text-[12.5px] font-bold sm:min-h-9',
                on
                  ? 'bg-[var(--brand-ink)] text-white'
                  : 'text-foreground hover:bg-muted',
              )}
              aria-pressed={on}
              onClick={() => {
                setSeg(s.id);
                setOffset(0);
              }}
            >
              {s.label}
            </button>
          );
        })}
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
          description={
            seg !== 'all'
              ? 'Aucun résultat pour ce filtre.'
              : 'Créez la première procédure du client actif pour démarrer la rédaction.'
          }
          action={
            canCreate && seg === 'all' ? (
              <Button type="button" onClick={() => setCreateOpen(true)}>
                Nouvelle procédure
              </Button>
            ) : undefined
          }
        />
      ) : null}

      {listQ.isSuccess &&
      (listQ.data.items.length > 0 || canCreate) ? (
        <div
          className="grid grid-cols-1 gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr))]"
          role="list"
        >
          {listQ.data.items.map((row) => (
            <div key={row.id} role="listitem">
              <ProcedureCard row={row} />
            </div>
          ))}
          {canCreate ? (
            <button
              type="button"
              role="listitem"
              onClick={() => setCreateOpen(true)}
              className={cn(
                'flex min-h-[170px] flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)]',
                'border-[1.5px] border-dashed border-border bg-transparent p-5 text-center',
                'hover:border-[var(--brand-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]',
              )}
            >
              <FilePlus2
                className="size-[26px] text-muted-foreground"
                aria-hidden
              />
              <span className="text-sm font-bold text-foreground">
                Nouvelle procédure
              </span>
              <span className="text-xs text-muted-foreground">
                Page vierge ou à partir d&apos;un modèle
              </span>
            </button>
          ) : null}
        </div>
      ) : null}

      {listQ.isSuccess && total > PAGE_SIZE ? (
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
      ) : null}

      <ProcedureCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        members={membersQ.data ?? []}
        membersLoading={membersQ.isLoading}
        categories={categoriesQ.data ?? []}
        categoriesLoading={categoriesQ.isLoading}
        isSubmitting={createMut.isPending}
        onSubmit={(values) => createMut.mutate(values)}
      />
    </div>
  );
}
