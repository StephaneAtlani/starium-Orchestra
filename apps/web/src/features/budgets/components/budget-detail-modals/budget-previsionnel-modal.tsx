'use client';

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { Calculator, TrendingUp } from 'lucide-react';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BudgetDensityToggle } from '@/features/budgets/components/budget-density-toggle';
import { BudgetExplorerTable, type BudgetExplorerPilotageBindings } from '@/features/budgets/components/budget-explorer-table';
import { BudgetExplorerToolbar } from '@/features/budgets/components/budget-explorer-toolbar';
import { formatTaxAwareAmount, type TaxDisplayMode } from '@/lib/format-tax-aware-amount';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ExplorerNode } from '@/features/budgets/types/budget-explorer.types';
import type { BudgetExplorerFilters } from '@/features/budgets/types/budget-explorer.types';
import type { Amounts12 } from '@/features/budgets/lib/budget-planning-grid';
import type { BudgetPilotageDensity } from '@/features/budgets/types/budget-pilotage.types';
import type {
  BudgetEnvelope,
  BudgetLine,
} from '@/features/budgets/types/budget-management.types';
import type { BudgetSummaryKpi } from '@/features/budgets/types/budget-reporting.types';
import { useBudgetPlanningQuickCalculator } from '@/features/budgets/hooks/use-budget-planning-quick-calculator';

type BudgetPrevisionnelModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetName: string;
  exerciseYearLabel: string | null;
  currency: string;
  taxDisplayMode: TaxDisplayMode;
  isTaxLoading: boolean;
  setTaxDisplayMode: (mode: TaxDisplayMode) => void;
  isBudgetTtcProjection: boolean;
  kpi: BudgetSummaryKpi | undefined;
  filters: BudgetExplorerFilters;
  setFilters: Dispatch<SetStateAction<BudgetExplorerFilters>>;
  density: BudgetPilotageDensity;
  onDensityChange: (density: BudgetPilotageDensity) => void;
  exercisePeriodHint: string | null;
  envelopes: BudgetEnvelope[];
  lines: BudgetLine[];
  amounts12ByLineId: Map<string, Amounts12 | null>;
  canEditPlanning: boolean;
  applyPendingLineId: string | null;
  onApplyCalculator: (lineId: string, amounts: Amounts12) => void;
  nodes: ExplorerNode[];
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onExpandAllEnvelopes: () => void;
  onCollapseAllEnvelopes: () => void;
  onBudgetLineClick: (lineId: string) => void;
  isFilteredEmpty: boolean;
  pilotage: BudgetExplorerPilotageBindings;
};

function formatDelta(value: number, currency: string): string {
  const formatter = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  });
  return `${value > 0 ? '+' : ''}${formatter.format(value)}`;
}

