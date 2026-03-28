'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
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
import { useActiveClient } from '@/hooks/use-active-client';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import {
  updateActionPlanTask,
  type UpdateActionPlanTaskPayload,
} from '@/features/projects/api/action-plans.api';
import {
  listClientRisks,
  listHumanResourcesForTaskPickers,
  listProjectTaskPhases,
  listProjects,
} from '@/features/projects/api/projects.api';
import { useProjectAssignableUsers } from '@/features/projects/hooks/use-project-assignable-users';
import { projectQueryKeys } from '@/features/projects/lib/project-query-keys';
import type { ActionPlanTaskApi } from '@/features/projects/types/project.types';
import { cn } from '@/lib/utils';

const textareaClass = cn(
  'flex min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs',
  'outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
);

const STATUS_LABELS: Record<string, string> = {
  TODO: 'À faire',
  IN_PROGRESS: 'En cours',
  BLOCKED: 'Bloquée',
  DONE: 'Terminée',
  CANCELLED: 'Annulée',
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Basse',
  MEDIUM: 'Moyenne',
  HIGH: 'Haute',
  CRITICAL: 'Critique',
};

function fmtShortDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short' }).format(new Date(iso));
  } catch {
    return '—';
  }
}

function isoToDateInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function dateInputToIsoDay(s: string): string | null {
  if (!s.trim()) return null;
  return new Date(`${s}T12:00:00.000Z`).toISOString();
}

