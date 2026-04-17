'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  createProjectScenarioRisk,
  deleteProjectScenarioRisk,
  getProjectScenarioRiskSummary,
  listProjectScenarioRisks,
} from './project-scenario-dimensions.api';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { toast } from '@/lib/toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingState } from '@/components/feedback/loading-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { projectRisks } from '../constants/project-routes';
import { projectQueryKeys } from '../lib/project-query-keys';
import type { ProjectScenarioApi } from '../types/project.types';
import { invalidateScenarioWorkspaceCaches } from './invalidate-scenario-workspace-caches';
import { isScenarioWorkspaceReadOnly } from './scenario-workspace-readonly';

type Props = {
  projectId: string;
  scenario: ProjectScenarioApi;
  canMutate: boolean;
};

export function ScenarioRiskPanel({ projectId, scenario, canMutate }: Props) {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const scenarioId = scenario.id;
  const readOnly = isScenarioWorkspaceReadOnly(scenario) || !canMutate;

  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [probability, setProbability] = useState('3');
  const [impact, setImpact] = useState('3');

  const risksQuery = useQuery({
    queryKey: projectQueryKeys.scenarioRisks(clientId, projectId, scenarioId),
    queryFn: async () => {
      const [risks, summary] = await Promise.all([
        listProjectScenarioRisks(authFetch, projectId, scenarioId, { limit: 100, offset: 0 }),
        getProjectScenarioRiskSummary(authFetch, projectId, scenarioId),
      ]);
      return { risks, summary };
    },
    enabled: Boolean(clientId && projectId && scenarioId),
  });

  const deleteMutation = useMutation({
    mutationFn: (riskId: string) =>
      deleteProjectScenarioRisk(authFetch, projectId, scenarioId, riskId),
    onSuccess: async () => {
      await invalidateScenarioWorkspaceCaches(queryClient, clientId, projectId, scenarioId);
      toast.success('Risque supprimé');
    },
    onError: (e: Error) => toast.error(e.message || 'Suppression impossible'),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createProjectScenarioRisk(authFetch, projectId, scenarioId, {
        title: title.trim(),
        probability: Number.parseInt(probability, 10),
        impact: Number.parseInt(impact, 10),
      }),
    onSuccess: async () => {
      await invalidateScenarioWorkspaceCaches(queryClient, clientId, projectId, scenarioId);
      toast.success('Risque scénario créé');
      setCreateOpen(false);
      setTitle('');
      setProbability('3');
      setImpact('3');
    },
    onError: (e: Error) => toast.error(e.message || 'Création impossible'),
  });

  if (risksQuery.isLoading) {
    return <LoadingState rows={4} />;
  }

  if (risksQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Erreur</AlertTitle>
        <AlertDescription>
          {risksQuery.error instanceof Error ? risksQuery.error.message : 'Chargement impossible'}
        </AlertDescription>
      </Alert>
    );
  }

  const items = risksQuery.data?.risks.items ?? [];
  const summary = risksQuery.data?.summary;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Risques projetés pour ce scénario (registre distinct des risques projet opérationnels).
      </p>

      {summary ? (
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-xs">
            <p className="font-medium text-muted-foreground">Risques critiques (score ≥ 15)</p>
            <p className="text-sm font-semibold">{summary.criticalRiskCount}</p>
          </div>
          <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-xs">
            <p className="font-medium text-muted-foreground">Criticité max</p>
            <p className="text-sm font-semibold">{summary.maxCriticality ?? '—'}</p>
          </div>
          <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-xs">
            <p className="font-medium text-muted-foreground">Criticité moyenne</p>
            <p className="text-sm font-semibold">{summary.averageCriticality ?? '—'}</p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={readOnly} onClick={() => setCreateOpen(true)}>
          Ajouter un risque scénario
        </Button>
        <Link
          href={projectRisks(projectId)}
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'w-fit')}
        >
          Registre risques projet
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun risque scénario.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titre</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">P×I</TableHead>
              <TableHead className="text-right">Score</TableHead>
              <TableHead className="w-[100px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.title}</TableCell>
                <TableCell>{r.riskType?.label ?? '—'}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {r.probability}×{r.impact}
                </TableCell>
                <TableCell className="text-right tabular-nums">{r.criticalityScore}</TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    disabled={readOnly || deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate(r.id)}
                  >
                    Supprimer
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau risque scénario</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-2">
              <Label htmlFor="sr-title">Titre</Label>
              <Input id="sr-title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sr-p">Probabilité (1–5)</Label>
              <Input
                id="sr-p"
                type="number"
                min={1}
                max={5}
                value={probability}
                onChange={(e) => setProbability(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sr-i">Impact (1–5)</Label>
              <Input
                id="sr-i"
                type="number"
                min={1}
                max={5}
                value={impact}
                onChange={(e) => setImpact(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button
              type="button"
              disabled={
                createMutation.isPending ||
                title.trim().length === 0 ||
                Number.isNaN(Number.parseInt(probability, 10)) ||
                Number.isNaN(Number.parseInt(impact, 10))
              }
              onClick={() => createMutation.mutate()}
            >
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
