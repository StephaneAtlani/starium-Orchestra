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
import { Label } from '@/components/ui/label';
import type { CreateProjectScenarioPayload } from '../types/project.types';

type CreateScenarioDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CreateProjectScenarioPayload) => Promise<void>;
  disabled: boolean;
};

export function CreateScenarioDialog({
  open,
  onOpenChange,
  onSubmit,
  disabled,
}: CreateScenarioDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!open) {
      setName('');
      setDescription('');
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer un scénario</DialogTitle>
          <DialogDescription>
            MVP: nom obligatoire, description optionnelle.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-1">
          <div className="grid gap-1.5">
            <Label htmlFor="scenario-name">Nom</Label>
            <Input
              id="scenario-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Scénario cible"
              disabled={disabled}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="scenario-description">Description (optionnel)</Label>
            <Input
              id="scenario-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Hypothèses principales"
              disabled={disabled}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={disabled}>
            Annuler
          </Button>
          <Button
            type="button"
            disabled={disabled || name.trim().length === 0}
            onClick={async () => {
              await onSubmit({
                name: name.trim(),
                description: description.trim() || undefined,
              });
              onOpenChange(false);
            }}
          >
            Créer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
