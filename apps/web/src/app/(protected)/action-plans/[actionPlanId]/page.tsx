'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/feedback/empty-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { usePermissions } from '@/hooks/use-permissions';
import { ActionPlanTaskCreateDialog } from '@/features/projects/components/action-plan-task-create-dialog';
import { ActionPlanTaskEditDialog } from '@/features/projects/components/action-plan-task-edit-dialog';
import { useActionPlanDetailQuery } from '@/features/projects/hooks/use-action-plan-detail-query';
import { useActionPlanTasksQuery } from '@/features/projects/hooks/use-action-plan-tasks-query';
import { useProjectAssignableUsers } from '@/features/projects/hooks/use-project-assignable-users';
import type { ActionPlanApi } from '@/features/projects/types/project.types';
import { cn } from '@/lib/utils';
import { AlertCircle, ChevronLeft, ClipboardList, Filter, Plus, Search } from 'lucide-react';

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

function formatTagsCell(tags: unknown): string {
  if (tags == null) return '—';
  if (Array.isArray(tags) && tags.every((x) => typeof x === 'string')) {
    return tags.length ? tags.join(', ') : '—';
  }
  return '—';
}

const ACTION_PLAN_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  ACTIVE: 'Actif',
  ON_HOLD: 'En pause',
  COMPLETED: 'Terminé',
  CANCELLED: 'Annulé',
};

const ACTION_PLAN_PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Basse',
  MEDIUM: 'Moyenne',
  HIGH: 'Haute',
};

const TASK_STATUS_LABELS: Record<string, string> = {
  TODO: 'À faire',
  IN_PROGRESS: 'En cours',
  BLOCKED: 'Bloquée',
  DONE: 'Terminée',
  CANCELLED: 'Annulée',
  DRAFT: 'Brouillon',
};

const TASK_PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Basse',
  MEDIUM: 'Moyenne',
  HIGH: 'Haute',
  CRITICAL: 'Critique',
};

function planStatusBadgeClass(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100';
    case 'ON_HOLD':
      return 'border-amber-500/40 bg-amber-500/10 font-medium text-amber-950 dark:text-amber-100';
    case 'COMPLETED':
      return 'border-sky-500/40 bg-sky-500/10 text-sky-950 dark:text-sky-100';
    case 'CANCELLED':
      return 'border-border text-muted-foreground';
    case 'DRAFT':
    default:
      return 'border-border/80 text-foreground';
  }
}

function taskStatusBadgeClass(status: string): string {
  switch (status) {
    case 'DONE':
      return 'border-emerald-500/35 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100';
    case 'IN_PROGRESS':
      return 'border-sky-500/35 bg-sky-500/10 text-sky-950 dark:text-sky-100';
    case 'BLOCKED':
      return 'border-destructive/30 bg-destructive/10 text-destructive';
    case 'CANCELLED':
      return 'border-border text-muted-foreground';
    default:
      return 'border-border/80';
  }
}

function taskPriorityBadgeClass(priority: string): string {
  switch (priority) {
    case 'CRITICAL':
      return 'border-destructive/35 bg-destructive/10 text-destructive';
    case 'HIGH':
      return 'border-amber-500/40 bg-amber-500/10 font-medium text-amber-950 dark:text-amber-100';
    case 'MEDIUM':
      return 'border-border text-foreground';
    default:
      return 'border-border/80 text-muted-foreground';
  }
}

