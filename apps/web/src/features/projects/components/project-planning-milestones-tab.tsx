'use client';

import { useEffect, useMemo, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/feedback/empty-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { UserInitialsAvatar } from '@/components/ui/user-initials-avatar';
import { useTablePan } from '@/hooks/use-table-pan';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useProjectAssignableUsers } from '../hooks/use-project-assignable-users';
import { useProjectMilestonesQuery } from '../hooks/use-project-milestones-query';
import { useProjectMilestoneLabelsQuery } from '../hooks/use-project-milestone-labels-query';
import { useProjectTasksQuery } from '../hooks/use-project-tasks-query';
import {
  useCreateProjectMilestoneMutation,
  useUpdateProjectMilestoneMutation,
} from '../hooks/use-project-planning-mutations';
import { useCreateProjectMilestoneLabelMutation } from '../hooks/use-project-labels-mutations';
import type { ProjectAssignableUser, ProjectMilestoneApi } from '../types/project.types';
import type {
  CreateProjectMilestonePayload,
  UpdateProjectMilestonePayload,
} from '../api/projects.api';
import { listProjectTaskPhases } from '../api/projects.api';
import { cn } from '@/lib/utils';
import { MilestoneFormDialog } from './milestone-form-dialog';
import { ProjectMilestonesStatStrip } from './project-milestones-stat-strip';
import {
  assignableUserDisplayName,
  assignableUserShortLabel,
  formatMilestoneDate,
  MILESTONE_ICON_TONES,
  MILESTONE_LABEL_TAG_TONES,
  milestoneDateIsLate,
  milestoneStatusDsBadgeClass,
  milestoneStatusLabel,
  resolveMilestoneLabelNames,
} from '../lib/project-milestone-display';
import { AlertCircle, Calendar, Check, Diamond, Link2, Plus } from 'lucide-react';

function emptyCreate(): CreateProjectMilestonePayload {
  const today = new Date().toISOString().slice(0, 10);
  return {
    name: '',
    targetDate: new Date(`${today}T12:00:00.000Z`).toISOString(),
    status: 'PLANNED',
    milestoneLabelIds: [],
    phaseId: null,
  };
}

