'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  bootstrapProjectScenarioTasksFromPlan,
  createProjectScenarioTask,
  deleteProjectScenarioTask,
  getProjectScenarioTimelineSummary,
  listProjectScenarioTasks,
} from './project-scenario-dimensions.api';
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

export function ScenarioTimelinePanel({ projectId, scenario, canMutate }: Props) {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const scenarioId = scenario.id;
  const readOnly = isScenarioWorkspaceReadOnly(scenario) || !canMutate;

  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [taskType, setTaskType] = useState<'TASK' | 'MILESTONE'>('TASK');

  const tasksQuery = useQuery({
    queryKey: projectQueryKeys.scenarioScenarioTasks(clientId, projectId, scenarioId),
    queryFn: async () => {
      const [tasks, timeline] = await Promise.all([
        listProjectScenarioTasks(authFetch, projectId, scenarioId, { limit: 100, offset: 0 }),
        getProjectScenarioTimelineSummary(authFetch, projectId, scenarioId),
      ]);
      return { tasks, timeline };
    },
    enabled: Boolean(clientId && projectId && scenarioId),
  });

  const deleteMutation = useMutation({
    mutationFn: (taskId: string) =>
      deleteProjectScenarioTask(authFetch, projectId, scenarioId, taskId),
    onSuccess: async () => {
      await invalidateScenarioWorkspaceCaches(queryClient, clientId, projectId, scenarioId);
      toast.success('Élément supprimé');
    },
    onError: (e: Error) => toast.error(e.message || 'Suppression impossible'),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createProjectScenarioTask(authFetch, projectId, scenarioId, {
        title: title.trim(),
        taskType,
      }),
    onSuccess: async () => {
      await invalidateScenarioWorkspaceCaches(queryClient, clientId, projectId, scenarioId);
      toast.success('Élément créé');
      setCreateOpen(false);
      setTitle('');
      setTaskType('TASK');
    },
    onError: (e: Error) => toast.error(e.message || 'Création impossible'),
  });

  const bootstrapMutation = useMutation({
    mutationFn: () => bootstrapProjectScenarioTasksFromPlan(authFetch, projectId, scenarioId),
    onSuccess: async (data) => {
      await invalidateScenarioWorkspaceCaches(queryClient, clientId, projectId, scenarioId);
      toast.success(`${data.createdCount} tâche(s) importée(s) depuis le plan projet`);
    },
    onError: (e: Error) => toast.error(e.message || 'Import impossible'),
  });

  if (tasksQuery.isLoading) {
    return <LoadingState rows={4} />;
  }

  if (tasksQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Erreur</AlertTitle>
        <AlertDescription>
          {tasksQuery.error instanceof Error ? tasksQuery.error.message : 'Chargement impossible'}
        </AlertDescription>
      </Alert>
    );
  }

  const items = tasksQuery.data?.tasks.items ?? [];
  const timeline = tasksQuery.data?.timeline;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Planning scénario indépendant de la frise projet officielle. Tu peux importer des tâches
        depuis le plan projet ou créer des éléments manuellement.
      </p>

      {timeline ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-xs">
            <p className="font-medium text-muted-foreground">Début planifié</p>
            <p className="text-sm font-semibold">{timeline.plannedStartDate ?? '—'}</p>
          </div>
          <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-xs">
            <p className="font-medium text-muted-foreground">Fin planifiée</p>
            <p className="text-sm font-semibold">{timeline.plannedEndDate ?? '—'}</p>
          </div>
          <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-xs">
            <p className="font-medium text-muted-foreground">Durée chemin critique</p>
            <p className="text-sm font-semibold">{timeline.criticalPathDuration ?? '—'}</p>
          </div>
          <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-xs">
            <p className="font-medium text-muted-foreground">Jalons</p>
            <p className="text-sm font-semibold">{timeline.milestoneCount}</p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={readOnly || bootstrapMutation.isPending}
          onClick={() => bootstrapMutation.mutate()}
        >
          Importer depuis le plan projet
        </Button>
        <Button type="button" size="sm" disabled={readOnly} onClick={() => setCreateOpen(true)}>
          Ajouter une tâche / jalon
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune tâche scénario.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titre</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="w-[100px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.title}</TableCell>
                <TableCell>{t.taskType ?? '—'}</TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    disabled={readOnly || deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate(t.id)}
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
            <DialogTitle>Nouvelle tâche ou jalon</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-2">
              <Label htmlFor="st-title">Titre</Label>
              <Input id="st-title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select
                value={taskType}
                onValueChange={(v) => setTaskType((v ?? 'TASK') as 'TASK' | 'MILESTONE')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TASK">Tâche</SelectItem>
                  <SelectItem value="MILESTONE">Jalon</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button
              type="button"
              disabled={createMutation.isPending || title.trim().length === 0}
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
