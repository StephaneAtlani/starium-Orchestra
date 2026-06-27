'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogBody,
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
import { useBudgetSummary } from '@/features/budgets/hooks/use-budget-summary';
import { useBudgetLinesByBudget } from '@/features/budgets/hooks/use-budget-lines';
import { useBudgetEnvelopesAll } from '@/features/budgets/hooks/use-budget-envelopes';
import type { ApiFormError } from '@/features/budgets/api/types';
import { useUpdateProjectBudgetLink } from '../hooks/use-update-project-budget-link';
import { ProjectBudgetHierarchyCombobox } from './project-budget-hierarchy-combobox';
import { ProjectBudgetAllocationRemainder } from './project-budget-allocation-remainder';
import { ProjectBudgetLineAllocationAlert } from './project-budget-line-allocation-alert';
import { getBudgetLineAllocationWarning } from '../lib/project-budget-line-allocation-check';
import {
  ALLOCATION_MODE_LABELS,
  computeFixedAllocationRemainderForEdit,
  computePercentageAllocationRemainderForEdit,
  computePercentageLineAllocationAmount,
  humanizeProjectBudgetLinkError,
  isPercentageAllocationMode,
  parseFixedLinkAmount,
  parseAllocationPercentage,
} from '../lib/project-budget-allocation';
import type {
  ProjectBudgetAllocationType,
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

function formatCurrencyEur(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
}

type Props = {
  projectId: string;
  link: ProjectBudgetLinkItem | null;
  budgetLinks: ProjectBudgetLinkItem[];
  forecastCost: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ProjectBudgetLinkEditDialog({
  projectId,
  link,
  budgetLinks,
  forecastCost,
  open,
  onOpenChange,
}: Props) {
  const budgetsQuery = useBudgetsList({ limit: 100 });
  const [budgetId, setBudgetId] = useState<string>(SELECT_NONE);
  const [envelopeId, setEnvelopeId] = useState<string>(SELECT_NONE);
  const [budgetLineId, setBudgetLineId] = useState<string>(SELECT_NONE);
  const [amount, setAmount] = useState('');
  const [percentage, setPercentage] = useState('');
  const [editAllocationMode, setEditAllocationMode] =
    useState<ProjectBudgetAllocationType>('FIXED');

  const linesQuery = useBudgetLinesByBudget(
    budgetId === SELECT_NONE ? null : budgetId,
  );
  const envelopesQuery = useBudgetEnvelopesAll(
    budgetId === SELECT_NONE ? null : budgetId,
  );
  const budgetSummaryQuery = useBudgetSummary(
    budgetId === SELECT_NONE ? null : budgetId,
  );
  const updateMut = useUpdateProjectBudgetLink(projectId);
  const titleRef = useRef<HTMLHeadingElement>(null);

  const canChangeAllocationMode = budgetLinks.length <= 1;
  const effectiveAllocationMode = canChangeAllocationMode
    ? editAllocationMode
    : (link?.allocationType ?? 'FIXED');

  useEffect(() => {
    if (!open || !link) return;
    setBudgetId(link.budgetLine.budgetId);
    setEnvelopeId(link.budgetLine.envelopeId || SELECT_NONE);
    setBudgetLineId(link.budgetLineId);
    setAmount(link.amount ?? '');
    setPercentage(link.percentage ?? '');
    setEditAllocationMode(link.allocationType);
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
    const items = activeLinesInEnvelope.map((l) => ({
      id: l.id,
      label: formatLineOptionLabel(l),
    }));
    if (
      link &&
      link.budgetLine.envelopeId === envelopeId &&
      link.budgetLineId !== SELECT_NONE &&
      !items.some((item) => item.id === link.budgetLineId)
    ) {
      const suffix =
        link.budgetLine.status !== 'ACTIVE' ? ' (ligne non active)' : '';
      items.unshift({
        id: link.budgetLineId,
        label: `${formatLineOptionLabel(link.budgetLine)}${suffix}`,
      });
    }
    return [none, ...items];
  }, [activeLinesInEnvelope, envelopeId, link]);

  const envelopeLoading =
    budgetId !== SELECT_NONE &&
    (envelopesQuery.isPending ||
      (envelopesQuery.isFetching && envelopesQuery.data === undefined));

  const lineLoading =
    budgetId !== SELECT_NONE &&
    envelopeId !== SELECT_NONE &&
    (linesQuery.isPending ||
      (linesQuery.isFetching && linesQuery.data === undefined));

  const allocationRemainder = useMemo(() => {
    if (!link) return null;
    if (effectiveAllocationMode === 'FIXED') {
      return computeFixedAllocationRemainderForEdit(
        budgetLinks,
        link.id,
        forecastCost,
        amount,
      );
    }
    if (effectiveAllocationMode === 'PERCENTAGE') {
      return computePercentageAllocationRemainderForEdit(
        budgetLinks,
        link.id,
        percentage,
      );
    }
    if (effectiveAllocationMode === 'BUDGET_PERCENTAGE') {
      return computePercentageAllocationRemainderForEdit(
        budgetLinks,
        link.id,
        percentage,
      );
    }
    return null;
  }, [amount, budgetLinks, effectiveAllocationMode, forecastCost, link, percentage]);

  const selectedBudgetLine = useMemo(() => {
    if (budgetLineId === SELECT_NONE) return null;
    const fromQuery = (linesQuery.data ?? []).find((line) => line.id === budgetLineId);
    if (fromQuery) return fromQuery;
    if (link && link.budgetLineId === budgetLineId) {
      const bl = link.budgetLine;
      const initial = bl.initialAmount ?? 0;
      const committed = bl.committedAmount ?? 0;
      const consumed = bl.consumedAmount ?? 0;
      return {
        code: bl.code,
        name: bl.name,
        initialAmount: initial,
        remainingAmount: Math.max(0, initial - committed - consumed),
      };
    }
    return null;
  }, [budgetLineId, linesQuery.data, link]);

  const budgetTotalInitialAmount =
    budgetSummaryQuery.data?.kpi.totalInitialAmount ??
    link?.budgetLine.budgetTotalInitialAmount ??
    null;

  const lineAllocationWarning = useMemo(() => {
    if (
      effectiveAllocationMode !== 'FIXED' &&
      !isPercentageAllocationMode(effectiveAllocationMode)
    ) {
      return null;
    }
    return getBudgetLineAllocationWarning(selectedBudgetLine, {
      mode: effectiveAllocationMode,
      amount,
      percentage,
      budgetTotalInitialAmount,
    });
  }, [
    amount,
    budgetTotalInitialAmount,
    effectiveAllocationMode,
    percentage,
    selectedBudgetLine,
  ]);

  const draftPercentageAmount = useMemo(() => {
    if (!isPercentageAllocationMode(effectiveAllocationMode)) return null;
    const pct = parseAllocationPercentage(percentage);
    if (pct == null) return null;
    const base =
      effectiveAllocationMode === 'BUDGET_PERCENTAGE'
        ? budgetTotalInitialAmount
        : selectedBudgetLine?.initialAmount ?? null;
    if (base == null || base <= 0) return null;
    return computePercentageLineAllocationAmount(base, pct);
  }, [
    budgetTotalInitialAmount,
    effectiveAllocationMode,
    percentage,
    selectedBudgetLine,
  ]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!link) return;
    if (!budgetLineId || budgetLineId === SELECT_NONE) {
      toast.error('Choisissez une ligne budgétaire ACTIVE.');
      return;
    }

    const payload: UpdateProjectBudgetLinkPayload = {};
    if (budgetLineId !== link.budgetLineId) payload.budgetLineId = budgetLineId;

    if (canChangeAllocationMode && effectiveAllocationMode !== link.allocationType) {
      payload.allocationType = effectiveAllocationMode;
    }

    if (effectiveAllocationMode === 'FIXED') {
      const a = Number(amount.replace(',', '.'));
      if (Number.isNaN(a)) {
        toast.error('Montant invalide.');
        return;
      }
      if (payload.allocationType != null || parseFixedLinkAmount(link.amount) !== a) {
        payload.amount = a;
      }
    } else if (effectiveAllocationMode === 'PERCENTAGE' || effectiveAllocationMode === 'BUDGET_PERCENTAGE') {
      const p = Number(percentage.replace(',', '.'));
      if (Number.isNaN(p)) {
        toast.error('Pourcentage invalide.');
        return;
      }
      if (payload.allocationType != null || parseAllocationPercentage(link.percentage) !== p) {
        payload.percentage = p;
      }
    }

    if (Object.keys(payload).length === 0) {
      toast.message('Aucune modification à enregistrer.');
      return;
    }

    try {
      await updateMut.mutateAsync({ linkId: link.id, payload });
      toast.success('Lien budgétaire mis à jour.');
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = isApiFormError(err)
        ? humanizeProjectBudgetLinkError(err.message)
        : 'Mise à jour impossible.';
      toast.error(msg);
    }
  };

  const currency = selectedBudget?.currency ?? 'EUR';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[min(92dvh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
        showCloseButton
        initialFocus={titleRef}
      >
        <DialogHeader className="shrink-0 border-b border-border/60 px-5 py-4 pr-12">
          <DialogTitle
            ref={titleRef}
            tabIndex={-1}
            className="outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Modifier le lien budgétaire
          </DialogTitle>
          <DialogDescription>
            Ajustez la ligne active et la valeur allouée selon le mode du projet.
          </DialogDescription>
        </DialogHeader>

        {link ? (
          <form onSubmit={onSubmit} className="starium-proj-budget-edit-form flex min-h-0 flex-1 flex-col">
            <DialogBody className="starium-proj-budget-edit-form__body space-y-5 px-5 py-5">
              <div className="space-y-3">
                <p className="starium-overline">Sélection</p>
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
                      (lineLoading && budgetLineId === SELECT_NONE)
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
              </div>

              <div className="border-t border-border/60 pt-5">
                <p className="starium-overline mb-1">Allocation sur la ligne</p>

                {canChangeAllocationMode ? (
                  <div className="mb-4 max-w-md space-y-2">
                    <Label htmlFor="pb-edit-mode">Mode d&apos;allocation</Label>
                    <Select
                      modal={false}
                      value={editAllocationMode}
                      onValueChange={(value) =>
                        setEditAllocationMode(
                          (value as ProjectBudgetAllocationType) ?? 'FIXED',
                        )
                      }
                    >
                      <SelectTrigger id="pb-edit-mode" className="h-10 w-full min-w-0">
                        <SelectValue placeholder="Choisir un mode">
                          {ALLOCATION_MODE_LABELS[editAllocationMode]}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {(
                          Object.entries(ALLOCATION_MODE_LABELS) as Array<
                            [ProjectBudgetAllocationType, string]
                          >
                        ).map(([mode, label]) => (
                          <SelectItem key={mode} value={mode}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Modifiable tant qu&apos;il n&apos;existe qu&apos;un seul lien sur ce projet.
                    </p>
                  </div>
                ) : (
                  <p className="mb-4 text-xs text-muted-foreground">
                    Mode du projet :{' '}
                    <span className="font-medium text-foreground">
                      {ALLOCATION_MODE_LABELS[effectiveAllocationMode]}
                    </span>
                  </p>
                )}

                {isPercentageAllocationMode(effectiveAllocationMode) ? (
                  <div className="max-w-xs space-y-2">
                    <Label htmlFor="pb-edit-pct">
                      {effectiveAllocationMode === 'BUDGET_PERCENTAGE'
                        ? 'Pourcentage du budget'
                        : 'Pourcentage de la ligne'}
                    </Label>
                    <div className="relative max-w-[10rem]">
                      <Input
                        id="pb-edit-pct"
                        inputMode="decimal"
                        placeholder="ex. 25"
                        value={percentage}
                        onChange={(ev) => setPercentage(ev.target.value)}
                        className={cn(
                          'h-10 pr-9 tabular-nums',
                          lineAllocationWarning?.exceedsLineBudget &&
                            'border-[color:var(--state-danger)] ring-1 ring-[color:color-mix(in_srgb,var(--state-danger)_35%,transparent)]',
                        )}
                        aria-invalid={lineAllocationWarning != null}
                        aria-describedby={
                          lineAllocationWarning
                            ? 'pb-edit-line-allocation-alert'
                            : 'pb-edit-pct-hint'
                        }
                      />
                      <span
                        className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-semibold text-muted-foreground"
                        aria-hidden
                      >
                        %
                      </span>
                    </div>
                    <p id="pb-edit-pct-hint" className="text-xs text-muted-foreground">
                      {effectiveAllocationMode === 'BUDGET_PERCENTAGE'
                        ? 'Part du budget parent imputée sur la ligne (montant arrondi à l’entier supérieur).'
                        : 'Part du projet sur cette ligne budgétaire (montant arrondi à l’entier supérieur).'}
                      {effectiveAllocationMode === 'BUDGET_PERCENTAGE' &&
                      budgetTotalInitialAmount != null ? (
                        <>
                          {' '}
                          Budget total :{' '}
                          <span className="font-medium tabular-nums text-foreground">
                            {formatCurrencyEur(budgetTotalInitialAmount)}
                          </span>
                        </>
                      ) : null}
                      {selectedBudgetLine ? (
                        <>
                          {effectiveAllocationMode === 'PERCENTAGE' ? (
                            <>
                              {' '}
                              Budget ligne :{' '}
                              <span className="font-medium tabular-nums text-foreground">
                                {formatCurrencyEur(selectedBudgetLine.initialAmount)}
                              </span>
                            </>
                          ) : null}
                          {draftPercentageAmount != null ? (
                            <>
                              {' · '}
                              Montant imputé :{' '}
                              <span className="font-medium tabular-nums text-foreground">
                                {formatCurrencyEur(draftPercentageAmount)}
                              </span>
                            </>
                          ) : null}
                          {' · '}
                          Disponible ligne :{' '}
                          <span className="font-medium tabular-nums text-foreground">
                            {formatCurrencyEur(
                              Math.max(0, selectedBudgetLine.remainingAmount),
                            )}
                          </span>
                        </>
                      ) : null}
                    </p>
                  </div>
                ) : effectiveAllocationMode === 'FIXED' ? (
                  <div className="max-w-xs space-y-2">
                    <Label htmlFor="pb-edit-amt">Montant ({currency})</Label>
                    <Input
                      id="pb-edit-amt"
                      inputMode="decimal"
                      placeholder="ex. 12000"
                      value={amount}
                      onChange={(ev) => setAmount(ev.target.value)}
                      className={cn(
                        'h-10 tabular-nums',
                        lineAllocationWarning?.exceedsLineBudget &&
                          'border-[color:var(--state-danger)] ring-1 ring-[color:color-mix(in_srgb,var(--state-danger)_35%,transparent)]',
                      )}
                      aria-invalid={lineAllocationWarning != null}
                      aria-describedby={
                        lineAllocationWarning ? 'pb-edit-line-allocation-alert' : undefined
                      }
                    />
                    {selectedBudgetLine ? (
                      <p className="text-xs text-muted-foreground">
                        Budget ligne :{' '}
                        <span className="font-medium tabular-nums text-foreground">
                          {formatCurrencyEur(selectedBudgetLine.initialAmount)}
                        </span>
                        {' · '}
                        Disponible :{' '}
                        <span className="font-medium tabular-nums text-foreground">
                          {formatCurrencyEur(Math.max(0, selectedBudgetLine.remainingAmount))}
                        </span>
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Le projet prend 100 % de la ligne sélectionnée. Aucun montant ni pourcentage à
                    saisir.
                  </p>
                )}

                {lineAllocationWarning ? (
                  <ProjectBudgetLineAllocationAlert
                    id="pb-edit-line-allocation-alert"
                    warning={lineAllocationWarning}
                    currency={currency}
                  />
                ) : null}

                {effectiveAllocationMode === 'FIXED' ||
                isPercentageAllocationMode(effectiveAllocationMode) ? (
                  <ProjectBudgetAllocationRemainder
                    mode={effectiveAllocationMode}
                    remainder={allocationRemainder}
                    forecastCost={forecastCost}
                    currency={currency}
                  />
                ) : null}
              </div>
            </DialogBody>

            <div className="starium-proj-budget-edit-form__footer flex shrink-0 flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={() => onOpenChange(false)}
              >
                Annuler
              </Button>
              <Button type="submit" className="min-h-11" disabled={updateMut.isPending}>
                {updateMut.isPending ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </div>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
