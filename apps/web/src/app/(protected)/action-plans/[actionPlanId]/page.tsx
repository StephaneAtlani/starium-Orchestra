'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from '@/lib/toast';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/feedback/empty-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { ActionPlanMetaBadges } from '@/features/projects/components/action-plan-meta-badges';
import {
  ACTION_PLAN_PRIORITY_LABELS,
  ACTION_PLAN_STATUS_LABELS,
} from '@/features/projects/lib/action-plan-display';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/PermissionGate';
import { useActiveClient } from '@/hooks/use-active-client';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { usePermissions } from '@/hooks/use-permissions';
import { listClientRisks, listProjects } from '@/features/projects/api/projects.api';
import {
  updateActionPlan,
  updateActionPlanTask,
  type UpdateActionPlanPayload,
} from '@/features/projects/api/action-plans.api';
import { ActionPlanDetailKpiStrip } from '@/features/projects/components/action-plan-detail-kpi-strip';
import { ActionPlanTaskCreateDialog } from '@/features/projects/components/action-plan-task-create-dialog';
import { ActionPlanTaskEditDialog } from '@/features/projects/components/action-plan-task-edit-dialog';
import { ActionPlanTasksKanban } from '@/features/projects/components/action-plan-tasks-kanban';
import {
  ActionPlanTasksTable,
  type ActionPlanTaskSortField,
} from '@/features/projects/components/action-plan-tasks-table';
import { ActionPlanTasksToolbar } from '@/features/projects/components/action-plan-tasks-toolbar';
import { useActionPlanDetailQuery } from '@/features/projects/hooks/use-action-plan-detail-query';
import { useActionPlanTasksQuery } from '@/features/projects/hooks/use-action-plan-tasks-query';
import { useProjectAssignableUsers } from '@/features/projects/hooks/use-project-assignable-users';
import { projectQueryKeys } from '@/features/projects/lib/project-query-keys';
import type { ActionPlanApi, ActionPlanTaskApi } from '@/features/projects/types/project.types';
import { useTablePan } from '@/hooks/use-table-pan';
import { cn } from '@/lib/utils';
import { AlertCircle, ChevronLeft, Download, Plus } from 'lucide-react';
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

const ACTION_PLAN_TASKS_VIEW_MODE_KEY = 'starium.action-plan.tasksViewMode';

