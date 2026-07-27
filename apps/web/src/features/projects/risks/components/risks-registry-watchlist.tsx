'use client';

import { useMemo } from 'react';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { isRiskDueOverdue } from '../../lib/project-risk-display';
import { RiskLevelBadge } from './risk-level-badge';
import type { ProjectRiskRegistryRow } from '../hooks/use-project-risks-registry-query';

/** Nombre d'entrées affichées avant renvoi vers le registre filtré. */
const WATCHLIST_LIMIT = 5;

const CRITICALITY_RANK: Record<string, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

function dotClass(level: string): string {
  switch (level) {
    case 'CRITICAL':
      return 'bg-violet-500';
    case 'HIGH':
      return 'bg-red-500';
    default:
      return 'bg-amber-500';
  }
}

function formatDue(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Risques ouverts de niveau haut ou critique, les plus urgents d'abord. */
export function selectRisksToArbitrate(
  rows: ProjectRiskRegistryRow[],
): ProjectRiskRegistryRow[] {
  return rows
    .filter(
      (r) =>
        r.status !== 'CLOSED' &&
        (r.criticalityLevel === 'CRITICAL' || r.criticalityLevel === 'HIGH'),
    )
    .slice()
    .sort((a, b) => {
      const rank =
        (CRITICALITY_RANK[b.criticalityLevel] ?? 0) - (CRITICALITY_RANK[a.criticalityLevel] ?? 0);
      if (rank !== 0) return rank;
      const scoreDiff = b.criticalityScore - a.criticalityScore;
      if (scoreDiff !== 0) return scoreDiff;
      const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      return aDue - bDue;
    });
}

type Props = {
  rows: ProjectRiskRegistryRow[];
  isLoading: boolean;
  /** Ouvre la fiche EBIOS du risque (undefined si l'utilisateur est en lecture seule). */
  onOpenRisk?: (row: ProjectRiskRegistryRow) => void;
  /** Bascule le registre sur les seuls risques critiques. */
  onShowAllCritical: () => void;
};

/**
 * Panneau « Risques critiques à arbitrer » — raccourci décisionnel au-dessus du
 * registre. Se limite à la sélection courante (filtres appliqués).
 */
export function RisksRegistryWatchlist({
  rows,
  isLoading,
  onOpenRisk,
  onShowAllCritical,
}: Props) {
  const items = useMemo(() => selectRisksToArbitrate(rows), [rows]);
  const shown = items.slice(0, WATCHLIST_LIMIT);

  return (
    <Card
      size="sm"
      className="starium-panel flex flex-col overflow-hidden border border-border shadow-sm"
      data-testid="risks-registry-watchlist"
    >
      <CardHeader className="flex flex-row items-start justify-between gap-3 border-b border-border/60 pb-3">
        <div className="min-w-0">
          <CardTitle className="text-sm font-semibold">Risques critiques à arbitrer</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Risques ouverts de niveau haut ou critique.
          </CardDescription>
        </div>
        <ShieldAlert className="size-4 shrink-0 text-destructive" aria-hidden />
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-1 pt-3">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-md" />
            ))}
          </div>
        ) : shown.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Aucun risque haut ou critique ouvert sur la sélection courante.
          </p>
        ) : (
          <>
            <ul className="divide-y divide-border/50">
              {shown.map((row) => {
                const due = formatDue(row.dueDate);
                const overdue = row.status !== 'CLOSED' && isRiskDueOverdue(row.dueDate);
                const meta = [row.projectName, due ? `échéance ${due}` : null]
                  .filter(Boolean)
                  .join(' · ');

                const content = (
                  <>
                    <span
                      className={cn('mt-1.5 size-2 shrink-0 rounded-full', dotClass(row.criticalityLevel))}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {row.title}
                      </span>
                      <span
                        className={cn(
                          'block truncate text-xs',
                          overdue
                            ? 'font-semibold text-yellow-950 dark:text-amber-400'
                            : 'text-muted-foreground',
                        )}
                      >
                        {meta || '—'}
                      </span>
                    </span>
                    <RiskLevelBadge level={row.criticalityLevel} />
                  </>
                );

                return (
                  <li key={row.id}>
                    {onOpenRisk ? (
                      <button
                        type="button"
                        onClick={() => onOpenRisk(row)}
                        className="flex w-full items-start gap-2.5 rounded-md px-1 py-2.5 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {content}
                      </button>
                    ) : (
                      <div className="flex w-full items-start gap-2.5 px-1 py-2.5">{content}</div>
                    )}
                  </li>
                );
              })}
            </ul>

            <div className="mt-auto pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={onShowAllCritical}
              >
                {items.length > shown.length
                  ? `Voir les ${items.length} risques critiques`
                  : 'Filtrer sur les risques critiques'}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
