'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useProjectMilestonesQuery } from '../hooks/use-project-milestones-query';
import { useProjectMilestoneLabelsQuery } from '../hooks/use-project-milestone-labels-query';
import {
  useCreateProjectMilestoneMutation,
  useUpdateProjectMilestoneMutation,
} from '../hooks/use-project-planning-mutations';
import { useCreateProjectMilestoneLabelMutation } from '../hooks/use-project-labels-mutations';
import { MILESTONE_STATUS_LABEL } from '../constants/project-enum-labels';
import type { ProjectMilestoneApi } from '../types/project.types';
import type {
  CreateProjectMilestonePayload,
  UpdateProjectMilestonePayload,
} from '../api/projects.api';
import { listProjectTaskPhases } from '../api/projects.api';
import { cn } from '@/lib/utils';
import { MilestoneFormDialogFields } from './milestone-form-dialog-fields';

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

export function ProjectPlanningMilestonesTab({ projectId }: { projectId: string }) {
  const { has } = usePermissions();
  const canEdit = has('projects.update');
  const canListProjectLabels = has('projects.read') || canEdit;

  const authFetch = useAuthenticatedFetch();

  const milestonesQuery = useProjectMilestonesQuery(projectId);
  const milestoneLabelsQuery = useProjectMilestoneLabelsQuery(
    projectId,
    canListProjectLabels,
  );
  const createMut = useCreateProjectMilestoneMutation(projectId);
  const updateMut = useUpdateProjectMilestoneMutation(projectId);
  const createMilestoneLabelMut = useCreateProjectMilestoneLabelMutation(projectId);

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
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">Jalons sans durée — date cible unique.</p>
        {canEdit && (
          <Button type="button" size="sm" onClick={openCreate}>
            Nouveau jalon
          </Button>
        )}
      </div>

      {milestonesQuery.isLoading ? (
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
                <TableHead>Phase</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date cible</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedMilestones.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-muted-foreground max-w-[12rem] truncate">
                      {renderPhaseLabel(m.phaseId)}
                    </TableCell>
                    <TableCell className="max-w-[min(100%,280px)] font-medium">
                      {canEdit ? (
                        <button
                          type="button"
                          onClick={() => openEdit(m)}
                          className={cn(
                            'w-full rounded-sm text-left transition-colors',
                            'hover:bg-muted/60 hover:text-primary',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                          )}
                        >
                          {m.name}
                        </button>
                      ) : (
                        m.name
                      )}
                    </TableCell>
                    <TableCell>{MILESTONE_STATUS_LABEL[m.status] ?? m.status}</TableCell>
                    <TableCell>
                      {new Date(m.targetDate).toLocaleDateString('fr-FR')}
                    </TableCell>
                  </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg" showCloseButton>
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier le jalon' : 'Nouveau jalon'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Mettre à jour le repère temporel et la liaison éventuelle avec une tâche.'
                : 'Définir un jalon sur la ligne de temps du projet ; liaison avec une tâche optionnelle.'}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[min(60vh,440px)] overflow-y-auto pr-0.5 [-ms-overflow-style:none] [scrollbar-width:thin]">
            <MilestoneFormDialogFields
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
