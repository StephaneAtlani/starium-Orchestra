'use client';

import React, { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatAmount } from '../lib/budget-formatters';
import type {
  CalculatePlanningPayload,
  CalculatePlanningPreviewResponse,
  GrowthFrequency,
  GrowthType,
  QuantityGrowthFrequency,
  QuantityGrowthType,
} from '../types/budget-line-planning.types';
import type { ApiFormError } from '../api/types';
import {
  useApplyBudgetLineCalculationMutation,
  useApplyBudgetLineGrowthMutation,
  useCalculateBudgetLinePlanningMutation,
} from '../hooks/use-budget-line-planning';

export type PlanningCalculatorTool = 'GROWTH' | 'QUANTITY_X_UNIT_PRICE';

interface BudgetLinePlanningCalculatorPanelProps {
  lineId: string;
  budgetId: string | null;
  currency: string;
  selectedTool: PlanningCalculatorTool;
  canEdit: boolean;
  className?: string;
  onError?: (error: ApiFormError) => void;
}

const MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

function buildDefaultActiveMonths(): number[] {
  return Array.from({ length: 12 }, (_, index) => index + 1);
}

export function BudgetLinePlanningCalculatorPanel({
  lineId,
  budgetId,
  currency,
  selectedTool,
  canEdit,
  className,
  onError,
}: BudgetLinePlanningCalculatorPanelProps) {
  const [activeMonths, setActiveMonths] = useState<number[]>(() => buildDefaultActiveMonths());

  // Growth state
  const [growthBaseAmount, setGrowthBaseAmount] = useState<number | ''>('');
  const [growthType, setGrowthType] = useState<GrowthType>('PERCENT');
  const [growthValue, setGrowthValue] = useState<number | ''>('');
  const [growthFrequency, setGrowthFrequency] = useState<GrowthFrequency>('MONTHLY');

  // Quantity x unit price state
  const [quantityStart, setQuantityStart] = useState<number | ''>('');
  const [quantityGrowthType, setQuantityGrowthType] = useState<QuantityGrowthType>('PERCENT');
  const [quantityGrowthValue, setQuantityGrowthValue] = useState<number | ''>('');
  const [quantityGrowthFrequency, setQuantityGrowthFrequency] = useState<QuantityGrowthFrequency>('MONTHLY');
  const [unitPrice, setUnitPrice] = useState<number | ''>('');
  const [lastPayload, setLastPayload] = useState<CalculatePlanningPayload | null>(null);
  const [preview, setPreview] = useState<CalculatePlanningPreviewResponse | null>(null);

  const calculateMutation = useCalculateBudgetLinePlanningMutation(lineId);
  const applyCalculationMutation = useApplyBudgetLineCalculationMutation(lineId, budgetId);
  const applyGrowthMutation = useApplyBudgetLineGrowthMutation(lineId, budgetId);

  const handleToggleMonth = (monthIndex: number) => {
    setActiveMonths((prev) => {
      if (prev.includes(monthIndex)) {
        if (prev.length === 1) return prev;
        return prev.filter((m) => m !== monthIndex);
      }
      return [...prev, monthIndex].sort((a, b) => a - b);
    });
  };

  const allMonthsSelected = useMemo(
    () => activeMonths.length === 12,
    [activeMonths],
  );

  const handleToggleAllMonths = () => {
    setActiveMonths((prev) => (prev.length === 12 ? [1] : buildDefaultActiveMonths()));
  };

  const handleGrowthApply = async () => {
    if (!budgetId) return;
    if (growthBaseAmount === '' || growthValue === '') return;

    try {
      await applyGrowthMutation.mutateAsync({
        baseAmount: Number(growthBaseAmount),
        growthType,
        growthValue: Number(growthValue),
        growthFrequency,
        activeMonthIndexes: activeMonths,
      });
    } catch (err) {
      if (onError && err && typeof err === 'object') {
        onError(err as ApiFormError);
      }
    }
  };

  const handleCalculatePreview = async () => {
    if (!budgetId) return;
    if (quantityStart === '' || quantityGrowthValue === '' || unitPrice === '') return;

    const payload: CalculatePlanningPayload = {
      formulaType: 'QUANTITY_X_UNIT_PRICE',
      quantity: {
        startValue: Number(quantityStart),
        growthType: quantityGrowthType,
        growthValue: Number(quantityGrowthValue),
        growthFrequency: quantityGrowthFrequency,
      },
      unitPrice: {
        value: Number(unitPrice),
      },
      activeMonthIndexes: activeMonths,
    };

    try {
      const result = await calculateMutation.mutateAsync(payload);
      setLastPayload(payload);
      setPreview(result);
    } catch (err) {
      if (onError && err && typeof err === 'object') {
        onError(err as ApiFormError);
      }
    }
  };

  const handleApplyCalculation = async () => {
    if (!lastPayload || !budgetId) return;

    try {
      await applyCalculationMutation.mutateAsync(lastPayload);
      setPreview(null);
    } catch (err) {
      if (onError && err && typeof err === 'object') {
        onError(err as ApiFormError);
      }
    }
  };

  const isGrowthDisabled =
    !canEdit || applyGrowthMutation.isPending;
  const isCalculatorDisabled =
    !canEdit || calculateMutation.isPending || applyCalculationMutation.isPending;

  return (
    <div className={cn('flex h-full flex-col gap-3 rounded-md border border-border bg-muted/30 p-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-foreground">Moteurs de planning avancés</span>
          <span className="text-[11px] text-muted-foreground">
            Configurez une croissance ou une formule quantité × prix unitaire, puis prévisualisez et appliquez.
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-md bg-background px-2 py-1.5 text-[11px]">
        <button
          type="button"
          className={cn(
            'rounded-full px-2 py-0.5 font-medium',
            selectedTool === 'GROWTH'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80',
          )}
        >
          Croissance
        </button>
        <button
          type="button"
          className={cn(
            'rounded-full px-2 py-0.5 font-medium',
            selectedTool === 'QUANTITY_X_UNIT_PRICE'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80',
          )}
        >
          Qté × prix unitaire
        </button>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            className={cn(
              'rounded-full px-2 py-0.5 font-medium',
              allMonthsSelected ? 'bg-muted text-foreground' : 'bg-background text-muted-foreground',
            )}
            onClick={handleToggleAllMonths}
          >
            {allMonthsSelected ? 'Tous les mois' : 'Activer tous les mois'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-1.5">
        {MONTH_LABELS.map((label, index) => {
          const monthIndex = index + 1;
          const isActive = activeMonths.includes(monthIndex);
          return (
            <button
              key={label}
              type="button"
              className={cn(
                'h-7 rounded border text-[11px]',
                isActive
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-input bg-background text-muted-foreground hover:bg-muted',
              )}
              onClick={() => handleToggleMonth(monthIndex)}
            >
              {label}
            </button>
          );
        })}
      </div>

      {selectedTool === 'GROWTH' ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <label className="space-y-1">
              <span className="block text-[11px] text-muted-foreground">Montant de base</span>
              <input
                type="number"
                min={0}
                step="0.01"
                className="h-7 w-full rounded border border-input bg-background px-2 text-right text-xs"
                value={growthBaseAmount}
                onChange={(e) =>
                  setGrowthBaseAmount(e.target.value === '' ? '' : Number(e.target.value))
                }
              />
            </label>
            <label className="space-y-1">
              <span className="block text-[11px] text-muted-foreground">Type de croissance</span>
              <select
                className="h-7 w-full rounded border border-input bg-background px-2 text-xs"
                value={growthType}
                onChange={(e) => setGrowthType(e.target.value as GrowthType)}
              >
                <option value="PERCENT">% par période</option>
                <option value="FIXED">Montant fixe</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="block text-[11px] text-muted-foreground">
                Valeur de croissance {growthType === 'PERCENT' ? '(%)' : `(${currency})`}
              </span>
              <input
                type="number"
                step="0.01"
                className="h-7 w-full rounded border border-input bg-background px-2 text-right text-xs"
                value={growthValue}
                onChange={(e) =>
                  setGrowthValue(e.target.value === '' ? '' : Number(e.target.value))
                }
              />
            </label>
            <label className="space-y-1">
              <span className="block text-[11px] text-muted-foreground">Fréquence</span>
              <select
                className="h-7 w-full rounded border border-input bg-background px-2 text-xs"
                value={growthFrequency}
                onChange={(e) => setGrowthFrequency(e.target.value as GrowthFrequency)}
              >
                <option value="MONTHLY">Mensuelle</option>
                <option value="QUARTERLY">Trimestrielle</option>
                <option value="YEARLY">Annuelle</option>
              </select>
            </label>
          </div>
          <button
            type="button"
            onClick={handleGrowthApply}
            disabled={
              isGrowthDisabled ||
              growthBaseAmount === '' ||
              growthValue === '' ||
              activeMonths.length === 0
            }
            className={cn(
              'inline-flex h-8 items-center justify-center rounded-md border px-3 text-xs font-medium',
              isGrowthDisabled
                ? 'cursor-not-allowed border-input bg-muted text-muted-foreground'
                : 'border-primary bg-primary text-primary-foreground hover:bg-primary/90',
            )}
          >
            {applyGrowthMutation.isPending && (
              <Loader2 className="mr-1 size-3 animate-spin" />
            )}
            Appliquer la croissance au planning
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <label className="space-y-1">
              <span className="block text-[11px] text-muted-foreground">Quantité initiale</span>
              <input
                type="number"
                min={0}
                step="0.01"
                className="h-7 w-full rounded border border-input bg-background px-2 text-right text-xs"
                value={quantityStart}
                onChange={(e) =>
                  setQuantityStart(e.target.value === '' ? '' : Number(e.target.value))
                }
              />
            </label>
            <label className="space-y-1">
              <span className="block text-[11px] text-muted-foreground">Type de croissance quantité</span>
              <select
                className="h-7 w-full rounded border border-input bg-background px-2 text-xs"
                value={quantityGrowthType}
                onChange={(e) =>
                  setQuantityGrowthType(e.target.value as QuantityGrowthType)
                }
              >
                <option value="PERCENT">% par période</option>
                <option value="FIXED">Quantité fixe</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="block text-[11px] text-muted-foreground">
                Valeur de croissance quantité
              </span>
              <input
                type="number"
                step="0.01"
                className="h-7 w-full rounded border border-input bg-background px-2 text-right text-xs"
                value={quantityGrowthValue}
                onChange={(e) =>
                  setQuantityGrowthValue(
                    e.target.value === '' ? '' : Number(e.target.value),
                  )
                }
              />
            </label>
            <label className="space-y-1">
              <span className="block text-[11px] text-muted-foreground">
                Fréquence croissance quantité
              </span>
              <select
                className="h-7 w-full rounded border border-input bg-background px-2 text-xs"
                value={quantityGrowthFrequency}
                onChange={(e) =>
                  setQuantityGrowthFrequency(
                    e.target.value as QuantityGrowthFrequency,
                  )
                }
              >
                <option value="MONTHLY">Mensuelle</option>
                <option value="QUARTERLY">Trimestrielle</option>
                <option value="YEARLY">Annuelle</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="block text-[11px] text-muted-foreground">
                Prix unitaire ({currency})
              </span>
              <input
                type="number"
                min={0}
                step="0.01"
                className="h-7 w-full rounded border border-input bg-background px-2 text-right text-xs"
                value={unitPrice}
                onChange={(e) =>
                  setUnitPrice(e.target.value === '' ? '' : Number(e.target.value))
                }
              />
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCalculatePreview}
              disabled={
                isCalculatorDisabled ||
                quantityStart === '' ||
                quantityGrowthValue === '' ||
                unitPrice === '' ||
                activeMonths.length === 0
              }
              className={cn(
                'inline-flex h-8 items-center justify-center rounded-md border px-3 text-xs font-medium',
                isCalculatorDisabled
                  ? 'cursor-not-allowed border-input bg-muted text-muted-foreground'
                  : 'border-primary bg-primary text-primary-foreground hover:bg-primary/90',
              )}
            >
              {calculateMutation.isPending && (
                <Loader2 className="mr-1 size-3 animate-spin" />
              )}
              Prévisualiser
            </button>
            <button
              type="button"
              onClick={handleApplyCalculation}
              disabled={
                isCalculatorDisabled ||
                !lastPayload ||
                !preview ||
                activeMonths.length === 0
              }
              className={cn(
                'inline-flex h-8 items-center justify-center rounded-md border px-3 text-xs font-medium',
                isCalculatorDisabled || !preview
                  ? 'cursor-not-allowed border-input bg-muted text-muted-foreground'
                  : 'border-primary bg-primary text-primary-foreground hover:bg-primary/90',
              )}
            >
              {applyCalculationMutation.isPending && (
                <Loader2 className="mr-1 size-3 animate-spin" />
              )}
              Appliquer le calcul
            </button>
          </div>
          {preview && (
            <div className="space-y-2 rounded-md border border-dashed border-border bg-background p-2">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Prévisualisation des montants par mois</span>
                <span>
                  Total preview :{' '}
                  <span className="font-semibold text-foreground">
                    {formatAmount(preview.previewTotalAmount, currency)}
                  </span>
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1 text-[11px]">
                {preview.previewMonths.map((m) => {
                  const label = MONTH_LABELS[m.monthIndex - 1] ?? `M${m.monthIndex}`;
                  return (
                    <div
                      key={m.monthIndex}
                      className="flex items-center justify-between rounded bg-muted px-1.5 py-0.5"
                    >
                      <span className="text-muted-foreground">{label}</span>
                      <span className="tabular-nums">
                        {formatAmount(m.amount, currency)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

