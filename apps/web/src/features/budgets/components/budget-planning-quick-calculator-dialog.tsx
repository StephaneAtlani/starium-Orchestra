'use client';

import { useId, useState } from 'react';
import { Calculator, Percent } from 'lucide-react';
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
import type { BudgetPlanningQuickCalculatorState } from '../hooks/use-budget-planning-quick-calculator';

export type BudgetPlanningQuickCalculatorDialogFooter =
  | {
      mode: 'planning';
      onApplyToPlanning: () => void;
      applyPending?: boolean;
      applyLabel?: string;
    }
  | {
      mode: 'line-amounts';
      applyTarget: 'initial' | 'revised' | null;
      onApplyToInitial: () => void;
      onApplyToRevised: () => void;
    };

export interface BudgetPlanningQuickCalculatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercisePeriodHint?: string | null;
  calc: BudgetPlanningQuickCalculatorState;
  footer: BudgetPlanningQuickCalculatorDialogFooter;
}

export function BudgetPlanningQuickCalculatorDialog({
  open,
  onOpenChange,
  exercisePeriodHint = null,
  calc,
  footer,
}: BudgetPlanningQuickCalculatorDialogProps) {
  const qId = useId();
  const pId = useId();
  const {
    calcQuantity,
    setCalcQuantity,
    calcUnitPrice,
    setCalcUnitPrice,
    monthValues,
    setMonthValues,
    planningMonthLabels,
    effectiveTotal,
    canApplyCalculetteTotal,
    hasMonthAttribution,
    applySpread,
    applyPercentToMonths,
  } = calc;

  const [pctModalOpen, setPctModalOpen] = useState(false);
  const [pctValue, setPctValue] = useState<number | ''>('');
  const [pctDirection, setPctDirection] = useState<'increase' | 'decrease'>('increase');

  const handleMainOpenChange = (next: boolean) => {
    if (!next) setPctModalOpen(false);
    onOpenChange(next);
  };

  const pctParsed = pctValue === '' ? NaN : Number(pctValue);
  const canApplyPct =
    hasMonthAttribution &&
    Number.isFinite(pctParsed) &&
    pctParsed >= 0 &&
    (pctDirection === 'increase' ? true : pctParsed <= 100);

  return (
    <>
    <Dialog open={open} onOpenChange={handleMainOpenChange}>
      <DialogContent
        showCloseButton
        overlayClassName="z-[100] bg-black/40 backdrop-blur-md dark:bg-black/55"
        className="z-[110] max-h-[min(90vh,880px)] w-full gap-4 overflow-y-auto sm:max-w-2xl lg:max-w-3xl"
      >
        <DialogHeader className="-mx-4 -mt-4 space-y-2 rounded-t-xl border-b border-border/60 bg-card pb-4 pl-7 pr-4 pt-4 text-left shadow-sm sm:pl-8">
          <div className="pr-8">
            <DialogTitle className="flex items-center gap-2 text-left text-foreground">
              <Calculator className="size-5 shrink-0 text-foreground/80" aria-hidden />
              Calculette rapide
            </DialogTitle>
            <DialogDescription className="mt-2 text-left text-foreground/90">
              Quantité × prix unitaire ou saisie directe par mois ; les raccourcis répartissent le total sur
              les 12 mois d’exercice (alignés sur le budget).
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-border/70 bg-card p-3 shadow-sm sm:p-4">
            <p className="mb-3 text-sm font-semibold text-foreground">Saisie rapide</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={qId}>Quantité</Label>
                <Input
                  id={qId}
                  type="number"
                  min={0}
                  step="0.01"
                  value={calcQuantity}
                  onChange={(e) =>
                    setCalcQuantity(e.target.value === '' ? '' : Number(e.target.value))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={pId}>Prix unitaire</Label>
                <Input
                  id={pId}
                  type="number"
                  min={0}
                  step="0.01"
                  value={calcUnitPrice}
                  onChange={(e) =>
                    setCalcUnitPrice(e.target.value === '' ? '' : Number(e.target.value))
                  }
                />
              </div>
            </div>
            <div
              className="mt-4 border-t border-border/60 pt-4"
              role="group"
              aria-label="Appliquer une répartition sur la grille mensuelle"
            >
              <p className="mb-2.5 text-xs font-semibold text-foreground">Appliquer</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  disabled={!canApplyCalculetteTotal}
                  onClick={() => applySpread('MONTHLY')}
                >
                  12 mois
                </Button>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  disabled={!canApplyCalculetteTotal}
                  onClick={() => applySpread('QUARTERLY')}
                >
                  4 trimestres
                </Button>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  disabled={!canApplyCalculetteTotal}
                  onClick={() => applySpread('SEMESTER')}
                >
                  2 semestres
                </Button>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  disabled={!canApplyCalculetteTotal}
                  onClick={() => applySpread('FIRST_MONTH')}
                >
                  Premier mois
                </Button>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  disabled={!canApplyCalculetteTotal}
                  onClick={() => applySpread('LAST_MONTH')}
                >
                  Dernier mois
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border/70 bg-card p-3 shadow-sm sm:p-4">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-semibold text-foreground">Répartition par mois</p>
                {exercisePeriodHint ? (
                  <p className="text-xs leading-snug text-foreground/85">{exercisePeriodHint}</p>
                ) : null}
              </div>
              <Button
                type="button"
                variant="default"
                size="sm"
                className="shrink-0 gap-1.5"
                disabled={!hasMonthAttribution}
                title={
                  !hasMonthAttribution
                    ? 'Renseignez d’abord au moins un mois (ou utilisez les raccourcis « Appliquer » ci-dessus).'
                    : 'Augmenter ou réduire tous les montants mensuels d’un pourcentage'
                }
                onClick={() => {
                  setPctValue('');
                  setPctDirection('increase');
                  setPctModalOpen(true);
                }}
              >
                <Percent className="size-3.5" aria-hidden />
                Variation %
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
              {planningMonthLabels.map((label, index) => (
                <div key={`ex-m-${index}`} className="space-y-1">
                  <Label className="text-[11px] font-medium leading-none text-foreground/90">
                    {label}
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={monthValues[index]}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const parsed = raw === '' ? 0 : Number(raw);
                      setMonthValues((prev) => {
                        const next = [...prev];
                        next[index] = Number.isNaN(parsed) ? prev[index] : parsed;
                        return next;
                      });
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between rounded-md border border-dashed border-border/80 bg-muted/30 px-3 py-2">
              <span className="text-sm font-medium text-foreground">Montant total</span>
              <span className="font-semibold tabular-nums text-foreground">
                {Number.isFinite(effectiveTotal) ? effectiveTotal.toFixed(2) : '0.00'}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-row flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
          {footer.mode === 'planning' ? (
            <Button
              type="button"
              disabled={!hasMonthAttribution || footer.applyPending}
              title={
                !hasMonthAttribution
                  ? 'Répartissez le montant sur au moins un mois (raccourcis ci-dessus ou saisie dans la grille).'
                  : undefined
              }
              onClick={footer.onApplyToPlanning}
            >
              {footer.applyLabel ?? 'Appliquer au prévisionnel'}
            </Button>
          ) : footer.applyTarget === null ? (
            <>
              <Button
                type="button"
                variant="secondary"
                title={
                  !hasMonthAttribution
                    ? 'Répartissez le montant sur au moins un mois (raccourcis ci-dessus ou saisie dans la grille).'
                    : undefined
                }
                onClick={footer.onApplyToInitial}
                disabled={!hasMonthAttribution}
              >
                Appliquer au montant initial
              </Button>
              <Button
                type="button"
                title={
                  !hasMonthAttribution
                    ? 'Répartissez le montant sur au moins un mois (raccourcis ci-dessus ou saisie dans la grille).'
                    : undefined
                }
                onClick={footer.onApplyToRevised}
                disabled={!hasMonthAttribution}
              >
                Appliquer au montant révisé
              </Button>
            </>
          ) : footer.applyTarget === 'initial' ? (
            <Button
              type="button"
              title={
                !hasMonthAttribution
                  ? 'Répartissez le montant sur au moins un mois (raccourcis ci-dessus ou saisie dans la grille).'
                  : undefined
              }
              onClick={footer.onApplyToInitial}
              disabled={!hasMonthAttribution}
            >
              Appliquer au montant initial
            </Button>
          ) : (
            <Button
              type="button"
              title={
                !hasMonthAttribution
                  ? 'Répartissez le montant sur au moins un mois (raccourcis ci-dessus ou saisie dans la grille).'
                  : undefined
              }
              onClick={footer.onApplyToRevised}
              disabled={!hasMonthAttribution}
            >
              Appliquer au montant révisé
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={pctModalOpen} onOpenChange={setPctModalOpen}>
      <DialogContent
        showCloseButton
        overlayClassName="z-[115] bg-black/45 backdrop-blur-sm dark:bg-black/55"
        className="z-[120] w-full gap-4 sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-left">
            <Percent className="size-5 shrink-0 opacity-80" aria-hidden />
            Augmentation ou réduction
          </DialogTitle>
          <DialogDescription className="text-left">
            Applique le pourcentage à chaque mois de la grille (montants actuels), puis vous pouvez valider
            la calculette.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Type de variation">
            <Button
              type="button"
              size="sm"
              variant={pctDirection === 'increase' ? 'default' : 'outline'}
              onClick={() => setPctDirection('increase')}
            >
              Augmentation
            </Button>
            <Button
              type="button"
              size="sm"
              variant={pctDirection === 'decrease' ? 'default' : 'outline'}
              onClick={() => setPctDirection('decrease')}
            >
              Réduction
            </Button>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pct-variation-input">Pourcentage (%)</Label>
            <Input
              id="pct-variation-input"
              type="number"
              min={0}
              max={pctDirection === 'decrease' ? 100 : undefined}
              step="0.1"
              value={pctValue}
              onChange={(e) => {
                const raw = e.target.value;
                setPctValue(raw === '' ? '' : Number(raw));
              }}
              placeholder={pctDirection === 'decrease' ? 'Ex. 5 pour −5 %' : 'Ex. 10 pour +10 %'}
            />
            {pctDirection === 'decrease' ? (
              <p className="text-xs text-muted-foreground">Une réduction de 100 % met tous les mois à 0.</p>
            ) : null}
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => setPctModalOpen(false)}>
            Annuler
          </Button>
          <Button
            type="button"
            disabled={!canApplyPct}
            onClick={() => {
              if (!canApplyPct || pctValue === '') return;
              applyPercentToMonths(Number(pctValue), pctDirection);
              setPctModalOpen(false);
              setPctValue('');
            }}
          >
            Appliquer à la grille
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
