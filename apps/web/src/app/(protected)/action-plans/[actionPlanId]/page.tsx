'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/feedback/empty-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PermissionGate } from '@/components/PermissionGate';
import { useActiveClient } from '@/hooks/use-active-client';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { usePermissions } from '@/hooks/use-permissions';
import { createActionPlanTask } from '@/features/projects/api/action-plans.api';
import {
  listClientRisks,
  listHumanResourcesForTaskPickers,
  listProjectTaskPhases,
  listProjects,
} from '@/features/projects/api/projects.api';
import { ActionPlanTaskEditDialog } from '@/features/projects/components/action-plan-task-edit-dialog';
import { useActionPlanDetailQuery } from '@/features/projects/hooks/use-action-plan-detail-query';
import { useActionPlanTasksQuery } from '@/features/projects/hooks/use-action-plan-tasks-query';
import { useProjectAssignableUsers } from '@/features/projects/hooks/use-project-assignable-users';
import { projectQueryKeys } from '@/features/projects/lib/project-query-keys';
import { cn } from '@/lib/utils';
import { ArrowLeft, Plus } from 'lucide-react';

function fmtShortDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short' }).format(new Date(iso));
  } catch {
    return '—';
  }
}

function formatUser(
  id: string | null | undefined,
  users: { id: string; firstName: string | null; lastName: string | null; email: string }[],
): string {
  if (!id) return '—';
  const u = users.find((x) => x.id === id);
  if (!u) return '—';
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return name || u.email;
}

function formatResourcePerson(r: {
  firstName: string | null;
  name: string;
  code: string | null;
}): string {
  const label = [r.firstName, r.name].filter(Boolean).join(' ').trim();
  return label || r.code || '—';
}

function dateInputToIsoDay(s: string): string | undefined {
  if (!s.trim()) return undefined;
  return new Date(`${s}T12:00:00.000Z`).toISOString();
}

function parseTagsInput(raw: string): string[] | undefined {
  const parts = raw
    .split(/[,;]/)
    .map((x) => x.trim())
    .filter(Boolean);
  if (parts.length === 0) return undefined;
  return parts;
}

function formatTagsCell(tags: unknown): string {
  if (tags == null) return '—';
  if (Array.isArray(tags) && tags.every((x) => typeof x === 'string')) {
    return tags.length ? tags.join(', ') : '—';
  }
  return '—';
}

/** Base UI Select : sans `items`, le trigger affiche la valeur brute (ex. `__none`). */
const FILTER_STATUS_LABELS: Record<string, string> = {
  __all: 'Tous',
  TODO: 'À faire',
  IN_PROGRESS: 'En cours',
  BLOCKED: 'Bloquée',
  DONE: 'Terminée',
  CANCELLED: 'Annulée',
};

const FILTER_PRIORITY_LABELS: Record<string, string> = {
  __all: 'Toutes',
  LOW: 'Basse',
  MEDIUM: 'Moyenne',
  HIGH: 'Haute',
  CRITICAL: 'Critique',
};

const FORM_STATUS_LABELS: Record<string, string> = {
  TODO: 'À faire',
  IN_PROGRESS: 'En cours',
  BLOCKED: 'Bloquée',
  DONE: 'Terminée',
  CANCELLED: 'Annulée',
};

const FORM_PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Basse',
  MEDIUM: 'Moyenne',
  HIGH: 'Haute',
  CRITICAL: 'Critique',
};

const textareaClass = cn(
  'flex min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs',
  'outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
);

