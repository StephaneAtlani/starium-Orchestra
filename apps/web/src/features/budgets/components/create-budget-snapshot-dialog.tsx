'use client';

import React, { useId } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { budgetQueryKeys } from '@/features/budgets/lib/budget-query-keys';
import { createBudgetSnapshot } from '@/features/budgets/api/budget-snapshots.api';
import { listBudgetSnapshotOccasionTypesMerged } from '@/features/budgets/api/budget-snapshot-occasion-types.api';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

function todayDateInputValue(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const NO_OCCASION_TYPE = '__none__';

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
  const dateFieldId = `${id}-snapshot-date`;
  const typeFieldId = `${id}-snapshot-occasion-type`;

  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const queryClient = useQueryClient();

  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [snapshotDate, setSnapshotDate] = React.useState(todayDateInputValue);
  const [occasionTypeId, setOccasionTypeId] = React.useState(NO_OCCASION_TYPE);

  const occasionTypesQuery = useQuery({
    queryKey: budgetQueryKeys.budgetSnapshotOccasionTypesMerged(clientId),
    queryFn: () => listBudgetSnapshotOccasionTypesMerged(authFetch),
    enabled: open && !!clientId,
  });

  const createSnapshotMutation = useMutation({
    mutationFn: () =>
      createBudgetSnapshot(authFetch, {
        budgetId,
        name: name.trim(),
        description: description.trim() || undefined,
        snapshotDate: snapshotDate.trim()
          ? `${snapshotDate.trim()}T12:00:00.000Z`
          : undefined,
        occasionTypeId:
          occasionTypeId && occasionTypeId !== NO_OCCASION_TYPE
            ? occasionTypeId.trim()
            : undefined,
      }),
    onSuccess: async () => {
      setName('');
      setDescription('');
      setSnapshotDate(todayDateInputValue());
      setOccasionTypeId(NO_OCCASION_TYPE);
      toast.success('Version figée enregistrée', {
        description: 'La copie lecture seule du budget est enregistrée.',
      });
      onOpenChange(false);
      await queryClient.invalidateQueries({
        queryKey: budgetQueryKeys.budgetSnapshotsList(clientId, budgetId),
      });
      onSuccess?.();
    },
    onError: (error: Error) => {
      const msg = error.message || 'Erreur lors de l’enregistrement de la version figée';
      toast.error('Enregistrement impossible', {
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
      setSnapshotDate(todayDateInputValue());
      setOccasionTypeId(NO_OCCASION_TYPE);
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
          <DialogTitle>Enregistrer une version figée</DialogTitle>
          <DialogDescription>
            Copie immuable du budget à la date choisie — lignes en brouillon ou reportées ne sont pas incluses
            (seules les lignes prises en compte dans le pilotage : actives, en validation, clôturées).
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor={dateFieldId}>Date de la version</Label>
            <Input
              id={dateFieldId}
              type="date"
              value={snapshotDate}
              onChange={(e) => setSnapshotDate(e.target.value)}
              disabled={isCreatePending}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={typeFieldId}>Type d’occasion (optionnel)</Label>
            <Select
              value={occasionTypeId}
              onValueChange={(v) => setOccasionTypeId(v ?? NO_OCCASION_TYPE)}
              disabled={isCreatePending || occasionTypesQuery.isLoading}
            >
              <SelectTrigger id={typeFieldId} className="w-full">
                <SelectValue placeholder="Aucun type — renseigner seulement le nom" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_OCCASION_TYPE}>Aucun</SelectItem>
                {(occasionTypesQuery.data ?? []).map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {`${t.label} (${t.code})${t.scope === 'global' ? ' — plateforme' : ''}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {occasionTypesQuery.isError ? (
              <p className="text-xs text-destructive">
                Impossible de charger les types — vous pouvez quand même enregistrer sans type.
              </p>
            ) : null}
          </div>

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
              {isCreatePending ? 'Enregistrement…' : 'Enregistrer la version'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
