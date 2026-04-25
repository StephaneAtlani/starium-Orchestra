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

const STATUS_OPTIONS: StrategicObjectiveStatus[] = [
  'ON_TRACK',
  'AT_RISK',
  'OFF_TRACK',
  'COMPLETED',
  'ARCHIVED',
];

export function StrategicObjectiveEditDialog({
  objective,
  open,
  onOpenChange,
}: {
  objective: StrategicObjectiveDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateObjective = useUpdateStrategicObjectiveMutation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ownerLabel, setOwnerLabel] = useState('');
  const [status, setStatus] = useState<StrategicObjectiveStatus>('ON_TRACK');
  const [deadline, setDeadline] = useState('');

  useEffect(() => {
    if (!objective) return;
    setTitle(objective.title);
    setDescription(objective.description ?? '');
    setOwnerLabel(objective.ownerLabel ?? '');
    setStatus(objective.status);
    setDeadline(objective.deadline ? objective.deadline.slice(0, 10) : '');
  }, [objective]);

  const handleSave = async () => {
    if (!objective) return;
    try {
      await updateObjective.mutateAsync({
        objectiveId: objective.id,
        body: {
          title: title.trim(),
          description: description.trim() ? description.trim() : null,
          ownerLabel: ownerLabel.trim() ? ownerLabel.trim() : null,
          status,
          deadline: deadline ? `${deadline}T00:00:00.000Z` : null,
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
                {STATUS_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
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