export default function ActionPlanDetailPage() {
  const params = useParams();
  const actionPlanId = typeof params.actionPlanId === 'string' ? params.actionPlanId : '';
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const { has, isSuccess: permsSuccess } = usePermissions();
  const canRead = has('projects.read');
  const canUpdateProjects = has('projects.update');
  const enabled = !!clientId && permsSuccess && canRead && !!actionPlanId;

  const planQuery = useActionPlanDetailQuery(actionPlanId, { enabled });
  const [statusF, setStatusF] = useState<string>('');
  const [priorityF, setPriorityF] = useState<string>('');
  const [searchF, setSearchF] = useState('');
  const tasksQuery = useActionPlanTasksQuery(
    actionPlanId,
    {
      status: statusF || undefined,
      priority: priorityF || undefined,
      search: searchF.trim() || undefined,
      limit: 100,
      offset: 0,
    },
    { enabled },
  );

  const authFetch = useAuthenticatedFetch();
  const assignable = useProjectAssignableUsers({ enabled });

  const resourcesHuman = useQuery({
    queryKey: [...projectQueryKeys.all, 'human-resources-task-pickers', clientId],
    queryFn: () => listHumanResourcesForTaskPickers(authFetch),
    enabled: !!clientId && enabled,
  });

  const projectsMini = useQuery({
    queryKey: [...projectQueryKeys.all, 'action-plan-project-pick', clientId],
    // API : ListProjectsQueryDto limite `limit` à 100 — au-delà → 400 et liste vide côté UI.
    queryFn: () => listProjects(authFetch, { page: 1, limit: 100 }),
    enabled: !!clientId && enabled,
  });

  const risksMini = useQuery({
    queryKey: projectQueryKeys.clientRisks(clientId),
    queryFn: () => listClientRisks(authFetch),
    enabled: !!clientId && enabled,
  });

  const users = assignable.data?.users ?? [];
  const humanResources = resourcesHuman.data?.items ?? [];

  const projectSelectItems = useMemo(() => {
    const items: Record<string, string> = { __none: 'Aucun' };
    for (const p of projectsMini.data?.items ?? []) {
      items[p.id] = `${p.code} — ${p.name}`;
    }
    return items;
  }, [projectsMini.data?.items]);

  const riskSelectItems = useMemo(() => {
    const items: Record<string, string> = { __none: 'Aucun' };
    for (const r of risksMini.data ?? []) {
      items[r.id] = `${r.code} — ${r.title}`;
    }
    return items;
  }, [risksMini.data]);

  const responsibleSelectItems = useMemo(() => {
    const items: Record<string, string> = { __none: 'Aucune personne' };
    for (const r of humanResources) {
      items[r.id] = formatResourcePerson(r);
    }
    return items;
  }, [humanResources]);

  const [open, setOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [tName, setTName] = useState('');
  const [tDescription, setTDescription] = useState('');
  const [tStatus, setTStatus] = useState('TODO');
  const [tPriority, setTPriority] = useState('MEDIUM');
  const [tProjectId, setTProjectId] = useState<string>('');
  const [tRiskId, setTRiskId] = useState<string>('');
  const [tPhaseId, setTPhaseId] = useState<string>('');
  const [tResponsibleResourceId, setTResponsibleResourceId] = useState<string>('');
  const [tPlannedStart, setTPlannedStart] = useState<string>('');
  const [tPlannedEnd, setTPlannedEnd] = useState<string>('');
  const [tEstimatedHours, setTEstimatedHours] = useState<string>('');
  const [tTagsRaw, setTTagsRaw] = useState<string>('');

  const phasesPick = useQuery({
    queryKey: [...projectQueryKeys.all, 'task-phases-pick', clientId, tProjectId],
    queryFn: () => listProjectTaskPhases(authFetch, tProjectId),
    enabled: !!clientId && enabled && !!tProjectId,
  });

  const phaseSelectItems = useMemo(() => {
    const items: Record<string, string> = { __none: 'Sans phase' };
    for (const ph of phasesPick.data ?? []) {
      items[ph.id] = ph.name;
    }
    return items;
  }, [phasesPick.data]);

  useEffect(() => {
    setTPhaseId('');
  }, [tProjectId]);

  const queryClient = useQueryClient();

  function resetTaskForm() {
    setTName('');
    setTDescription('');
    setTStatus('TODO');
    setTPriority('MEDIUM');
    setTProjectId('');
    setTRiskId('');
    setTPhaseId('');
    setTResponsibleResourceId('');
    setTPlannedStart('');
    setTPlannedEnd('');
    setTEstimatedHours('');
    setTTagsRaw('');
  }

  async function onCreateTask() {
    if (!tName.trim()) return;
    setCreating(true);
    try {
      const hoursRaw = tEstimatedHours.trim();
      const estimatedHoursParsed =
        hoursRaw === '' ? undefined : Number.parseFloat(hoursRaw.replace(',', '.'));
      const tags = parseTagsInput(tTagsRaw);
      await createActionPlanTask(authFetch, actionPlanId, {
        name: tName.trim(),
        description: tDescription.trim() || null,
        status: tStatus,
        priority: tPriority,
        projectId: tProjectId || null,
        riskId: tRiskId || null,
        phaseId: tProjectId ? (tPhaseId || null) : null,
        responsibleResourceId: tResponsibleResourceId || null,
        plannedStartDate: dateInputToIsoDay(tPlannedStart) ?? null,
        plannedEndDate: dateInputToIsoDay(tPlannedEnd) ?? null,
        ...(estimatedHoursParsed !== undefined &&
          !Number.isNaN(estimatedHoursParsed) && {
            estimatedHours: estimatedHoursParsed,
          }),
        tags: tags ?? null,
      });
      await queryClient.invalidateQueries({
        queryKey: [...projectQueryKeys.all, 'action-plan-tasks', clientId, actionPlanId],
      });
      await queryClient.invalidateQueries({
        queryKey: projectQueryKeys.actionPlanDetail(clientId, actionPlanId),
      });
      setOpen(false);
      resetTaskForm();
    } finally {
      setCreating(false);
    }
  }

  const plan = planQuery.data;
  const progressLabel = plan ? `${plan.progressPercent}%` : '—';

  const detailTask = useMemo(() => {
    if (!selectedTaskId || !tasksQuery.data?.items) return null;
    return tasksQuery.data.items.find((t) => t.id === selectedTaskId) ?? null;
  }, [selectedTaskId, tasksQuery.data?.items]);

  useEffect(() => {
    if (!selectedTaskId || !tasksQuery.isSuccess || !tasksQuery.data?.items) return;
    const found = tasksQuery.data.items.some((t) => t.id === selectedTaskId);
    if (!found) setSelectedTaskId(null);
  }, [selectedTaskId, tasksQuery.isSuccess, tasksQuery.data?.items]);

  return (
    <RequireActiveClient>
      <PageContainer>
        <div className="mb-4">
          <Link
            href="/action-plans"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Plans d’action
          </Link>
        </div>

        {planQuery.isLoading && <LoadingState rows={3} />}

        {planQuery.error && (
          <Card className="border-destructive/40">
            <CardContent className="pt-6 text-sm text-destructive">
              Plan introuvable ou accès refusé.
            </CardContent>
          </Card>
        )}

        {plan && (
          <>
            <PageHeader
              title={plan.title}
              description={`${plan.code} · Avancement ${progressLabel} · ${plan.status}`}
              actions={
                <PermissionGate permission="projects.update">
                  <Button type="button" size="sm" onClick={() => setOpen(true)}>
                    <Plus className="size-4" />
                    Nouvelle tâche
                  </Button>
                </PermissionGate>
              }
            />

            <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
              <div className="mb-1 text-xs font-medium text-muted-foreground">Progression du plan</div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, plan.progressPercent))}%` }}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label>Recherche</Label>
                <Input
                  className="w-[min(100%,280px)]"
                  placeholder="Nom de tâche…"
                  value={searchF}
                  onChange={(e) => setSearchF(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Statut tâche</Label>
                <Select
                  value={statusF || '__all'}
                  onValueChange={(v) => setStatusF(!v || v === '__all' ? '' : v)}
                  items={FILTER_STATUS_LABELS}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all">Tous</SelectItem>
                    <SelectItem value="TODO">À faire</SelectItem>
                    <SelectItem value="IN_PROGRESS">En cours</SelectItem>
                    <SelectItem value="BLOCKED">Bloquée</SelectItem>
                    <SelectItem value="DONE">Terminée</SelectItem>
                    <SelectItem value="CANCELLED">Annulée</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Priorité</Label>
                <Select
                  value={priorityF || '__all'}
                  onValueChange={(v) => setPriorityF(!v || v === '__all' ? '' : v)}
                  items={FILTER_PRIORITY_LABELS}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Toutes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all">Toutes</SelectItem>
                    <SelectItem value="LOW">Basse</SelectItem>
                    <SelectItem value="MEDIUM">Moyenne</SelectItem>
                    <SelectItem value="HIGH">Haute</SelectItem>
                    <SelectItem value="CRITICAL">Critique</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {tasksQuery.isLoading && <LoadingState rows={5} />}

            {tasksQuery.data && tasksQuery.data.items.length === 0 && !tasksQuery.isLoading && (
              <EmptyState title="Aucune tâche" description="Ajoutez une tâche à ce plan." />
            )}

            {tasksQuery.data && tasksQuery.data.items.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-border/70">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tâche</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Priorité</TableHead>
                      <TableHead>Projet</TableHead>
                      <TableHead>Risque</TableHead>
                      <TableHead>Début</TableHead>
                      <TableHead>Échéance</TableHead>
                      <TableHead>Charge (h)</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead>Responsable</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasksQuery.data.items.map((row) => (
                      <TableRow
                        key={row.id}
                        className="cursor-pointer"
                        tabIndex={0}
                        onClick={() => setSelectedTaskId(row.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedTaskId(row.id);
                          }
                        }}
                      >
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell>{row.status}</TableCell>
                        <TableCell>{row.priority}</TableCell>
                        <TableCell>
                          {row.project ? `${row.project.code} — ${row.project.name}` : '—'}
                        </TableCell>
                        <TableCell>
                          {row.risk ? `${row.risk.code} — ${row.risk.title}` : '—'}
                        </TableCell>
                        <TableCell>{fmtShortDate(row.plannedStartDate)}</TableCell>
                        <TableCell>{fmtShortDate(row.plannedEndDate)}</TableCell>
                        <TableCell>
                          {row.estimatedHours != null && !Number.isNaN(Number(row.estimatedHours))
                            ? String(row.estimatedHours)
                            : '—'}
                        </TableCell>
                        <TableCell className="max-w-[140px] truncate text-muted-foreground">
                          {formatTagsCell(row.tags)}
                        </TableCell>
                        <TableCell>
                          {row.responsibleResource
                            ? formatResourcePerson(row.responsibleResource)
                            : formatUser(row.ownerUserId, users)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}

        <ActionPlanTaskEditDialog
          open={selectedTaskId !== null}
          onOpenChange={(o) => {
            if (!o) setSelectedTaskId(null);
          }}
          actionPlanId={actionPlanId}
          task={detailTask}
          canEdit={canUpdateProjects}
        />

        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) resetTaskForm();
          }}
        >
          <DialogContent className="max-h-[min(90vh,720px)] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nouvelle tâche dans le plan</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="nt-name">Intitulé</Label>
                <Input
                  id="nt-name"
                  value={tName}
                  onChange={(e) => setTName(e.target.value)}
                  placeholder="Nom de la tâche"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nt-desc">Description</Label>
                <textarea
                  id="nt-desc"
                  value={tDescription}
                  onChange={(e) => setTDescription(e.target.value)}
                  placeholder="Contexte, périmètre, critères de done…"
                  className={textareaClass}
                />
                <p className="text-xs text-muted-foreground">
                  Fortement recommandé pour le pilotage (cadrage partagé).
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Statut</Label>
                  <Select
                    value={tStatus}
                    onValueChange={(v) => setTStatus(v ?? 'TODO')}
                    items={FORM_STATUS_LABELS}
                  >
                    <SelectTrigger className="w-full min-w-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TODO">À faire</SelectItem>
                      <SelectItem value="IN_PROGRESS">En cours</SelectItem>
                      <SelectItem value="BLOCKED">Bloquée</SelectItem>
                      <SelectItem value="DONE">Terminée</SelectItem>
                      <SelectItem value="CANCELLED">Annulée</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Priorité</Label>
                  <Select
                    value={tPriority}
                    onValueChange={(v) => setTPriority(v ?? 'MEDIUM')}
                    items={FORM_PRIORITY_LABELS}
                  >
                    <SelectTrigger className="w-full min-w-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Basse</SelectItem>
                      <SelectItem value="MEDIUM">Moyenne</SelectItem>
                      <SelectItem value="HIGH">Haute</SelectItem>
                      <SelectItem value="CRITICAL">Critique</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="nt-start">Début planifié</Label>
                  <Input
                    id="nt-start"
                    type="date"
                    value={tPlannedStart}
                    onChange={(e) => setTPlannedStart(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nt-end">Échéance</Label>
                  <Input
                    id="nt-end"
                    type="date"
                    value={tPlannedEnd}
                    onChange={(e) => setTPlannedEnd(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nt-hours">Charge estimée (heures)</Label>
                <Input
                  id="nt-hours"
                  inputMode="decimal"
                  value={tEstimatedHours}
                  onChange={(e) => setTEstimatedHours(e.target.value)}
                  placeholder="ex. 4 ou 0,5"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nt-tags">Tags</Label>
                <Input
                  id="nt-tags"
                  value={tTagsRaw}
                  onChange={(e) => setTTagsRaw(e.target.value)}
                  placeholder="ex. urgence, comité, technique (séparés par des virgules)"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Projet (optionnel)</Label>
                {projectsMini.isError && (
                  <p className="text-xs text-destructive">
                    Impossible de charger les projets (réseau ou droits).
                  </p>
                )}
                {projectsMini.isSuccess && (projectsMini.data?.items?.length ?? 0) === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Aucun projet sur ce client — créez-en un dans Projets ou laissez vide.
                  </p>
                )}
                <Select
                  value={tProjectId || '__none'}
                  onValueChange={(v) => setTProjectId(!v || v === '__none' ? '' : v)}
                  items={projectSelectItems}
                >
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue placeholder="Aucun" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Aucun</SelectItem>
                    {(projectsMini.data?.items ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.code} — {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {tProjectId ? (
                <div className="space-y-1.5">
                  <Label>Phase (optionnel)</Label>
                  <Select
                    value={tPhaseId || '__none'}
                    onValueChange={(v) => setTPhaseId(!v || v === '__none' ? '' : v)}
                    items={phaseSelectItems}
                  >
                    <SelectTrigger className="w-full min-w-0">
                      <SelectValue placeholder="Sans phase" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">Sans phase</SelectItem>
                      {(phasesPick.data ?? []).map((ph) => (
                        <SelectItem key={ph.id} value={ph.id}>
                          {ph.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              <div className="space-y-1.5">
                <Label>Risque (optionnel)</Label>
                <Select
                  value={tRiskId || '__none'}
                  onValueChange={(v) => setTRiskId(!v || v === '__none' ? '' : v)}
                  items={riskSelectItems}
                >
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue placeholder="Aucun" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Aucun</SelectItem>
                    {(risksMini.data ?? []).map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.code} — {r.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Responsable personne (optionnel)</Label>
                {resourcesHuman.isError && (
                  <p className="text-xs text-destructive">
                    Impossible de charger le répertoire personnes.
                  </p>
                )}
                {resourcesHuman.isSuccess && humanResources.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Aucune personne en catalogue — ajoutez des ressources humaines (module
                    Personnes) ou laissez vide.
                  </p>
                )}
                <Select
                  value={tResponsibleResourceId || '__none'}
                  onValueChange={(v) =>
                    setTResponsibleResourceId(!v || v === '__none' ? '' : v)
                  }
                  items={responsibleSelectItems}
                >
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue placeholder="Aucune personne" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Aucune personne</SelectItem>
                    {humanResources.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {formatResourcePerson(r)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Ressource métier de type <span className="font-medium text-foreground">Personne</span>{' '}
                  (catalogue humain), distincte d’un compte utilisateur Starium.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button
                type="button"
                disabled={creating || !tName.trim()}
                onClick={() => void onCreateTask()}
              >
                {creating ? 'Création…' : 'Créer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageContainer>
    </RequireActiveClient>
  );
}
