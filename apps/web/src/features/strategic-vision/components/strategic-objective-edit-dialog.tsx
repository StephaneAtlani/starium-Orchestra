'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/lib/toast';
import type {
  StrategicObjectiveDto,
  StrategicObjectiveStatus,
} from '../types/strategic-vision.types';
import { useUpdateStrategicObjectiveMutation } from '../hooks/use-strategic-vision-queries';
import { STRATEGIC_OBJECTIVE_STATUS_OPTIONS } from '../lib/strategic-vision-labels';
import {
  getFirstZodError,
  strategicObjectiveFormSchema,
} from '../schemas/strategic-vision.schemas';

export function StrategicObjectiveEditDialog({
  objective,
  open,
  onOpenChange,
  directionOptions,
}: {
  objective: StrategicObjectiveDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  directionOptions: Array<{ id: string; label: string }>;
}) {
  const updateObjective = useUpdateStrategicObjectiveMutation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ownerLabel, setOwnerLabel] = useState('');
  const [status, setStatus] = useState<StrategicObjectiveStatus>('ON_TRACK');
  const [deadline, setDeadline] = useState('');
  const [directionId, setDirectionId] = useState<string>('UNASSIGNED');

  useEffect(() => {
    if (!objective) return;
    setTitle(objective.title);
    setDescription(objective.description ?? '');
    setOwnerLabel(objective.ownerLabel ?? '');
    setStatus(objective.status);
    setDeadline(objective.deadline ? objective.deadline.slice(0, 10) : '');
    setDirectionId(objective.directionId ?? 'UNASSIGNED');
  }, [objective]);

  const handleSave = async () => {
    if (!objective) return;
    const parsed = strategicObjectiveFormSchema.safeParse({
      axisId: objective.axisId,
      title,
      description,
      ownerLabel,
      status,
      deadline,
      directionId,
    });
    if (!parsed.success) {
      toast.error(getFirstZodError(parsed.error));
      return;
    }
    try {
      await updateObjective.mutateAsync({
        objectiveId: objective.id,
        body: {
          title: parsed.data.title,
          description: parsed.data.description?.trim() ? parsed.data.description : null,
          ownerLabel: parsed.data.ownerLabel?.trim() ? parsed.data.ownerLabel : null,
          status: parsed.data.status,
          deadline: parsed.data.deadline ? `${parsed.data.deadline}T00:00:00.000Z` : null,
          directionId:
            parsed.data.directionId === 'UNASSIGNED' ? null : parsed.data.directionId,
        },
      });
      toast.success('Objectif stratégique mis à jour.');
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Mise à jour impossible.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifier l&apos;objectif</DialogTitle>
          <DialogDescription>
            Mettez à jour les informations de pilotage de l&apos;objectif.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Titre</span>
            <input
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Description</span>
            <textarea
              className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Responsable</span>
              <input
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={ownerLabel}
                onChange={(event) => setOwnerLabel(event.target.value)}
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Statut</span>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={status}
                onChange={(event) => setStatus(event.target.value as StrategicObjectiveStatus)}
              >
                {STRATEGIC_OBJECTIVE_STATUS_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Echéance</span>
            <input
              type="date"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={deadline}
              onChange={(event) => setDeadline(event.target.value)}
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Direction</span>
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={directionId}
              onChange={(event) => setDirectionId(event.target.value)}
            >
              <option value="UNASSIGNED">Non affecté</option>
              {directionOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <DialogFooter showCloseButton={false}>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={() => void handleSave()}
            disabled={updateObjective.isPending || title.trim().length === 0}
          >
            {updateObjective.isPending ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
