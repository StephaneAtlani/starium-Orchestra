'use client';

import React, { useId, useState } from 'react';
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
import { useCreateAccessGroup } from '../hooks/use-create-access-group';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateGroupDialog({ open, onOpenChange }: Props) {
  const formId = useId();
  const [name, setName] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const createGroup = useCreateAccessGroup();

  function reset() {
    setName('');
    setErr(null);
  }

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) reset();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setErr('Le nom est requis.');
      return;
    }
    setErr(null);
    createGroup.mutate(
      { name: trimmed },
      {
        onSuccess: () => handleOpenChange(false),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouveau groupe d&apos;accès</DialogTitle>
          <DialogDescription>
            Le nom est unique pour ce client. Vous pourrez y ajouter des membres ensuite.
          </DialogDescription>
        </DialogHeader>
        <form id={formId} onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`${formId}-name`}>Nom du groupe</Label>
            <Input
              id={`${formId}-name`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex. Équipe DSI"
              autoComplete="off"
              disabled={createGroup.isPending}
            />
          </div>
          {err && <p className="text-sm text-destructive">{err}</p>}
        </form>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={createGroup.isPending}
          >
            Annuler
          </Button>
          <Button type="submit" form={formId} disabled={createGroup.isPending}>
            Créer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
