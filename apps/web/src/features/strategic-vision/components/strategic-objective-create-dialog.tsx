'use client';

import { useMemo, useState } from 'react';
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
import { useCreateStrategicObjectiveMutation } from '../hooks/use-strategic-vision-queries';
import type { StrategicObjectiveStatus } from '../types/strategic-vision.types';

type AxisOption = { id: string; name: string };

const STATUS_OPTIONS: Array<{ value: StrategicObjectiveStatus; label: string }> = [
  { value: 'ON_TRACK', label: 'On track' },
  { value: 'AT_RISK', label: 'À risque' },
  { value: 'OFF_TRACK', label: 'Hors trajectoire' },
  { value: 'COMPLETED', label: 'Terminé' },
  { value: 'ARCHIVED', label: 'Archivé' },
];

export function StrategicObjectiveCreateDialog({
  open,
  onOpenChange,
  axisOptions,
  initialAxisId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  axisOptions: AxisOption[];
  initialAxisId?: string | null;
}) {
  const createObjective = useCreateStrategicObjectiveMutation();
  const [axisId, setAxisId] = useState(initialAxisId ?? '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ownerLabel, setOwnerLabel] = useState('');
  const [status, setStatus] = useState<StrategicObjectiveStatus>('ON_TRACK');
  const [deadline, setDeadline] = useState('');

  const effectiveAxisId = useMemo(() => {
    if (axisId) return axisId;
    if (initialAxisId) return initialAxisId;
    return axisOptions[0]?.id ?? '';
  }, [axisId, initialAxisId, axisOptions]);

  const reset = () => {
    setAxisId(initialAxisId ?? '');
    setTitle('');
    setDescription('');
    setOwnerLabel('');
    setStatus('ON_TRACK');
    setDeadline('');
  };

  const handleCreate = async () => {
    if (!effectiveAxisId || !title.trim()) return;
    try {
      await createObjective.mutateAsync({
        axisId: effectiveAxisId,
        title: title.trim(),
        description: description.trim() || undefined,
        ownerLabel: ownerLabel.trim() || undefined,
        status,
        deadline: deadline || undefined,
      });
      toast.success('Objectif stratégique créé.');
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Création impossible.');
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouvel objectif stratégique</DialogTitle>
          <DialogDescription>
            Rattachez l&apos;objectif à un axe et définissez son pilotage.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Axe</span>
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={effectiveAxisId}
              onChange={(event) => setAxisId(event.target.value)}
            >
              {axisOptions.map((axis) => (
                <option key={axis.id} value={axis.id}>
                  {axis.name}
                </option>
              ))}
            </select>
          </label>
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
              className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Responsable</span>
            <input
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={ownerLabel}
              onChange={(event) => setOwnerLabel(event.target.value)}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Statut initial</span>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={status}
                onChange={(event) => setStatus(event.target.value as StrategicObjectiveStatus)}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Échéance</span>
              <input
                type="date"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={deadline}
                onChange={(event) => setDeadline(event.target.value)}
              />
            </label>
          </div>
        </div>
        <DialogFooter showCloseButton={false}>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={() => void handleCreate()}
            disabled={createObjective.isPending || !effectiveAxisId || title.trim().length === 0}
          >
            {createObjective.isPending ? 'Création...' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
