'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from '@/lib/toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBudgetsList } from '@/features/budgets/hooks/use-budgets';
import { useBudgetLinesByBudget } from '@/features/budgets/hooks/use-budget-lines';
import { useBudgetEnvelopesAll } from '@/features/budgets/hooks/use-budget-envelopes';
import type { ApiFormError } from '@/features/budgets/api/types';
import { useUpdateProjectBudgetLink } from '../hooks/use-update-project-budget-link';
import { ProjectBudgetHierarchyCombobox } from './project-budget-hierarchy-combobox';
import type {
  ProjectBudgetLinkItem,
  UpdateProjectBudgetLinkPayload,
} from '../types/project.types';

const SELECT_NONE = '__none__';

function isApiFormError(e: unknown): e is ApiFormError {
  return (
    typeof e === 'object' &&
    e !== null &&
    'message' in e &&
    typeof (e as ApiFormError).message === 'string'
  );
}

function formatBudgetOptionLabel(b: { code: string | null; name: string }): string {
  return b.code ? `${b.code} — ${b.name}` : b.name;
}

function formatEnvelopeOptionLabel(e: {
  code: string | null;
  name: string;
}): string {
  return e.code ? `${e.code} — ${e.name}` : e.name;
}

function formatLineOptionLabel(l: { code: string | null; name: string }): string {
  return l.code ? `${l.code} — ${l.name}` : l.name;
}

