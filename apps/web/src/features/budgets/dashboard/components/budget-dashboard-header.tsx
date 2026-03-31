'use client';

import React from 'react';
import Link from 'next/link';
import { LayoutDashboard, RefreshCw, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import type { BudgetExerciseSummary } from '@/features/budgets/types/budget-list.types';
import type { BudgetSummary } from '@/features/budgets/types/budget-list.types';
import { budgetList } from '@/features/budgets/constants/budget-routes';
import { TaxDisplayModeToggle } from '@/components/finance/tax-display-mode-toggle';
import type { TaxDisplayMode } from '@/lib/format-tax-aware-amount';
import { cn } from '@/lib/utils';

export function BudgetDashboardHeader({
  exercises,
  budgets,
  exerciseId,
  budgetId,
  exerciseSelectLabel,
  budgetSelectLabel,
  exercisesLoading,
  budgetsLoading,
  onExerciseChange,
  onBudgetChange,
  onRefresh,
  isFetching,
  taxDisplayMode,
  onTaxDisplayModeChange,
  taxDisplayLoading,
  onCustomize,
  useUserOverrides,
  onUseUserOverridesModeChange,
  forecastReportingHref,
}: {
  exercises: BudgetExerciseSummary[];
  budgets: BudgetSummary[];
  exerciseId?: string;
  budgetId?: string;
  /** Libellé affiché (code + nom), jamais l’ID brut */
  exerciseSelectLabel: string;
  budgetSelectLabel: string;
  exercisesLoading: boolean;
  budgetsLoading: boolean;
  onExerciseChange: (id: string) => void;
  onBudgetChange: (id: string) => void;
  onRefresh: () => void;
  isFetching: boolean;
  taxDisplayMode: TaxDisplayMode;
  onTaxDisplayModeChange: (next: TaxDisplayMode) => void;
  taxDisplayLoading?: boolean;
  onCustomize?: () => void;
  /** true => "Personnaliser", false => "Global (client)". */
  useUserOverrides: boolean;
  onUseUserOverridesModeChange: (next: boolean) => void;
  /** RFC-FE-BUD-030 — lien vers `/budgets/:id/reporting` si un budget réel est sélectionné. */
  forecastReportingHref?: string;
}) {
  return (
    <header className="space-y-6">
      <div
        className={cn(
          'rounded-2xl border border-border/80 bg-gradient-to-br from-muted/40 via-card to-card p-6 shadow-sm ring-1 ring-border/40',
        )}
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
              <LayoutDashboard className="h-6 w-6" strokeWidth={1.75} aria-hidden />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Budget Cockpit
              </h1>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
                Pilotage décisionnel : risques, enveloppes et lignes critiques en un
                coup d&apos;œil.
              </p>
            </div>
          </div>

          <div className="flex min-w-0 flex-col items-stretch gap-2 sm:items-end">
            <div className="flex flex-wrap items-center gap-2">

            <Select
              value={exerciseId ?? ''}
              onValueChange={(v) => {
                if (v) onExerciseChange(v);
              }}
              disabled={
                exercisesLoading ||
                (exercises.length === 0 && !exerciseSelectLabel)
              }
            >
              <SelectTrigger className="w-[220px] min-w-[220px] border-input bg-background shadow-sm">
                <span className="min-w-0 flex-1 truncate text-left text-sm">
                  {exerciseSelectLabel ? (
                    exerciseSelectLabel
                  ) : (
                    <span className="text-muted-foreground">Exercice</span>
                  )}
                </span>
              </SelectTrigger>
              <SelectContent>
                {exercises.map((ex) => (
                  <SelectItem key={ex.id} value={ex.id}>
                    {ex.code ? `${ex.code} — ` : ''}
                    {ex.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={budgetId ?? ''}
              onValueChange={(v) => {
                if (v) onBudgetChange(v);
              }}
              disabled={
                !exerciseId ||
                budgetsLoading ||
                (budgets.length === 0 && !budgetSelectLabel)
              }
            >
              <SelectTrigger className="w-[220px] min-w-[220px] border-input bg-background shadow-sm">
                <span className="min-w-0 flex-1 truncate text-left text-sm">
                  {budgetSelectLabel ? (
                    budgetSelectLabel
                  ) : (
                    <span className="text-muted-foreground">Budget</span>
                  )}
                </span>
              </SelectTrigger>
              <SelectContent>
                {budgets.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.code ? `${b.code} — ` : ''}
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="outline"
              className="border-border bg-background shadow-sm"
              onClick={onRefresh}
              disabled={isFetching}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`}
              />
              Actualiser
            </Button>

            <TaxDisplayModeToggle
              taxDisplayMode={taxDisplayMode}
              setTaxDisplayMode={onTaxDisplayModeChange}
              isLoading={taxDisplayLoading}
            />

            <Link
              href={budgetList()}
              className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              Ouvrir les budgets
            </Link>

            {forecastReportingHref ? (
              <Link
                href={forecastReportingHref}
                className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted/80"
              >
                Forecast & comparaison
              </Link>
            ) : null}

            <span className="text-sm text-muted-foreground">{'Global'}</span>
            <Switch
              checked={useUserOverrides}
              onCheckedChange={onUseUserOverridesModeChange}
              aria-label="Mode cockpit budget"
            />
            <span className="text-sm">{'Personnalisé'}</span>

            {onCustomize && useUserOverrides ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-border bg-background shadow-sm whitespace-nowrap gap-2"
                onClick={onCustomize}
              >
                <Settings2 className="size-4" />
                Personnaliser
              </Button>
            ) : null}
            </div>
            {useUserOverrides ? (
              <p className="max-w-md text-right text-xs leading-relaxed text-muted-foreground">
                En mode personnalisé, l&apos;exercice et le budget choisis ici sont
                mémorisés comme défaut pour votre compte (séparés du mode Global).
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
