'use client';

import React, { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { AlertTriangle, Plus } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingState } from '@/components/feedback/loading-state';
import { usePermissions } from '@/hooks/use-permissions';
import { useCollaboratorsList } from '@/features/teams/collaborators/hooks/use-collaborators-list';
import { useProjectsListQuery } from '@/features/projects/hooks/use-projects-list-query';
import { useActivityTypesList } from '../hooks/use-activity-types-list';
import { useTeamAssignmentsList } from '../hooks/use-team-assignments-list';
import { useTeamAssignmentMutations } from '../hooks/use-team-assignment-mutations';
import {
  toTeamAssignmentsListParams,
  type AssignmentDateFilterMode,
  type AssignmentListFilterInput,
} from '../lib/team-assignment-list-query';
import { TeamAssignmentsTable } from './team-assignments-table';
import { TeamAssignmentFormDialog } from './team-assignment-form-dialog';
import type { TeamResourceAssignment } from '../types/team-assignment.types';

const DEFAULT_LIMIT = 20;

function parseMode(sp: URLSearchParams): AssignmentDateFilterMode {
  const explicit = sp.get('dateMode');
  if (explicit === 'range' || explicit === 'activeOn' || explicit === 'none') {
    return explicit;
  }
  if (sp.get('activeOn')) return 'activeOn';
  if (sp.get('from') && sp.get('to')) return 'range';
  return 'none';
}

function buildFilterFromSearchParams(sp: URLSearchParams): AssignmentListFilterInput {
  return {
    collaboratorId: sp.get('collaboratorId') ?? undefined,
    projectId: sp.get('projectId') ?? undefined,
    activityTypeId: sp.get('activityTypeId') ?? undefined,
    includeCancelled: sp.get('includeCancelled') === 'true',
    limit: Math.min(
      100,
      Math.max(1, Number(sp.get('limit')) || DEFAULT_LIMIT),
    ),
    offset: Math.max(0, Number(sp.get('offset')) || 0),
    dateMode: parseMode(sp),
    from: sp.get('from') ?? undefined,
    to: sp.get('to') ?? undefined,
    activeOn: sp.get('activeOn') ?? undefined,
  };
}

