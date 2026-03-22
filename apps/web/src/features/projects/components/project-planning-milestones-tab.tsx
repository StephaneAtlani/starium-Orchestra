'use client';

import { useMemo, useState } from 'react';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoadingState } from '@/components/feedback/loading-state';
import { usePermissions } from '@/hooks/use-permissions';
import { useProjectMilestonesQuery } from '../hooks/use-project-milestones-query';
import { useProjectTasksQuery } from '../hooks/use-project-tasks-query';
import {
  useCreateProjectMilestoneMutation,
  useUpdateProjectMilestoneMutation,
} from '../hooks/use-project-planning-mutations';
import { MILESTONE_STATUS_LABEL } from '../constants/project-enum-labels';
import type { ProjectMilestoneApi } from '../types/project.types';
import type {
  CreateProjectMilestonePayload,
  UpdateProjectMilestonePayload,
} from '../api/projects.api';

function isoToDateInput(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

function dateInputToIso(s: string): string | undefined {
  if (!s.trim()) return undefined;
  return new Date(`${s}T12:00:00.000Z`).toISOString();
}

function emptyCreate(): CreateProjectMilestonePayload {
  const today = new Date().toISOString().slice(0, 10);
  return {
    name: '',
    targetDate: new Date(`${today}T12:00:00.000Z`).toISOString(),
    status: 'PLANNED',
  };
}

export function ProjectPlanningMilestonesTab({ projectId }: { projectId: string }) {
  const { has } = usePermissions();
  const canEdit = has('projects.update');

  const milestonesQuery = useProjectMilestonesQuery(projectId);
  const tasksQuery = useProjectTasksQuery(projectId);
  const createMut = useCreateProjectMilestoneMutation(projectId);
  const updateMut = useUpdateProjectMilestoneMutation(projectId);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectMilestoneApi | null>(null);
  const [form, setForm] = useState<CreateProjectMilestonePayload>(emptyCreate());

  const items = milestonesQuery.data?.items ?? [];
  const taskItems = tasksQuery.data?.items ?? [];

  const sortedMilestones = useMemo(() => {
    return [...items].sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime();
    });
  }, [items]);

  const taskOptions = useMemo(
    () => [...taskItems].sort((a, b) => a.name.localeCompare(b.name)),
    [taskItems],
  );

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
    });
    setOpen(true);
  };

  const submit = () => {
    if (!form.name.trim()) return;
    if (editing) {
      const body: UpdateProjectMilestonePayload = { ...form };
      updateMut.mutate(
        { milestoneId: editing.id, body },
        { onSuccess: () => setOpen(false) },
      );
    } else {
      createMut.mutate(form, { onSuccess: () => setOpen(false) });
    }
  };

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">Jalons sans durée — date cible unique.</p>
        {canEdit && (
          <Button type="button" size="sm" onClick={openCreate}>
            Nouveau jalon
          </Button>
        )}
      </div>

      {milestonesQuery.isLoading || tasksQuery.isLoading ? (
        <LoadingState rows={4} />
      ) : milestonesQuery.isError ? (
        <p className="text-destructive text-sm">Impossible de charger les jalons.</p>
      ) : sortedMilestones.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">Aucun jalon.</p>
      ) : (
        <div className="max-h-[min(70vh,560px)] overflow-auto rounded-lg border border-border/60">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date cible</TableHead>
                <TableHead>Tâche liée</TableHead>
                {canEdit && <TableHead className="w-[100px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedMilestones.map((m) => {
                const linked = m.linkedTaskId
                  ? taskItems.find((t) => t.id === m.linkedTaskId)
                  : undefined;
                return (
                  <TableRow key={m.id}>
                    <TableCell>{m.name}</TableCell>
                    <TableCell>{MILESTONE_STATUS_LABEL[m.status] ?? m.status}</TableCell>
                    <TableCell>
                      {new Date(m.targetDate).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">
                      {linked ? linked.name : '—'}
                    </TableCell>
                    {canEdit && (
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(m)}
                        >
                          Modifier
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier le jalon' : 'Nouveau jalon'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ms-name">Nom</Label>
              <Input
                id="ms-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ms-desc">Description</Label>
              <textarea
                id="ms-desc"
                className="border-input bg-background min-h-[64px] w-full rounded-lg border px-3 py-2 text-sm"
                value={form.description ?? ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ms-target">Date cible</Label>
                <Input
                  id="ms-target"
                  type="date"
                  value={isoToDateInput(form.targetDate)}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      targetDate: dateInputToIso(e.target.value) ?? form.targetDate,
                    })
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Statut</Label>
                <select
                  className="border-input bg-background h-9 w-full rounded-lg border px-2 text-sm"
                  value={form.status ?? 'PLANNED'}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  {Object.keys(MILESTONE_STATUS_LABEL).map((k) => (
                    <option key={k} value={k}>
                      {MILESTONE_STATUS_LABEL[k]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ms-achieved">Date d’atteinte (optionnel)</Label>
              <Input
                id="ms-achieved"
                type="date"
                value={isoToDateInput(form.achievedDate)}
                onChange={(e) =>
                  setForm({
                    ...form,
                    achievedDate: e.target.value
                      ? dateInputToIso(e.target.value)
                      : undefined,
                  })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tâche liée</Label>
              <select
                className="border-input bg-background h-9 w-full rounded-lg border px-2 text-sm"
                value={form.linkedTaskId ?? ''}
                onChange={(e) =>
                  setForm({ ...form, linkedTaskId: e.target.value || null })
                }
              >
                <option value="">—</option>
                {taskOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button
              type="button"
              onClick={submit}
              disabled={!form.name.trim() || createMut.isPending || updateMut.isPending}
            >
              {editing ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