function PlanMetaBadges({ plan }: { plan: ActionPlanApi }) {
  const st = ACTION_PLAN_STATUS_LABELS[plan.status] ?? plan.status;
  const pr = ACTION_PLAN_PRIORITY_LABELS[plan.priority] ?? plan.priority;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="outline" className={cn('font-normal', planStatusBadgeClass(plan.status))}>
        {st}
      </Badge>
      <Badge variant="outline" className="border-border/80 font-normal">
        Priorité {pr}
      </Badge>
    </div>
  );
}

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

  const assignable = useProjectAssignableUsers({ enabled });

  const users = assignable.data?.users ?? [];

  const [open, setOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const plan = planQuery.data;
  const progressPct = plan ? Math.min(100, Math.max(0, plan.progressPercent)) : 0;

  const detailTask = useMemo(() => {
    if (!selectedTaskId || !tasksQuery.data?.items) return null;
    return tasksQuery.data.items.find((t) => t.id === selectedTaskId) ?? null;
  }, [selectedTaskId, tasksQuery.data?.items]);

  useEffect(() => {
    if (!selectedTaskId || !tasksQuery.isSuccess || !tasksQuery.data?.items) return;
    const found = tasksQuery.data.items.some((t) => t.id === selectedTaskId);
    if (!found) setSelectedTaskId(null);
  }, [selectedTaskId, tasksQuery.isSuccess, tasksQuery.data?.items]);

  const resetFilters = () => {
    setStatusF('');
    setPriorityF('');
    setSearchF('');
  };

  const hasActiveFilters = Boolean(statusF || priorityF || searchF.trim());

  const pageDescription = plan
    ? `${plan.code} · ${ACTION_PLAN_STATUS_LABELS[plan.status] ?? plan.status} · avancement ${plan.progressPercent}%`
    : undefined;

  const ownerLabel = plan?.owner
    ? [plan.owner.firstName, plan.owner.lastName].filter(Boolean).join(' ').trim() || plan.owner.email
    : null;

  return (
    <RequireActiveClient>
      <PageContainer>
        <div className="mb-2">
          <Link
            href="/action-plans"
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'sm' }),
              '-ml-2 gap-1 text-muted-foreground hover:text-foreground',
            )}
          >
            <ChevronLeft className="size-4 shrink-0" aria-hidden />
            Plans d’action
          </Link>
        </div>

        {planQuery.isLoading && <LoadingState rows={3} />}

        {planQuery.error && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Plan inaccessible</AlertTitle>
            <AlertDescription>
              Plan introuvable ou accès refusé pour ce client.
            </AlertDescription>
          </Alert>
        )}

        {plan && (
          <>
            <PageHeader
              title={plan.title}
              description={pageDescription}
              actions={
                <PermissionGate permission="projects.update">
                  <Button type="button" size="sm" onClick={() => setOpen(true)}>
                    <Plus className="size-4" />
                    Nouvelle tâche
                  </Button>
                </PermissionGate>
              }
            />

            {/* §6.1 — synthèse compacte */}
            <section className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div
                    className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
                    aria-hidden
                  >
                    <ClipboardList className="size-5" />
                  </div>
                  <div className="min-w-0 space-y-2">
                    <PlanMetaBadges plan={plan} />
                    {plan.description?.trim() ? (
                      <p className="max-w-2xl text-sm text-muted-foreground">{plan.description.trim()}</p>
                    ) : null}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                    Avancement
                  </div>
                  <div className="tabular-nums text-2xl font-semibold tracking-tight text-primary">
                    {plan.progressPercent}%
                  </div>
                </div>
              </div>
              <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-border/70 bg-muted/25 px-3 py-2">
                  <div className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                    Début
                  </div>
                  <div className="mt-0.5 text-sm font-medium tabular-nums text-foreground">
                    {fmtShortDate(plan.startDate)}
                  </div>
                </div>
                <div className="rounded-lg border border-border/70 bg-muted/25 px-3 py-2">
                  <div className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                    Échéance cible
                  </div>
                  <div className="mt-0.5 text-sm font-medium tabular-nums text-foreground">
                    {fmtShortDate(plan.targetDate)}
                  </div>
                </div>
                <div className="rounded-lg border border-border/70 bg-muted/25 px-3 py-2 sm:col-span-2 lg:col-span-2">
                  <div className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                    Responsable plan
                  </div>
                  <div className="mt-0.5 truncate text-sm font-medium text-foreground">
                    {ownerLabel ?? '—'}
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Progression du plan</span>
                  <span className="tabular-nums text-xs text-muted-foreground">{progressPct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            </section>

            {/* §7 — filtres */}
            <Card size="sm" className="overflow-hidden shadow-sm" role="search" aria-label="Filtrer les tâches">
              <CardHeader className="flex flex-col gap-2 border-b border-border/60 pb-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-0.5">
                  <CardTitle className="text-sm font-medium">Filtrer les tâches</CardTitle>
                  <CardDescription className="text-xs">
                    Recherche par libellé, filtre par statut ou priorité.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 self-start"
                  disabled={!hasActiveFilters}
                  onClick={resetFilters}
                >
                  Réinitialiser
                </Button>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div>
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Search className="size-3.5 text-muted-foreground" aria-hidden />
                    Recherche
                  </div>
                  <div className="relative max-w-lg">
                    <Search
                      className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden
                    />
                    <Input
                      className="w-full pl-9"
                      placeholder="Nom de tâche…"
                      value={searchF}
                      onChange={(e) => setSearchF(e.target.value)}
                      aria-label="Rechercher une tâche par nom"
                    />
                  </div>
                </div>
                <div className="h-px bg-border/70" />
                <div>
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Filter className="size-3.5 text-muted-foreground" aria-hidden />
                    Filtrer par
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="ap-task-status">Statut tâche</Label>
                      <Select
                        value={statusF || '__all'}
                        onValueChange={(v) => setStatusF(!v || v === '__all' ? '' : v)}
                      >
                        <SelectTrigger id="ap-task-status" className="w-full min-w-0">
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
                      <Label htmlFor="ap-task-priority">Priorité</Label>
                      <Select
                        value={priorityF || '__all'}
                        onValueChange={(v) => setPriorityF(!v || v === '__all' ? '' : v)}
                      >
                        <SelectTrigger id="ap-task-priority" className="w-full min-w-0">
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
                </div>
              </CardContent>
            </Card>

            {tasksQuery.isLoading && <LoadingState rows={5} />}

            {tasksQuery.data && tasksQuery.data.items.length === 0 && !tasksQuery.isLoading && (
              <Card size="sm" className="overflow-hidden shadow-sm">
                <CardContent className="py-10">
                  <EmptyState
                    title="Aucune tâche"
                    description="Ajoutez une tâche à ce plan ou élargissez les filtres."
                  />
                </CardContent>
              </Card>
            )}

            {tasksQuery.data && tasksQuery.data.items.length > 0 && (
              <Card size="sm" className="overflow-hidden shadow-sm">
                <CardHeader className="border-b border-border/60 pb-3">
                  <CardTitle className="text-sm font-medium">Tâches du plan</CardTitle>
                  <CardDescription className="text-xs">
                    Cliquez sur une ligne pour ouvrir la fiche tâche (lecture / édition selon vos droits).
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table className="min-w-[56rem]">
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
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn('font-normal', taskStatusBadgeClass(row.status))}
                            >
                              {TASK_STATUS_LABELS[row.status] ?? row.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn('font-normal', taskPriorityBadgeClass(row.priority))}
                            >
                              {TASK_PRIORITY_LABELS[row.priority] ?? row.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {row.project ? `${row.project.code} — ${row.project.name}` : '—'}
                          </TableCell>
                          <TableCell>
                            {row.risk ? `${row.risk.code} — ${row.risk.title}` : '—'}
                          </TableCell>
                          <TableCell className="tabular-nums">{fmtShortDate(row.plannedStartDate)}</TableCell>
                          <TableCell className="tabular-nums">{fmtShortDate(row.plannedEndDate)}</TableCell>
                          <TableCell className="tabular-nums">
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
                </CardContent>
                <CardFooter className="border-t border-border/60 bg-muted/15 py-2 text-xs text-muted-foreground">
                  {tasksQuery.data.items.length === tasksQuery.data.total
                    ? `${tasksQuery.data.total} tâche${tasksQuery.data.total > 1 ? 's' : ''}`
                    : `Affichage de ${tasksQuery.data.items.length} sur ${tasksQuery.data.total} tâche${tasksQuery.data.total > 1 ? 's' : ''}`}
                </CardFooter>
              </Card>
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

        <ActionPlanTaskCreateDialog
          open={open}
          onOpenChange={setOpen}
          actionPlanId={actionPlanId}
          prefill={null}
        />
      </PageContainer>
    </RequireActiveClient>
  );
}
