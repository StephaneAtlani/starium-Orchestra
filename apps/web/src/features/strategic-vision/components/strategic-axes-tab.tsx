'use client';

import { useMemo, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { StrategicAxisDto, StrategicObjectiveDto } from '../types/strategic-vision.types';
import { StrategicAxisCard } from './strategic-axis-card';
import { StrategicObjectiveCard } from './strategic-objective-card';
import { StrategicAxisEditDialog } from './strategic-axis-edit-dialog';
import { StrategicObjectiveEditDialog } from './strategic-objective-edit-dialog';

export function StrategicAxesTab({
  axes,
  canUpdate,
}: {
  axes: StrategicAxisDto[];
  canUpdate: boolean;
}) {
  const [selectedAxisId, setSelectedAxisId] = useState<string | null>(axes[0]?.id ?? null);
  const [editingAxis, setEditingAxis] = useState<StrategicAxisDto | null>(null);
  const [editingObjective, setEditingObjective] = useState<StrategicObjectiveDto | null>(null);

  const selectedAxis = useMemo(
    () => axes.find((axis) => axis.id === selectedAxisId) ?? axes[0] ?? null,
    [axes, selectedAxisId],
  );

  if (axes.length === 0) {
    return (
      <Alert>
        <AlertDescription>Aucun axe strategique disponible.</AlertDescription>
      </Alert>
    );
  }

  return (
    <section className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-2">
        {axes.map((axis) => (
          <StrategicAxisCard
            key={axis.id}
            axis={axis}
            isSelected={selectedAxis?.id === axis.id}
            onSelect={setSelectedAxisId}
            canUpdate={canUpdate}
            onEdit={setEditingAxis}
          />
        ))}
      </div>

      <section className="space-y-3">
        <h3 className="text-base font-semibold">
          Detail axe: {selectedAxis?.name ?? 'Aucun axe selectionne'}
        </h3>
        {!selectedAxis || selectedAxis.objectives.length === 0 ? (
          <Alert>
            <AlertDescription>Aucun objectif sur l&apos;axe selectionne.</AlertDescription>
          </Alert>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {selectedAxis.objectives.map((objective: StrategicObjectiveDto) => (
              <StrategicObjectiveCard
                key={objective.id}
                objective={objective}
                axisName={selectedAxis.name}
                showAxis={false}
                canUpdate={canUpdate}
                onEdit={setEditingObjective}
              />
            ))}
          </div>
        )}
      </section>

      <StrategicAxisEditDialog
        axis={editingAxis}
        open={editingAxis != null}
        onOpenChange={(open) => {
          if (!open) setEditingAxis(null);
        }}
      />
      <StrategicObjectiveEditDialog
        objective={editingObjective}
        open={editingObjective != null}
        onOpenChange={(open) => {
          if (!open) setEditingObjective(null);
        }}
      />
    </section>
  );
}