function MilestoneTableRow({
  milestone: m,
  index,
  canEdit,
  phaseLabel,
  labelNames,
  linkedTaskName,
  ownerUser,
  onEdit,
  shouldSuppressClick,
}: {
  milestone: ProjectMilestoneApi;
  index: number;
  canEdit: boolean;
  phaseLabel: string;
  labelNames: string[];
  linkedTaskName: string | null;
  ownerUser: ProjectAssignableUser | undefined;
  onEdit: (m: ProjectMilestoneApi) => void;
  shouldSuppressClick: () => boolean;
}) {
  const statusLabel = milestoneStatusLabel(m.status);
  const iconTone = MILESTONE_ICON_TONES[index % MILESTONE_ICON_TONES.length];
  const isLate = milestoneDateIsLate(m.status);
  const ownerLabel = ownerUser ? assignableUserShortLabel(ownerUser) : null;
  const ownerFullName = ownerUser ? assignableUserDisplayName(ownerUser) : null;

  return (
    <tr
      className={cn(canEdit && 'cursor-pointer')}
      onClick={() => {
        if (shouldSuppressClick()) return;
        if (canEdit) onEdit(m);
      }}
      onKeyDown={(event) => {
        if (!canEdit) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onEdit(m);
        }
      }}
      tabIndex={canEdit ? 0 : undefined}
    >
      <td>
        <div className="starium-dt-tname">
          <div className={cn('starium-dt-tname-ico', iconTone)} aria-hidden>
            <Diamond strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <div className="starium-dt-cell-strong truncate">{m.name}</div>
            {m.code ? (
              <div className="starium-dt-cell-sub truncate">Code {m.code}</div>
            ) : null}
          </div>
        </div>
      </td>
      <td>
        <span
          className={cn(
            'inline-flex max-w-[11rem] truncate rounded-md border px-2 py-0.5 text-[11px] font-semibold',
            m.phaseId
              ? 'border-primary/30 bg-primary/10 text-foreground'
              : 'border-border bg-muted/30 text-muted-foreground',
          )}
          title={phaseLabel}
        >
          {phaseLabel}
        </span>
      </td>
      <td>
        {labelNames.length > 0 ? (
          <div className="flex max-w-[14rem] flex-wrap gap-1">
            {labelNames.slice(0, 3).map((label, labelIndex) => (
              <span
                key={`${m.id}:${label}`}
                className={cn(
                  'inline-flex shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold tracking-wide uppercase',
                  MILESTONE_LABEL_TAG_TONES[labelIndex % MILESTONE_LABEL_TAG_TONES.length],
                )}
              >
                {label}
              </span>
            ))}
            {labelNames.length > 3 ? (
              <span className="text-muted-foreground text-[10px] font-medium">
                +{labelNames.length - 3}
              </span>
            ) : null}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </td>
      <td>
        {linkedTaskName ? (
          <span
            className="inline-flex max-w-[12rem] items-center gap-1.5 truncate text-[12.5px] font-semibold text-[color:var(--state-info)]"
            title={linkedTaskName}
          >
            <Link2 className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
            <span className="truncate">{linkedTaskName}</span>
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </td>
      <td>
        {ownerLabel && ownerFullName ? (
          <div className="starium-dt-assignee">
            <UserInitialsAvatar
              displayName={ownerFullName}
              seed={m.ownerUserId ?? m.id}
              themeIndex={index}
              size="sm"
            />
            <span className="starium-dt-assignee-name">{ownerLabel}</span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </td>
      <td>
        <span className={cn('starium-ds-badge', milestoneStatusDsBadgeClass(m.status))}>
          {statusLabel}
        </span>
      </td>
      <td>
        <div className={cn('starium-dt-date', isLate && 'starium-dt-date--late')}>
          <Calendar strokeWidth={1.75} aria-hidden />
          <time dateTime={m.targetDate}>{formatMilestoneDate(m.targetDate)}</time>
        </div>
      </td>
      <td>
        {m.achievedDate ? (
          <div className="starium-dt-date text-[color:var(--state-success)]">
            <Check strokeWidth={1.75} aria-hidden />
            <time dateTime={m.achievedDate}>{formatMilestoneDate(m.achievedDate)}</time>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </td>
    </tr>
  );
}

export function ProjectPlanningMilestonesTab({ projectId }: { projectId: string }) {
  const { has } = usePermissions();
  const canEdit = has('projects.update');
  const canListProjectLabels = has('projects.read') || canEdit;

  const authFetch = useAuthenticatedFetch();

  const milestonesQuery = useProjectMilestonesQuery(projectId);
  const tasksQuery = useProjectTasksQuery(projectId);
  const assignableQuery = useProjectAssignableUsers();
  const milestoneLabelsQuery = useProjectMilestoneLabelsQuery(
    projectId,
    canListProjectLabels,
  );
  const createMut = useCreateProjectMilestoneMutation(projectId);
  const updateMut = useUpdateProjectMilestoneMutation(projectId);
  const createMilestoneLabelMut = useCreateProjectMilestoneLabelMutation(projectId);
  const tablePan = useTablePan();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectMilestoneApi | null>(null);
  const [form, setForm] = useState<CreateProjectMilestonePayload>(emptyCreate());
  const [phaseOptions, setPhaseOptions] = useState<
    Array<{ id: string; name: string; sortOrder: number }>
  >([]);

  const phaseNameById = useMemo(
    () => new Map(phaseOptions.map((p) => [p.id, p.name] as const)),
    [phaseOptions],
  );

  const milestoneLabelNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of milestoneLabelsQuery.data ?? []) {
      m.set(l.id, l.name);
    }
    return m;
  }, [milestoneLabelsQuery.data]);

  const taskNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of tasksQuery.data?.items ?? []) {
      m.set(t.id, t.name);
    }
    return m;
  }, [tasksQuery.data?.items]);

  const ownerUserById = useMemo(() => {
    const m = new Map<string, NonNullable<typeof assignableQuery.data>['users'][number]>();
    for (const u of assignableQuery.data?.users ?? []) {
      m.set(u.id, u);
    }
    return m;
  }, [assignableQuery.data?.users]);

  const renderPhaseLabel = (phaseId: string | null | undefined) => {
    if (!phaseId) return 'Sans libellé de phase';
    return phaseNameById.get(phaseId) ?? '—';
  };

  useEffect(() => {
    void listProjectTaskPhases(authFetch, projectId)
      .then((phases) => {
        setPhaseOptions(
          phases.map((p) => ({ id: p.id, name: p.name, sortOrder: p.sortOrder })),
        );
      })
      .catch(() => {
        setPhaseOptions([]);
      });
  }, [authFetch, projectId]);

  const items = useMemo(
    () => milestonesQuery.data?.items ?? [],
    [milestonesQuery.data?.items],
  );

  const sortedMilestones = useMemo(() => {
    return [...items].sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime();
    });
  }, [items]);

  const milestoneLabelOptions = useMemo(
    () =>
      (milestoneLabelsQuery.data ?? []).map((l) => ({
        id: l.id,
        label: l.name,
      })),
    [milestoneLabelsQuery.data],
  );

  const canCreateMilestoneLabels = canEdit;
  const onCreateMilestoneLabel = async (name: string) => {
    const created = await createMilestoneLabelMut.mutateAsync({ name });
    return created.id;
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyCreate());
    setOpen(true);
  };

  const openEdit = (m: ProjectMilestoneApi) => {
    setEditing(m);
    setForm({
      name: m.name,
      description: m.description ?? undefined,
      code: m.code ?? undefined,
      targetDate: m.targetDate,
      achievedDate: m.achievedDate ?? undefined,
      status: m.status,
      linkedTaskId: m.linkedTaskId,
      ownerUserId: m.ownerUserId,
      sortOrder: m.sortOrder,
      phaseId: m.phaseId ?? null,
      milestoneLabelIds: m.milestoneLabelIds ?? [],
    });
    setOpen(true);
  };

  const submit = () => {
    if (!form.name.trim()) return;
    if (editing) {
      const body: UpdateProjectMilestonePayload = { ...form };
      updateMut.mutate(
        { milestoneId: editing.id, body },
        {
          onSuccess: () => {
            void milestonesQuery.refetch();
            setOpen(false);
          },
        },
      );
    } else {
      createMut.mutate(form, {
        onSuccess: () => {
          void milestonesQuery.refetch();
          setOpen(false);
        },
      });
    }
  };

  return (
    <div className="starium-proj-milestones flex min-w-0 flex-col gap-[18px] pt-4 md:pt-5">
      <ProjectMilestonesStatStrip projectId={projectId} />

      <div className="starium-toolbar">
        <p className="text-sm text-muted-foreground">
          Repères temporels sans durée — une date cible unique par jalon.
        </p>
        <div className="starium-toolbar-spacer" aria-hidden />
        {canEdit ? (
          <button type="button" className="starium-btn starium-btn-primary" onClick={openCreate}>
            <Plus strokeWidth={2.5} aria-hidden />
            Nouveau jalon
          </button>
        ) : null}
      </div>

      {milestonesQuery.isLoading ? (
        <div className="starium-tablecard p-6">
          <LoadingState rows={4} />
        </div>
      ) : milestonesQuery.isError ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>Impossible de charger les jalons.</AlertDescription>
        </Alert>
      ) : sortedMilestones.length === 0 ? (
        <div className="starium-tablecard">
          <EmptyState
            title="Aucun jalon"
            description="Ajoutez un repère temporel pour structurer le pilotage du projet."
            action={
              canEdit ? (
                <Button type="button" size="sm" onClick={openCreate}>
                  Nouveau jalon
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="starium-tablecard">
          <div
            ref={tablePan.scrollRef}
            onPointerDown={tablePan.onPointerDown}
            className={cn(
              'starium-table-wrap',
              tablePan.isPanning ? 'cursor-grabbing select-none touch-none' : 'cursor-grab',
            )}
            title="Clic maintenu et glisser pour parcourir le tableau"
            aria-label="Tableau des jalons — glisser pour faire défiler"
          >
            <table className="starium-dt">
              <caption className="sr-only">Liste des jalons du projet</caption>
              <thead>
                <tr>
                  <th scope="col">Jalon</th>
                  <th scope="col">Phase</th>
                  <th scope="col">Étiquettes</th>
                  <th scope="col">Tâche liée</th>
                  <th scope="col">Responsable</th>
                  <th scope="col">Statut</th>
                  <th scope="col">Date cible</th>
                  <th scope="col">Date atteinte</th>
                </tr>
              </thead>
              <tbody>
                {sortedMilestones.map((m, index) => (
                  <MilestoneTableRow
                    key={m.id}
                    milestone={m}
                    index={index}
                    canEdit={canEdit}
                    phaseLabel={renderPhaseLabel(m.phaseId)}
                    labelNames={resolveMilestoneLabelNames(
                      m.milestoneLabelIds,
                      milestoneLabelNameById,
                    )}
                    linkedTaskName={
                      m.linkedTaskId ? (taskNameById.get(m.linkedTaskId) ?? null) : null
                    }
                    ownerUser={
                      m.ownerUserId ? ownerUserById.get(m.ownerUserId) : undefined
                    }
                    onEdit={openEdit}
                    shouldSuppressClick={tablePan.shouldSuppressClick}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <MilestoneFormDialog
        open={open}
        onOpenChange={setOpen}
        editing={Boolean(editing)}
        onSubmit={submit}
        isSubmitting={createMut.isPending || updateMut.isPending}
        form={form}
        onPatch={(p) =>
          setForm((prev) => ({
            ...prev,
            ...p,
          }))
        }
        phaseOptions={phaseOptions}
        milestoneLabelOptions={milestoneLabelOptions}
        canCreateMilestoneLabels={canCreateMilestoneLabels}
        onCreateMilestoneLabel={onCreateMilestoneLabel}
        fieldIdPrefix="ms"
      />
    </div>
  );
}