function parseTagsInput(raw: string): string[] | null {
  const parts = raw
    .split(/[,;]/)
    .map((x) => x.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  return parts;
}

function formatTagsCell(tags: unknown): string {
  if (tags == null) return '—';
  if (Array.isArray(tags) && tags.every((x) => typeof x === 'string')) {
    return tags.length ? tags.join(', ') : '—';
  }
  return '—';
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

type TaskDraft = {
  name: string;
  description: string;
  status: string;
  priority: string;
  plannedStart: string;
  plannedEnd: string;
  estimatedHours: string;
  tagsRaw: string;
  projectId: string;
  riskId: string;
  phaseId: string;
  responsibleResourceId: string;
  ownerUserId: string;
};

function taskToDraft(t: ActionPlanTaskApi): TaskDraft {
  return {
    name: t.name,
    description: t.description ?? '',
    status: t.status,
    priority: t.priority,
    plannedStart: isoToDateInput(t.plannedStartDate),
    plannedEnd: isoToDateInput(t.plannedEndDate),
    estimatedHours:
      t.estimatedHours != null && !Number.isNaN(Number(t.estimatedHours))
        ? String(t.estimatedHours)
        : '',
    tagsRaw: formatTagsCell(t.tags) === '—' ? '' : formatTagsCell(t.tags),
    projectId: t.projectId ?? '',
    riskId: t.riskId ?? '',
    phaseId: t.phaseId ?? '',
    responsibleResourceId: t.responsibleResourceId ?? '',
    ownerUserId: t.ownerUserId ?? '',
  };
}

function draftToPayload(d: TaskDraft): UpdateActionPlanTaskPayload {
  const hoursRaw = d.estimatedHours.trim();
  const estimatedParsed =
    hoursRaw === '' ? null : Number.parseFloat(hoursRaw.replace(',', '.'));
  const tags = parseTagsInput(d.tagsRaw);
  return {
    name: d.name.trim(),
    description: d.description.trim() || null,
    status: d.status,
    priority: d.priority,
    plannedStartDate: dateInputToIsoDay(d.plannedStart),
    plannedEndDate: dateInputToIsoDay(d.plannedEnd),
    estimatedHours:
      estimatedParsed !== null && !Number.isNaN(estimatedParsed) ? estimatedParsed : null,
    tags,
    projectId: d.projectId || null,
    riskId: d.riskId || null,
    phaseId: d.projectId ? (d.phaseId || null) : null,
    responsibleResourceId: d.responsibleResourceId || null,
    ownerUserId: d.ownerUserId || null,
  };
}

function draftSnapshot(d: TaskDraft): string {
  return JSON.stringify(draftToPayload(d));
}

function ReadSlot({
  label,
  children,
  disabled,
  onActivate,
}: {
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
  onActivate: () => void;
}) {
  if (disabled) {
    return (
      <div className="space-y-1">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <div className="rounded-md px-2 py-1.5 text-sm">{children}</div>
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <button
        type="button"
        className="w-full rounded-md border border-transparent px-2 py-1.5 text-left text-sm transition-colors hover:border-border hover:bg-muted/60"
        onClick={onActivate}
      >
        {children}
      </button>
    </div>
  );
}

export type ActionPlanTaskEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionPlanId: string;
  task: ActionPlanTaskApi | null;
  canEdit: boolean;
};

export function ActionPlanTaskEditDialog({
  open,
  onOpenChange,
  actionPlanId,
  task,
  canEdit,
}: ActionPlanTaskEditDialogProps) {
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const assignable = useProjectAssignableUsers({ enabled: open && !!clientId });
  const users = assignable.data?.users ?? [];

  const [draft, setDraft] = useState<TaskDraft | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const savedSnapshotRef = useRef('');
  const sessionTaskIdRef = useRef<string | null>(null);

  const projectsMini = useQuery({
    queryKey: [...projectQueryKeys.all, 'action-plan-project-pick', clientId],
    queryFn: () => listProjects(authFetch, { page: 1, limit: 100 }),
    enabled: open && !!clientId,
  });

  const risksMini = useQuery({
    queryKey: projectQueryKeys.clientRisks(clientId),
    queryFn: () => listClientRisks(authFetch),
    enabled: open && !!clientId,
  });

  const resourcesHuman = useQuery({
    queryKey: [...projectQueryKeys.all, 'human-resources-task-pickers', clientId],
    queryFn: () => listHumanResourcesForTaskPickers(authFetch),
    enabled: open && !!clientId,
  });

  const humanResources = resourcesHuman.data?.items ?? [];

  const phasesPick = useQuery({
    queryKey: [...projectQueryKeys.all, 'task-phases-pick', clientId, draft?.projectId ?? ''],
    queryFn: () => listProjectTaskPhases(authFetch, draft!.projectId),
    enabled: open && !!clientId && !!draft?.projectId,
  });

  useEffect(() => {
    if (!open) {
      sessionTaskIdRef.current = null;
      setEditingKey(null);
      setDraft(null);
      return;
    }
    if (!task) return;
    if (sessionTaskIdRef.current === task.id) return;
    const d = taskToDraft(task);
    setDraft(d);
    savedSnapshotRef.current = draftSnapshot(d);
    sessionTaskIdRef.current = task.id;
  }, [open, task]);

  const mutation = useMutation({
    mutationFn: async (payload: UpdateActionPlanTaskPayload) => {
      if (!task) throw new Error('no task');
      return updateActionPlanTask(authFetch, actionPlanId, task.id, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [...projectQueryKeys.all, 'action-plan-tasks', clientId, actionPlanId],
      });
      await queryClient.invalidateQueries({
        queryKey: projectQueryKeys.actionPlanDetail(clientId, actionPlanId),
      });
    },
    onError: (e: Error) => {
      toast.error(e.message || 'Enregistrement impossible');
    },
  });

  const saveFromDraft = useCallback(async () => {
    if (!task || !draft) return;
    const payload = draftToPayload(draft);
    if (!payload.name?.trim()) return;
    await mutation.mutateAsync(payload);
  }, [task, draft, mutation, authFetch, actionPlanId]);

  const saveRef = useRef(saveFromDraft);
  saveRef.current = saveFromDraft;

  const snapshot = draft ? draftSnapshot(draft) : '';
  const canSave = !!(draft && draft.name.trim().length > 0);

  useEffect(() => {
    if (!open || !canEdit || !task || !draft) return;
    if (snapshot === savedSnapshotRef.current) return;
    if (!canSave) return;
    if (mutation.isPending) return;

    const id = window.setTimeout(() => {
      if (snapshot === savedSnapshotRef.current) return;
      void (async () => {
        try {
          await saveRef.current();
          savedSnapshotRef.current = snapshot;
        } catch {
          // toast déjà émis
        }
      })();
    }, 550);

    return () => window.clearTimeout(id);
  }, [open, canEdit, task, draft, snapshot, canSave, mutation.isPending]);

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

  const phaseSelectItems = useMemo(() => {
    const items: Record<string, string> = { __none: 'Sans phase' };
    for (const ph of phasesPick.data ?? []) {
      items[ph.id] = ph.name;
    }
    return items;
  }, [phasesPick.data]);

  const ownerSelectItems = useMemo(() => {
    const items: Record<string, string> = { __none: 'Non assigné' };
    for (const u of users) {
      const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
      items[u.id] = name || u.email;
    }
    return items;
  }, [users]);

  const displayProject =
    task?.project != null ? `${task.project.code} — ${task.project.name}` : '—';
  const displayRisk =
    task?.risk != null ? `${task.risk.code} — ${task.risk.title}` : '—';
  const displayResponsible =
    task && draft
      ? task.responsibleResource
        ? formatResourcePerson(task.responsibleResource)
        : formatUser(task.ownerUserId, users)
      : '—';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[min(90vh,760px)] overflow-y-auto sm:max-w-2xl"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle className="pr-8">Détail de la tâche</DialogTitle>
          <p className="text-xs text-muted-foreground">
            {canEdit
              ? 'Cliquez sur une valeur pour modifier. Les changements sont enregistrés automatiquement.'
              : 'Lecture seule.'}
          </p>
        </DialogHeader>

        {!task || !draft ? (
          <p className="py-4 text-sm text-muted-foreground">Chargement…</p>
        ) : (
        <div className="space-y-4 py-1">
          {editingKey === 'name' && canEdit ? (
            <div className="space-y-1">
              <Label htmlFor="ed-name">Intitulé</Label>
              <Input
                id="ed-name"
                autoFocus
                value={draft.name}
                onChange={(e) => setDraft((p) => (p ? { ...p, name: e.target.value } : p))}
                onBlur={() => setEditingKey(null)}
              />
            </div>
          ) : (
            <ReadSlot
              label="Intitulé"
              disabled={!canEdit}
              onActivate={() => setEditingKey('name')}
            >
              <span className="font-medium">{draft.name || '—'}</span>
            </ReadSlot>
          )}

          {editingKey === 'description' && canEdit ? (
            <div className="space-y-1">
              <Label htmlFor="ed-desc">Description</Label>
              <textarea
                id="ed-desc"
                autoFocus
                value={draft.description}
                onChange={(e) =>
                  setDraft((p) => (p ? { ...p, description: e.target.value } : p))
                }
                onBlur={() => setEditingKey(null)}
                className={textareaClass}
              />
            </div>
          ) : (
            <ReadSlot
              label="Description"
              disabled={!canEdit}
              onActivate={() => setEditingKey('description')}
            >
              <span className="whitespace-pre-wrap text-muted-foreground">
                {draft.description.trim() ? draft.description : '—'}
              </span>
            </ReadSlot>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {editingKey === 'status' && canEdit ? (
              <div className="space-y-1">
                <Label>Statut</Label>
                <Select
                  value={draft.status}
                  items={STATUS_LABELS}
                  onValueChange={(v) => {
                    setDraft((p) => (p ? { ...p, status: v ?? p.status } : p));
                    setEditingKey(null);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABELS).map(([k, lab]) => (
                      <SelectItem key={k} value={k}>
                        {lab}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <ReadSlot
                label="Statut"
                disabled={!canEdit}
                onActivate={() => setEditingKey('status')}
              >
                {STATUS_LABELS[draft.status] ?? draft.status}
              </ReadSlot>
            )}

            {editingKey === 'priority' && canEdit ? (
              <div className="space-y-1">
                <Label>Priorité</Label>
                <Select
                  value={draft.priority}
                  items={PRIORITY_LABELS}
                  onValueChange={(v) => {
                    setDraft((p) => (p ? { ...p, priority: v ?? p.priority } : p));
                    setEditingKey(null);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_LABELS).map(([k, lab]) => (
                      <SelectItem key={k} value={k}>
                        {lab}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <ReadSlot
                label="Priorité"
                disabled={!canEdit}
                onActivate={() => setEditingKey('priority')}
              >
                {PRIORITY_LABELS[draft.priority] ?? draft.priority}
              </ReadSlot>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {editingKey === 'plannedStart' && canEdit ? (
              <div className="space-y-1">
                <Label htmlFor="ed-start">Début planifié</Label>
                <Input
                  id="ed-start"
                  type="date"
                  autoFocus
                  value={draft.plannedStart}
                  onChange={(e) =>
                    setDraft((p) => (p ? { ...p, plannedStart: e.target.value } : p))
                  }
                  onBlur={() => setEditingKey(null)}
                />
              </div>
            ) : (
              <ReadSlot
                label="Début planifié"
                disabled={!canEdit}
                onActivate={() => setEditingKey('plannedStart')}
              >
                {draft.plannedStart
                  ? fmtShortDate(dateInputToIsoDay(draft.plannedStart) ?? undefined)
                  : '—'}
              </ReadSlot>
            )}

            {editingKey === 'plannedEnd' && canEdit ? (
              <div className="space-y-1">
                <Label htmlFor="ed-end">Échéance</Label>
                <Input
                  id="ed-end"
                  type="date"
                  autoFocus
                  value={draft.plannedEnd}
                  onChange={(e) =>
                    setDraft((p) => (p ? { ...p, plannedEnd: e.target.value } : p))
                  }
                  onBlur={() => setEditingKey(null)}
                />
              </div>
            ) : (
              <ReadSlot
                label="Échéance"
                disabled={!canEdit}
                onActivate={() => setEditingKey('plannedEnd')}
              >
                {draft.plannedEnd
                  ? fmtShortDate(dateInputToIsoDay(draft.plannedEnd) ?? undefined)
                  : '—'}
              </ReadSlot>
            )}
          </div>

          {editingKey === 'estimatedHours' && canEdit ? (
            <div className="space-y-1">
              <Label htmlFor="ed-hours">Charge estimée (h)</Label>
              <Input
                id="ed-hours"
                inputMode="decimal"
                autoFocus
                value={draft.estimatedHours}
                onChange={(e) =>
                  setDraft((p) => (p ? { ...p, estimatedHours: e.target.value } : p))
                }
                onBlur={() => setEditingKey(null)}
                placeholder="ex. 4"
              />
            </div>
          ) : (
            <ReadSlot
              label="Charge estimée (h)"
              disabled={!canEdit}
              onActivate={() => setEditingKey('estimatedHours')}
            >
              {draft.estimatedHours.trim() ? draft.estimatedHours : '—'}
            </ReadSlot>
          )}

          {editingKey === 'tags' && canEdit ? (
            <div className="space-y-1">
              <Label htmlFor="ed-tags">Tags</Label>
              <Input
                id="ed-tags"
                autoFocus
                value={draft.tagsRaw}
                onChange={(e) =>
                  setDraft((p) => (p ? { ...p, tagsRaw: e.target.value } : p))
                }
                onBlur={() => setEditingKey(null)}
                placeholder="séparés par des virgules"
              />
            </div>
          ) : (
            <ReadSlot label="Tags" disabled={!canEdit} onActivate={() => setEditingKey('tags')}>
              {draft.tagsRaw.trim() ? draft.tagsRaw : '—'}
            </ReadSlot>
          )}

          {editingKey === 'project' && canEdit ? (
            <div className="space-y-1">
              <Label>Projet</Label>
              <Select
                value={draft.projectId || '__none'}
                items={projectSelectItems}
                onValueChange={(v) => {
                  setDraft((p) =>
                    p
                      ? {
                          ...p,
                          projectId: !v || v === '__none' ? '' : v,
                          phaseId: '',
                        }
                      : p,
                  );
                  setEditingKey(null);
                }}
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
          ) : (
            <ReadSlot label="Projet" disabled={!canEdit} onActivate={() => setEditingKey('project')}>
              {draft.projectId
                ? (projectSelectItems[draft.projectId] ?? displayProject)
                : displayProject}
            </ReadSlot>
          )}

          {draft.projectId ? (
            editingKey === 'phase' && canEdit ? (
              <div className="space-y-1">
                <Label>Phase</Label>
                <Select
                  value={draft.phaseId || '__none'}
                  items={phaseSelectItems}
                  onValueChange={(v) => {
                    setDraft((p) =>
                      p ? { ...p, phaseId: !v || v === '__none' ? '' : v } : p,
                    );
                    setEditingKey(null);
                  }}
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
            ) : (
              <ReadSlot label="Phase" disabled={!canEdit} onActivate={() => setEditingKey('phase')}>
                {draft.phaseId
                  ? (phaseSelectItems[draft.phaseId] ?? '—')
                  : 'Sans phase'}
              </ReadSlot>
            )
          ) : null}

          {editingKey === 'risk' && canEdit ? (
            <div className="space-y-1">
              <Label>Risque</Label>
              <Select
                value={draft.riskId || '__none'}
                items={riskSelectItems}
                onValueChange={(v) => {
                  setDraft((p) =>
                    p ? { ...p, riskId: !v || v === '__none' ? '' : v } : p,
                  );
                  setEditingKey(null);
                }}
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
          ) : (
            <ReadSlot label="Risque" disabled={!canEdit} onActivate={() => setEditingKey('risk')}>
              {draft.riskId ? (riskSelectItems[draft.riskId] ?? displayRisk) : displayRisk}
            </ReadSlot>
          )}

          {editingKey === 'responsible' && canEdit ? (
            <div className="space-y-1">
              <Label>Responsable (personne métier)</Label>
              <Select
                value={draft.responsibleResourceId || '__none'}
                items={responsibleSelectItems}
                onValueChange={(v) => {
                  setDraft((p) =>
                    p
                      ? {
                          ...p,
                          responsibleResourceId: !v || v === '__none' ? '' : v,
                        }
                      : p,
                  );
                  setEditingKey(null);
                }}
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
            </div>
          ) : (
            <ReadSlot
              label="Responsable (personne métier)"
              disabled={!canEdit}
              onActivate={() => setEditingKey('responsible')}
            >
              {draft.responsibleResourceId
                ? (responsibleSelectItems[draft.responsibleResourceId] ?? displayResponsible)
                : displayResponsible}
            </ReadSlot>
          )}

          {editingKey === 'owner' && canEdit ? (
            <div className="space-y-1">
              <Label>Assigné (compte utilisateur)</Label>
              <Select
                value={draft.ownerUserId || '__none'}
                items={ownerSelectItems}
                onValueChange={(v) => {
                  setDraft((p) =>
                    p ? { ...p, ownerUserId: !v || v === '__none' ? '' : v } : p,
                  );
                  setEditingKey(null);
                }}
              >
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue placeholder="Non assigné" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Non assigné</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {[u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <ReadSlot
              label="Assigné (compte utilisateur)"
              disabled={!canEdit}
              onActivate={() => setEditingKey('owner')}
            >
              {formatUser(draft.ownerUserId, users)}
            </ReadSlot>
          )}
        </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t pt-3 text-xs text-muted-foreground">
          {mutation.isPending ? <span>Enregistrement…</span> : <span>&nbsp;</span>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
