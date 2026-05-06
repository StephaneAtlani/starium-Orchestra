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
import type { StrategicVisionDto } from '../types/strategic-vision.types';
import { useUpdateStrategicVisionMutation } from '../hooks/use-strategic-vision-queries';
import { getFirstZodError, strategicVisionFormSchema } from '../schemas/strategic-vision.schemas';

export function StrategicVisionEditDialog({
  vision,
  open,
  onOpenChange,
}: {
  vision: StrategicVisionDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateVision = useUpdateStrategicVisionMutation();
  const [title, setTitle] = useState('');
  const [statement, setStatement] = useState('');
  const [horizonLabel, setHorizonLabel] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!vision) return;
    setTitle(vision.title);
    setStatement(vision.statement);
    setHorizonLabel(vision.horizonLabel);
    setIsActive(vision.isActive);
  }, [vision]);

  const handleSave = async () => {
    if (!vision) return;
    const parsed = strategicVisionFormSchema.safeParse({ title, statement, horizonLabel, isActive });
    if (!parsed.success) {
      toast.error(getFirstZodError(parsed.error));
      return;
    }
    try {
      await updateVision.mutateAsync({
        visionId: vision.id,
        body: {
          title: parsed.data.title,
          statement: parsed.data.statement,
          horizonLabel: parsed.data.horizonLabel,
          isActive: parsed.data.isActive,
        },
      });
      toast.success('Vision stratégique mise à jour.');
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Mise à jour impossible.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifier la vision</DialogTitle>
          <DialogDescription>
            Mettez à jour le titre, le statement, l&apos;horizon et le statut.
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
            Vision active
          </label>
        </div>
        <DialogFooter showCloseButton={false}>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={() => void handleSave()}
            disabled={
              updateVision.isPending ||
              title.trim().length === 0 ||
              statement.trim().length === 0 ||
              horizonLabel.trim().length === 0
            }
          >
            {updateVision.isPending ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
