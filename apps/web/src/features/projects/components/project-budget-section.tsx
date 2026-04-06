'use client';

import { useMemo, useState } from 'react';
import { toast } from '@/lib/toast';
import { ChevronDown, Link2, Pencil, Trash2 } from 'lucide-react';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoadingState } from '@/components/feedback/loading-state';
import { useBudgetsList } from '@/features/budgets/hooks/use-budgets';
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
import type {
  CreateProjectBudgetLinkPayload,
  ProjectBudgetAllocationType,
} from '../types/project.types';
import { ProjectBudgetLinkEditDialog } from './project-budget-link-edit-dialog';

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
    return { ok: false, message: 'Choisissez une ligne budgétaire.' };
  }
  const payload: CreateProjectBudgetLinkPayload = {
    budgetLineId,
    allocationType,
  };
  if (allocationType === 'PERCENTAGE') {
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

function parseFixedLinkAmount(amount: string | null): number | null {
  if (amount == null || amount === '') return null;
  const n = Number(String(amount).replace(',', '.'));
  return Number.isNaN(n) ? null : n;
}

function formatCurrencyEur(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function ProjectBudgetSection({ projectId }: { projectId: string }) {
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

  const [budgetLineId, setBudgetLineId] = useState<string>(SELECT_NONE);
  const [amount, setAmount] = useState('');

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

  const resetForm = () => {
    setBudgetLineId(SELECT_NONE);
    setAmount('');
  };

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

      const built = buildCreateLinkPayload(line.id, 'FIXED', '', amount);
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
      const msg = isApiFormError(err) ? err.message : 'Création impossible.';
      toast.error(msg);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const built = buildCreateLinkPayload(budgetLineId, 'FIXED', '', amount);
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
        ? err.message
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
        ? err.message
        : 'Suppression impossible.';
      toast.error(msg);
    }
  };

  const editingLink =
    editingLinkId == null
      ? null
      : (linksQuery.data?.items ?? []).find((l) => l.id === editingLinkId) ?? null;

  const fixedBudgetLinks = useMemo(
    () =>
      (linksQuery.data?.items ?? []).filter(
        (row) => row.allocationType === 'FIXED',
      ),
    [linksQuery.data?.items],
  );

  const totalFixedAllocated = useMemo(() => {
    let sum = 0;
    for (const row of fixedBudgetLinks) {
      const v = parseFixedLinkAmount(row.amount);
      if (v != null) sum += v;
    }
    return sum;
  }, [fixedBudgetLinks]);

  const sheetForecastCost = sheetQuery.data?.estimatedCost ?? null;
  const forecastVsAllocatedGap =
    sheetForecastCost != null
      ? sheetForecastCost - totalFixedAllocated
      : null;

  const lineKpisFromFixedLinks = useMemo(() => {
    let committed = 0;
    let consumed = 0;
    let imputedCapex = 0;
    let imputedOpex = 0;
    for (const row of fixedBudgetLinks) {
      committed += row.budgetLine.committedAmount ?? 0;
      consumed += row.budgetLine.consumedAmount ?? 0;
      const fixed = parseFixedLinkAmount(row.amount);
      if (fixed == null) continue;
      const et = row.budgetLine.expenseType;
      if (et === 'CAPEX') imputedCapex += fixed;
      else imputedOpex += fixed;
    }
    return { committed, consumed, imputedCapex, imputedOpex };
  }, [fixedBudgetLinks]);

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Budget</CardTitle>
        <p className="text-sm font-normal text-muted-foreground">
          Liez le projet à une ou plusieurs lignes budgétaires.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {linksQuery.isLoading ? (
          <LoadingState rows={2} />
        ) : (
          <>
            {!fixedBudgetLinks.length ? (
              <p className="text-sm text-muted-foreground">
                Aucun lien en montants fixes.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ligne</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead className="w-[104px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fixedBudgetLinks.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <span className="font-medium">{row.budgetLine.code}</span>{' '}
                        <span className="text-muted-foreground">{row.budgetLine.name}</span>
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">
                        <span className="text-muted-foreground">
                          {row.amount != null ? row.amount : '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-0.5">
                          {canEditBudgetLinks ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-foreground"
                              onClick={() => setEditingLinkId(row.id)}
                              aria-label="Modifier le lien budgétaire"
                            >
                              <Pencil className="size-4" />
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            disabled={deleteMut.isPending}
                            onClick={() => onDelete(row.id)}
                            aria-label="Supprimer le lien"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <div
              className="rounded-lg border border-border/60 bg-muted/25 px-3 py-3 sm:px-4"
              aria-live="polite"
            >
              <dl className="grid gap-3 sm:grid-cols-3 sm:gap-4">
                <div className="min-w-0 space-y-0.5">
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Coût prévisionnel (fiche projet)
                  </dt>
                  <dd className="text-base font-semibold tabular-nums text-foreground">
                    {sheetQuery.isLoading ? (
                      <span className="text-muted-foreground">Chargement…</span>
                    ) : sheetQuery.isError ? (
                      <span className="text-muted-foreground">—</span>
                    ) : sheetForecastCost != null ? (
                      formatCurrencyEur(sheetForecastCost)
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </dd>
                </div>
                <div className="min-w-0 space-y-0.5">
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Total imputé (montants fixes)
                  </dt>
                  <dd className="text-base font-semibold tabular-nums text-foreground">
                    {formatCurrencyEur(totalFixedAllocated)}
                  </dd>
                </div>
                <div className="min-w-0 space-y-0.5">
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Écart (prévisionnel − imputé)
                  </dt>
                  <dd
                    className={cn(
                      'text-base font-semibold tabular-nums',
                      forecastVsAllocatedGap == null
                        ? 'text-muted-foreground'
                        : forecastVsAllocatedGap < 0
                          ? 'text-destructive'
                          : forecastVsAllocatedGap > 0
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-foreground',
                    )}
                  >
                    {sheetQuery.isLoading ? (
                      <span className="font-normal text-muted-foreground">
                        Chargement…
                      </span>
                    ) : sheetForecastCost == null ||
                      forecastVsAllocatedGap == null ||
                      sheetQuery.isError ? (
                      '—'
                    ) : (
                      formatCurrencyEur(forecastVsAllocatedGap)
                    )}
                  </dd>
                </div>
              </dl>

              <div className="mt-3 border-t border-border/50 pt-3">
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Lignes budgétaires liées
                </p>
                <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
                  <div className="min-w-0 space-y-0.5">
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Engagé (lignes)
                    </dt>
                    <dd className="text-base font-semibold tabular-nums text-foreground">
                      {formatCurrencyEur(lineKpisFromFixedLinks.committed)}
                    </dd>
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Consommé (lignes)
                    </dt>
                    <dd className="text-base font-semibold tabular-nums text-foreground">
                      {formatCurrencyEur(lineKpisFromFixedLinks.consumed)}
                    </dd>
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      CAPEX (imputé)
                    </dt>
                    <dd className="text-base font-semibold tabular-nums text-foreground">
                      {formatCurrencyEur(lineKpisFromFixedLinks.imputedCapex)}
                    </dd>
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      OPEX (imputé)
                    </dt>
                    <dd className="text-base font-semibold tabular-nums text-foreground">
                      {formatCurrencyEur(lineKpisFromFixedLinks.imputedOpex)}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm dark:bg-card">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/30 sm:px-5"
                onClick={() => setAddBudgetLinkOpen((o) => !o)}
                aria-expanded={addBudgetLinkOpen}
                aria-controls="pb-add-budget-link-panel"
                id="pb-add-budget-link-trigger"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-semibold tracking-tight">
                    Ajouter un lien budgétaire
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Tapez pour filtrer, ou ouvrez la liste. Budget, puis enveloppe, puis une ligne
                    active — libellés alignés sur le module Budget.
                  </p>
                </div>
                <ChevronDown
                  className={cn(
                    'size-4 shrink-0 text-muted-foreground transition-transform duration-200',
                    addBudgetLinkOpen && 'rotate-180',
                  )}
                  aria-hidden="true"
                />
              </button>

              {addBudgetLinkOpen ? (
            <form
              id="pb-add-budget-link-panel"
              onSubmit={onSubmit}
              className="space-y-5 border-t border-border/80 bg-white px-4 pb-5 pt-4 dark:bg-card sm:px-5"
            >
              <div className="space-y-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
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
                      linesInEnvelope.length === 0
                        ? canCreateBudgetLine
                          ? 'Aucune ligne. Utilisez le bouton « Créer une nouvelle ligne » sous la sélection, ou le module Budget.'
                          : 'Aucune ligne dans cette enveloppe. Créez-en une depuis le module Budget.'
                        : null
                    }
                    onValueChange={(id) => {
                      setBudgetLineId(id);
                    }}
                  />
                </div>
              </div>

              <div className="border-t border-border/60 pt-5">
                <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Allocation sur la ligne choisie ou à créer
                </p>
                <p className="mb-3 text-xs text-muted-foreground">
                  Montants fixes sur la ligne sélectionnée.
                </p>
                <div className="max-w-md space-y-2">
                  <Label htmlFor="pb-amt">Montant (devise budget)</Label>
                  <Input
                    id="pb-amt"
                    inputMode="decimal"
                    placeholder="ex. 12000"
                    value={amount}
                    onChange={(ev) => setAmount(ev.target.value)}
                    className="h-9"
                  />
                </div>
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
                          Indiquez le montant fixe au-dessus. Création rapide
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

              <Button
                type="submit"
                variant="secondary"
                className="w-full sm:w-auto"
                disabled={
                  createMut.isPending ||
                  !budgetLineId ||
                  budgetLineId === SELECT_NONE
                }
              >
                {createMut.isPending ? 'Enregistrement…' : 'Ajouter le lien'}
              </Button>
            </form>
              ) : null}
            </div>
          </>
        )}

        <ProjectBudgetLinkEditDialog
          projectId={projectId}
          link={editingLink}
          open={editingLinkId !== null && editingLink !== null}
          onOpenChange={(o) => {
            if (!o) setEditingLinkId(null);
          }}
        />
      </CardContent>
    </Card>
  );
}
