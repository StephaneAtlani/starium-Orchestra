'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronUp, ExternalLink, ListTree, X } from 'lucide-react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useBudgetEnvelope, useBudgetEnvelopeLines } from '../../hooks/use-budget-envelope';
import { BudgetEnvelopeIdentityCard } from '../budget-envelope-identity-card';
import { BudgetEnvelopeContextCard } from '../budget-envelope-context-card';
import { BudgetEnvelopeSummaryCards } from '../budget-envelope-summary-cards';
import { BudgetEnvelopeLinesTable } from '../budget-envelope-lines-table';
import { CockpitSurfaceCard } from '../../dashboard/components/budget-cockpit-primitives';
import { budgetEnvelopeDetail } from '../../constants/budget-routes';

const DEFAULT_LIMIT = 20;
const SEARCH_DEBOUNCE_MS = 300;

export function BudgetEnvelopeIntelligenceDrawer({
  open,
  onOpenChange,
  envelopeId,
  onBudgetLineClick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  envelopeId: string | null;
  onBudgetLineClick: (lineId: string) => void;
}) {
  const effectiveId = open && envelopeId ? envelopeId : null;

  const [offset, setOffset] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [panelExpanded, setPanelExpanded] = useState(false);

  useEffect(() => {
    if (!open) setPanelExpanded(false);
  }, [open]);

  useEffect(() => {
    if (!effectiveId) return;
    setOffset(0);
    setSearchInput('');
    setDebouncedSearch('');
    setStatusFilter('ALL');
  }, [effectiveId]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setOffset(0);
  }, [debouncedSearch, statusFilter]);

  const linesQueryParams = useMemo(
    () => ({
      offset,
      limit: DEFAULT_LIMIT,
      search: debouncedSearch || undefined,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
    }),
    [offset, debouncedSearch, statusFilter],
  );

  const envelopeQuery = useBudgetEnvelope(effectiveId);
  const linesQuery = useBudgetEnvelopeLines(effectiveId, linesQueryParams);

  const envelope = envelopeQuery.data ?? null;
  const hasActiveFilters =
    searchInput.trim().length > 0 || statusFilter !== 'ALL';

  const showLoadingShell =
    open && effectiveId && envelopeQuery.isLoading && !envelope;
  const showError =
    open && effectiveId && envelopeQuery.isError && !envelope;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          className="fixed inset-0 z-50 bg-black/20 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
        />
        <DialogPrimitive.Popup
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-none',
            'border border-border/60 bg-background shadow-lg outline-none',
            'h-[100dvh] sm:h-[70vh] md:h-[65vh]',
            panelExpanded && 'sm:h-[100dvh] md:h-[100dvh]',
            'rounded-none sm:rounded-t-2xl',
            'transition-[height] duration-300 ease-out motion-reduce:transition-none',
            'overflow-hidden',
            'data-open:animate-in data-open:slide-in-from-bottom-2 data-open:fade-in-0',
            'data-closed:animate-out data-closed:slide-out-to-bottom-2 data-closed:fade-out-0',
          )}
        >
          {showLoadingShell && (
            <div className="flex h-full flex-col">
              <div className="border-b border-border/60 px-4 py-3">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="mt-2 h-4 w-1/4" />
              </div>
              <div className="space-y-3 p-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-8 w-2/3" />
                <Skeleton className="h-8 w-full" />
              </div>
            </div>
          )}

          {showError && (
            <div className="p-4">
              <Alert variant="destructive">
                <AlertDescription>
                  Impossible de charger l’enveloppe budgétaire.
                </AlertDescription>
              </Alert>
              <div className="mt-3 flex gap-2">
                <Button variant="outline" onClick={() => envelopeQuery.refetch()}>
                  Réessayer
                </Button>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Fermer
                </Button>
              </div>
            </div>
          )}

          {envelope && open && (
            <div className="flex h-full min-h-0 flex-col">
              <button
                type="button"
                className={cn(
                  'group flex shrink-0 cursor-pointer flex-col items-center justify-center gap-0.5 py-2.5',
                  'touch-manipulation select-none rounded-t-2xl outline-none',
                  'hover:bg-muted/40 active:bg-muted/60',
                  'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                )}
                aria-expanded={panelExpanded}
                aria-label={
                  panelExpanded
                    ? 'Réduire le panneau'
                    : 'Agrandir le panneau vers le haut'
                }
                onClick={() => setPanelExpanded((v) => !v)}
              >
                <span className="h-1 w-12 rounded-full bg-muted-foreground/35 transition-colors group-hover:bg-muted-foreground/50" />
                <ChevronUp
                  className={cn(
                    'size-4 text-muted-foreground transition-transform duration-300 ease-out',
                    panelExpanded && 'rotate-180',
                  )}
                  aria-hidden
                />
              </button>

              <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/60 px-4 pb-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-sm font-semibold leading-tight text-foreground">
                      {envelope.name}
                    </h2>
                    <BudgetEnvelopeStatusBadge status={envelope.status} />
                  </div>
                  {envelope.code ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">{envelope.code}</p>
                  ) : null}
                  <Link
                    href={budgetEnvelopeDetail(envelope.id)}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    Fiche complète
                    <ExternalLink className="size-3.5 shrink-0" aria-hidden />
                  </Link>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  aria-label="Fermer"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="size-4" />
                </Button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
                <div className="grid gap-4 py-4 md:grid-cols-2">
                  <BudgetEnvelopeIdentityCard envelope={envelope} />
                  <BudgetEnvelopeContextCard envelope={envelope} />
                </div>

                <BudgetEnvelopeSummaryCards envelope={envelope} />

                <div className="pb-2 pt-2">
                  <CockpitSurfaceCard
                    title="Lignes budgétaires de l’enveloppe"
                    description="Recherche par code ou libellé, filtre par statut, pagination."
                    icon={ListTree}
                    accent="primary"
                    contentPad={false}
                    bodyClassName="p-0"
                    data-testid="budget-envelope-drawer-lines-table"
                  >
                    <BudgetEnvelopeLinesTable
                      lines={linesQuery.data?.items ?? []}
                      isLoading={linesQuery.isLoading}
                      error={linesQuery.error}
                      total={linesQuery.data?.total ?? 0}
                      offset={offset}
                      limit={DEFAULT_LIMIT}
                      onPageChange={setOffset}
                      searchInput={searchInput}
                      onSearchChange={setSearchInput}
                      statusFilter={statusFilter}
                      onStatusFilterChange={setStatusFilter}
                      hasActiveFilters={hasActiveFilters}
                      onBudgetLineClick={onBudgetLineClick}
                    />
                  </CockpitSurfaceCard>
                </div>
              </div>
            </div>
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
