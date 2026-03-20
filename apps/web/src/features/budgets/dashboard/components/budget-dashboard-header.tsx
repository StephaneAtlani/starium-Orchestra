'use client';

import React from 'react';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import type { BudgetExerciseSummary } from '@/features/budgets/types/budget-list.types';
import type { BudgetSummary } from '@/features/budgets/types/budget-list.types';
import { budgetList } from '@/features/budgets/constants/budget-routes';

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
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Budget Cockpit
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pilotage décisionnel : risques, enveloppes et lignes critiques en un
            coup d&apos;œil.
          </p>
        </div>
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
            <SelectTrigger className="w-[220px] min-w-[220px] border-input bg-background">
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
            <SelectTrigger className="w-[220px] min-w-[220px] border-input bg-background">
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
            className="border-border"
            onClick={onRefresh}
            disabled={isFetching}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`}
            />
            Actualiser
          </Button>

          <Link
            href={budgetList()}
            className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Ouvrir les budgets
          </Link>
        </div>
      </div>
      <div className="h-px w-full bg-border" aria-hidden />
    </div>
  );
}