export function TeamAssignmentsListView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { has, isLoading: permsLoading, isSuccess: permsOk } = usePermissions();
  const canRead = has('team_assignments.read');
  const canManage = has('team_assignments.manage');
  const canActivityTypes = has('activity_types.read');

  const filterInput = useMemo(
    () => buildFilterFromSearchParams(searchParams),
    [searchParams],
  );

  const listParams = useMemo(
    () => toTeamAssignmentsListParams(filterInput),
    [filterInput],
  );

  const listQuery = useTeamAssignmentsList(listParams);
  const { cancelGlobal } = useTeamAssignmentMutations();

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editRow, setEditRow] = useState<TeamResourceAssignment | null>(null);

  const collaboratorsForFilter = useCollaboratorsList({ limit: 100 });
  const projectsForFilter = useProjectsListQuery({ limit: 100, page: 1 });
  const activityTypesForFilter = useActivityTypesList(
    { limit: 200, includeArchived: false },
    canRead && canActivityTypes,
  );

  const pushFilters = useCallback(
    (next: Partial<AssignmentListFilterInput>) => {
      const sp = new URLSearchParams(searchParams.toString());
      const keys = [
        'collaboratorId',
        'projectId',
        'activityTypeId',
        'from',
        'to',
        'activeOn',
        'dateMode',
        'includeCancelled',
        'limit',
        'offset',
      ] as const;
      for (const k of keys) {
        sp.delete(k);
      }
      const merged = { ...filterInput, ...next };
      sp.set('dateMode', merged.dateMode);
      if (merged.collaboratorId) sp.set('collaboratorId', merged.collaboratorId);
      if (merged.projectId) sp.set('projectId', merged.projectId);
      if (merged.activityTypeId) sp.set('activityTypeId', merged.activityTypeId);
      if (merged.includeCancelled) sp.set('includeCancelled', 'true');
      if (merged.dateMode === 'range' && merged.from && merged.to) {
        sp.set('from', merged.from);
        sp.set('to', merged.to);
      }
      if (merged.dateMode === 'activeOn' && merged.activeOn) {
        sp.set('activeOn', merged.activeOn);
      }
      sp.set('limit', String(merged.limit));
      sp.set('offset', String(merged.offset));
      router.push(`/teams/assignments?${sp.toString()}`);
    },
    [filterInput, router, searchParams],
  );

  const openCreate = () => {
    setFormMode('create');
    setEditRow(null);
    setFormOpen(true);
  };

  const openEdit = (row: TeamResourceAssignment) => {
    setFormMode('edit');
    setEditRow(row);
    setFormOpen(true);
  };

  const handleCancelRow = async (row: TeamResourceAssignment) => {
    if (!canManage || !canActivityTypes) return;
    if (!window.confirm('Annuler cette affectation ?')) return;
    try {
      await cancelGlobal.mutateAsync(row.id);
      toast.success('Affectation annulée.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Annulation impossible.');
    }
  };

  const writeBlocked = canManage && !canActivityTypes;

  return (
    <>
      <PageHeader
        title="Affectations"
        description="Charge planifiée par collaborateur, projet et type d’activité."
        actions={
          canRead && canManage ? (
            <Button type="button" onClick={openCreate} disabled={!canActivityTypes}>
              <Plus className="size-4" />
              Nouvelle affectation
            </Button>
          ) : null
        }
      />

      {permsLoading && <LoadingState rows={2} />}
      {permsOk && !canRead && (
        <Alert className="border-amber-500/35">
          <AlertTriangle className="size-4" />
          <AlertTitle>Accès refusé</AlertTitle>
          <AlertDescription>
            Permission requise : <code>team_assignments.read</code>.
          </AlertDescription>
        </Alert>
      )}

      {permsOk && canRead && writeBlocked && (
        <Alert>
          <AlertTitle>Modification impossible</AlertTitle>
          <AlertDescription>
            Vous pouvez consulter les affectations, mais la création et l’édition nécessitent
            l’accès aux types d’activité (<code>activity_types.read</code>). Contactez un
            administrateur.
          </AlertDescription>
        </Alert>
      )}

      {permsOk && canRead && (
        <div className="space-y-4">
          <div className="grid gap-3 rounded-lg border p-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <Label>Collaborateur</Label>
              <select
                className="border-input bg-background h-8 w-full rounded-lg border px-2 text-sm"
                value={filterInput.collaboratorId ?? ''}
                onChange={(e) =>
                  pushFilters({
                    collaboratorId: e.target.value || undefined,
                    offset: 0,
                  })
                }
              >
                <option value="">Tous</option>
                {(collaboratorsForFilter.data?.items ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.displayName}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Projet</Label>
              <select
                className="border-input bg-background h-8 w-full rounded-lg border px-2 text-sm"
                value={filterInput.projectId ?? ''}
                onChange={(e) =>
                  pushFilters({
                    projectId: e.target.value || undefined,
                    offset: 0,
                  })
                }
              >
                <option value="">Tous</option>
                {(projectsForFilter.data?.items ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Type d&apos;activité</Label>
              <select
                className="border-input bg-background h-8 w-full rounded-lg border px-2 text-sm"
                value={filterInput.activityTypeId ?? ''}
                onChange={(e) =>
                  pushFilters({
                    activityTypeId: e.target.value || undefined,
                    offset: 0,
                  })
                }
                disabled={!canActivityTypes}
              >
                <option value="">Tous</option>
                {(activityTypesForFilter.data?.items ?? []).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 md:col-span-2 lg:col-span-3">
              <Label>Filtre temporel</Label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="dateMode"
                    checked={filterInput.dateMode === 'none'}
                    onChange={() =>
                      pushFilters({
                        dateMode: 'none',
                        from: undefined,
                        to: undefined,
                        activeOn: undefined,
                        offset: 0,
                      })
                    }
                  />
                  Aucun
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="dateMode"
                    checked={filterInput.dateMode === 'range'}
                    onChange={() =>
                      pushFilters({
                        dateMode: 'range',
                        from: filterInput.from,
                        to: filterInput.to,
                        activeOn: undefined,
                        offset: 0,
                      })
                    }
                  />
                  Plage (du / au)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="dateMode"
                    checked={filterInput.dateMode === 'activeOn'}
                    onChange={() =>
                      pushFilters({
                        dateMode: 'activeOn',
                        from: undefined,
                        to: undefined,
                        activeOn: filterInput.activeOn,
                        offset: 0,
                      })
                    }
                  />
                  Actif le…
                </label>
              </div>
              {filterInput.dateMode === 'range' ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  <Input
                    type="date"
                    value={filterInput.from ?? ''}
                    onChange={(e) =>
                      pushFilters({
                        dateMode: 'range',
                        from: e.target.value || undefined,
                        to: filterInput.to,
                        offset: 0,
                      })
                    }
                  />
                  <Input
                    type="date"
                    value={filterInput.to ?? ''}
                    onChange={(e) =>
                      pushFilters({
                        dateMode: 'range',
                        from: filterInput.from,
                        to: e.target.value || undefined,
                        offset: 0,
                      })
                    }
                  />
                </div>
              ) : null}
              {filterInput.dateMode === 'activeOn' ? (
                <div className="mt-2">
                  <Input
                    type="date"
                    value={filterInput.activeOn ?? ''}
                    onChange={(e) =>
                      pushFilters({
                        dateMode: 'activeOn',
                        activeOn: e.target.value || undefined,
                        offset: 0,
                      })
                    }
                  />
                </div>
              ) : null}
            </div>
            <label className="flex items-center gap-2 text-sm md:col-span-2">
              <input
                type="checkbox"
                checked={filterInput.includeCancelled}
                onChange={(e) =>
                  pushFilters({ includeCancelled: e.target.checked, offset: 0 })
                }
              />
              Inclure les affectations annulées
            </label>
          </div>

          {listQuery.isLoading && <LoadingState rows={4} />}
          {listQuery.error && (
            <Alert variant="destructive">
              <AlertTitle>{(listQuery.error as Error).message}</AlertTitle>
            </Alert>
          )}
          {listQuery.data && listQuery.data.items.length === 0 && (
            <p className="text-muted-foreground text-sm">Aucune affectation ne correspond aux filtres.</p>
          )}
          {listQuery.data && listQuery.data.items.length > 0 && (
            <TeamAssignmentsTable
              variant="global"
              items={listQuery.data.items}
              canManage={canManage && canActivityTypes}
              onEdit={openEdit}
              onCancel={handleCancelRow}
            />
          )}

          {listQuery.data && listQuery.data.total > filterInput.limit ? (
            <div className="flex items-center justify-between gap-2">
              <p className="text-muted-foreground text-sm">
                {listQuery.data.total} résultat(s) — offset {filterInput.offset}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={filterInput.offset === 0}
                  onClick={() =>
                    pushFilters({
                      offset: Math.max(0, filterInput.offset - filterInput.limit),
                    })
                  }
                >
                  Précédent
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={
                    filterInput.offset + filterInput.limit >= listQuery.data.total
                  }
                  onClick={() =>
                    pushFilters({
                      offset: filterInput.offset + filterInput.limit,
                    })
                  }
                >
                  Suivant
                </Button>
              </div>
            </div>
          ) : null}

          <p className="text-muted-foreground text-xs">
            <Link href="/teams/collaborators" className="underline">
              Collaborateurs
            </Link>
            {' · '}
            <Link href="/projects" className="underline">
              Projets
            </Link>
          </p>
        </div>
      )}

      <TeamAssignmentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        variant="global"
        mode={formMode}
        initial={editRow}
        canLoadActivityTypes={canActivityTypes}
      />
    </>
  );
}
