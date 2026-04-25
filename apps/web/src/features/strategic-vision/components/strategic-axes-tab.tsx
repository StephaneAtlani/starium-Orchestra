'use client';

import { useEffect, useMemo, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';
import type { StrategicAxisDto, StrategicObjectiveDto } from '../types/strategic-vision.types';
import { StrategicAxisCard } from './strategic-axis-card';
import { StrategicAxisCreateDialog } from './strategic-axis-create-dialog';
import { StrategicObjectiveCard } from './strategic-objective-card';
import { StrategicAxisEditDialog } from './strategic-axis-edit-dialog';
import { StrategicObjectiveEditDialog } from './strategic-objective-edit-dialog';
import { useUpdateStrategicAxisMutation } from '../hooks/use-strategic-vision-queries';

export function StrategicAxesTab({
  axes,
  canUpdate,
  canCreate,
  visionId,
  visionTitle,
}: {
  axes: StrategicAxisDto[];
  canUpdate: boolean;
  canCreate: boolean;
  visionId: string | null;
  visionTitle: string | null;
}) {
  const updateAxis = useUpdateStrategicAxisMutation();
  const [orderedAxes, setOrderedAxes] = useState<StrategicAxisDto[]>(axes);
  const [draggingAxisId, setDraggingAxisId] = useState<string | null>(null);
  const [selectedAxisId, setSelectedAxisId] = useState<string | null>(axes[0]?.id ?? null);
  const [editingAxis, setEditingAxis] = useState<StrategicAxisDto | null>(null);
  const [editingObjective, setEditingObjective] = useState<StrategicObjectiveDto | null>(null);
  const [creatingAxis, setCreatingAxis] = useState(false);

  useEffect(() => {
    setOrderedAxes(axes);
    setSelectedAxisId((current) =>
      current && axes.some((axis) => axis.id === current) ? current : (axes[0]?.id ?? null),
    );
  }, [axes]);

  const persistOrder = async (nextAxes: StrategicAxisDto[]) => {
    if (!canUpdate) return;
    try {
      await Promise.all(
        nextAxes.map((axis, index) =>
          updateAxis.mutateAsync({
            axisId: axis.id,
            body: { orderIndex: index + 1 },
          }),
        ),
      );
      toast.success('Ordre des axes mis à jour.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Mise à jour de l’ordre impossible.');
    }
  };

  const moveAxis = async (targetAxisId: string) => {
    if (!draggingAxisId || draggingAxisId === targetAxisId) return;
    const sourceIndex = orderedAxes.findIndex((axis) => axis.id === draggingAxisId);
    const targetIndex = orderedAxes.findIndex((axis) => axis.id === targetAxisId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const nextAxes = [...orderedAxes];
    const [moved] = nextAxes.splice(sourceIndex, 1);
    nextAxes.splice(targetIndex, 0, moved);
    setOrderedAxes(nextAxes);
    setDraggingAxisId(null);
    await persistOrder(nextAxes);
  };

  const selectedAxis = useMemo(
    () => orderedAxes.find((axis) => axis.id === selectedAxisId) ?? orderedAxes[0] ?? null,
    [orderedAxes, selectedAxisId],
  );

  if (orderedAxes.length === 0) {
    return (
      <Alert>
        <AlertDescription>Aucun axe strategique disponible.</AlertDescription>
      </Alert>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreatingAxis(true)} disabled={!canCreate || !visionId}>
          Nouvel axe stratégique
        </Button>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {orderedAxes.map((axis, index) => (
          <StrategicAxisCard
            key={axis.id}
            axis={axis}
            displayIndex={index + 1}
            isSelected={selectedAxis?.id === axis.id}
            onSelect={setSelectedAxisId}
            canUpdate={canUpdate}
            onEdit={setEditingAxis}
            draggable={canUpdate}
            onDragStart={setDraggingAxisId}
            onDrop={(axisId) => void moveAxis(axisId)}
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
      <StrategicAxisCreateDialog
        visionId={visionId}
        visionTitle={visionTitle}
        open={creatingAxis}
        onOpenChange={setCreatingAxis}
      />
    </section>
  );
}
