'use client';

import { useMemo, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StrategicObjectiveCard } from './strategic-objective-card';
import { StrategicObjectiveEditDialog } from './strategic-objective-edit-dialog';
import { StrategicObjectiveCreateDialog } from './strategic-objective-create-dialog';
import { StrategicLinksPanel } from './strategic-links-panel';
import {
  buildObjectivesByAxis,
  isObjectiveOverdue,
} from '../lib/strategic-vision-tabs-view';
import type {
  StrategicObjectiveDto,
  StrategicObjectiveStatus,
} from '../types/strategic-vision.types';
import { STRATEGIC_OBJECTIVE_STATUS_OPTIONS } from '../lib/strategic-vision-labels';

type AxisOption = { id: string; name: string };

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase();
}

export function StrategicObjectivesTab({
  objectives,
  axisOptions,
  directionOptions,
  directionFilter,
  canCreate,
  canUpdate,
  canManageLinks,
}: {
  objectives: StrategicObjectiveDto[];
  axisOptions: AxisOption[];
  directionOptions: Array<{ id: string; label: string }>;
  directionFilter: string;
  canCreate: boolean;
  canUpdate: boolean;
  canManageLinks: boolean;
}) {
  const [axisFilter, setAxisFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | StrategicObjectiveStatus>('ALL');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [overdueOnly, setOverdueOnly] = useState<boolean>(false);
  const [editingObjective, setEditingObjective] = useState<StrategicObjectiveDto | null>(null);
  const [creatingObjective, setCreatingObjective] = useState(false);

  const axisNameById = useMemo(
    () => new Map(axisOptions.map((axis) => [axis.id, axis.name])),
    [axisOptions],
  );

  const filteredObjectives = useMemo(() => {
    const search = normalizeSearch(searchFilter);
    return objectives.filter((objective) => {
      if (axisFilter !== 'ALL' && objective.axisId !== axisFilter) return false;
      if (statusFilter !== 'ALL' && objective.status !== statusFilter) return false;
      if (overdueOnly && !isObjectiveOverdue(objective)) return false;
      if (!search) return true;

      const haystack = [
        objective.title,
        objective.description ?? '',
        objective.ownerLabel ?? '',
        objective.direction?.name ?? '',
        axisNameById.get(objective.axisId) ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(search);
    });
  }, [axisFilter, axisNameById, objectives, overdueOnly, searchFilter, statusFilter]);

  const groupedObjectives = useMemo(
    () => buildObjectivesByAxis(filteredObjectives),
    [filteredObjectives],
  );

  return (
    <section className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => setCreatingObjective(true)}
          disabled={!canCreate || axisOptions.length === 0}
        >
          Nouvel objectif
        </Button>
      </div>
      {objectives.length === 0 ? (
        <Alert>
          <AlertDescription>Aucun objectif strategique disponible.</AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-2 lg:grid-cols-4">
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={axisFilter}
          onChange={(event) => setAxisFilter(event.target.value)}
        >
          <option value="ALL">Tous les axes</option>
          {axisOptions.map((axis) => (
            <option key={axis.id} value={axis.id}>
              {axis.name}
            </option>
          ))}
        </select>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as 'ALL' | StrategicObjectiveStatus)
          }
        >
          <option value="ALL">Tous les statuts</option>
          {STRATEGIC_OBJECTIVE_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Input
          placeholder="Rechercher un objectif..."
          value={searchFilter}
          onChange={(event) => setSearchFilter(event.target.value)}
        />
        <label className="flex items-center gap-2 rounded-md border border-input px-3 text-sm">
          <input
            type="checkbox"
            checked={overdueOnly}
            onChange={(event) => setOverdueOnly(event.target.checked)}
          />
          En retard uniquement
        </label>
      </div>
      {directionFilter !== 'ALL' ? (
        <p className="text-xs text-muted-foreground">
          Filtre cockpit actif :{' '}
          {directionFilter === 'UNASSIGNED'
            ? 'Non affecté'
            : directionOptions.find((option) => option.id === directionFilter)?.label ??
              'Direction'}
        </p>
      ) : null}

      {filteredObjectives.length === 0 ? (
        <Alert>
          <AlertDescription>Aucun objectif ne correspond aux filtres.</AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-4">
          {Array.from(groupedObjectives.entries()).map(([axisId, axisObjectives]) => (
            <section key={axisId} className="space-y-3">
              <h3 className="text-base font-semibold">
                {axisNameById.get(axisId) ?? 'Axe strategique'}
              </h3>
              <div className="grid gap-3 lg:grid-cols-2">
                {axisObjectives.map((objective) => (
                  <StrategicObjectiveCard
                    key={objective.id}
                    objective={objective}
                    axisName={axisNameById.get(objective.axisId) ?? 'Axe strategique'}
                    showAxis
                    canUpdate={canUpdate}
                    onEdit={setEditingObjective}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      <StrategicLinksPanel
        objectives={filteredObjectives}
        canManageLinks={canManageLinks}
      />
      <StrategicObjectiveEditDialog
        objective={editingObjective}
        open={editingObjective != null}
        directionOptions={directionOptions}
        onOpenChange={(open) => {
          if (!open) setEditingObjective(null);
        }}
      />
      <StrategicObjectiveCreateDialog
        open={creatingObjective}
        onOpenChange={setCreatingObjective}
        axisOptions={axisOptions}
        directionOptions={directionOptions}
      />
    </section>
  );
}
