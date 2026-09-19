'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { createProcedure, listActiveProcedureTemplates, listProcedureCategories, listProcedures } from '../api/procedures.api';
import { procedureQueryKeys } from '../lib/procedure-query-keys';
import {
  procedureCategoryLabel,
  procedureStatusLabel,
} from '../lib/procedure-labels';
import type { ProcedureListItem, ProcedureStatusApi } from '../types/procedure.types';
import { ProcedureCreateDialog } from './procedure-create-dialog';

const PAGE_SIZE = 48;
const ALL_CATEGORIES = '__all__';

type SegFilter =
  | 'all'
  | 'PUBLISHED'
  | 'PENDING_VALIDATION'
  | 'IN_REVIEW'
  | 'DRAFT';

const SEGMENTS: { id: SegFilter; label: string }[] = [
  { id: 'all', label: 'Toutes' },
  { id: 'PUBLISHED', label: 'Publiées' },
  { id: 'PENDING_VALIDATION', label: 'En validation' },
  { id: 'IN_REVIEW', label: 'En relecture' },
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
      return 'starium-ds-badge--success';
    case 'IN_REVIEW':
    case 'PENDING_VALIDATION':
      return 'starium-ds-badge--warn';
    case 'ARCHIVED':
      return 'starium-ds-badge--neutral';
    default:
      return 'starium-ds-badge--neutral';
  }
}

function ProcedureCard({ row }: { row: ProcedureListItem }) {
  const ver = row.publishedVersionLabel;
  const summary =
    row.description?.trim() ||
    'Aucune description — ouvrez la procédure pour rédiger.';
  const owner = displayLabel(row.ownerLabel, 'Non assigné');
  return (
    <Link href={`/procedures/${row.id}/edit`} className="pr-card" role="listitem">
      <div className="pr-card-top">
        <div className="min-w-0">
          <div className="pr-cat">{procedureCategoryLabel(row.category)}</div>
          <h3>{displayLabel(row.title, 'Procédure sans titre')}</h3>
        </div>
        <span className={cn('starium-ds-badge shrink-0', statusBadgeClass(row.status))}>
          {procedureStatusLabel(row.status)}
        </span>
      </div>
      <p className="pr-card-sum">{summary}</p>
      <div className="pr-card-foot">
        <span className="pr-av" title={owner} aria-label={owner}>
          {ownerInitials(row.ownerLabel)}
        </span>
        <span className="tabular-nums">{ver ?? 'Brouillon'}</span>
        <span className="sp" aria-hidden />
        <span className="tabular-nums">
          {row.blockCount ?? 0} bloc{(row.blockCount ?? 0) > 1 ? 's' : ''} ·{' '}
          {formatRelativeFr(row.updatedAt)}
        </span>
      </div>
    </Link>
  );
}

export function ProceduresCatalogHeaderActions({
  canCreate,
  onCreate,
}: {
  canCreate: boolean;
  onCreate: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="min-h-11 sm:min-h-9"
        disabled
        title="Bientôt disponible"
      >
        <Download className="size-4" aria-hidden />
        Exporter le recueil
      </Button>
      {canCreate ? (
        <Button
          type="button"
          size="sm"
          className="min-h-11 sm:min-h-9"
          onClick={onCreate}
        >
          <Plus className="size-4" aria-hidden />
          Nouvelle procédure
        </Button>
      ) : null}
    </div>
  );
}

