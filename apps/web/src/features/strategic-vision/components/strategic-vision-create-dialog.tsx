'use client';

import { useState } from 'react';
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
import { useCreateStrategicVisionMutation } from '../hooks/use-strategic-vision-queries';

export function StrategicVisionCreateDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createVision = useCreateStrategicVisionMutation();
  const [title, setTitle] = useState('');
  const [statement, setStatement] = useState('');
  const [horizonLabel, setHorizonLabel] = useState('');
  const [isActive, setIsActive] = useState(false);

  const reset = () => {
    setTitle('');
    setStatement('');
    setHorizonLabel('');
    setIsActive(false);
  };

  const handleCreate = async () => {
    try {
      await createVision.mutateAsync({
        title: title.trim(),
        statement: statement.trim(),
        horizonLabel: horizonLabel.trim(),
        isActive,
      });
      toast.success('Vision stratégique créée.');
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
          <DialogTitle>Nouvelle vision</DialogTitle>
          <DialogDescription>Créez une nouvelle vision stratégique.</DialogDescription>
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
            <span className="text-muted-foreground">Statement</span>
            <textarea
              className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={statement}
              onChange={(event) => setStatement(event.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Horizon</span>
            <input
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={horizonLabel}
              onChange={(event) => setHorizonLabel(event.target.value)}
            />
          </label>
          <label className="flex items-center gap-2 rounded-md border border-input px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
            />
            Activer immédiatement
          </label>
        </div>
        <DialogFooter showCloseButton={false}>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={() => void handleCreate()}
            disabled={
              createVision.isPending ||
              title.trim().length === 0 ||
              statement.trim().length === 0 ||
              horizonLabel.trim().length === 0
            }
          >
            {createVision.isPending ? 'Création...' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
