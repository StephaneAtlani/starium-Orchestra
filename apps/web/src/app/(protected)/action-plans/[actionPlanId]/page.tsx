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
import { Input } from '@/components/ui/input';
import { RegistryBadge } from '@/lib/ui/registry-badge';
import {
  PROJECT_ENTITY_PRIORITY_KEYS,
  type ProjectEntityPriorityKey,
  type ProjectLifecycleStatusKey,
} from '@/lib/ui/badge-registry';
import { useClientUiBadgeConfig } from '@/features/ui/hooks/use-client-ui-badge-config';
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
import { updateActionPlan } from '@/features/projects/api/action-plans.api';
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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

/** Style = cycle de vie projet (RFC-PLA-001 `ACTIVE` ≈ `IN_PROGRESS`). */
function actionPlanStatusToLifecycleKey(
  status: string,
): ProjectLifecycleStatusKey {
  const m: Record<string, ProjectLifecycleStatusKey> = {
    DRAFT: 'DRAFT',
    ACTIVE: 'IN_PROGRESS',
    ON_HOLD: 'ON_HOLD',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
  };
  return m[status] ?? 'DRAFT';
}

function PlanMetaBadges({ plan }: { plan: ActionPlanApi }) {
  const { merged } = useClientUiBadgeConfig();
  const lifecycleKey = actionPlanStatusToLifecycleKey(plan.status);
  const statusBadge = merged.projectLifecycleStatus[lifecycleKey];
  const statusLabel = ACTION_PLAN_STATUS_LABELS[plan.status] ?? plan.status;

  const priorityKnown = (
    PROJECT_ENTITY_PRIORITY_KEYS as readonly string[]
  ).includes(plan.priority);
  const priorityEntry = priorityKnown
    ? merged.projectEntityPriority[plan.priority as ProjectEntityPriorityKey]
    : undefined;
  const priorityWord =
    priorityEntry?.label ??
    ACTION_PLAN_PRIORITY_LABELS[plan.priority] ??
    plan.priority;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <RegistryBadge className={statusBadge.className}>{statusLabel}</RegistryBadge>
      <RegistryBadge
        className={
          priorityEntry?.className ?? 'border-border/80 text-foreground'
        }
      >
        Priorité {priorityWord}
      </RegistryBadge>
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
  const [activeMetaEdit, setActiveMetaEdit] = useState<
    'title' | 'status' | 'priority' | 'owner' | null
  >(null);
  const [editableTitle, setEditableTitle] = useState<string>('');
  const [editableStatus, setEditableStatus] = useState<string>('ACTIVE');
  const [editablePriority, setEditablePriority] = useState<string>('MEDIUM');
  const [editableOwnerUserId, setEditableOwnerUserId] = useState<string>('__none__');
  const queryClient = useQueryClient();

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
  const planMetaMutation = useMutation({
    mutationFn: (payload: { status?: string; priority?: string; ownerUserId?: string | null }) =>
      updateActionPlan(authFetch, actionPlanId, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: projectQueryKeys.actionPlanDetail(clientId, actionPlanId),
        }),
        queryClient.invalidateQueries({
          queryKey: [...projectQueryKeys.all, 'action-plan-tasks', clientId, actionPlanId],
        }),
      ]);
      setActiveMetaEdit(null);
    },
  });

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
  const ownerOptions = useMemo(
    () =>
      users.map((u) => ({
        id: u.id,
        label: [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.email,
      })),
    [users],
  );
  const selectedOwnerLabel =
    editableOwnerUserId === '__none__'
      ? 'Non assigné'
      : ownerOptions.find((o) => o.id === editableOwnerUserId)?.label ?? 'Non assigné';
  const derivedWindow = useMemo(() => {
    const items = tasksQuery.data?.items ?? [];
    const toTs = (iso: string | null | undefined) => {
      if (!iso) return null;
      const ts = new Date(iso).getTime();
      return Number.isFinite(ts) ? ts : null;
    };
    const starts = items
      .map((t) => toTs(t.actualStartDate ?? t.plannedStartDate))
      .filter((v): v is number => v != null);
    const ends = items
      .map((t) => toTs(t.actualEndDate ?? t.plannedEndDate))
      .filter((v): v is number => v != null);
    return {
      startDate: starts.length > 0 ? new Date(Math.min(...starts)).toISOString() : null,
      endDate: ends.length > 0 ? new Date(Math.max(...ends)).toISOString() : null,
    };
  }, [tasksQuery.data?.items]);

  useEffect(() => {
    if (!plan) return;
    setEditableTitle(plan.title);
    setEditableStatus(plan.status);
    setEditablePriority(plan.priority);
    setEditableOwnerUserId(plan.ownerUserId ?? '__none__');
  }, [plan]);

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
              title={
                activeMetaEdit === 'title' ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      value={editableTitle}
                      onChange={(event) => setEditableTitle(event.target.value)}
                      className="h-9 w-full max-w-xl"
                      aria-label="Titre du plan d’action"
                    />
                    <Button
                      type="button"
                      size="sm"
                      disabled={planMetaMutation.isPending || editableTitle.trim().length === 0}
                      onClick={() =>
                        planMetaMutation.mutate({
                          title: editableTitle.trim(),
                        })
                      }
                    >
                      OK
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={planMetaMutation.isPending}
                      onClick={() => {
                        setEditableTitle(plan.title);
                        setActiveMetaEdit(null);
                      }}
                    >
                      Annuler
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="rounded px-1 py-0.5 text-left text-2xl font-semibold tracking-tight text-foreground hover:bg-muted"
                    onClick={() => {
                      if (!canUpdateProjects) return;
                      setEditableTitle(plan.title);
                      setActiveMetaEdit('title');
                    }}
                  >
                    {plan.title}
                  </button>
                )
              }
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
                    {activeMetaEdit === 'status' || activeMetaEdit === 'priority' ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Select value={editableStatus} onValueChange={(value) => setEditableStatus(value ?? '')}>
                          <SelectTrigger className="h-8 w-[150px] text-xs">
                            <SelectValue>
                              {ACTION_PLAN_STATUS_LABELS[editableStatus] ?? editableStatus}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(ACTION_PLAN_STATUS_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={editablePriority}
                          onValueChange={(value) => setEditablePriority(value ?? '')}
                        >
                          <SelectTrigger className="h-8 w-[150px] text-xs">
                            <SelectValue>
                              {ACTION_PLAN_PRIORITY_LABELS[editablePriority] ?? editablePriority}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(ACTION_PLAN_PRIORITY_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 px-2 text-xs"
                          disabled={planMetaMutation.isPending}
                          onClick={() =>
                            planMetaMutation.mutate({
                              status: editableStatus,
                              priority: editablePriority,
                            })
                          }
                        >
                          OK
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 px-2 text-xs"
                          disabled={planMetaMutation.isPending}
                          onClick={() => {
                            setEditableStatus(plan.status);
                            setEditablePriority(plan.priority);
                            setActiveMetaEdit(null);
                          }}
                        >
                          Annuler
                        </Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="rounded px-1 py-0.5 text-left hover:bg-muted"
                        onClick={() => setActiveMetaEdit('status')}
                      >
                        <PlanMetaBadges plan={plan} />
                      </button>
                    )}
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
                    Début (calculé)
                  </div>
                  <div className="mt-0.5 text-sm font-medium tabular-nums text-foreground">
                    {fmtShortDate(derivedWindow.startDate)}
                  </div>
                </div>
                <div className="rounded-lg border border-border/70 bg-muted/25 px-3 py-2">
                  <div className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                    Fin (calculée)
                  </div>
                  <div className="mt-0.5 text-sm font-medium tabular-nums text-foreground">
                    {fmtShortDate(derivedWindow.endDate)}
                  </div>
                </div>
                <div className="rounded-lg border border-border/70 bg-muted/25 px-3 py-2 sm:col-span-2 lg:col-span-2">
                  <div className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                    Responsable plan
                  </div>
                  {activeMetaEdit === 'owner' ? (
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Select
                        value={editableOwnerUserId}
                        onValueChange={(value) => setEditableOwnerUserId(value ?? '__none__')}
                      >
                        <SelectTrigger className="h-8 w-[280px] text-xs">
                          <SelectValue>{selectedOwnerLabel}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Non assigné</SelectItem>
                          {ownerOptions.map((option) => (
                            <SelectItem key={option.id} value={option.id}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 px-2 text-xs"
                        disabled={planMetaMutation.isPending}
                        onClick={() =>
                          planMetaMutation.mutate({
                            ownerUserId: editableOwnerUserId === '__none__' ? null : editableOwnerUserId,
                          })
                        }
                      >
                        OK
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 px-2 text-xs"
                        disabled={planMetaMutation.isPending}
                        onClick={() => {
                          setEditableOwnerUserId(plan.ownerUserId ?? '__none__');
                          setActiveMetaEdit(null);
                        }}
                      >
                        Annuler
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="mt-0.5 truncate rounded px-1 py-0.5 text-left text-sm font-medium text-foreground hover:bg-muted"
                      onClick={() => setActiveMetaEdit('owner')}
                    >
                      {ownerLabel ?? '—'}
                    </button>
                  )}
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