export function ProceduresCatalog({
  createOpen,
  onCreateOpenChange,
}: {
  createOpen?: boolean;
  onCreateOpenChange?: (open: boolean) => void;
} = {}) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const { has } = usePermissions();
  const canCreate = has('procedures.create');
  const queryClient = useQueryClient();
  const router = useRouter();
  const [internalCreateOpen, setInternalCreateOpen] = useState(false);
  const createDialogOpen = createOpen ?? internalCreateOpen;
  const setCreateDialogOpen = onCreateOpenChange ?? setInternalCreateOpen;
  const membersQ = useClientMembers();
  const [seg, setSeg] = useState<SegFilter>('all');
  const [categoryId, setCategoryId] = useState('');
  const [offset, setOffset] = useState(0);

  const filters = useMemo(
    () => ({
      status: seg === 'all' ? undefined : seg,
      categoryId: categoryId || undefined,
      limit: PAGE_SIZE,
      offset,
    }),
    [seg, categoryId, offset],
  );

  const listQ = useQuery({
    queryKey: procedureQueryKeys.list(clientId, filters),
    queryFn: () =>
      listProcedures(authFetch, {
        limit: filters.limit,
        offset: filters.offset,
        status: filters.status,
        categoryId: filters.categoryId,
      }),
    enabled: Boolean(clientId),
  });

  const categoriesQ = useQuery({
    queryKey: procedureQueryKeys.categories(clientId, true),
    queryFn: () => listProcedureCategories(authFetch, { activeOnly: true }),
    enabled: Boolean(clientId),
  });

  const templatesQ = useQuery({
    queryKey: [...procedureQueryKeys.templates(clientId), 'active'],
    queryFn: () => listActiveProcedureTemplates(authFetch),
    enabled: Boolean(clientId) && createDialogOpen && canCreate,
  });

  const createMut = useMutation({
    mutationFn: (input: Parameters<typeof createProcedure>[1]) =>
      createProcedure(authFetch, input),
    onSuccess: async (created) => {
      toast.success('Procédure créée');
      setCreateDialogOpen(false);
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
  const categories = categoriesQ.data ?? [];
  const selectedCategory = categories.find((c) => c.id === categoryId);
  const hasActiveFilter = seg !== 'all' || Boolean(categoryId);

  return (
    <div className="flex flex-col gap-4">
      <div className="pr-filters">
        <div className="pr-seg" role="group" aria-label="Filtrer par statut">
          {SEGMENTS.map((s) => {
            const on = seg === s.id;
            return (
              <button
                key={s.id}
                type="button"
                className={on ? 'on' : undefined}
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

        <div className="pr-cat-filter min-w-0 sm:ml-auto">
          <label htmlFor="pr-filter-category" className="sr-only">
            Filtrer par catégorie
          </label>
          <Select
            value={categoryId || ALL_CATEGORIES}
            onValueChange={(v) => {
              setCategoryId(!v || v === ALL_CATEGORIES ? '' : v);
              setOffset(0);
            }}
            disabled={categoriesQ.isLoading}
          >
            <SelectTrigger
              id="pr-filter-category"
              className="min-h-11 w-full sm:min-h-9 sm:w-[220px]"
            >
              <SelectValue placeholder="Toutes les catégories">
                {categoriesQ.isLoading
                  ? 'Chargement…'
                  : selectedCategory
                    ? procedureCategoryLabel(selectedCategory)
                    : 'Toutes les catégories'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CATEGORIES}>
                Toutes les catégories
              </SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {procedureCategoryLabel(c)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {listQ.isLoading ? <LoadingState rows={4} /> : null}
      {listQ.isError ? (
        <ErrorState
          message="Impossible de charger les procédures."
          onRetry={() => void listQ.refetch()}
        />
      ) : null}

      {listQ.isSuccess && listQ.data.items.length === 0 && !canCreate ? (
        <EmptyState
          title="Aucune procédure"
          description={
            hasActiveFilter
              ? 'Aucun résultat pour ce filtre.'
              : 'Créez la première procédure du client actif pour démarrer la rédaction.'
          }
        />
      ) : null}

      {listQ.isSuccess &&
      (listQ.data.items.length > 0 || canCreate) ? (
        <div className="pr-grid" role="list" aria-label="Catalogue des procédures">
          {listQ.data.items.map((row) => (
            <ProcedureCard key={row.id} row={row} />
          ))}
          {canCreate ? (
            <button
              type="button"
              role="listitem"
              className="pr-card pr-new"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus aria-hidden />
              <b>Nouvelle procédure</b>
              <span>Page vierge ou à partir d&apos;un modèle</span>
            </button>
          ) : null}
        </div>
      ) : null}

      {listQ.isSuccess &&
      listQ.data.items.length === 0 &&
      canCreate &&
      hasActiveFilter ? (
        <EmptyState
          title="Aucune procédure"
          description="Aucun résultat pour ce filtre."
        />
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
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        members={membersQ.data ?? []}
        membersLoading={membersQ.isLoading}
        categories={categoriesQ.data ?? []}
        categoriesLoading={categoriesQ.isLoading}
        templates={templatesQ.data ?? []}
        templatesLoading={templatesQ.isLoading}
        isSubmitting={createMut.isPending}
        onSubmit={(values) => createMut.mutate(values)}
      />
    </div>
  );
}
