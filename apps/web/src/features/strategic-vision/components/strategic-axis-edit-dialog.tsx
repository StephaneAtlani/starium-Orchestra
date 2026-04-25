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
import type { StrategicAxisDto } from '../types/strategic-vision.types';
import { useUpdateStrategicAxisMutation } from '../hooks/use-strategic-vision-queries';

export function StrategicAxisEditDialog({
  axis,
  open,
  onOpenChange,
}: {
  axis: StrategicAxisDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateAxis = useUpdateStrategicAxisMutation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [orderIndex, setOrderIndex] = useState('');

  useEffect(() => {
    if (!axis) return;
    setName(axis.name);
    setDescription(axis.description ?? '');
    setOrderIndex(axis.orderIndex == null ? '' : String(axis.orderIndex));
  }, [axis]);

  const handleSave = async () => {
    if (!axis) return;
    try {
      await updateAxis.mutateAsync({
        axisId: axis.id,
        body: {
          name: name.trim(),
          description: description.trim() ? description.trim() : null,
          orderIndex: orderIndex.trim() === '' ? null : Number(orderIndex),
        },
      });
      toast.success('Axe stratégique mis à jour.');
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Mise à jour impossible.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifier l&apos;axe stratégique</DialogTitle>
          <DialogDescription>
            Mettez à jour le nom, la description et l&apos;ordre d&apos;affichage.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Nom</span>
            <input
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={name}
              onChange={(event) => setName(event.target.value)}
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

          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Ordre</span>
            <input
              type="number"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={orderIndex}
              onChange={(event) => setOrderIndex(event.target.value)}
            />
          </label>
        </div>

        <DialogFooter showCloseButton={false}>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={() => void handleSave()}
            disabled={updateAxis.isPending || name.trim().length === 0}
          >
            {updateAxis.isPending ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
