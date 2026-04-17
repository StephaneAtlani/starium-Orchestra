'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createProjectScenarioResourcePlan,
  deleteProjectScenarioResourcePlan,
  getProjectScenarioResourceSummary,
  listProjectScenarioResourcePlans,
  updateProjectScenarioResourcePlan,
  type CreateProjectScenarioResourcePlanPayload,
} from './project-scenario-dimensions.api';
import type { ProjectScenarioResourcePlanApi } from './project-scenario-dimensions.types';
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatResourceDisplayName, RESOURCE_AFFILIATION_LABEL } from '@/lib/resource-labels';
import type { ResourceListItem } from '@/services/resources';
import { personResourceMatchesSearch } from '../lib/person-resource-search';
import { projectQueryKeys } from '../lib/project-query-keys';
import type { ProjectScenarioApi } from '../types/project.types';
import { invalidateScenarioWorkspaceCaches } from './invalidate-scenario-workspace-caches';
import { isScenarioWorkspaceReadOnly } from './scenario-workspace-readonly';
import { cn } from '@/lib/utils';

type Props = {
  projectId: string;
  scenario: ProjectScenarioApi;
  canMutate: boolean;
};

function resourceDisplayName(name: string, code: string | null): string {
  return code ? `${name} (${code})` : name;
}

