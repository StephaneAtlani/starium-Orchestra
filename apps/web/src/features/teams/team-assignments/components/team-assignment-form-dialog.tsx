'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCollaboratorsList } from '@/features/teams/collaborators/hooks/use-collaborators-list';
import { useProjectsListQuery } from '@/features/projects/hooks/use-projects-list-query';
import { useActivityTypesList } from '../hooks/use-activity-types-list';
import { useTeamAssignmentMutations } from '../hooks/use-team-assignment-mutations';
import {
  activityTaxonomyKindLabel,
  dateInputToEndIso,
  dateInputToStartIso,
} from '../lib/team-assignment-label-mappers';
import { cn } from '@/lib/utils';
import type { ActivityTaxonomyKind, TeamResourceAssignment } from '../types/team-assignment.types';
import { toast } from '@/lib/toast';

function isoDatePart(iso: string): string {
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

export type TeamAssignmentFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant: 'global' | 'project';
  /** Variante projet : verrouillé par l’URL. */
  projectId?: string;
  projectLabel?: string;
  mode: 'create' | 'edit';
  initial: TeamResourceAssignment | null;
  canLoadActivityTypes: boolean;
};

export function TeamAssignmentFormDialog({
  open,
  onOpenChange,
  variant,
  projectId: lockedProjectId,
  projectLabel,
  mode,
  initial,
  canLoadActivityTypes,
}: TeamAssignmentFormDialogProps) {
  const {
    createGlobal,
    updateGlobal,
    createProject,
    updateProject,
  } = useTeamAssignmentMutations();

  const [collabSearch, setCollabSearch] = useState('');
  const [debouncedCollabSearch, setDebouncedCollabSearch] = useState('');
  const [projectSearch, setProjectSearch] = useState('');
  const [debouncedProjectSearch, setDebouncedProjectSearch] = useState('');

  React.useEffect(() => {
    const t = window.setTimeout(() => setDebouncedCollabSearch(collabSearch), 300);
    return () => window.clearTimeout(t);
  }, [collabSearch]);

  React.useEffect(() => {
    const t = window.setTimeout(() => setDebouncedProjectSearch(projectSearch), 300);
    return () => window.clearTimeout(t);
  }, [projectSearch]);

  const collaboratorsQuery = useCollaboratorsList({
    search: debouncedCollabSearch || undefined,
    limit: 30,
  });

  const projectsQuery = useProjectsListQuery(
    {
      search: debouncedProjectSearch || undefined,
      limit: 30,
      page: 1,
    },
    { enabled: open && variant === 'global' },
  );

  const activityTypesQuery = useActivityTypesList(
    { limit: 200, includeArchived: false },
    open && canLoadActivityTypes,
  );

  const [collaboratorId, setCollaboratorId] = useState('');
  const [optionalProjectId, setOptionalProjectId] = useState<string | '__none__'>('__none__');
  const [activityTypeId, setActivityTypeId] = useState('');
  const [roleLabel, setRoleLabel] = useState('');
  const [startYmd, setStartYmd] = useState('');
  const [endYmd, setEndYmd] = useState('');
  const [allocationPercent, setAllocationPercent] = useState<string>('50');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && initial) {
      setCollaboratorId(initial.collaboratorId);
      setOptionalProjectId(initial.projectId ?? '__none__');
      setActivityTypeId(initial.activityTypeId);
      setRoleLabel(initial.roleLabel);
      setStartYmd(isoDatePart(initial.startDate));
      setEndYmd(initial.endDate ? isoDatePart(initial.endDate) : '');
      setAllocationPercent(String(initial.allocationPercent));
      setNotes(initial.notes ?? '');
      setCollabSearch('');
      setProjectSearch('');
      return;
    }
    setCollaboratorId('');
    setOptionalProjectId('__none__');
    setActivityTypeId('');
    setRoleLabel('');
    const today = new Date().toISOString().slice(0, 10);
    setStartYmd(today);
    setEndYmd('');
    setAllocationPercent('50');
    setNotes('');
    setCollabSearch('');
    setProjectSearch('');
  }, [open, mode, initial]);

  const effectiveProjectId =
    variant === 'project' ? lockedProjectId : optionalProjectId === '__none__' ? null : optionalProjectId;

  const activityOptions = useMemo(() => {
    const items = activityTypesQuery.data?.items ?? [];
    if (variant === 'project') {
      return items.filter((i) => i.kind === 'PROJECT');
    }
    if (effectiveProjectId) {
      return items.filter((i) => i.kind === 'PROJECT');
    }
    return items.filter((i) => i.kind !== 'PROJECT');
  }, [activityTypesQuery.data?.items, variant, effectiveProjectId]);

  useEffect(() => {
    if (!open || !canLoadActivityTypes || mode !== 'create') return;
    if (activityOptions.length === 0) return;
    setActivityTypeId((prev) => {
      if (prev) {
        const ids = new Set(activityOptions.map((x) => x.id));
        if (ids.has(prev)) return prev;
      }
      const def = activityOptions.find((x) => x.isDefaultForKind);
      return (def ?? activityOptions[0]).id;
    });
  }, [open, canLoadActivityTypes, mode, activityOptions]);

  const submitting =
    createGlobal.isPending ||
    updateGlobal.isPending ||
    createProject.isPending ||
    updateProject.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canLoadActivityTypes) {
      toast.error('Les types d’activité ne sont pas accessibles pour votre profil.');
      return;
    }
    const pct = Number(allocationPercent.replace(',', '.'));
    if (!collaboratorId || !activityTypeId || !roleLabel.trim() || !startYmd) {
      toast.error('Complétez les champs obligatoires.');
      return;
    }
    if (!Number.isFinite(pct) || pct < 0.01 || pct > 100) {
      toast.error('Le pourcentage de charge doit être entre 0,01 et 100.');
      return;
    }
    const startIso = dateInputToStartIso(startYmd);
    const endIso = endYmd.trim() ? dateInputToEndIso(endYmd.trim()) : undefined;

    try {
      if (variant === 'global') {
        const projectId =
          optionalProjectId === '__none__' ? undefined : optionalProjectId;
        if (mode === 'create') {
          await createGlobal.mutateAsync({
            collaboratorId,
            projectId,
            activityTypeId,
            roleLabel: roleLabel.trim(),
            startDate: startIso,
            endDate: endIso,
            allocationPercent: pct,
            notes: notes.trim() || undefined,
          });
        } else if (initial) {
          await updateGlobal.mutateAsync({
            id: initial.id,
            payload: {
              collaboratorId,
              projectId: projectId ?? null,
              activityTypeId,
              roleLabel: roleLabel.trim(),
              startDate: startIso,
              endDate: endIso,
              allocationPercent: pct,
              notes: notes.trim() || undefined,
            },
          });
        }
      } else if (lockedProjectId) {
        if (mode === 'create') {
          await createProject.mutateAsync({
            projectId: lockedProjectId,
            payload: {
              collaboratorId,
              activityTypeId,
              roleLabel: roleLabel.trim(),
              startDate: startIso,
              endDate: endIso,
              allocationPercent: pct,
              notes: notes.trim() || undefined,
            },
          });
        } else if (initial) {
          await updateProject.mutateAsync({
            projectId: lockedProjectId,
            assignmentId: initial.id,
            payload: {
              collaboratorId,
              activityTypeId,
              roleLabel: roleLabel.trim(),
              startDate: startIso,
              endDate: endIso,
              allocationPercent: pct,
              notes: notes.trim() || undefined,
            },
          });
        }
      }
      toast.success(mode === 'create' ? 'Affectation créée.' : 'Affectation mise à jour.');
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur à l’enregistrement.');
    }
  };

  const title =
    mode === 'create'
      ? 'Nouvelle affectation'
      : 'Modifier l’affectation';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {variant === 'project' && projectLabel ? (
            <p className="text-muted-foreground text-sm">Projet : {projectLabel}</p>
          ) : null}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ta-collab-filter">Collaborateur</Label>
            <Input
              id="ta-collab-filter"
              placeholder="Filtrer par nom ou email…"
              value={collabSearch}
              onChange={(e) => setCollabSearch(e.target.value)}
              disabled={!canLoadActivityTypes}
            />
            <div className="max-h-36 overflow-y-auto rounded-md border">
              {(collaboratorsQuery.data?.items ?? []).length === 0 ? (
                <p className="text-muted-foreground p-2 text-sm">Aucun résultat.</p>
              ) : (
                (collaboratorsQuery.data?.items ?? []).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    disabled={!canLoadActivityTypes}
                    className={cn(
                      'block w-full px-2 py-1.5 text-left text-sm hover:bg-muted/80',
                      collaboratorId === c.id && 'bg-muted font-medium',
                    )}
                    onClick={() => setCollaboratorId(c.id)}
                  >
                    {c.displayName}
                    {c.email ? (
                      <span className="text-muted-foreground"> — {c.email}</span>
                    ) : null}
                  </button>
                ))
              )}
            </div>
          </div>

          {variant === 'global' ? (
            <div className="space-y-2">
              <Label htmlFor="ta-proj-filter">Projet</Label>
              <Input
                id="ta-proj-filter"
                placeholder="Filtrer par nom ou code…"
                value={projectSearch}
                onChange={(e) => setProjectSearch(e.target.value)}
                disabled={!canLoadActivityTypes}
              />
              <div className="max-h-36 overflow-y-auto rounded-md border">
                <button
                  type="button"
                  disabled={!canLoadActivityTypes}
                  className={cn(
                    'block w-full px-2 py-1.5 text-left text-sm hover:bg-muted/80',
                    optionalProjectId === '__none__' && 'bg-muted font-medium',
                  )}
                  onClick={() => setOptionalProjectId('__none__')}
                >
                  Hors projet
                </button>
                {(projectsQuery.data?.items ?? []).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    disabled={!canLoadActivityTypes}
                    className={cn(
                      'block w-full px-2 py-1.5 text-left text-sm hover:bg-muted/80',
                      optionalProjectId === p.id && 'bg-muted font-medium',
                    )}
                    onClick={() => setOptionalProjectId(p.id)}
                  >
                    {p.name}{' '}
                    <span className="text-muted-foreground">({p.code})</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="ta-activity">Type d&apos;activité</Label>
            <select
              id="ta-activity"
              className="border-input bg-background h-8 w-full rounded-lg border px-2.5 text-sm"
              value={activityTypeId}
              onChange={(e) => setActivityTypeId(e.target.value)}
              disabled={!canLoadActivityTypes || activityOptions.length === 0}
            >
              {activityOptions.length === 0 ? (
                <option value="">— Aucun type disponible —</option>
              ) : (
                activityOptions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({activityTaxonomyKindLabel(a.kind as ActivityTaxonomyKind)})
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ta-role">Rôle</Label>
            <Input
              id="ta-role"
              value={roleLabel}
              onChange={(e) => setRoleLabel(e.target.value)}
              maxLength={120}
              disabled={!canLoadActivityTypes}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ta-start">Début</Label>
              <Input
                id="ta-start"
                type="date"
                value={startYmd}
                onChange={(e) => setStartYmd(e.target.value)}
                disabled={!canLoadActivityTypes}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ta-end">Fin (optionnel)</Label>
              <Input
                id="ta-end"
                type="date"
                value={endYmd}
                onChange={(e) => setEndYmd(e.target.value)}
                disabled={!canLoadActivityTypes}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ta-pct">Charge (%)</Label>
            <Input
              id="ta-pct"
              type="number"
              min={0.01}
              max={100}
              step={0.5}
              value={allocationPercent}
              onChange={(e) => setAllocationPercent(e.target.value)}
              disabled={!canLoadActivityTypes}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ta-notes">Notes (optionnel)</Label>
            <textarea
              id="ta-notes"
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[72px] w-full rounded-lg border px-2.5 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={!canLoadActivityTypes}
              maxLength={4000}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Fermer
            </Button>
            <Button type="submit" disabled={submitting || !canLoadActivityTypes}>
              {submitting ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
