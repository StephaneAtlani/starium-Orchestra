'use client';

import { useMemo, useState } from 'react';
import { toast } from '@/lib/toast';
import {
  ChevronDown,
  Cloud,
  Code2,
  Link2,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingState } from '@/components/feedback/loading-state';
import { useBudgetsList } from '@/features/budgets/hooks/use-budgets';
import { useBudgetSummary } from '@/features/budgets/hooks/use-budget-summary';
import { useBudgetLinesByBudget } from '@/features/budgets/hooks/use-budget-lines';
import { useBudgetEnvelopesAll } from '@/features/budgets/hooks/use-budget-envelopes';
import type { ApiFormError } from '@/features/budgets/api/types';
import type { CreateLinePayload } from '@/features/budgets/api/budget-management.api';
import { useGeneralLedgerAccountOptions } from '@/features/budgets/hooks/use-general-ledger-account-options';
import { useActiveClient } from '@/hooks/use-active-client';
import { usePermissions } from '@/hooks/use-permissions';
import { useProjectBudgetLinksQuery } from '../hooks/use-project-budget-links-query';
import { useProjectSheetQuery } from '../hooks/use-project-sheet-query';
import { useCreateProjectBudgetLink } from '../hooks/use-create-project-budget-link';
import { useDeleteProjectBudgetLink } from '../hooks/use-delete-project-budget-link';
import { useCreateBudgetLineInline } from '../hooks/use-create-budget-line-inline';
import { cn } from '@/lib/utils';
import { ProjectBudgetHierarchyCombobox } from './project-budget-hierarchy-combobox';
import { ProjectBudgetLinkEditDialog } from './project-budget-link-edit-dialog';
import {
  ALLOCATION_MODE_LABELS,
  canAddProjectBudgetLink,
  computeFixedAllocationRemainder,
  computePercentageAllocationRemainder,
  computePercentageLineAllocationAmount,
  humanizeProjectBudgetLinkError,
  isPercentageAllocationMode,
  parseAllocationPercentage,
  parseFixedLinkAmount,
  resolveCreateAllocationMode,
} from '../lib/project-budget-allocation';
import { formatProjectBudgetAllocation } from '../scenario-workspace/scenario-budget-project-links';
import { ProjectBudgetAllocationRemainder } from './project-budget-allocation-remainder';
import { ProjectBudgetLineAllocationAlert } from './project-budget-line-allocation-alert';
import { getBudgetLineAllocationWarning } from '../lib/project-budget-line-allocation-check';
import type {
  CreateProjectBudgetLinkPayload,
  ProjectBudgetAllocationType,
} from '../types/project.types';

/** Valeur réservée pour « aucune sélection » — évite value undefined (Select contrôlé stable). */
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

type BuildLinkResult =
  | { ok: true; payload: CreateProjectBudgetLinkPayload }
  | { ok: false; message: string };

function buildCreateLinkPayload(
  budgetLineId: string,
  allocationType: ProjectBudgetAllocationType,
  percentage: string,
  amount: string,
): BuildLinkResult {
  if (!budgetLineId || budgetLineId === SELECT_NONE) {
    return { ok: false, message: 'Choisissez une ligne budgétaire ACTIVE.' };
  }
  const payload: CreateProjectBudgetLinkPayload = {
    budgetLineId,
    allocationType,
  };
  if (allocationType === 'PERCENTAGE' || allocationType === 'BUDGET_PERCENTAGE') {
    const p = Number(percentage.replace(',', '.'));
    if (Number.isNaN(p)) {
      return { ok: false, message: 'Indiquez un pourcentage valide.' };
    }
    payload.percentage = p;
  }
  if (allocationType === 'FIXED') {
    const a = Number(amount.replace(',', '.'));
    if (Number.isNaN(a)) {
      return { ok: false, message: 'Indiquez un montant valide.' };
    }
    payload.amount = a;
  }
  return { ok: true, payload };
}