function resourcePickerLabel(r: ResourceListItem): string {
  const name = formatResourceDisplayName(r);
  const bits: string[] = [name];
  if (r.code?.trim()) bits.push(r.code.trim());
  if (r.affiliation) bits.push(RESOURCE_AFFILIATION_LABEL[r.affiliation]);
  return bits.join(' · ');
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
  const [resourceSearch, setResourceSearch] = useState('');
  const [roleLabel, setRoleLabel] = useState('');
  const [allocationPct, setAllocationPct] = useState('');
  const [plannedDays, setPlannedDays] = useState('');

  useEffect(() => {
    if (!createOpen) setResourceSearch('');
  }, [createOpen]);

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

  const updatePlanMutation = useMutation({
    mutationFn: ({
      planId,
      payload,
    }: {
      planId: string;
      payload: Partial<CreateProjectScenarioResourcePlanPayload>;
    }) => updateProjectScenarioResourcePlan(authFetch, projectId, scenarioId, planId, payload),
    onSuccess: async () => {
      await invalidateScenarioWorkspaceCaches(queryClient, clientId, projectId, scenarioId);
    },
    onError: (e: Error) => toast.error(e.message || 'Mise à jour impossible'),
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

  const items = resourceQuery.data?.plans.items ?? [];
  const summary = resourceQuery.data?.summary;
  const humanResources = resourcesQuery.data?.items ?? [];

  const resourcesFilteredSortedByRole = useMemo(() => {
    const filtered = humanResources.filter((r) => personResourceMatchesSearch(r, resourceSearch));
    const byRole = new Map<string, ResourceListItem[]>();
    for (const r of filtered) {
      const key = r.role?.name?.trim() ? r.role.name.trim() : 'Sans rôle métier';
      const g = byRole.get(key) ?? [];
      g.push(r);
      byRole.set(key, g);
    }
    for (const list of byRole.values()) {
      list.sort((a, b) =>
        formatResourceDisplayName(a).localeCompare(formatResourceDisplayName(b), 'fr', {
          sensitivity: 'base',
        }),
      );
    }
    return [...byRole.entries()].sort(([a], [b]) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
  }, [humanResources, resourceSearch]);

  const selectedResourceLabel = useMemo(() => {
    if (!resourceId) return '';
    const r = humanResources.find((x) => x.id === resourceId);
    return r ? resourcePickerLabel(r) : '';
  }, [humanResources, resourceId]);

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

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Plans de charge par ressource pour ce scénario, indépendamment des timesheets réels. Rôle, %
        et jours sont modifiables ici ; la sauvegarde se fait automatiquement à la sortie de chaque
        champ.
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
              <ScenarioResourcePlanRow
                key={row.id}
                row={row}
                readOnly={readOnly}
                onDelete={() => deleteMutation.mutate(row.id)}
                deletePending={deleteMutation.isPending}
                onPatch={(payload) =>
                  updatePlanMutation.mutateAsync({ planId: row.id, payload })
                }
                patchPending={
                  updatePlanMutation.isPending &&
                  updatePlanMutation.variables?.planId === row.id
                }
              />
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau plan ressource</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-2">
              <Label htmlFor="resource-plan-search">Ressource humaine</Label>
              <Input
                id="resource-plan-search"
                value={resourceSearch}
                onChange={(e) => setResourceSearch(e.target.value)}
                placeholder="Filtrer par nom, code, e-mail, rôle…"
                className="text-sm"
                autoComplete="off"
              />
              <Select value={resourceId} onValueChange={(v) => setResourceId(v ?? '')}>
                <SelectTrigger
                  className={cn('w-full min-w-0 max-w-full justify-between')}
                  title={selectedResourceLabel || undefined}
                >
                  <SelectValue placeholder="Choisir une ressource">
                    {resourceId ? selectedResourceLabel : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-[min(22rem,50vh)]">
                  {resourcesQuery.isLoading ? (
                    <div className="px-2 py-3 text-sm text-muted-foreground">Chargement…</div>
                  ) : resourcesFilteredSortedByRole.length === 0 ? (
                    <div className="px-2 py-3 text-sm text-muted-foreground">
                      Aucune ressource ne correspond au filtre.
                    </div>
                  ) : (
                    resourcesFilteredSortedByRole.map(([roleTitle, list]) => (
                      <SelectGroup key={roleTitle}>
                        <SelectLabel className="font-medium text-muted-foreground">
                          {roleTitle}
                        </SelectLabel>
                        {list.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {resourcePickerLabel(r)}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Liste groupée par <strong>rôle métier</strong> (annuaire ressources), triée par nom.
              </p>
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

function nullableDraftValue(v: string | null | undefined): string {
  return v ?? '';
}

function normalizeOptionalField(raw: string): string | null {
  const t = raw.trim();
  return t === '' ? null : t;
}

function optionalFieldsEqual(next: string | null, prev: string | null | undefined): boolean {
  return (prev ?? null) === (next ?? null);
}

function ScenarioResourcePlanRow({
  row,
  readOnly,
  onDelete,
  deletePending,
  onPatch,
  patchPending,
}: {
  row: ProjectScenarioResourcePlanApi;
  readOnly: boolean;
  onDelete: () => void;
  deletePending: boolean;
  onPatch: (payload: Partial<CreateProjectScenarioResourcePlanPayload>) => Promise<unknown>;
  patchPending: boolean;
}) {
  const [roleDraft, setRoleDraft] = useState(nullableDraftValue(row.roleLabel));
  const [pctDraft, setPctDraft] = useState(nullableDraftValue(row.allocationPct));
  const [daysDraft, setDaysDraft] = useState(nullableDraftValue(row.plannedDays));

  useEffect(() => {
    setRoleDraft(nullableDraftValue(row.roleLabel));
    setPctDraft(nullableDraftValue(row.allocationPct));
    setDaysDraft(nullableDraftValue(row.plannedDays));
  }, [row.id, row.roleLabel, row.allocationPct, row.plannedDays, row.updatedAt]);

  return (
    <TableRow>
      <TableCell className="font-medium">
        {resourceDisplayName(row.resource.name, row.resource.code)}
      </TableCell>
      <TableCell>
        <Input
          className="h-8 min-w-[8rem] max-w-[14rem] text-sm"
          value={roleDraft}
          onChange={(e) => setRoleDraft(e.target.value)}
          onBlur={() => {
            if (readOnly || patchPending) return;
            const next = normalizeOptionalField(roleDraft);
            if (optionalFieldsEqual(next, row.roleLabel)) return;
            void onPatch({ roleLabel: next }).catch(() => {
              setRoleDraft(nullableDraftValue(row.roleLabel));
            });
          }}
          disabled={readOnly || patchPending}
          placeholder="—"
          aria-label={`Rôle pour ${resourceDisplayName(row.resource.name, row.resource.code)}`}
        />
      </TableCell>
      <TableCell className="text-right">
        <Input
          className="h-8 w-[5.5rem] text-right tabular-nums text-sm"
          inputMode="decimal"
          value={pctDraft}
          onChange={(e) => setPctDraft(e.target.value)}
          onBlur={() => {
            if (readOnly || patchPending) return;
            const next = normalizeOptionalField(pctDraft);
            if (optionalFieldsEqual(next, row.allocationPct)) return;
            void onPatch({ allocationPct: next }).catch(() => {
              setPctDraft(nullableDraftValue(row.allocationPct));
            });
          }}
          disabled={readOnly || patchPending}
          placeholder="—"
          aria-label={`Allocation % pour ${resourceDisplayName(row.resource.name, row.resource.code)}`}
        />
      </TableCell>
      <TableCell className="text-right">
        <Input
          className="h-8 w-[5.5rem] text-right tabular-nums text-sm"
          inputMode="decimal"
          value={daysDraft}
          onChange={(e) => setDaysDraft(e.target.value)}
          onBlur={() => {
            if (readOnly || patchPending) return;
            const next = normalizeOptionalField(daysDraft);
            if (optionalFieldsEqual(next, row.plannedDays)) return;
            void onPatch({ plannedDays: next }).catch(() => {
              setDaysDraft(nullableDraftValue(row.plannedDays));
            });
          }}
          disabled={readOnly || patchPending}
          placeholder="—"
          aria-label={`Jours planifiés pour ${resourceDisplayName(row.resource.name, row.resource.code)}`}
        />
      </TableCell>
      <TableCell>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-destructive"
          disabled={readOnly || deletePending || patchPending}
          onClick={onDelete}
        >
          Supprimer
        </Button>
      </TableCell>
    </TableRow>
  );
}
