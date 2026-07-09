'use client';

import React, { useId, useState } from 'react';
import { UsersRound } from 'lucide-react';
import { StariumModal } from '@/components/layout/form-dialog-shell';
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
    <StariumModal
      open={open}
      onOpenChange={handleOpenChange}
      title="Nouveau groupe d'accès"
      description="Le nom est unique pour ce client. Vous pourrez y ajouter des membres ensuite."
      icon={UsersRound}
      size="md"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 sm:min-h-9"
            onClick={() => handleOpenChange(false)}
            disabled={createGroup.isPending}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            form={formId}
            className="min-h-11 sm:min-h-9"
            disabled={createGroup.isPending}
          >
            Créer
          </Button>
        </>
      }
    >
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
    </StariumModal>
  );
}
