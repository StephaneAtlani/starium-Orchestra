'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { PermissionGate } from '@/components/PermissionGate';
import { useActiveClient } from '@/hooks/use-active-client';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { usePermissions } from '@/hooks/use-permissions';
import { listClientRisks, listProjects } from '@/features/projects/api/projects.api';
import { ActionPlanTaskCreateDialog } from '@/features/projects/components/action-plan-task-create-dialog';
import { ActionPlanTaskEditDialog } from '@/features/projects/components/action-plan-task-edit-dialog';
import {
  ActionPlanTasksTable,
  type ActionPlanTaskSortField,
} from '@/features/projects/components/action-plan-tasks-table';
import { useActionPlanDetailQuery } from '@/features/projects/hooks/use-action-plan-detail-query';
import { useActionPlanTasksQuery } from '@/features/projects/hooks/use-action-plan-tasks-query';
import { useProjectAssignableUsers } from '@/features/projects/hooks/use-project-assignable-users';
import { projectQueryKeys } from '@/features/projects/lib/project-query-keys';
import type { ActionPlanApi } from '@/features/projects/types/project.types';
import { cn } from '@/lib/utils';
import { AlertCircle, ChevronLeft, ClipboardList, Plus } from 'lucide-react';

function fmtShortDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short' }).format(new Date(iso));
  } catch {
    return '—';
  }
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
  const authFetch = useAuthenticatedFetch();
  const { has, isSuccess: permsSuccess } = usePermissions();
  const canRead = has('projects.read');
  const canUpdateProjects = has('projects.update');
  const enabled = !!clientId && permsSuccess && canRead && !!actionPlanId;

  const planQuery = useActionPlanDetailQuery(actionPlanId, { enabled });
  const [statusF, setStatusF] = useState<string>('');
  const [priorityF, setPriorityF] = useState<string>('');
  const [searchF, setSearchF] = useState('');
  const [projectIdF, setProjectIdF] = useState<string>('');
  const [riskIdF, setRiskIdF] = useState<string>('');
  const [ownerUserIdF, setOwnerUserIdF] = useState<string>('');
  const [sortByField, setSortByField] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const tasksQuery = useActionPlanTasksQuery(
    actionPlanId,
    {
      status: statusF || undefined,
      priority: priorityF || undefined,
      projectId: projectIdF || undefined,
      riskId: riskIdF || undefined,
      ownerUserId: ownerUserIdF || undefined,
      search: searchF.trim() || undefined,
      sortBy: sortByField || undefined,
      sortOrder: sortByField ? sortOrder : undefined,
      limit: 100,
      offset: 0,
    },
    { enabled },
  );

  const projectsPick = useQuery({
    queryKey: [...projectQueryKeys.all, 'action-plan-detail-projects-pick', clientId],
    queryFn: () => listProjects(authFetch, { page: 1, limit: 200 }),
    enabled,
  });
  const risksPick = useQuery({
    queryKey: projectQueryKeys.clientRisks(clientId),
    queryFn: () => listClientRisks(authFetch),
    enabled: enabled && !!clientId,
  });

  const projectOptions = useMemo(
    () =>
      (projectsPick.data?.items ?? []).map((p) => ({
        id: p.id,
        label: `${p.code} — ${p.name}`,
      })),
    [projectsPick.data?.items],
  );
  const riskOptions = useMemo(
    () =>
      (risksPick.data ?? []).map((r) => ({
        id: r.id,
        label: `${r.code} — ${r.title}`,
      })),
    [risksPick.data],
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
    setProjectIdF('');
    setRiskIdF('');
    setOwnerUserIdF('');
    setSortByField('');
    setSortOrder('asc');
  };

  const applyTaskSort = useCallback((key: ActionPlanTaskSortField) => {
    setSortByField((prev) => {
      if (prev === key) {
        setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortOrder('asc');
      return key;
    });
  }, []);

  const hasActiveFilters = Boolean(
    statusF ||
      priorityF ||
      searchF.trim() ||
      projectIdF ||
      riskIdF ||
      ownerUserIdF ||
      sortByField,
  );

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

            {/* §7 — filtres + tableau (double en-tête, cf. portefeuille projets) */}
            <Card
              size="sm"
              className="overflow-hidden shadow-sm"
              role="search"
              aria-label="Filtrer et trier les tâches du plan"
            >
              <CardHeader className="flex flex-col gap-2 border-b border-border/60 pb-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-0.5">
                  <CardTitle className="text-sm font-medium">Filtrer et trier</CardTitle>
                  <CardDescription className="text-xs">
                    Filtres sur la deuxième ligne d’en-tête ; cliquez sur un libellé pour trier. Ligne de données
                    : ouverture de la fiche tâche.
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
              {tasksQuery.isLoading && tasksQuery.data == null ? (
                <CardContent className="py-8">
                  <LoadingState rows={5} />
                </CardContent>
              ) : tasksQuery.data && tasksQuery.data.items.length === 0 ? (
                <CardContent className="py-10">
                  <EmptyState
                    title="Aucune tâche"
                    description="Ajoutez une tâche à ce plan ou élargissez les filtres."
                  />
                </CardContent>
              ) : tasksQuery.data && tasksQuery.data.items.length > 0 ? (
                <>
                  <CardContent className="p-0">
                    <ActionPlanTasksTable
                      items={tasksQuery.data.items}
                      users={users}
                      search={searchF}
                      onSearchChange={setSearchF}
                      status={statusF}
                      onStatusChange={setStatusF}
                      priority={priorityF}
                      onPriorityChange={setPriorityF}
                      projectId={projectIdF}
                      onProjectIdChange={setProjectIdF}
                      riskId={riskIdF}
                      onRiskIdChange={setRiskIdF}
                      ownerUserId={ownerUserIdF}
                      onOwnerUserIdChange={setOwnerUserIdF}
                      projectOptions={projectOptions}
                      riskOptions={riskOptions}
                      sortBy={sortByField}
                      sortOrder={sortOrder}
                      onSort={applyTaskSort}
                      onRowClick={(id) => setSelectedTaskId(id)}
                    />
                  </CardContent>
                  <CardFooter className="border-t border-border/60 bg-muted/15 py-2 text-xs text-muted-foreground">
                    {tasksQuery.data.items.length === tasksQuery.data.total
                      ? `${tasksQuery.data.total} tâche${tasksQuery.data.total > 1 ? 's' : ''}`
                      : `Affichage de ${tasksQuery.data.items.length} sur ${tasksQuery.data.total} tâche${tasksQuery.data.total > 1 ? 's' : ''}`}
                  </CardFooter>
                </>
              ) : null}
            </Card>
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