function sanitizeFileName(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function fmtExportDateTime(date: Date): string {
  const pad = (v: number) => String(v).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
}

function taskOwnerLabel(task: ActionPlanTaskApi, ownerLabelById: Map<string, string>): string {
  if (task.ownerUserId) {
    return ownerLabelById.get(task.ownerUserId) ?? task.ownerUserId;
  }
  return 'Non assigne';
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
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
  const [tasksViewMode, setTasksViewMode] = useState<'table' | 'kanban'>('kanban');
  const tablePan = useTablePan();
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

  /** KPIs détail = toutes les actions du plan (hors filtres UI). */
  const tasksStatsQuery = useActionPlanTasksQuery(
    actionPlanId,
    { limit: 100, offset: 0 },
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

  const users = useMemo(
    () => assignable.data?.users ?? [],
    [assignable.data?.users],
  );

  const [open, setOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingXlsx, setIsExportingXlsx] = useState(false);
  const [exportFormatValue, setExportFormatValue] = useState<string>('');

  const plan = planQuery.data;
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
  const planMetaMutation = useMutation({
    mutationFn: (payload: UpdateActionPlanPayload) =>
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

  const taskStatusMutation = useMutation({
    mutationFn: ({
      taskId,
      toStatus,
    }: {
      taskId: string;
      fromStatus: string;
      toStatus: string;
    }) => updateActionPlanTask(authFetch, actionPlanId, taskId, { status: toStatus }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [...projectQueryKeys.all, 'action-plan-tasks', clientId, actionPlanId],
        }),
        queryClient.invalidateQueries({
          queryKey: projectQueryKeys.actionPlanDetail(clientId, actionPlanId),
        }),
      ]);
      toast.success('Statut de la tâche mis à jour.');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Impossible de déplacer la tâche.');
    },
  });

  const detailTask = useMemo(() => {
    if (!selectedTaskId || !tasksQuery.data?.items) return null;
    return tasksQuery.data.items.find((t) => t.id === selectedTaskId) ?? null;
  }, [selectedTaskId, tasksQuery.data?.items]);

  const ownerLabelById = useMemo(
    () => new Map(ownerOptions.map((option) => [option.id, option.label])),
    [ownerOptions],
  );

  const taskRowsForExport = useMemo(
    () => (tasksQuery.data?.items ?? []).map((task, index) => ({
      index: index + 1,
      code: task.code ?? '',
      name: task.name,
      status: task.status,
      priority: task.priority,
      progress: `${task.progress}%`,
      owner: taskOwnerLabel(task, ownerLabelById),
      project: task.project ? `${task.project.code} - ${task.project.name}` : '',
      risk: task.risk ? `${task.risk.code} - ${task.risk.title}` : '',
      plannedStartDate: fmtShortDate(task.plannedStartDate),
      plannedEndDate: fmtShortDate(task.plannedEndDate),
      actualStartDate: fmtShortDate(task.actualStartDate),
      actualEndDate: fmtShortDate(task.actualEndDate),
      description: task.description ?? '',
    })),
    [tasksQuery.data?.items, ownerLabelById],
  );

  const exportBaseName = useMemo(() => {
    if (!plan) return 'plan-action';
    const core = sanitizeFileName(`${plan.code}-${plan.title}`) || plan.code.toLowerCase();
    return `${core}-${fmtExportDateTime(new Date())}`;
  }, [plan]);
  const isExporting = isExportingPdf || isExportingXlsx;

  const handleExportXlsx = useCallback(async () => {
    if (!plan) return;
    setIsExportingXlsx(true);
    try {
      const excel = await import('exceljs');
      const workbook = new excel.Workbook();
      workbook.created = new Date();

      const summarySheet = workbook.addWorksheet('Plan');
      summarySheet.addRow(['Code', plan.code]);
      summarySheet.addRow(['Titre', plan.title]);
      summarySheet.addRow(['Statut', ACTION_PLAN_STATUS_LABELS[plan.status] ?? plan.status]);
      summarySheet.addRow(['Priorite', ACTION_PLAN_PRIORITY_LABELS[plan.priority] ?? plan.priority]);
      summarySheet.addRow(['Avancement', `${plan.progressPercent}%`]);
      summarySheet.addRow(['Responsable', ownerLabel ?? 'Non assigne']);
      summarySheet.addRow(['Nombre de taches', String(taskRowsForExport.length)]);
      summarySheet.columns = [{ width: 24 }, { width: 60 }];

      const tasksSheet = workbook.addWorksheet('Taches');
      tasksSheet.columns = [
        { header: '#', key: 'index', width: 6 },
        { header: 'Code', key: 'code', width: 16 },
        { header: 'Tache', key: 'name', width: 40 },
        { header: 'Statut', key: 'status', width: 14 },
        { header: 'Priorite', key: 'priority', width: 12 },
        { header: 'Avancement', key: 'progress', width: 12 },
        { header: 'Responsable', key: 'owner', width: 24 },
        { header: 'Projet', key: 'project', width: 26 },
        { header: 'Risque', key: 'risk', width: 26 },
        { header: 'Debut prevu', key: 'plannedStartDate', width: 14 },
        { header: 'Fin prevue', key: 'plannedEndDate', width: 14 },
        { header: 'Debut reel', key: 'actualStartDate', width: 14 },
        { header: 'Fin reelle', key: 'actualEndDate', width: 14 },
        { header: 'Description', key: 'description', width: 40 },
      ];
      tasksSheet.getRow(1).font = { bold: true };
      taskRowsForExport.forEach((row) => tasksSheet.addRow(row));

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      downloadBlob(blob, `${exportBaseName}.xlsx`);
      toast.success('Export XLSX genere.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export XLSX impossible.");
    } finally {
      setIsExportingXlsx(false);
    }
  }, [exportBaseName, ownerLabel, plan, taskRowsForExport]);

  const handleExportPdf = useCallback(async () => {
    if (!plan) return;
    setIsExportingPdf(true);
    try {
      const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=1280,height=900');
      if (!printWindow) {
        throw new Error("Popup bloquee. Autorise les popups pour exporter en PDF.");
      }

      const tableRows = taskRowsForExport
        .map(
          (row) => `<tr>
<td>${row.index}</td>
<td>${escapeHtml(row.code || '-')}</td>
<td>${escapeHtml(row.name)}</td>
<td>${escapeHtml(row.status)}</td>
<td>${escapeHtml(row.priority)}</td>
<td>${escapeHtml(row.progress)}</td>
<td>${escapeHtml(row.owner)}</td>
<td>${escapeHtml(row.project || '-')}</td>
<td>${escapeHtml(row.risk || '-')}</td>
<td>${escapeHtml(row.plannedEndDate)}</td>
</tr>`,
        )
        .join('');

      const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(exportBaseName)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; color: #111; }
    h1 { font-size: 20px; margin: 0 0 8px; }
    .meta { font-size: 12px; margin-bottom: 14px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { border: 1px solid #d4d4d4; padding: 6px; text-align: left; vertical-align: top; }
    th { background: #f4f4f5; }
  </style>
</head>
<body>
  <h1>Plan d'action: ${escapeHtml(plan.code)} - ${escapeHtml(plan.title)}</h1>
  <div class="meta">
    Statut: ${escapeHtml(ACTION_PLAN_STATUS_LABELS[plan.status] ?? plan.status)} |
    Priorite: ${escapeHtml(ACTION_PLAN_PRIORITY_LABELS[plan.priority] ?? plan.priority)} |
    Avancement: ${escapeHtml(`${plan.progressPercent}%`)} |
    Responsable: ${escapeHtml(ownerLabel ?? 'Non assigne')} |
    Taches: ${taskRowsForExport.length}
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th><th>Code</th><th>Tache</th><th>Statut</th><th>Priorite</th><th>%</th><th>Responsable</th><th>Projet</th><th>Risque</th><th>Fin prevue</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>
</body>
</html>`;

      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      toast.success('Apercu PDF ouvert.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Export PDF impossible.');
    } finally {
      setIsExportingPdf(false);
    }
  }, [exportBaseName, ownerLabel, plan, taskRowsForExport]);

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

  const handleTasksViewModeChange = useCallback((nextMode: 'table' | 'kanban') => {
    setTasksViewMode(nextMode);
    try {
      window.localStorage.setItem(ACTION_PLAN_TASKS_VIEW_MODE_KEY, nextMode);
    } catch {
      // ignore localStorage failures
    }
  }, []);

  const handleTaskStatusDrop = useCallback(
    (payload: { taskId: string; fromStatus: string; toStatus: string }) => {
      if (!canUpdateProjects) return;
      if (payload.fromStatus === payload.toStatus) return;
      taskStatusMutation.mutate(payload);
    },
    [canUpdateProjects, taskStatusMutation],
  );

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
    ? plan.description?.trim()
      ? plan.description.trim()
      : `Pilotez les actions correctives et d'amélioration — ${plan.code}.`
    : undefined;

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

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(ACTION_PLAN_TASKS_VIEW_MODE_KEY);
      if (stored === 'table' || stored === 'kanban') {
        setTasksViewMode(stored);
      }
    } catch {
      // ignore localStorage failures
    }
  }, []);

  return (
    <RequireActiveClient>
      <PageContainer>
        <Link href="/action-plans" className="starium-mb-back">
          <ChevronLeft aria-hidden />
          Tous les plans d&apos;action
        </Link>

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
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 rounded-md border border-input bg-background px-2">
                    <Download className="size-4 text-muted-foreground" />
                    <Select
                      value={exportFormatValue}
                      onValueChange={(value) => {
                        setExportFormatValue('');
                        if (value === 'pdf') {
                          void handleExportPdf();
                          return;
                        }
                        if (value === 'xlsx') {
                          void handleExportXlsx();
                        }
                      }}
                      disabled={isExporting || tasksQuery.isLoading}
                    >
                      <SelectTrigger className="h-9 min-w-[170px] border-0 px-1 shadow-none focus:ring-0">
                        <SelectValue placeholder={isExporting ? 'Export en cours...' : 'Exporter'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">Exporter en PDF</SelectItem>
                        <SelectItem value="xlsx">Exporter en XLSX</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <PermissionGate permission="projects.update">
                    <Button type="button" size="sm" onClick={() => setOpen(true)}>
                      <Plus className="size-4" />
                      Nouvelle action
                    </Button>
                  </PermissionGate>
                </div>
              }
            />

            <ActionPlanDetailKpiStrip
              items={tasksStatsQuery.data?.items}
              isLoading={tasksStatsQuery.isLoading && tasksStatsQuery.data == null}
            />

            {/* Métadonnées plan — édition compacte */}
            <section className="rounded-[var(--radius-lg,14px)] border border-[color:var(--neutral-200)] bg-[color:var(--neutral-0)] p-4 shadow-[var(--shadow-1)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
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
                      onClick={() => {
                        if (!canUpdateProjects) return;
                        setActiveMetaEdit('status');
                      }}
                    >
                      <ActionPlanMetaBadges plan={plan} />
                    </button>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <div className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                      Début (calculé)
                    </div>
                    <div className="mt-0.5 text-sm font-medium tabular-nums text-foreground">
                      {fmtShortDate(derivedWindow.startDate)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                      Fin (calculée)
                    </div>
                    <div className="mt-0.5 text-sm font-medium tabular-nums text-foreground">
                      {fmtShortDate(derivedWindow.endDate)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                      Responsable plan
                    </div>
                    {activeMetaEdit === 'owner' ? (
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Select
                          value={editableOwnerUserId}
                          onValueChange={(value) => setEditableOwnerUserId(value ?? '__none__')}
                        >
                          <SelectTrigger className="h-8 w-[220px] text-xs">
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
                        onClick={() => {
                          if (!canUpdateProjects) return;
                          setActiveMetaEdit('owner');
                        }}
                      >
                        {ownerLabel ?? '—'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="flex flex-col gap-[14px]" aria-label="Actions du plan">
              <ActionPlanTasksToolbar
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
                users={users}
                onReset={resetFilters}
                hasActiveFilters={hasActiveFilters}
                viewMode={tasksViewMode}
                onViewModeChange={handleTasksViewModeChange}
              />

              {tasksQuery.isLoading && tasksQuery.data == null ? (
                <div className="starium-tablecard p-6">
                  <LoadingState rows={5} />
                </div>
              ) : tasksQuery.data && tasksQuery.data.items.length === 0 ? (
                <div className="starium-tablecard p-10">
                  <EmptyState
                    title="Aucune action"
                    description="Ajoutez une action à ce plan ou élargissez les filtres."
                  />
                </div>
              ) : tasksQuery.data && tasksQuery.data.items.length > 0 ? (
                <div
                  key={tasksViewMode}
                  className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300 motion-safe:ease-out"
                >
                  {tasksViewMode === 'kanban' ? (
                    <ActionPlanTasksKanban
                      items={tasksQuery.data.items}
                      statusFilter={statusF || undefined}
                      canUpdate={canUpdateProjects}
                      isUpdating={taskStatusMutation.isPending}
                      onTaskClick={(id) => setSelectedTaskId(id)}
                      onStatusDrop={handleTaskStatusDrop}
                    />
                  ) : (
                    <div className="starium-tablecard">
                      <div
                        className={cn(
                          'starium-table-wrap',
                          tablePan.isPanning
                            ? 'cursor-grabbing select-none touch-none'
                            : 'cursor-grab',
                        )}
                        ref={tablePan.scrollRef}
                        onPointerDown={tablePan.onPointerDown}
                      >
                        <ActionPlanTasksTable
                          items={tasksQuery.data.items}
                          sortBy={sortByField}
                          sortOrder={sortOrder}
                          onSort={applyTaskSort}
                          onRowClick={(id) => setSelectedTaskId(id)}
                        />
                      </div>
                      <div className="starium-table-footer border-t border-[color:var(--neutral-100)] bg-[color:var(--neutral-50)] px-4 py-2 text-xs text-muted-foreground">
                        {tasksQuery.data.items.length === tasksQuery.data.total
                          ? `${tasksQuery.data.total} action${tasksQuery.data.total > 1 ? 's' : ''}`
                          : `Affichage de ${tasksQuery.data.items.length} sur ${tasksQuery.data.total} action${tasksQuery.data.total > 1 ? 's' : ''}`}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </section>
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