export function BudgetPrevisionnelModal({
  open,
  onOpenChange,
  budgetName,
  exerciseYearLabel,
  currency,
  taxDisplayMode,
  isTaxLoading,
  setTaxDisplayMode,
  isBudgetTtcProjection,
  kpi,
  filters,
  setFilters,
  density,
  onDensityChange,
  exercisePeriodHint,
  envelopes,
  lines,
  amounts12ByLineId,
  canEditPlanning,
  applyPendingLineId,
  onApplyCalculator,
  nodes,
  expandedIds,
  onToggleExpand,
  onExpandAllEnvelopes,
  onCollapseAllEnvelopes,
  onBudgetLineClick,
  isFilteredEmpty,
  pilotage,
}: BudgetPrevisionnelModalProps) {
  const totalBudget = kpi
    ? formatTaxAwareAmount({
        htValue: kpi.totalInitialAmount,
        ttcValue: kpi.totalInitialAmountTtc ?? null,
        currency,
        mode: taxDisplayMode,
        isApproximation: isBudgetTtcProjection,
      })
    : '—';

  const totalForecast = kpi
    ? formatTaxAwareAmount({
        htValue: kpi.totalForecastAmount,
        ttcValue: kpi.totalForecastAmountTtc ?? null,
        currency,
        mode: taxDisplayMode,
        isApproximation: isBudgetTtcProjection,
      })
    : '—';

  const deltaAmount = kpi
    ? (taxDisplayMode === 'TTC'
        ? (kpi.totalForecastAmountTtc ?? kpi.totalForecastAmount) -
          (kpi.totalInitialAmountTtc ?? kpi.totalInitialAmount)
        : kpi.totalForecastAmount - kpi.totalInitialAmount)
    : 0;
  const calc = useBudgetPlanningQuickCalculator({
    monthColumnLabels: pilotage.monthColumnLabels,
  });
  const [selectedLineId, setSelectedLineId] = useState('');

  const lineOptions = useMemo(() => {
    const envelopeMap = new Map(envelopes.map((envelope) => [envelope.id, envelope]));
    return [...lines]
      .map((line) => {
        const envelope = envelopeMap.get(line.envelopeId);
        const envelopeLabel = envelope
          ? envelope.code
            ? `${envelope.name} (${envelope.code})`
            : envelope.name
          : 'Enveloppe';
        const lineLabel = line.code ? `${line.name} (${line.code})` : line.name;
        return {
          id: line.id,
          label: `${envelopeLabel} › ${lineLabel}`,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label, 'fr-FR'));
  }, [envelopes, lines]);

  useEffect(() => {
    if (!open) return;
    if (selectedLineId) return;
    setSelectedLineId(lineOptions[0]?.id ?? '');
  }, [lineOptions, open, selectedLineId]);

  useEffect(() => {
    if (!open || !selectedLineId) return;
    calc.reset(amounts12ByLineId.get(selectedLineId) ?? null);
  }, [amounts12ByLineId, calc, open, selectedLineId]);

  const canApplyCalculator = canEditPlanning && !!selectedLineId && calc.hasMonthAttribution;
  const applyPending = !!selectedLineId && applyPendingLineId === selectedLineId;

  return (
    <StariumModal
      open={open}
      onOpenChange={onOpenChange}
      title="Réviser le prévisionnel"
      description={`${budgetName}${exerciseYearLabel ? ` · exercice ${exerciseYearLabel}` : ''}`}
      icon={Calculator}
      size="full"
      bodyClassName="max-h-[78vh] overflow-y-auto"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 sm:min-h-9"
            onClick={() => {
              if (!selectedLineId) {
                calc.reset(null);
                return;
              }
              calc.reset(amounts12ByLineId.get(selectedLineId) ?? null);
            }}
          >
            Réinitialiser
          </Button>
          <Button
            type="button"
            className="min-h-11 sm:min-h-9"
            onClick={() => onOpenChange(false)}
          >
            Terminer
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-3 md:grid-cols-3">
          <section className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
            <p className="starium-overline text-muted-foreground">Budget alloué</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{totalBudget}</p>
          </section>
          <section className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
            <p className="starium-overline text-muted-foreground">Prévision totale</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{totalForecast}</p>
          </section>
          <section className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
            <p className="starium-overline text-muted-foreground">Écart projeté</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
              {kpi ? formatDelta(deltaAmount, currency) : '—'}
            </p>
          </section>
        </div>

        <Alert>
          <TrendingUp className="size-4" aria-hidden />
          <AlertDescription>
            La grille reste la source de vérité. Sur mobile, faites défiler horizontalement le
            tableau mensuel pour modifier les 12 mois.
          </AlertDescription>
        </Alert>

        <div className="space-y-4 rounded-xl border border-border/70 bg-card p-4 shadow-sm">
          <div className="space-y-4 rounded-xl border border-border/70 bg-muted/30 p-4">
            <div>
              <p className="starium-overline text-muted-foreground">
                Calculette de répartition par ligne
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Sélectionnez une ligne, répartissez le montant, puis appliquez directement au
                prévisionnel.
              </p>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="previsionnel-line-select">Ligne budgétaire</Label>
                  <Select
                    value={selectedLineId}
                    onValueChange={(value) => setSelectedLineId(value ?? '')}
                  >
                    <SelectTrigger id="previsionnel-line-select" className="w-full">
                      <SelectValue placeholder="Choisir une ligne budgétaire" />
                    </SelectTrigger>
                    <SelectContent>
                      {lineOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="previsionnel-calc-quantity">Quantité</Label>
                    <Input
                      id="previsionnel-calc-quantity"
                      type="number"
                      min={0}
                      step="0.01"
                      value={calc.calcQuantity}
                      onChange={(event) =>
                        calc.setCalcQuantity(
                          event.target.value === '' ? '' : Number(event.target.value),
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="previsionnel-calc-price">Prix unitaire</Label>
                    <Input
                      id="previsionnel-calc-price"
                      type="number"
                      min={0}
                      step="0.01"
                      value={calc.calcUnitPrice}
                      onChange={(event) =>
                        calc.setCalcUnitPrice(
                          event.target.value === '' ? '' : Number(event.target.value),
                        )
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">Répartition rapide</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={!calc.canApplyCalculetteTotal}
                      onClick={() => calc.applySpread('MONTHLY')}
                    >
                      12 mois
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={!calc.canApplyCalculetteTotal}
                      onClick={() => calc.applySpread('QUARTERLY')}
                    >
                      4 trimestres
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={!calc.canApplyCalculetteTotal}
                      onClick={() => calc.applySpread('SEMESTER')}
                    >
                      2 semestres
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={!calc.canApplyCalculetteTotal}
                      onClick={() => calc.applySpread('FIRST_MONTH')}
                    >
                      Premier mois
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={!calc.canApplyCalculetteTotal}
                      onClick={() => calc.applySpread('LAST_MONTH')}
                    >
                      Dernier mois
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Répartition modifiable</p>
                    {exercisePeriodHint ? (
                      <p className="mt-1 text-xs text-muted-foreground">{exercisePeriodHint}</p>
                    ) : null}
                  </div>
                  <div className="rounded-lg border border-dashed border-border/80 bg-background px-3 py-2 text-right">
                    <div className="text-xs text-muted-foreground">Total réparti</div>
                    <div className="font-semibold tabular-nums text-foreground">
                      {calc.effectiveTotal.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                  {calc.planningMonthLabels.map((label, index) => (
                    <div key={`modal-calc-month-${index}`} className="space-y-1">
                      <Label className="text-[11px] font-medium leading-none text-foreground/90">
                        {label}
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={calc.monthValues[index]}
                        onChange={(event) => {
                          const raw = event.target.value;
                          const parsed = raw === '' ? 0 : Number(raw);
                          calc.setMonthValues((prev) => {
                            const next = [...prev];
                            next[index] = Number.isNaN(parsed) ? prev[index] : parsed;
                            return next;
                          });
                        }}
                      />
                    </div>
                  ))}
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    disabled={!canApplyCalculator || applyPending}
                    onClick={() => {
                      if (!selectedLineId || !calc.hasMonthAttribution) return;
                      const padded = Array.from(
                        { length: 12 },
                        (_, i) => calc.monthValues[i] ?? 0,
                      ) as unknown as Amounts12;
                      onApplyCalculator(selectedLineId, padded);
                    }}
                  >
                    {applyPending ? 'Application…' : 'Appliquer au prévisionnel'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="starium-overline text-muted-foreground">
                Prévisionnel mensuel par ligne
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Ouvrez la calculette sur une ligne pour répartir rapidement le montant, puis ajustez
                les mois directement dans la grille.
              </p>
            </div>
            <BudgetDensityToggle density={density} onDensityChange={onDensityChange} />
          </div>

          {density === 'condense' ? (
            <Alert>
              <AlertDescription>
                Mode condensé en lecture seule. Passez en <strong>mensuel</strong> pour éditer les
                12 mois.
              </AlertDescription>
            </Alert>
          ) : null}

          <BudgetExplorerToolbar
            filters={filters}
            setFilters={setFilters}
            taxDisplayMode={taxDisplayMode}
            setTaxDisplayMode={setTaxDisplayMode}
            isTaxLoading={isTaxLoading}
          />

          <div className="overflow-x-auto">
            <BudgetExplorerTable
              nodes={nodes}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              onExpandAllEnvelopes={onExpandAllEnvelopes}
              onCollapseAllEnvelopes={onCollapseAllEnvelopes}
              onBudgetLineClick={onBudgetLineClick}
              emptyMessage="Aucune enveloppe."
              emptyFilteredMessage="Aucun résultat pour ces filtres."
              isFilteredEmpty={isFilteredEmpty}
              pilotage={pilotage}
            />
          </div>
        </div>
      </div>
    </StariumModal>
  );
}
