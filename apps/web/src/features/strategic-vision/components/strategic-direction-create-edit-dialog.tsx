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
import { Input } from '@/components/ui/input';
import { toast } from '@/lib/toast';
import {
  useCreateStrategicDirectionMutation,
  useUpdateStrategicDirectionMutation,
} from '../hooks/use-strategic-vision-queries';
import type { StrategicDirectionDto } from '../types/strategic-vision.types';

export function StrategicDirectionCreateEditDialog({
  mode,
  open,
  onOpenChange,
  direction,
  onSuccess,
}: {
  mode: 'create' | 'edit';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  direction: StrategicDirectionDto | null;
  onSuccess?: (direction: StrategicDirectionDto) => void;
}) {
  const createDirection = useCreateStrategicDirectionMutation();
  const updateDirection = useUpdateStrategicDirectionMutation();

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && direction) {
      setCode(direction.code);
      setName(direction.name);
      setDescription(direction.description ?? '');
      setIsActive(direction.isActive);
    } else if (mode === 'create') {
      setCode('');
      setName('');
      setDescription('');
      setIsActive(true);
    }
  }, [open, mode, direction]);

  const reset = () => {
    setCode('');
    setName('');
    setDescription('');
    setIsActive(true);
  };

  const handleSubmit = async () => {
    try {
      if (mode === 'create') {
        const created = await createDirection.mutateAsync({
          code: code.trim(),
          name: name.trim(),
          description: description.trim() || undefined,
          sortOrder: 0,
          isActive,
        });
        toast.success('Direction créée.');
        onSuccess?.(created);
      } else if (direction) {
        const updated = await updateDirection.mutateAsync({
          directionId: direction.id,
          body: {
            code: code.trim(),
            name: name.trim(),
            description: description.trim() || null,
            sortOrder: direction.sortOrder,
            isActive,
          },
        });
        toast.success('Direction mise à jour.');
        onSuccess?.(updated);
      }
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Enregistrement impossible.');
    }
  };

  const pending = createDirection.isPending || updateDirection.isPending;
  const canSubmit =
    !pending && code.trim().length > 0 && name.trim().length > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg bg-background/75 backdrop-blur-md border-border/50">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Nouvelle direction' : 'Modifier la direction'}</DialogTitle>
          <DialogDescription>
            Code court unique (ex. DSI), libellé affiché partout dans les sélecteurs et tableaux.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Code</span>
            <Input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Ex. DSI"
              disabled={pending}
              maxLength={30}
              autoComplete="off"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Nom</span>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nom métier"
              disabled={pending}
              maxLength={255}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Description (optionnel)</span>
            <textarea
              className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={pending}
              maxLength={4000}
            />
          </label>
          <p className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            Ordre d&apos;affichage : automatique (alphabétique).
          </p>
          <label className="flex items-center gap-2 rounded-md border border-border/60 px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
              disabled={pending}
            />
            Direction active
          </label>
        </div>
        <DialogFooter showCloseButton={false}>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Annuler
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={!canSubmit}>
            {pending ? 'Enregistrement…' : mode === 'create' ? 'Créer' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
