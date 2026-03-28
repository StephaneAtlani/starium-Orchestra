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
  listProjectTaskPhases,
  listProjects,
} from '@/features/projects/api/projects.api';
import { useActionPlanDetailQuery } from '@/features/projects/hooks/use-action-plan-detail-query';
import { useActionPlanTasksQuery } from '@/features/projects/hooks/use-action-plan-tasks-query';
import { useProjectAssignableUsers } from '@/features/projects/hooks/use-project-assignable-users';
import { projectQueryKeys } from '@/features/projects/lib/project-query-keys';
import { cn } from '@/lib/utils';
import { tryListResources, type ResourceListItem } from '@/services/resources';
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
    queryKey: [...projectQueryKeys.all, 'human-resources-pick', clientId],
    queryFn: async () => {
      const out = await tryListResources(authFetch, { type: 'HUMAN', limit: 200, offset: 0 });
      if (!out.ok) return { items: [] as ResourceListItem[] };
      return out.data;
    },
    enabled: !!clientId && enabled,
  });

  const projectsMini = useQuery({
    queryKey: [...projectQueryKeys.all, 'action-plan-project-pick', clientId],
    queryFn: () => listProjects(authFetch, { page: 1, limit: 200 }),
    enabled: !!clientId && enabled,
  });

  const risksMini = useQuery({
    queryKey: projectQueryKeys.clientRisks(clientId),
    queryFn: () => listClientRisks(authFetch),
    enabled: !!clientId && enabled,
  });

  const users = assignable.data?.users ?? [];
  const humanResources = resourcesHuman.data?.items ?? [];

  const [open, setOpen] = useState(false);
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
                      <TableRow key={row.id}>
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
                  <Select value={tStatus} onValueChange={(v) => setTStatus(v ?? 'TODO')}>
                    <SelectTrigger>
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
                  <Select value={tPriority} onValueChange={(v) => setTPriority(v ?? 'MEDIUM')}>
                    <SelectTrigger>
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
                <Select
                  value={tProjectId || '__none'}
                  onValueChange={(v) => setTProjectId(!v || v === '__none' ? '' : v)}
                >
                  <SelectTrigger>
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
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">—</SelectItem>
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
                >
                  <SelectTrigger>
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
                <Select
                  value={tResponsibleResourceId || '__none'}
                  onValueChange={(v) =>
                    setTResponsibleResourceId(!v || v === '__none' ? '' : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">—</SelectItem>
                    {humanResources.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {formatResourcePerson(r)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Référent métier (catalogue Personnes / ressources humaines), pas un compte
                  utilisateur Starium.
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