function formatCurrencyEur(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function ProjectBudgetSection({
  projectId,
  embedded = false,
}: {
  projectId: string;
  /** Sans carte englobante (page Budget dédiée). */
  embedded?: boolean;
}) {
  const { has } = usePermissions();
  const { activeClient } = useActiveClient();
  const canCreateBudgetLine = has('budgets.create');
  const canEditBudgetLinks = has('projects.update');
  const budgetAccountingEnabled = Boolean(activeClient?.budgetAccountingEnabled);
  const generalLedgerQuery = useGeneralLedgerAccountOptions();

  const linksQuery = useProjectBudgetLinksQuery(projectId);
  const sheetQuery = useProjectSheetQuery(projectId);
  const budgetsQuery = useBudgetsList({ limit: 100 });
  const [budgetId, setBudgetId] = useState<string>(SELECT_NONE);
  const [envelopeId, setEnvelopeId] = useState<string>(SELECT_NONE);
  const linesQuery = useBudgetLinesByBudget(
    budgetId === SELECT_NONE ? null : budgetId,
  );
  const envelopesQuery = useBudgetEnvelopesAll(
    budgetId === SELECT_NONE ? null : budgetId,
  );
  const budgetSummaryQuery = useBudgetSummary(
    budgetId === SELECT_NONE ? null : budgetId,
  );

  const [budgetLineId, setBudgetLineId] = useState<string>(SELECT_NONE);
  const [amount, setAmount] = useState('');
  const [percentage, setPercentage] = useState('');
  const [createAllocationMode, setCreateAllocationMode] =
    useState<ProjectBudgetAllocationType>('FIXED');

  const [newLineName, setNewLineName] = useState('');
  const [newLineCode, setNewLineCode] = useState('');
  const [newLineExpenseType, setNewLineExpenseType] = useState<'OPEX' | 'CAPEX'>(
    'OPEX',
  );
  const [newLineInitial, setNewLineInitial] = useState('0');
  const [newLineGeneralLedgerId, setNewLineGeneralLedgerId] =
    useState<string>(SELECT_NONE);
  /** Formulaire « nouvelle ligne » : uniquement après action explicite (pas dès budget+enveloppe). */
  const [showNewLineForm, setShowNewLineForm] = useState(false);
  /** Bloc « Ajouter un lien budgétaire » repliable. */
  const [addBudgetLinkOpen, setAddBudgetLinkOpen] = useState(false);

  const createMut = useCreateProjectBudgetLink(projectId);
  const deleteMut = useDeleteProjectBudgetLink(projectId);
  const createLineMut = useCreateBudgetLineInline();
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);

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

  const resetForm = () => {
    setBudgetLineId(SELECT_NONE);
    setAmount('');
    setPercentage('');
  };

  const budgetLinks = linksQuery.data?.items ?? [];
  const canChooseCreateAllocationMode = budgetLinks.length === 0;
  const effectiveCreateAllocationMode = useMemo(
    () =>
      canChooseCreateAllocationMode
        ? createAllocationMode
        : resolveCreateAllocationMode(budgetLinks),
    [budgetLinks, canChooseCreateAllocationMode, createAllocationMode],
  );
  const addLinkGuard = useMemo(
    () => canAddProjectBudgetLink(budgetLinks),
    [budgetLinks],
  );

  /** Crée la ligne budgétaire puis tente d’ajouter le lien projet (même règles que « Ajouter le lien »). */
  const handleCreateBudgetLineAndLink = async () => {
    if (budgetId === SELECT_NONE || envelopeId === SELECT_NONE) {
      toast.error('Choisissez un budget et une enveloppe.');
      return;
    }
    const name = newLineName.trim();
    if (!name) {
      toast.error('Indiquez un libellé pour la nouvelle ligne.');
      return;
    }
    const initialAmount = Number(newLineInitial.replace(',', '.'));
    if (Number.isNaN(initialAmount) || initialAmount < 0) {
      toast.error('Montant initial invalide.');
      return;
    }
    if (
      budgetAccountingEnabled &&
      (newLineGeneralLedgerId === SELECT_NONE || !newLineGeneralLedgerId)
    ) {
      toast.error('Sélectionnez un compte comptable pour la nouvelle ligne.');
      return;
    }
    try {
      const linePayload: CreateLinePayload = {
        budgetId,
        envelopeId,
        name,
        code: newLineCode.trim() || undefined,
        expenseType: newLineExpenseType,
        initialAmount,
        currency: selectedBudget?.currency ?? 'EUR',
        status: 'ACTIVE',
      };
      if (budgetAccountingEnabled && newLineGeneralLedgerId !== SELECT_NONE) {
        linePayload.generalLedgerAccountId = newLineGeneralLedgerId;
      }
      if (
        selectedBudget?.taxMode === 'TTC' &&
        selectedBudget.defaultTaxRate != null
      ) {
        linePayload.taxRate = selectedBudget.defaultTaxRate;
      }

      const line = await createLineMut.mutateAsync(linePayload);
      setBudgetLineId(line.id);
      setNewLineName('');
      setNewLineCode('');
      setNewLineInitial('0');
      setNewLineGeneralLedgerId(SELECT_NONE);
      setShowNewLineForm(false);

      const built = buildCreateLinkPayload(
        line.id,
        effectiveCreateAllocationMode,
        percentage,
        amount,
      );
      if (!built.ok) {
        toast.warning('Ligne créée et sélectionnée', {
          description: `${built.message} Complétez l’allocation ci-dessus, puis « Ajouter le lien ».`,
        });
        return;
      }

      await createMut.mutateAsync(built.payload);
      toast.success('Ligne créée et lien budgétaire ajouté.');
      resetForm();
    } catch (err: unknown) {
      const msg = isApiFormError(err)
        ? humanizeProjectBudgetLinkError(err.message)
        : 'Création impossible.';
      toast.error(msg);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addLinkGuard.ok) {
      toast.error(addLinkGuard.message);
      return;
    }
    const built = buildCreateLinkPayload(
      budgetLineId,
      effectiveCreateAllocationMode,
      percentage,
      amount,
    );
    if (!built.ok) {
      toast.error(built.message);
      return;
    }

    try {
      await createMut.mutateAsync(built.payload);
      toast.success('Lien budget créé.');
      resetForm();
    } catch (err: unknown) {
      const msg = isApiFormError(err)
        ? humanizeProjectBudgetLinkError(err.message)
        : 'Création impossible.';
      toast.error(msg);
    }
  };

  const onDelete = async (linkId: string) => {
    if (!window.confirm('Supprimer ce lien projet ↔ ligne budgétaire ?')) return;
    try {
      await deleteMut.mutateAsync(linkId);
      toast.success('Lien supprimé.');
    } catch (err: unknown) {
      const msg = isApiFormError(err)
        ? humanizeProjectBudgetLinkError(err.message)
        : 'Suppression impossible.';
      toast.error(msg);
    }
  };

  const editingLink =
    editingLinkId == null
      ? null
      : (linksQuery.data?.items ?? []).find((l) => l.id === editingLinkId) ?? null;

  const sheetForecastCost = sheetQuery.data?.estimatedCost ?? null;
  const budgetTotalInitialAmount =
    budgetSummaryQuery.data?.kpi.totalInitialAmount ?? null;

  const allocationRemainder = useMemo(() => {
    if (effectiveCreateAllocationMode === 'FIXED') {
      return computeFixedAllocationRemainder(budgetLinks, sheetForecastCost, amount);
    }
    if (isPercentageAllocationMode(effectiveCreateAllocationMode)) {
      return computePercentageAllocationRemainder(budgetLinks, percentage);
    }
    return null;
  }, [
    amount,
    budgetLinks,
    effectiveCreateAllocationMode,
    percentage,
    sheetForecastCost,
  ]);

  const selectedBudgetLine = useMemo(() => {
    if (budgetLineId === SELECT_NONE || budgetId === SELECT_NONE) return null;
    return (linesQuery.data ?? []).find((line) => line.id === budgetLineId) ?? null;
  }, [budgetId, budgetLineId, linesQuery.data]);

  const allocationLineRef = useMemo((): {
    initialAmount: number;
    remainingAmount: number;
  } | null => {
    if (selectedBudgetLine) {
      return {
        initialAmount: selectedBudgetLine.initialAmount,
        remainingAmount: selectedBudgetLine.remainingAmount,
      };
    }
    if (showNewLineForm && newLineInitial.trim()) {
      const initial = Number(newLineInitial.replace(',', '.'));
      if (Number.isNaN(initial) || initial < 0) return null;
      return { initialAmount: initial, remainingAmount: initial };
    }
    return null;
  }, [newLineInitial, selectedBudgetLine, showNewLineForm]);

  const draftPercentageAmount = useMemo(() => {
    if (!isPercentageAllocationMode(effectiveCreateAllocationMode)) return null;
    const pct = parseAllocationPercentage(percentage);
    if (pct == null) return null;
    const base =
      effectiveCreateAllocationMode === 'BUDGET_PERCENTAGE'
        ? budgetTotalInitialAmount
        : allocationLineRef?.initialAmount ?? null;
    if (base == null || base <= 0) return null;
    return computePercentageLineAllocationAmount(base, pct);
  }, [
    allocationLineRef,
    budgetTotalInitialAmount,
    effectiveCreateAllocationMode,
    percentage,
  ]);

  const lineAllocationWarning = useMemo(() => {
    if (
      effectiveCreateAllocationMode !== 'FIXED' &&
      !isPercentageAllocationMode(effectiveCreateAllocationMode)
    ) {
      return null;
    }

    const lineRef = selectedBudgetLine
      ? {
          code: selectedBudgetLine.code,
          name: selectedBudgetLine.name,
          initialAmount: selectedBudgetLine.initialAmount,
          remainingAmount: selectedBudgetLine.remainingAmount,
        }
      : showNewLineForm && newLineInitial.trim()
        ? (() => {
            const initial = Number(newLineInitial.replace(',', '.'));
            if (Number.isNaN(initial) || initial < 0) return null;
            return {
              code: newLineCode.trim() || null,
              name: newLineName.trim() || 'Nouvelle ligne',
              initialAmount: initial,
              remainingAmount: initial,
            };
          })()
        : null;

    return getBudgetLineAllocationWarning(lineRef, {
      mode: effectiveCreateAllocationMode,
      amount,
      percentage,
      budgetTotalInitialAmount,
    });
  }, [
    amount,
    budgetTotalInitialAmount,
    effectiveCreateAllocationMode,
    newLineCode,
    newLineInitial,
    newLineName,
    percentage,
    selectedBudgetLine,
    showNewLineForm,
  ]);

  const body = (
    <>
        {linksQuery.isLoading ? (
          <LoadingState rows={2} />
        ) : (
          <>
            <div className="starium-tablecard">
              <div className="starium-table-wrap">
                <table className="starium-dt">
                  <caption className="sr-only">
                    Liaisons budgétaires du projet
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Ligne budgétaire</th>
                      <th scope="col">Mode d&apos;allocation</th>
                      <th scope="col" className="starium-dt__right">
                        Valeur
                      </th>
                      <th scope="col" className="starium-dt__right w-[108px]">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {budgetLinks.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="py-10 text-center text-sm text-muted-foreground"
                        >
                          Aucun lien budgétaire. Ajoutez un lien ci-dessous pour rattacher le
                          projet à une ligne active.
                        </td>
                      </tr>
                    ) : (
                      budgetLinks.map((row, index) => {
                        const fixedAmount = parseFixedLinkAmount(row.amount);
                        const lineLabel = row.budgetLine.code
                          ? `${row.budgetLine.code} — ${row.budgetLine.name}`
                          : row.budgetLine.name;
                        const allocationLabel = formatProjectBudgetAllocation(row);
                        const valueLabel =
                          row.allocationType === 'FULL'
                            ? '100 %'
                            : row.allocationType === 'PERCENTAGE' ||
                                row.allocationType === 'BUDGET_PERCENTAGE'
                              ? row.percentage != null
                                ? `${row.percentage} %`
                                : '—'
                              : fixedAmount != null
                                ? formatCurrencyEur(fixedAmount)
                                : '—';
                        const tone =
                          row.budgetLine.expenseType === 'CAPEX'
                            ? 'starium-dt-ti-blue'
                            : index % 2 === 0
                              ? 'starium-dt-ti-gold'
                              : 'starium-dt-ti-purple';
                        const Icon =
                          row.budgetLine.expenseType === 'CAPEX' ? Cloud : Code2;

                        return (
                          <tr key={row.id}>
                            <td>
                              <div className="starium-dt-tname">
                                <div
                                  className={cn('starium-dt-tname-ico', tone)}
                                  aria-hidden
                                >
                                  <Icon strokeWidth={1.75} />
                                </div>
                                <div className="min-w-0">
                                  <div className="starium-dt-cell-strong truncate">
                                    {lineLabel}
                                  </div>
                                  <div className="starium-dt-cell-sub">
                                    {row.budgetLine.expenseType ?? 'OPEX'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div className="text-sm text-foreground">{allocationLabel}</div>
                            </td>
                            <td className="text-right tabular-nums font-semibold">
                              {valueLabel}
                            </td>
                            <td className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {canEditBudgetLinks ? (
                                  <button
                                    type="button"
                                    className="starium-btn-icon min-h-11 min-w-11"
                                    onClick={() => setEditingLinkId(row.id)}
                                    aria-label={`Modifier le lien sur ${lineLabel}`}
                                  >
                                    <Pencil aria-hidden />
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  className="starium-btn-icon min-h-11 min-w-11 text-[color:var(--state-danger)]"
                                  disabled={deleteMut.isPending}
                                  onClick={() => onDelete(row.id)}
                                  aria-label={`Supprimer le lien sur ${lineLabel}`}
                                >
                                  <Trash2 aria-hidden />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <p className="flex items-center gap-1.5 border-t border-[color:var(--neutral-100)] px-4 py-3 text-[11.5px] text-muted-foreground">
                Montants ou pourcentages imputés sur chaque ligne selon le mode d&apos;allocation
                du projet.
              </p>
            </div>

            <div className="starium-proj-budget-add">
              <button
                type="button"
                className="starium-proj-budget-add__trigger"
                onClick={() => setAddBudgetLinkOpen((o) => !o)}
                aria-expanded={addBudgetLinkOpen}
                aria-controls="pb-add-budget-link-panel"
                id="pb-add-budget-link-trigger"
              >
                <span className="starium-proj-budget-add__trigger-icon" aria-hidden="true">
                  <Plus strokeWidth={2.25} />
                </span>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="starium-proj-budget-add__trigger-title">
                    Ajouter un lien budgétaire
                  </p>
                  <p className="starium-proj-budget-add__trigger-sub">
                    Budget, enveloppe, puis ligne active — libellés alignés sur le module Budget.
                  </p>
                </div>
                <ChevronDown
                  className={cn(
                    'size-4 shrink-0 text-[color:var(--brand-gold-700)] transition-transform duration-200',
                    addBudgetLinkOpen && 'rotate-180',
                  )}
                  aria-hidden="true"
                />
              </button>

              {addBudgetLinkOpen ? (
            <form
              id="pb-add-budget-link-panel"
              onSubmit={onSubmit}
              className="starium-proj-budget-add__panel space-y-5"
            >
              {!addLinkGuard.ok ? (
                <div
                  className="rounded-lg border border-[color-mix(in_srgb,var(--state-warning)_35%,var(--border))] bg-[color-mix(in_srgb,var(--state-warning-bg)_80%,var(--card))] px-4 py-3 text-sm text-foreground"
                  role="status"
                >
                  {addLinkGuard.message}
                </div>
              ) : (
                <>
              <div className="space-y-3">
                <p className="starium-overline">
                  Sélection
                </p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <ProjectBudgetHierarchyCombobox
                    id="pb-budget"
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
                      setShowNewLineForm(false);
                    }}
                  />
                  <ProjectBudgetHierarchyCombobox
                    id="pb-envelope"
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
                        ? 'Aucune enveloppe sur ce budget. Créez-en une depuis le module Budget.'
                        : null
                    }
                    onValueChange={(id) => {
                      setEnvelopeId(id);
                      setBudgetLineId(SELECT_NONE);
                      setShowNewLineForm(false);
                    }}
                  />
                  <ProjectBudgetHierarchyCombobox
                    id="pb-line"
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
                        ? canCreateBudgetLine
                          ? 'Aucune ligne active. Utilisez le bouton « Créer une nouvelle ligne » sous la sélection, ou le module Budget.'
                          : 'Aucune ligne active dans cette enveloppe. Créez-en une depuis le module Budget.'
                        : null
                    }
                    onValueChange={(id) => {
                      setBudgetLineId(id);
                    }}
                  />
                </div>
              </div>

              <div className="border-t border-border/60 pt-5">
                <p className="starium-overline mb-1">
                  Allocation sur la ligne choisie ou à créer
                </p>

                {canChooseCreateAllocationMode ? (
                  <div className="mb-4 max-w-md space-y-2">
                    <Label htmlFor="pb-create-mode">Mode d&apos;allocation</Label>
                    <Select
                      modal={false}
                      value={createAllocationMode}
                      onValueChange={(value) => {
                        const mode = (value as ProjectBudgetAllocationType) ?? 'FIXED';
                        setCreateAllocationMode(mode);
                        setAmount('');
                        setPercentage('');
                      }}
                    >
                      <SelectTrigger id="pb-create-mode" className="h-10 w-full min-w-0">
                        <SelectValue placeholder="Choisir un mode">
                          {ALLOCATION_MODE_LABELS[createAllocationMode]}
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
                      Choix définitif pour ce projet : tous les liens utiliseront le même mode.
                    </p>
                  </div>
                ) : (
                  <p className="mb-3 text-xs text-muted-foreground">
                    Mode du projet :{' '}
                    <span className="font-medium text-foreground">
                      {ALLOCATION_MODE_LABELS[effectiveCreateAllocationMode]}
                    </span>
                  </p>
                )}

                {isPercentageAllocationMode(effectiveCreateAllocationMode) ? (
                  <div className="max-w-xs space-y-2">
                    <Label htmlFor="pb-pct">
                      {effectiveCreateAllocationMode === 'BUDGET_PERCENTAGE'
                        ? 'Pourcentage du budget'
                        : 'Pourcentage de la ligne'}
                    </Label>
                    <div className="relative max-w-[10rem]">
                      <Input
                        id="pb-pct"
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
                            ? 'pb-line-allocation-alert'
                            : 'pb-pct-hint'
                        }
                      />
                      <span
                        className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-semibold text-muted-foreground"
                        aria-hidden
                      >
                        %
                      </span>
                    </div>
                    <p id="pb-pct-hint" className="text-xs text-muted-foreground">
                      {effectiveCreateAllocationMode === 'BUDGET_PERCENTAGE'
                        ? 'Part du budget parent imputée sur la ligne (montant arrondi à l’entier supérieur).'
                        : 'Part du projet sur cette ligne budgétaire (montant arrondi à l’entier supérieur).'}
                      {effectiveCreateAllocationMode === 'BUDGET_PERCENTAGE' &&
                      budgetTotalInitialAmount != null ? (
                        <>
                          {' '}
                          Budget total :{' '}
                          <span className="font-medium tabular-nums text-foreground">
                            {formatCurrencyEur(budgetTotalInitialAmount)}
                          </span>
                        </>
                      ) : null}
                      {allocationLineRef ? (
                        <>
                          {effectiveCreateAllocationMode === 'PERCENTAGE' ? (
                            <>
                              {' '}
                              Budget ligne :{' '}
                              <span className="font-medium tabular-nums text-foreground">
                                {formatCurrencyEur(allocationLineRef.initialAmount)}
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
                              Math.max(0, allocationLineRef.remainingAmount),
                            )}
                          </span>
                        </>
                      ) : null}
                    </p>
                  </div>
                ) : effectiveCreateAllocationMode === 'FIXED' ? (
                  <div className="max-w-xs space-y-2">
                    <Label htmlFor="pb-amt">Montant ({selectedBudget?.currency ?? 'EUR'})</Label>
                    <Input
                      id="pb-amt"
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
                        lineAllocationWarning ? 'pb-line-allocation-alert' : undefined
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
                    Le projet prendra 100 % de la ligne sélectionnée. Aucun montant ni pourcentage
                    à saisir.
                  </p>
                )}
                {lineAllocationWarning ? (
                  <ProjectBudgetLineAllocationAlert
                    id="pb-line-allocation-alert"
                    warning={lineAllocationWarning}
                    currency={selectedBudget?.currency ?? 'EUR'}
                  />
                ) : null}
                {effectiveCreateAllocationMode === 'FIXED' ||
                isPercentageAllocationMode(effectiveCreateAllocationMode) ? (
                  <ProjectBudgetAllocationRemainder
                    mode={effectiveCreateAllocationMode}
                    remainder={allocationRemainder}
                    forecastCost={sheetForecastCost}
                    currency={selectedBudget?.currency ?? 'EUR'}
                  />
                ) : null}
              </div>

              {canCreateBudgetLine &&
                budgetId !== SELECT_NONE &&
                envelopeId !== SELECT_NONE &&
                !showNewLineForm && (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-muted-foreground">
                      Besoin d’une ligne qui n’existe pas encore dans cette enveloppe ?
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={() => setShowNewLineForm(true)}
                    >
                      Créer une nouvelle ligne
                    </Button>
                  </div>
                )}

              {canCreateBudgetLine &&
                budgetId !== SELECT_NONE &&
                envelopeId !== SELECT_NONE &&
                showNewLineForm && (
                  <div className="space-y-3 rounded-lg border border-dashed border-primary/25 bg-background/80 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">Nouvelle ligne dans cette enveloppe</p>
                        <p className="text-xs text-muted-foreground">
                          {effectiveCreateAllocationMode === 'PERCENTAGE'
                            ? 'Indiquez le pourcentage de la ligne au-dessus. Création rapide'
                            : effectiveCreateAllocationMode === 'BUDGET_PERCENTAGE'
                              ? 'Indiquez le pourcentage du budget au-dessus. Création rapide'
                              : 'Indiquez le montant fixe au-dessus. Création rapide'}
                          {' '}
                          sans quitter la fiche projet (permission budgets.create).
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="shrink-0 text-muted-foreground"
                        onClick={() => {
                          setShowNewLineForm(false);
                          setNewLineName('');
                          setNewLineCode('');
                          setNewLineExpenseType('OPEX');
                          setNewLineInitial('0');
                          setNewLineGeneralLedgerId(SELECT_NONE);
                        }}
                      >
                        Annuler
                      </Button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="pb-new-name">Libellé</Label>
                        <Input
                          id="pb-new-name"
                          placeholder="ex. Projet — phase 1"
                          value={newLineName}
                          onChange={(ev) => setNewLineName(ev.target.value)}
                          autoComplete="off"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="pb-new-code">Code (optionnel)</Label>
                        <Input
                          id="pb-new-code"
                          placeholder="ex. PRJ-01"
                          value={newLineCode}
                          onChange={(ev) => setNewLineCode(ev.target.value)}
                          autoComplete="off"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Type</Label>
                        <Select
                          modal={false}
                          value={newLineExpenseType}
                          onValueChange={(v) =>
                            setNewLineExpenseType((v as 'OPEX' | 'CAPEX') ?? 'OPEX')
                          }
                        >
                          <SelectTrigger className="h-9 w-full min-w-0">
                            <SelectValue placeholder="OPEX ou CAPEX">
                              {newLineExpenseType}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="OPEX">OPEX</SelectItem>
                            <SelectItem value="CAPEX">CAPEX</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="pb-new-amt">Montant initial</Label>
                        <Input
                          id="pb-new-amt"
                          inputMode="decimal"
                          placeholder="0"
                          value={newLineInitial}
                          onChange={(ev) => setNewLineInitial(ev.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Devise : {selectedBudget?.currency ?? 'EUR'}
                        </p>
                      </div>
                    </div>
                    {budgetAccountingEnabled ? (
                      <div className="space-y-1.5">
                        <Label htmlFor="pb-new-gl">Compte comptable</Label>
                        <Select
                          modal={false}
                          value={newLineGeneralLedgerId}
                          onValueChange={(value) =>
                            setNewLineGeneralLedgerId(value ?? SELECT_NONE)
                          }
                        >
                          <SelectTrigger id="pb-new-gl" className="h-9 w-full min-w-0">
                            <SelectValue placeholder="Choisir un compte">
                              {newLineGeneralLedgerId !== SELECT_NONE
                                ? (() => {
                                    const g = (
                                      generalLedgerQuery.data?.items ?? []
                                    ).find((x) => x.id === newLineGeneralLedgerId);
                                    return g ? `${g.code} — ${g.name}` : '—';
                                  })()
                                : null}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={SELECT_NONE}>— Choisir —</SelectItem>
                            {(generalLedgerQuery.data?.items ?? []).map((g) => (
                              <SelectItem key={g.id} value={g.id}>
                                {g.code} — {g.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Requis lorsque la comptabilité budgétaire est activée pour le client.
                        </p>
                        {generalLedgerQuery.isError ? (
                          <p className="text-xs text-destructive">
                            Impossible de charger les comptes comptables.
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                    <Button
                      type="button"
                      variant="default"
                      className="inline-flex w-full min-h-9 items-center justify-center gap-2 sm:w-auto"
                      disabled={
                        createLineMut.isPending ||
                        createMut.isPending ||
                        (budgetAccountingEnabled && generalLedgerQuery.isPending)
                      }
                      onClick={() => void handleCreateBudgetLineAndLink()}
                    >
                      <Link2 className="size-4 shrink-0 opacity-90" aria-hidden />
                      {createLineMut.isPending || createMut.isPending ? (
                        'Enregistrement…'
                      ) : (
                        'Créer la ligne et ajouter le lien'
                      )}
                    </Button>
                  </div>
                )}

              <button
                type="submit"
                className="starium-btn starium-btn-primary w-full sm:w-auto"
                disabled={
                  createMut.isPending ||
                  !budgetLineId ||
                  budgetLineId === SELECT_NONE
                }
              >
                {createMut.isPending ? 'Enregistrement…' : 'Ajouter le lien'}
              </button>
                </>
              )}
            </form>
              ) : null}
            </div>
          </>
        )}

        <ProjectBudgetLinkEditDialog
          projectId={projectId}
          link={editingLink}
          budgetLinks={budgetLinks}
          forecastCost={sheetForecastCost}
          open={editingLinkId !== null && editingLink !== null}
          onOpenChange={(o) => {
            if (!o) setEditingLinkId(null);
          }}
        />
    </>
  );

  if (embedded) {
    return <div className="starium-proj-budget-section">{body}</div>;
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Budget</CardTitle>
        <p className="text-sm font-normal text-muted-foreground">
          Liez le projet à une ou plusieurs lignes budgétaires.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">{body}</CardContent>
    </Card>
  );
}
