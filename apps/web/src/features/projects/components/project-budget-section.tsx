'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
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
import { usePermissions } from '@/hooks/use-permissions';
import { useProjectBudgetLinksQuery } from '../hooks/use-project-budget-links-query';
import { useCreateProjectBudgetLink } from '../hooks/use-create-project-budget-link';
import { useDeleteProjectBudgetLink } from '../hooks/use-delete-project-budget-link';
import { useCreateBudgetLineInline } from '../hooks/use-create-budget-line-inline';
import type {
  CreateProjectBudgetLinkPayload,
  ProjectBudgetAllocationType,
} from '../types/project.types';

const ALLOCATION_LABEL: Record<ProjectBudgetAllocationType, string> = {
  FULL: '100 % sur la ligne',
  PERCENTAGE: 'Pourcentages (somme 100 %)',
  FIXED: 'Montants fixes',
};

const ALLOCATION_TYPE_KEYS = Object.keys(
  ALLOCATION_LABEL,
) as ProjectBudgetAllocationType[];

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

export function ProjectBudgetSection({ projectId }: { projectId: string }) {
  const { has } = usePermissions();
  const canCreateBudgetLine = has('budgets.create');

  const linksQuery = useProjectBudgetLinksQuery(projectId);
  const budgetsQuery = useBudgetsList({ limit: 100 });
  const [budgetId, setBudgetId] = useState<string>(SELECT_NONE);
  const [envelopeId, setEnvelopeId] = useState<string>(SELECT_NONE);
  const linesQuery = useBudgetLinesByBudget(
    budgetId === SELECT_NONE ? null : budgetId,
  );
  const envelopesQuery = useBudgetEnvelopesAll(
    budgetId === SELECT_NONE ? null : budgetId,
  );

  const [allocationType, setAllocationType] =
    useState<ProjectBudgetAllocationType>('FULL');
  const [budgetLineId, setBudgetLineId] = useState<string>(SELECT_NONE);
  const [percentage, setPercentage] = useState('');
  const [amount, setAmount] = useState('');

  const [newLineName, setNewLineName] = useState('');
  const [newLineCode, setNewLineCode] = useState('');
  const [newLineExpenseType, setNewLineExpenseType] = useState<'OPEX' | 'CAPEX'>(
    'OPEX',
  );
  const [newLineInitial, setNewLineInitial] = useState('0');

  const createMut = useCreateProjectBudgetLink(projectId);
  const deleteMut = useDeleteProjectBudgetLink(projectId);
  const createLineMut = useCreateBudgetLineInline();

  const selectedBudget = useMemo(
    () => (budgetsQuery.data?.items ?? []).find((b) => b.id === budgetId),
    [budgetsQuery.data?.items, budgetId],
  );

  /** Libellés trigger — en fonction de la valeur interne du Select (children fonction sur Select.Value, Base UI). */
  const budgetValueLabel = (value: unknown) => {
    if (budgetsQuery.isLoading) return 'Chargement…';
    const v = typeof value === 'string' ? value : SELECT_NONE;
    if (v === SELECT_NONE) return 'Choisir un budget';
    const b = budgetsQuery.data?.items?.find((x) => x.id === v);
    return b ? formatBudgetOptionLabel(b) : 'Budget introuvable dans la liste';
  };

  const envelopeValueLabel = (value: unknown) => {
    if (budgetId === SELECT_NONE) return 'D’abord un budget';
    // Première requête (pas encore de résultat) — isLoading peut être faux si le cache est vide
    if (
      envelopesQuery.isPending ||
      (envelopesQuery.isFetching && envelopesQuery.data === undefined)
    ) {
      return 'Chargement…';
    }
    const v = typeof value === 'string' ? value : SELECT_NONE;
    if (v === SELECT_NONE) return 'Choisir une enveloppe';
    const env = envelopesQuery.data?.find((e) => e.id === v);
    return env ? formatEnvelopeOptionLabel(env) : 'Enveloppe introuvable';
  };

  const lineValueLabel = (value: unknown) => {
    if (envelopeId === SELECT_NONE) return 'D’abord une enveloppe';
    if (
      linesQuery.isPending ||
      (linesQuery.isFetching && linesQuery.data === undefined)
    ) {
      return 'Chargement…';
    }
    const v = typeof value === 'string' ? value : SELECT_NONE;
    if (v === SELECT_NONE) return 'Choisir une ligne';
    const line = linesQuery.data?.find((l) => l.id === v);
    return line ? formatLineOptionLabel(line) : 'Ligne introuvable';
  };

  const activeLinesInEnvelope = useMemo(() => {
    const lines = linesQuery.data ?? [];
    return lines.filter(
      (l) =>
        l.status === 'ACTIVE' &&
        envelopeId !== SELECT_NONE &&
        l.envelopeId === envelopeId,
    );
  }, [linesQuery.data, envelopeId]);

  const resetForm = () => {
    setBudgetLineId(SELECT_NONE);
    setPercentage('');
    setAmount('');
  };

  const handleCreateBudgetLine = async () => {
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
    try {
      const line = await createLineMut.mutateAsync({
        budgetId,
        envelopeId,
        name,
        code: newLineCode.trim() || undefined,
        expenseType: newLineExpenseType,
        initialAmount,
        currency: selectedBudget?.currency ?? 'EUR',
        status: 'ACTIVE',
      });
      setBudgetLineId(line.id);
      setNewLineName('');
      setNewLineCode('');
      setNewLineInitial('0');
      toast.success('Ligne créée et sélectionnée.');
    } catch (err: unknown) {
      const msg = isApiFormError(err) ? err.message : 'Création de ligne impossible.';
      toast.error(msg);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!budgetLineId || budgetLineId === SELECT_NONE) {
      toast.error('Choisissez une ligne budgétaire ACTIVE.');
      return;
    }

    const payload: CreateProjectBudgetLinkPayload = {
      budgetLineId,
      allocationType,
    };
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
      await createMut.mutateAsync(payload);
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
            {!linksQuery.data?.items.length ? (
              <p className="text-sm text-muted-foreground">Aucun lien budgétaire.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ligne</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Détail</TableHead>
                    <TableHead className="w-[72px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linksQuery.data.items.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <span className="font-medium">{row.budgetLine.code}</span>{' '}
                        <span className="text-muted-foreground">{row.budgetLine.name}</span>
                      </TableCell>
                      <TableCell>{ALLOCATION_LABEL[row.allocationType]}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {row.allocationType === 'PERCENTAGE' && row.percentage != null
                          ? `${row.percentage} %`
                          : row.allocationType === 'FIXED' && row.amount != null
                            ? row.amount
                            : '—'}
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <form
              onSubmit={onSubmit}
              className="space-y-5 rounded-xl border border-border/70 bg-muted/30 p-5 shadow-sm"
            >
              <div className="space-y-1">
                <p className="text-sm font-semibold tracking-tight">
                  Ajouter un lien budgétaire
                </p>
                <p className="text-xs text-muted-foreground">
                  Budget, puis enveloppe, puis une ligne active. Les libellés affichés sont ceux
                  du module Budget.
                </p>
              </div>

              <div className="space-y-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Sélection
                </p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="pb-budget" className="text-xs text-muted-foreground">
                      1. Budget
                    </Label>
                    <Select
                      modal={false}
                      value={budgetId}
                      onValueChange={(v) => {
                        setBudgetId(v ?? SELECT_NONE);
                        setEnvelopeId(SELECT_NONE);
                        setBudgetLineId(SELECT_NONE);
                      }}
                      disabled={budgetsQuery.isLoading}
                    >
                      <SelectTrigger id="pb-budget" className="h-9 w-full min-w-0">
                        <SelectValue placeholder="Choisir un budget">
                          {budgetValueLabel}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent alignItemWithTrigger={false}>
                        <SelectItem value={SELECT_NONE} className="text-muted-foreground">
                          Choisir un budget
                        </SelectItem>
                        {(budgetsQuery.data?.items ?? []).map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {formatBudgetOptionLabel(b)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pb-envelope" className="text-xs text-muted-foreground">
                      2. Enveloppe
                    </Label>
                    <Select
                      key={`pb-env-${budgetId}-${envelopesQuery.dataUpdatedAt}`}
                      modal={false}
                      value={envelopeId}
                      onValueChange={(v) => {
                        setEnvelopeId(v ?? SELECT_NONE);
                        setBudgetLineId(SELECT_NONE);
                      }}
                      disabled={
                        budgetId === SELECT_NONE ||
                        envelopesQuery.isPending ||
                        envelopesQuery.isError
                      }
                    >
                      <SelectTrigger id="pb-envelope" className="h-9 w-full min-w-0">
                        <SelectValue placeholder="Choisir une enveloppe">
                          {envelopeValueLabel}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent alignItemWithTrigger={false}>
                        <SelectItem value={SELECT_NONE} className="text-muted-foreground">
                          Choisir une enveloppe
                        </SelectItem>
                        {(envelopesQuery.data ?? []).map((env) => (
                          <SelectItem key={env.id} value={env.id}>
                            {formatEnvelopeOptionLabel(env)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {budgetId !== SELECT_NONE && envelopesQuery.isError && (
                      <p className="text-xs text-destructive">
                        Impossible de charger les enveloppes. Vérifiez la console réseau ou
                        réessayez.
                      </p>
                    )}
                    {budgetId !== SELECT_NONE &&
                      envelopesQuery.isSuccess &&
                      (envelopesQuery.data?.length ?? 0) === 0 && (
                        <p className="text-xs text-muted-foreground">
                          Aucune enveloppe sur ce budget. Créez-en une depuis le module
                          Budget.
                        </p>
                      )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pb-line" className="text-xs text-muted-foreground">
                      3. Ligne (active)
                    </Label>
                    <Select
                      key={`pb-line-${budgetId}-${envelopeId}-${linesQuery.dataUpdatedAt}`}
                      modal={false}
                      value={budgetLineId}
                      onValueChange={(v) => setBudgetLineId(v ?? SELECT_NONE)}
                      disabled={
                        budgetId === SELECT_NONE ||
                        envelopeId === SELECT_NONE ||
                        linesQuery.isPending
                      }
                    >
                      <SelectTrigger id="pb-line" className="h-9 w-full min-w-0">
                        <SelectValue placeholder="Choisir une ligne">
                          {lineValueLabel}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent alignItemWithTrigger={false}>
                        <SelectItem value={SELECT_NONE} className="text-muted-foreground">
                          Choisir une ligne
                        </SelectItem>
                        {activeLinesInEnvelope.map((l) => (
                          <SelectItem key={l.id} value={l.id}>
                            {formatLineOptionLabel(l)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {canCreateBudgetLine &&
                budgetId !== SELECT_NONE &&
                envelopeId !== SELECT_NONE && (
                  <div className="space-y-3 rounded-lg border border-dashed border-primary/25 bg-background/80 p-4">
                    <div>
                      <p className="text-sm font-medium">Nouvelle ligne dans cette enveloppe</p>
                      <p className="text-xs text-muted-foreground">
                        Création rapide sans quitter la fiche projet (permission budgets.create).
                      </p>
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
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full sm:w-auto"
                      disabled={createLineMut.isPending}
                      onClick={() => void handleCreateBudgetLine()}
                    >
                      {createLineMut.isPending
                        ? 'Création…'
                        : 'Créer la ligne et la sélectionner'}
                    </Button>
                  </div>
                )}

              <div className="border-t border-border/60 pt-5">
                <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Allocation sur la ligne choisie
                </p>
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
                      {ALLOCATION_TYPE_KEYS.map((k) => (
                        <SelectItem key={k} value={k}>
                          {ALLOCATION_LABEL[k]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {allocationType === 'PERCENTAGE' && (
                  <div className="space-y-2">
                    <Label htmlFor="pb-pct">Pourcentage sur cette ligne</Label>
                    <Input
                      id="pb-pct"
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
                )}
              </div>
              </div>

              <Button
                type="submit"
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
