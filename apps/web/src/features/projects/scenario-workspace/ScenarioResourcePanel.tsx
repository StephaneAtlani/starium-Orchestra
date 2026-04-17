'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createProjectScenarioResourcePlan,
  deleteProjectScenarioResourcePlan,
  getProjectScenarioResourceSummary,
  listProjectScenarioResourcePlans,
} from './project-scenario-dimensions.api';
import { listHumanResourcesForTaskPickers } from '../api/projects.api';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { toast } from '@/lib/toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { projectQueryKeys } from '../lib/project-query-keys';
import type { ProjectScenarioApi } from '../types/project.types';
import { invalidateScenarioWorkspaceCaches } from './invalidate-scenario-workspace-caches';
import { isScenarioWorkspaceReadOnly } from './scenario-workspace-readonly';

type Props = {
  projectId: string;
  scenario: ProjectScenarioApi;
  canMutate: boolean;
};

function resourceDisplayName(name: string, code: string | null): string {
  return code ? `${name} (${code})` : name;
}

export function ScenarioResourcePanel({ projectId, scenario, canMutate }: Props) {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const scenarioId = scenario.id;
  const readOnly = isScenarioWorkspaceReadOnly(scenario) || !canMutate;

  const [createOpen, setCreateOpen] = useState(false);
  const [resourceId, setResourceId] = useState<string>('');
  const [roleLabel, setRoleLabel] = useState('');
  const [allocationPct, setAllocationPct] = useState('');
  const [plannedDays, setPlannedDays] = useState('');

  const resourcesQuery = useQuery({
    queryKey: [...projectQueryKeys.all, 'human-resources-task-pickers', clientId] as const,
    queryFn: () => listHumanResourcesForTaskPickers(authFetch),
    enabled: createOpen && Boolean(clientId),
  });

  const resourceQuery = useQuery({
    queryKey: projectQueryKeys.scenarioResourcePlans(clientId, projectId, scenarioId),
    queryFn: async () => {
      const [plans, summary] = await Promise.all([
        listProjectScenarioResourcePlans(authFetch, projectId, scenarioId, { limit: 100, offset: 0 }),
        getProjectScenarioResourceSummary(authFetch, projectId, scenarioId),
      ]);
      return { plans, summary };
    },
    enabled: Boolean(clientId && projectId && scenarioId),
  });

  const deleteMutation = useMutation({
    mutationFn: (planId: string) =>
      deleteProjectScenarioResourcePlan(authFetch, projectId, scenarioId, planId),
    onSuccess: async () => {
      await invalidateScenarioWorkspaceCaches(queryClient, clientId, projectId, scenarioId);
      toast.success('Plan ressource supprimé');
    },
    onError: (e: Error) => toast.error(e.message || 'Suppression impossible'),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createProjectScenarioResourcePlan(authFetch, projectId, scenarioId, {
        resourceId,
        roleLabel: roleLabel.trim() || null,
        allocationPct: allocationPct.trim() || null,
        plannedDays: plannedDays.trim() || null,
      }),
    onSuccess: async () => {
      await invalidateScenarioWorkspaceCaches(queryClient, clientId, projectId, scenarioId);
      toast.success('Plan ressource créé');
      setCreateOpen(false);
      setResourceId('');
      setRoleLabel('');
      setAllocationPct('');
      setPlannedDays('');
    },
    onError: (e: Error) => toast.error(e.message || 'Création impossible'),
  });

  if (resourceQuery.isLoading) {
    return <LoadingState rows={4} />;
  }

  if (resourceQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Erreur</AlertTitle>
        <AlertDescription>
          {resourceQuery.error instanceof Error ? resourceQuery.error.message : 'Chargement impossible'}
        </AlertDescription>
      </Alert>
    );
  }

  const items = resourceQuery.data?.plans.items ?? [];
  const summary = resourceQuery.data?.summary;
  const humanResources = resourcesQuery.data?.items ?? [];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Plans de charge par ressource pour ce scénario, indépendamment des timesheets réels.
      </p>

      {summary ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-xs">
            <p className="font-medium text-muted-foreground">Jours planifiés</p>
            <p className="text-sm font-semibold">{summary.plannedDaysTotal}</p>
          </div>
          <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-xs">
            <p className="font-medium text-muted-foreground">Coût planifié (estim.)</p>
            <p className="text-sm font-semibold">{summary.plannedCostTotal}</p>
          </div>
          <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-xs">
            <p className="font-medium text-muted-foreground">Pic FTE</p>
            <p className="text-sm font-semibold">{summary.plannedFtePeak ?? '—'}</p>
          </div>
          <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-xs">
            <p className="font-medium text-muted-foreground">Ressources distinctes</p>
            <p className="text-sm font-semibold">{summary.distinctResources}</p>
          </div>
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button type="button" size="sm" disabled={readOnly} onClick={() => setCreateOpen(true)}>
          Ajouter un plan ressource
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun plan ressource.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ressource</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead className="text-right">%</TableHead>
              <TableHead className="text-right">Jours</TableHead>
              <TableHead className="w-[100px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">
                  {resourceDisplayName(row.resource.name, row.resource.code)}
                </TableCell>
                <TableCell>{row.roleLabel ?? '—'}</TableCell>
                <TableCell className="text-right tabular-nums">{row.allocationPct ?? '—'}</TableCell>
                <TableCell className="text-right tabular-nums">{row.plannedDays ?? '—'}</TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    disabled={readOnly || deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate(row.id)}
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
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouveau plan ressource</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-2">
              <Label>Ressource humaine</Label>
              <Select value={resourceId} onValueChange={(v) => setResourceId(v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une ressource" />
                </SelectTrigger>
                <SelectContent>
                  {humanResources.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {resourceDisplayName(r.name, r.code)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rp-role">Rôle (optionnel)</Label>
              <Input
                id="rp-role"
                value={roleLabel}
                onChange={(e) => setRoleLabel(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rp-pct">Allocation % (optionnel)</Label>
              <Input
                id="rp-pct"
                value={allocationPct}
                onChange={(e) => setAllocationPct(e.target.value)}
                placeholder="ex. 50"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rp-days">Jours planifiés (optionnel)</Label>
              <Input
                id="rp-days"
                value={plannedDays}
                onChange={(e) => setPlannedDays(e.target.value)}
                placeholder="ex. 10"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button
              type="button"
              disabled={createMutation.isPending || !resourceId}
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
