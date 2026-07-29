'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRightLeft } from 'lucide-react';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Button } from '@/components/ui/button';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { listBudgetReallocations } from '@/features/budgets/api/budget-reallocations.api';
import { budgetQueryKeys } from '@/features/budgets/lib/budget-query-keys';
import type { BudgetLine } from '@/features/budgets/types/budget-management.types';

type BudgetReallocationsJournalModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetId: string;
  budgetName: string;
  lines: BudgetLine[];
  onCreateRequest: () => void;
};

function formatLineLabel(line: BudgetLine | null | undefined, fallbackId: string): string {
  if (!line) return fallbackId;
  return line.code ? `${line.name} (${line.code})` : line.name;
}

function formatAmount(value: number, currency: string): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function BudgetReallocationsJournalModal({
  open,
  onOpenChange,
  budgetId,
  budgetName,
  lines,
  onCreateRequest,
}: BudgetReallocationsJournalModalProps) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  const query = useQuery({
    queryKey: budgetQueryKeys.reallocations(clientId, budgetId, { offset: 0, limit: 20 }),
    queryFn: () => listBudgetReallocations(authFetch, { budgetId, offset: 0, limit: 20 }),
    enabled: open && !!clientId && !!budgetId,
  });

  const lineMap = useMemo(
    () => new Map(lines.map((line) => [line.id, line])),
    [lines],
  );

  return (
    <StariumModal
      open={open}
      onOpenChange={onOpenChange}
      title="Réaffectations"
      description={`${budgetName} · journal des mouvements enregistrés et création d’une nouvelle réaffectation.`}
      icon={ArrowRightLeft}
      size="xl"
      bodyClassName="max-h-[70vh] overflow-y-auto"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 sm:min-h-9"
            onClick={() => onOpenChange(false)}
          >
            Fermer
          </Button>
          <Button
            type="button"
            className="min-h-11 sm:min-h-9"
            onClick={() => {
              onOpenChange(false);
              onCreateRequest();
            }}
          >
            Nouvelle réaffectation
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {query.isLoading ? <LoadingState rows={4} /> : null}

        {query.error ? (
          <ErrorState
            message={
              query.error instanceof Error ? query.error.message : 'Une erreur est survenue.'
            }
          />
        ) : null}

        {!query.isLoading && !query.error && (query.data?.items.length ?? 0) === 0 ? (
          <EmptyState
            title="Aucune réaffectation"
            description="Aucun mouvement n’a encore été enregistré pour ce budget."
          />
        ) : null}

        {!query.isLoading && !query.error && query.data && query.data.items.length > 0 ? (
          <div className="space-y-3">
            {query.data.items.map((item) => {
              const sourceLine = lineMap.get(item.sourceLineId);
              const targetLine = lineMap.get(item.targetLineId);

              return (
                <article
                  key={item.id}
                  className="rounded-xl border border-border/70 bg-card p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">
                        {formatLineLabel(sourceLine, item.sourceLineId)}
                        <span className="mx-2 text-muted-foreground" aria-hidden>
                          →
                        </span>
                        {formatLineLabel(targetLine, item.targetLineId)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(item.createdAt).toLocaleString('fr-FR')}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums text-foreground">
                        {formatAmount(item.amount, item.currency)}
                      </p>
                      <p className="text-xs text-muted-foreground">{item.currency}</p>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                    <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                        Ligne source
                      </div>
                      <div className="mt-1 font-medium text-foreground">
                        {formatLineLabel(sourceLine, item.sourceLineId)}
                      </div>
                    </div>

                    <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                        Ligne cible
                      </div>
                      <div className="mt-1 font-medium text-foreground">
                        {formatLineLabel(targetLine, item.targetLineId)}
                      </div>
                    </div>
                  </div>

                  {item.reason ? (
                    <p className="mt-3 text-sm text-muted-foreground">{item.reason}</p>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : null}
      </div>
    </StariumModal>
  );
}
