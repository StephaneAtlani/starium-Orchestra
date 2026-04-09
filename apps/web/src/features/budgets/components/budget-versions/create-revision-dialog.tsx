'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CreateRevisionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: { label?: string; description?: string }) => void;
  isPending: boolean;
}

export function CreateRevisionDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: CreateRevisionDialogProps) {
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');

  const handleClose = (next: boolean) => {
    if (!next) {
      setLabel('');
      setDescription('');
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouvelle révision</DialogTitle>
          <DialogDescription>
            Duplique la structure du budget source vers une nouvelle version (brouillon). Les codes
            enveloppes / lignes restent alignés pour la comparaison.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rev-label">Libellé (optionnel)</Label>
            <Input
              id="rev-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="ex. Révision T2"
              maxLength={255}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rev-desc">Description (optionnel)</Label>
            <textarea
              id="rev-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={2000}
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleClose(false)}>
            Annuler
          </Button>
          <Button
            type="button"
            disabled={isPending}
            onClick={() => {
              onSubmit({
                label: label.trim() || undefined,
                description: description.trim() || undefined,
              });
            }}
          >
            {isPending ? 'Création…' : 'Créer la révision'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