type Props = {
  projectId: string;
  link: ProjectBudgetLinkItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ProjectBudgetLinkEditDialog({
  projectId,
  link,
  open,
  onOpenChange,
}: Props) {
  const budgetsQuery = useBudgetsList({ limit: 100 });
  const [budgetId, setBudgetId] = useState<string>(SELECT_NONE);
  const [envelopeId, setEnvelopeId] = useState<string>(SELECT_NONE);
  const [budgetLineId, setBudgetLineId] = useState<string>(SELECT_NONE);
  const [amount, setAmount] = useState('');

  const linesQuery = useBudgetLinesByBudget(
    budgetId === SELECT_NONE ? null : budgetId,
  );
  const envelopesQuery = useBudgetEnvelopesAll(
    budgetId === SELECT_NONE ? null : budgetId,
  );
  const updateMut = useUpdateProjectBudgetLink(projectId);

  useEffect(() => {
    if (!open || !link) return;
    setBudgetId(link.budgetLine.budgetId);
    setEnvelopeId(link.budgetLine.envelopeId || SELECT_NONE);
    setBudgetLineId(link.budgetLineId);
    setAmount(link.amount ?? '');
  }, [open, link]);

  const selectedBudget = useMemo(
    () => (budgetsQuery.data?.items ?? []).find((b) => b.id === budgetId),
    [budgetsQuery.data?.items, budgetId],
  );

  const budgetOptions = useMemo(
    () => [
      { id: SELECT_NONE, label: '— Choisir un budget —' },
      ...(budgetsQuery.data?.items ?? []).map((b) => ({
        id: b.id,
        label: formatBudgetOptionLabel(b),
      })),
    ],
    [budgetsQuery.data?.items],
  );

  const envelopeOptions = useMemo(() => {
    const none = { id: SELECT_NONE, label: '— Choisir une enveloppe —' };
    if (budgetId === SELECT_NONE) return [none];
    return [
      none,
      ...(envelopesQuery.data ?? []).map((e) => ({
        id: e.id,
        label: formatEnvelopeOptionLabel(e),
      })),
    ];
  }, [budgetId, envelopesQuery.data]);

  const linesInEnvelope = useMemo(() => {
    const lines = linesQuery.data ?? [];
    return lines.filter(
      (l) => envelopeId !== SELECT_NONE && l.envelopeId === envelopeId,
    );
  }, [linesQuery.data, envelopeId]);

  const lineOptions = useMemo(() => {
    const none = { id: SELECT_NONE, label: '— Choisir une ligne —' };
    if (envelopeId === SELECT_NONE) return [none];
    return [
      none,
      ...linesInEnvelope.map((l) => ({
        id: l.id,
        label: formatLineOptionLabel(l),
      })),
    ];
  }, [envelopeId, linesInEnvelope]);

  const envelopeLoading =
    budgetId !== SELECT_NONE &&
    (envelopesQuery.isPending ||
      (envelopesQuery.isFetching && envelopesQuery.data === undefined));

  const lineLoading =
    budgetId !== SELECT_NONE &&
    envelopeId !== SELECT_NONE &&
    (linesQuery.isPending ||
      (linesQuery.isFetching && linesQuery.data === undefined));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!link) return;
    if (!budgetLineId || budgetLineId === SELECT_NONE) {
      toast.error('Choisissez une ligne budgétaire.');
      return;
    }

    const a = Number(amount.replace(',', '.'));
    if (Number.isNaN(a)) {
      toast.error('Montant invalide.');
      return;
    }

    const payload: UpdateProjectBudgetLinkPayload = {};
    if (budgetLineId !== link.budgetLineId) payload.budgetLineId = budgetLineId;
    if (link.allocationType !== 'FIXED') {
      payload.allocationType = 'FIXED';
    }
    payload.amount = a;

    try {
      await updateMut.mutateAsync({ linkId: link.id, payload });
      toast.success('Lien budgétaire mis à jour.');
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = isApiFormError(err) ? err.message : 'Mise à jour impossible.';
      toast.error(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>Modifier le lien budgétaire</DialogTitle>
          <DialogDescription>
            Ligne budgétaire et montant fixe alloué sur cette ligne.
          </DialogDescription>
        </DialogHeader>

        {link ? (
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <ProjectBudgetHierarchyCombobox
                id="pb-edit-budget"
                label="1. Budget"
                placeholder="Rechercher un budget…"
                value={budgetId}
                noneId={SELECT_NONE}
                options={budgetOptions}
                loading={budgetsQuery.isLoading}
                onValueChange={(id) => {
                  setBudgetId(id);
                  setEnvelopeId(SELECT_NONE);
                  setBudgetLineId(SELECT_NONE);
                }}
              />
              <ProjectBudgetHierarchyCombobox
                id="pb-edit-envelope"
                label="2. Enveloppe"
                placeholder={
                  budgetId === SELECT_NONE
                    ? 'Choisissez d’abord un budget'
                    : 'Rechercher une enveloppe…'
                }
                value={envelopeId}
                noneId={SELECT_NONE}
                options={envelopeOptions}
                disabled={
                  budgetId === SELECT_NONE ||
                  envelopesQuery.isError ||
                  envelopeLoading
                }
                loading={envelopeLoading}
                errorText={
                  budgetId !== SELECT_NONE && envelopesQuery.isError
                    ? 'Impossible de charger les enveloppes.'
                    : null
                }
                emptyText={
                  budgetId !== SELECT_NONE &&
                  envelopesQuery.isSuccess &&
                  (envelopesQuery.data?.length ?? 0) === 0
                    ? 'Aucune enveloppe sur ce budget.'
                    : null
                }
                onValueChange={(id) => {
                  setEnvelopeId(id);
                  setBudgetLineId(SELECT_NONE);
                }}
              />
              <ProjectBudgetHierarchyCombobox
                id="pb-edit-line"
                label="3. Ligne (active)"
                placeholder={
                  envelopeId === SELECT_NONE
                    ? 'Choisissez d’abord une enveloppe'
                    : 'Rechercher une ligne…'
                }
                value={budgetLineId}
                noneId={SELECT_NONE}
                options={lineOptions}
                disabled={
                  budgetId === SELECT_NONE ||
                  envelopeId === SELECT_NONE ||
                  lineLoading
                }
                loading={lineLoading}
                emptyText={
                  budgetId !== SELECT_NONE &&
                  envelopeId !== SELECT_NONE &&
                  linesQuery.isSuccess &&
                  linesInEnvelope.length === 0
                    ? 'Aucune ligne dans cette enveloppe.'
                    : null
                }
                onValueChange={setBudgetLineId}
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Affectation : montants fixes sur la ligne sélectionnée.
              </p>
              <Label htmlFor="pb-edit-amt">
                Montant ({selectedBudget?.currency ?? 'EUR'})
              </Label>
              <Input
                id="pb-edit-amt"
                inputMode="decimal"
                placeholder="ex. 12000"
                value={amount}
                onChange={(ev) => setAmount(ev.target.value)}
                className="h-9 max-w-md"
              />
            </div>

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={updateMut.isPending}>
                {updateMut.isPending ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </div>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
