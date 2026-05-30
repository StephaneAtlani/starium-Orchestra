'use client';

import { Card, CardContent } from '@/components/ui/card';
import { LoadingState } from '@/components/feedback/loading-state';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  formatGovernanceCapacityDays,
  formatGovernanceDecimalAmount,
  formatGovernancePriorityScore,
} from '../lib/governance-cycle-formatters';
import { getApiErrorMessage, useGovernanceCycleSummaryQuery } from '../hooks/use-governance-cycles';

export function GovernanceCycleOverviewTab({
  cycleId,
  enabled,
}: {
  cycleId: string;
  enabled: boolean;
}) {
  const summaryQuery = useGovernanceCycleSummaryQuery(cycleId, { enabled });

  if (summaryQuery.isLoading) {
    return <LoadingState label="Chargement de la synthèse…" />;
  }

  if (summaryQuery.isError || !summaryQuery.data) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {getApiErrorMessage(summaryQuery.error, 'Impossible de charger la synthèse du cycle.')}
        </AlertDescription>
      </Alert>
    );
  }

  const s = summaryQuery.data;
  const cards = [
    { label: 'Items total', value: String(s.totalItems) },
    { label: 'Candidats', value: String(s.candidateCount) },
    { label: 'À arbitrer', value: String(s.toArbitrateCount) },
    { label: 'Retenus', value: String(s.acceptedCount) },
    { label: 'Différés', value: String(s.deferredCount) },
    { label: 'Refusés', value: String(s.rejectedCount) },
    { label: 'Complément demandé', value: String(s.needsInformationCount) },
    { label: 'Sous réserve', value: String(s.acceptedWithReserveCount) },
    { label: 'Budget estimé total', value: formatGovernanceDecimalAmount(s.estimatedBudgetTotal) },
    {
      label: 'Capacité estimée totale',
      value: formatGovernanceCapacityDays(s.estimatedCapacityDaysTotal),
    },
    {
      label: 'Score priorité moyen',
      value: formatGovernancePriorityScore(s.averagePriorityScore),
    },
    { label: 'Items à haut risque', value: String(s.highRiskItemsCount) },
  ];

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Synthèse générée le{' '}
        {new Intl.DateTimeFormat('fr-FR', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(new Date(s.generatedAt))}
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <p className="text-lg font-semibold tabular-nums">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
