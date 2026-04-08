'use client';

import { LoadingState } from '@/components/feedback/loading-state';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useBudgetDecisionHistory } from '../hooks/use-budget-decision-history';
import type { BudgetDecisionHistoryItem } from '../types/budget-management.types';

export interface BudgetDecisionTimelineProps {
  budgetId: string;
}

const whenDate = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const whenTime = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit',
  minute: '2-digit',
});

function formatWhen(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return `${whenDate.format(d)} à ${whenTime.format(d)}`;
  } catch {
    return iso;
  }
}

function DecisionRow({ item }: { item: BudgetDecisionHistoryItem }) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{item.summary}</p>
        <time
          className="shrink-0 text-xs text-muted-foreground"
          dateTime={item.createdAt}
        >
          {formatWhen(item.createdAt)}
        </time>
      </div>
      {item.actor ? (
        <p className="mt-1.5 text-xs text-muted-foreground">
          Par {item.actor.displayName}
        </p>
      ) : null}
    </div>
  );
}

export function BudgetDecisionTimeline({ budgetId }: BudgetDecisionTimelineProps) {
  const { data, isLoading, error } = useBudgetDecisionHistory(budgetId, {
    limit: 50,
    offset: 0,
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <LoadingState rows={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTitle>Historique indisponible</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'Impossible de charger l’historique.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const items = data?.items ?? [];

  if (items.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        Aucune décision enregistrée pour ce budget (périmètre courant).
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4 sm:p-6">
      <p className="text-sm text-muted-foreground">
        {data?.total != null ? (
          <>
            {data.total} événement{data.total > 1 ? 's' : ''} (affichage paginé :{' '}
            {items.length} sur {data.total})
          </>
        ) : null}
      </p>
      <ul className="space-y-3" aria-label="Historique des décisions budgétaires">
        {items.map((item) => (
          <li key={item.id}>
            <DecisionRow item={item} />
          </li>
        ))}
      </ul>
    </div>
  );
}
