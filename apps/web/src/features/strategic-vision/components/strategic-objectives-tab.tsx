'use client';

import { useMemo, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FilterBar } from '@/components/layout/filter-bar';
import { FilterBarField } from '@/components/layout/filter-bar-field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

  const axisLabel =
    axisFilter === 'ALL'
      ? 'Tous les axes'
      : axisOptions.find((a) => a.id === axisFilter)?.name ?? 'Axe';

  const statusLabel =
    statusFilter === 'ALL'
      ? 'Tous les statuts'
      : STRATEGIC_OBJECTIVE_STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label ?? statusFilter;

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
          className="min-h-11"
        >
          Nouvel objectif
        </Button>
      </div>
      {objectives.length === 0 ? (
        <Alert>
          <AlertDescription>Aucun objectif strategique disponible.</AlertDescription>
        </Alert>
      ) : null}

      <FilterBar aria-label="Filtres objectifs stratégiques" asSearch desktopColumns={4}>
        <FilterBarField id="objectives-axis" label="Axe">
          {({ controlId, labelId }) => (
            <Select value={axisFilter} onValueChange={(v) => setAxisFilter(v ?? 'ALL')}>
              <SelectTrigger id={controlId} aria-labelledby={labelId} className="w-full">
                <SelectValue>{axisLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les axes</SelectItem>
                {axisOptions.map((axis) => (
                  <SelectItem key={axis.id} value={axis.id}>
                    {axis.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FilterBarField>
        <FilterBarField id="objectives-status" label="Statut">
          {({ controlId, labelId }) => (
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter((v ?? 'ALL') as 'ALL' | StrategicObjectiveStatus)}
            >
              <SelectTrigger id={controlId} aria-labelledby={labelId} className="w-full">
                <SelectValue>{statusLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les statuts</SelectItem>
                {STRATEGIC_OBJECTIVE_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FilterBarField>
        <FilterBarField id="objectives-search" label="Recherche">
          {({ controlId }) => (
            <Input
              id={controlId}
              className="w-full"
              placeholder="Rechercher un objectif..."
              value={searchFilter}
              onChange={(event) => setSearchFilter(event.target.value)}
            />
          )}
        </FilterBarField>
        <FilterBarField id="objectives-overdue" label="En retard">
          {({ labelId }) => (
            <div className="flex min-h-11 items-center gap-2">
              <Switch
                aria-labelledby={labelId}
                aria-label="En retard uniquement"
                checked={overdueOnly}
                onCheckedChange={setOverdueOnly}
              />
              <span className="text-sm text-muted-foreground">En retard uniquement</span>
            </div>
          )}
        </FilterBarField>
      </FilterBar>

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
