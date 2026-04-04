'use client';

import React, { useId } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { budgetQueryKeys } from '@/features/budgets/lib/budget-query-keys';
import { createBudgetSnapshot } from '@/features/budgets/api/budget-snapshots.api';
import { toast } from '@/lib/toast';
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
import { cn } from '@/lib/utils';

const textareaClass = cn(
  'min-h-[88px] w-full resize-y rounded-lg border border-input bg-background px-2.5 py-2 text-sm transition-colors outline-none',
  'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
  'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
);

export interface CreateBudgetSnapshotDialogProps {
  budgetId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Ex. focus parent, toast — après invalidation cache */
  onSuccess?: () => void;
}

export function CreateBudgetSnapshotDialog({
  budgetId,
  open,
  onOpenChange,
  onSuccess,
}: CreateBudgetSnapshotDialogProps) {
  const id = useId();
  const nameFieldId = `${id}-snapshot-name`;
  const descFieldId = `${id}-snapshot-description`;

  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const queryClient = useQueryClient();

  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');

  const createSnapshotMutation = useMutation({
    mutationFn: () =>
      createBudgetSnapshot(authFetch, {
        budgetId,
        name: name.trim(),
        description: description.trim() || undefined,
      }),
    onSuccess: async () => {
      setName('');
      setDescription('');
      toast.success('Snapshot créé', {
        description: 'La photo figée du budget est enregistrée.',
      });
      onOpenChange(false);
      await queryClient.invalidateQueries({
        queryKey: budgetQueryKeys.budgetSnapshotsList(clientId, budgetId),
      });
      onSuccess?.();
    },
    onError: (error: Error) => {
      const msg = error.message || 'Erreur lors de la création du snapshot';
      toast.error('Création impossible', {
        description: msg,
        duration: 8_000,
      });
    },
  });

  const isCreatePending = createSnapshotMutation.isPending;

  const handleOpenChange = (nextOpen: boolean) => {
    if (isCreatePending) return;
    if (!nextOpen) {
      setName('');
      setDescription('');
    }
    onOpenChange(nextOpen);
  };

  const onSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    createSnapshotMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={!isCreatePending} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Créer un snapshot</DialogTitle>
          <DialogDescription>
            Photo figée du budget à l’instant T — utile pour audit et comparaisons.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor={nameFieldId}>Nom</Label>
            <Input
              id={nameFieldId}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex. Avant validation DAF"
              disabled={isCreatePending}
              required
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={descFieldId}>Description (optionnel)</Label>
            <textarea
              id={descFieldId}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Contexte ou périmètre du gel"
              disabled={isCreatePending}
              rows={3}
              className={textareaClass}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isCreatePending}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isCreatePending || !name.trim()}>
              {isCreatePending ? 'Création…' : 'Créer le snapshot'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
