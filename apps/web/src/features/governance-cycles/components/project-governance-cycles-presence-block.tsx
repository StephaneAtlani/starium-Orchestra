'use client';

import Link from 'next/link';
import { Layers } from 'lucide-react';
import { LoadingState } from '@/components/feedback/loading-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  useGovernanceCyclesByProjectQuery,
  useGovernanceCyclesReadContext,
} from '../api/governance-cycles.queries';
import { GovernanceCycleDecisionBadge } from './governance-cycle-decision-badge';
import { formatGovernancePriorityScore } from '../lib/governance-cycle-formatters';
import { getGovernanceCycleCadenceLabel } from '../lib/governance-cycle-labels';

const MAX_VISIBLE_ROWS = 5;

export function ProjectGovernanceCyclesPresenceBlock({
  projectId,
}: {
  projectId: string;
}) {
  const { canRead, permsSuccess, readEnabled } = useGovernanceCyclesReadContext();
  const query = useGovernanceCyclesByProjectQuery(projectId, {
    enabled: readEnabled,
  });

  if (!permsSuccess || !canRead) {
    return null;
  }

  const items = query.data?.items ?? [];
  const visibleItems = items.slice(0, MAX_VISIBLE_ROWS);
  const hasMore = items.length > MAX_VISIBLE_ROWS;

  return (
    <Card size="sm" className="overflow-hidden shadow-sm">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Layers className="size-4 text-muted-foreground" aria-hidden />
          Présence dans les cycles de pilotage
        </CardTitle>
        {hasMore ? (
          <Link
            href="/cycles"
            className="text-xs font-medium text-primary underline-offset-4 hover:underline"
          >
            Voir tous les cycles
          </Link>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3 px-4 py-4 text-sm">
        {query.isLoading ? (
          <LoadingState rows={2} />
        ) : query.isError ? (
          <p className="text-xs text-muted-foreground">
            Impossible de charger les cycles de pilotage pour ce projet.
          </p>
        ) : items.length === 0 ? (
          <p className="rounded-md border border-dashed border-border/80 bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
            Aucune présence dans un cycle de pilotage.
          </p>
        ) : (
          <ul className="space-y-2">
            {visibleItems.map((row) => (
              <li
                key={row.cycleId}
                className="flex flex-col gap-1.5 rounded-md border border-border/80 bg-muted/20 px-3 py-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/cycles/${row.cycleId}`}
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    {row.cycleName}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {row.periodLabel}
                    {' · '}
                    {getGovernanceCycleCadenceLabel(row.cadence)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <GovernanceCycleDecisionBadge status={row.decisionStatus} />
                  {row.priorityScore != null ? (
                    <span className="text-xs tabular-nums text-muted-foreground">
                      Score {formatGovernancePriorityScore(row.priorityScore)}
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
