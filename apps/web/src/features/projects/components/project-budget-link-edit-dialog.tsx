'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBudgetsList } from '@/features/budgets/hooks/use-budgets';
import { useBudgetLinesByBudget } from '@/features/budgets/hooks/use-budget-lines';
import { useBudgetEnvelopesAll } from '@/features/budgets/hooks/use-budget-envelopes';
import type { ApiFormError } from '@/features/budgets/api/types';
import { useUpdateProjectBudgetLink } from '../hooks/use-update-project-budget-link';
import { ProjectBudgetHierarchyCombobox } from './project-budget-hierarchy-combobox';
import type {
  ProjectBudgetAllocationType,
  ProjectBudgetLinkItem,
  UpdateProjectBudgetLinkPayload,
} from '../types/project.types';

const ALLOCATION_LABEL: Record<ProjectBudgetAllocationType, string> = {
  FULL: '100 % sur la ligne',
  PERCENTAGE: 'Pourcentages (somme 100 %)',
  FIXED: 'Montants fixes',
};

const ALLOCATION_TYPE_KEYS = Object.keys(
  ALLOCATION_LABEL,
) as ProjectBudgetAllocationType[];

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
  totalLinks: number;
};

export function ProjectBudgetLinkEditDialog({
  projectId,
  link,
  open,
  onOpenChange,
  totalLinks,
}: Props) {
  const budgetsQuery = useBudgetsList({ limit: 100 });
  const [budgetId, setBudgetId] = useState<string>(SELECT_NONE);
  const [envelopeId, setEnvelopeId] = useState<string>(SELECT_NONE);
  const [budgetLineId, setBudgetLineId] = useState<string>(SELECT_NONE);
  const [allocationType, setAllocationType] =
    useState<ProjectBudgetAllocationType>('FULL');
  const [percentage, setPercentage] = useState('');
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
    setAllocationType(link.allocationType);
    setPercentage(link.percentage ?? '');
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

  const activeLinesInEnvelope = useMemo(() => {
    const lines = linesQuery.data ?? [];
    return lines.filter(
      (l) =>
        l.status === 'ACTIVE' &&
        envelopeId !== SELECT_NONE &&
        l.envelopeId === envelopeId,
    );
  }, [linesQuery.data, envelopeId]);

  const lineOptions = useMemo(() => {
    const none = { id: SELECT_NONE, label: '— Choisir une ligne —' };
    if (envelopeId === SELECT_NONE) return [none];
    return [
      none,
      ...activeLinesInEnvelope.map((l) => ({
        id: l.id,
        label: formatLineOptionLabel(l),
      })),
    ];
  }, [envelopeId, activeLinesInEnvelope]);

  const envelopeLoading =
    budgetId !== SELECT_NONE &&
    (envelopesQuery.isPending ||
      (envelopesQuery.isFetching && envelopesQuery.data === undefined));

  const lineLoading =
    budgetId !== SELECT_NONE &&
    envelopeId !== SELECT_NONE &&
    (linesQuery.isPending ||
      (linesQuery.isFetching && linesQuery.data === undefined));

  /** Plusieurs liens + changement de mode : le backend convertit tous les liens (PAS → montants ou l’inverse). */
  const bulkModeChange =
    totalLinks > 1 && allocationType !== link?.allocationType;

  const allocationKeysForSelect = useMemo(() => {
    if (totalLinks > 1) {
      return ALLOCATION_TYPE_KEYS.filter((k) => k !== 'FULL');
    }
    return ALLOCATION_TYPE_KEYS;
  }, [totalLinks]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!link) return;
    if (!budgetLineId || budgetLineId === SELECT_NONE) {
      toast.error('Choisissez une ligne budgétaire ACTIVE.');
      return;
    }

    if (bulkModeChange) {
      if (budgetLineId !== link.budgetLineId) {
        toast.error(
          'Enregistrez d’abord le changement de ligne budgétaire, puis le mode d’allocation.',
        );
        return;
      }
      try {
        await updateMut.mutateAsync({
          linkId: link.id,
          payload: { allocationType },
        });
        toast.success('Mode d’allocation mis à jour pour tous les liens.');
        onOpenChange(false);
      } catch (err: unknown) {
        const msg = isApiFormError(err) ? err.message : 'Mise à jour impossible.';
        toast.error(msg);
      }
      return;
    }

    const payload: UpdateProjectBudgetLinkPayload = {};
    if (budgetLineId !== link.budgetLineId) payload.budgetLineId = budgetLineId;
    if (allocationType !== link.allocationType) {
      payload.allocationType = allocationType;
    }
    if (allocationType === 'PERCENTAGE') {
      const p = Number(percentage.replace(',', '.'));
      if (Number.isNaN(p)) {
        toast.error('Pourcentage invalide.');
        return;
      }
      payload.percentage = p;
    }
    if (allocationType === 'FIXED') {
      const a = Number(amount.replace(',', '.'));
      if (Number.isNaN(a)) {
        toast.error('Montant invalide.');
        return;
      }
      payload.amount = a;
    }

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
            Ligne, mode d’allocation et détail. Plusieurs liens : un changement de mode
            (pourcentages ↔ montants fixes) s’applique à tout le projet ; les valeurs sont
            recalculées à partir des données actuelles.
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
                  activeLinesInEnvelope.length === 0
                    ? 'Aucune ligne active dans cette enveloppe.'
                    : null
                }
                onValueChange={setBudgetLineId}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Mode</Label>
                <Select
                  modal={false}
                  value={allocationType}
                  onValueChange={(v) =>
                    setAllocationType((v ?? 'FULL') as ProjectBudgetAllocationType)
                  }
                >
                  <SelectTrigger className="h-9 w-full min-w-0">
                    <SelectValue placeholder="Mode d’allocation">
                      {ALLOCATION_LABEL[allocationType]}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {allocationKeysForSelect.map((k) => (
                      <SelectItem key={k} value={k}>
                        {ALLOCATION_LABEL[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {allocationType === 'PERCENTAGE' && (
                <div className="space-y-2">
                  <Label htmlFor="pb-edit-pct">Pourcentage sur cette ligne</Label>
                  <Input
                    id="pb-edit-pct"
                    inputMode="decimal"
                    placeholder="ex. 40"
                    value={percentage}
                    onChange={(ev) => setPercentage(ev.target.value)}
                    className="h-9"
                  />
                </div>
              )}
              {allocationType === 'FIXED' && (
                <div className="space-y-2">
                  <Label htmlFor="pb-edit-amt">
                    Montant ({selectedBudget?.currency ?? 'EUR'})
                  </Label>
                  <Input
                    id="pb-edit-amt"
                    inputMode="decimal"
                    placeholder="ex. 12000"
                    value={amount}
                    onChange={(ev) => setAmount(ev.target.value)}
                    className="h-9"
                  />
                </div>
              )}
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
