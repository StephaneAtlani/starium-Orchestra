'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getProjectScenarioCapacitySummary,
  listProjectScenarioCapacitySnapshots,
  recomputeProjectScenarioCapacity,
} from './project-scenario-dimensions.api';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { toast } from '@/lib/toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/feedback/loading-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { projectQueryKeys } from '../lib/project-query-keys';
import type { ProjectScenarioApi } from '../types/project.types';
import { invalidateScenarioWorkspaceCaches } from './invalidate-scenario-workspace-caches';
import { isScenarioWorkspaceReadOnly } from './scenario-workspace-readonly';

type Props = {
  projectId: string;
  scenario: ProjectScenarioApi;
  canMutate: boolean;
};

export function ScenarioCapacityPanel({ projectId, scenario, canMutate }: Props) {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const scenarioId = scenario.id;
  const readOnly = isScenarioWorkspaceReadOnly(scenario) || !canMutate;

  const capQuery = useQuery({
    queryKey: projectQueryKeys.scenarioCapacitySnapshots(clientId, projectId, scenarioId),
    queryFn: async () => {
      const [snapshots, summary] = await Promise.all([
        listProjectScenarioCapacitySnapshots(authFetch, projectId, scenarioId, {
          limit: 100,
          offset: 0,
        }),
        getProjectScenarioCapacitySummary(authFetch, projectId, scenarioId),
      ]);
      return { snapshots, summary };
    },
    enabled: Boolean(clientId && projectId && scenarioId),
  });

  const recomputeMutation = useMutation({
    mutationFn: () => recomputeProjectScenarioCapacity(authFetch, projectId, scenarioId),
    onSuccess: async () => {
      await invalidateScenarioWorkspaceCaches(queryClient, clientId, projectId, scenarioId);
      toast.success('Capacité recalculée');
    },
    onError: (e: Error) => toast.error(e.message || 'Recalcul impossible'),
  });

  if (capQuery.isLoading) {
    return <LoadingState rows={4} />;
  }

  if (capQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Erreur</AlertTitle>
        <AlertDescription>
          {capQuery.error instanceof Error ? capQuery.error.message : 'Chargement impossible'}
        </AlertDescription>
      </Alert>
    );
  }

  const items = capQuery.data?.snapshots.items ?? [];
  const summary = capQuery.data?.summary;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Charge vs capacité dérivée des plans ressource (scénario). Recalcule les snapshots après
        modification des plannings ressources.
      </p>

      {summary ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-xs">
            <p className="font-medium text-muted-foreground">Surcharge</p>
            <p className="text-sm font-semibold">{summary.overCapacityCount}</p>
          </div>
          <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-xs">
            <p className="font-medium text-muted-foreground">Sous-capacité</p>
            <p className="text-sm font-semibold">{summary.underCapacityCount}</p>
          </div>
          <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-xs">
            <p className="font-medium text-muted-foreground">Pic charge %</p>
            <p className="text-sm font-semibold">{summary.peakLoadPct ?? '—'}</p>
          </div>
          <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-xs">
            <p className="font-medium text-muted-foreground">Moyenne charge %</p>
            <p className="text-sm font-semibold">{summary.averageLoadPct ?? '—'}</p>
          </div>
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          disabled={readOnly || recomputeMutation.isPending}
          onClick={() => recomputeMutation.mutate()}
        >
          Recalculer la capacité
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucun snapshot — utilise « Recalculer » après avoir défini des plans ressources.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Ressource</TableHead>
              <TableHead className="text-right">Charge %</TableHead>
              <TableHead className="text-right">Écart %</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="tabular-nums text-xs">{row.snapshotDate}</TableCell>
                <TableCell className="font-medium">
                  {row.resource?.name ?? '—'}
                </TableCell>
                <TableCell className="text-right tabular-nums">{row.plannedLoadPct}</TableCell>
                <TableCell className="text-right tabular-nums">{row.variancePct}</TableCell>
                <TableCell>{row.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
