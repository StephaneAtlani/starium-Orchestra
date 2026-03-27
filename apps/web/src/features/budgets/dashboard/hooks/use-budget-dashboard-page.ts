'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useActiveClient } from '@/hooks/use-active-client';
import { useBudgetDashboardQuery } from '@/features/budgets/hooks/use-budget-dashboard';
import { useBudgetExerciseOptionsQuery } from '@/features/budgets/hooks/use-budget-exercise-options-query';
import { useBudgetsQuery } from '@/features/budgets/hooks/use-budgets-query';
import {
  loadBudgetCockpitSelection,
  saveBudgetCockpitSelection,
} from '@/features/budgets/lib/budget-cockpit-selection-storage';
import type {
  BudgetDashboardQueryParams,
  BudgetDashboardResponse,
} from '@/features/budgets/types/budget-dashboard.types';
import type {
  BudgetExerciseSummary,
  BudgetSummary,
} from '@/features/budgets/types/budget-list.types';

/**
 * Les Select (Base UI) affichent la valeur brute si aucun SelectItem ne correspond.
 * Quand l’ID vient du dashboard avant que les listes soient chargées, on injecte
 * une option synthétique à partir de la réponse cockpit.
 */
function mergeExerciseOptionsForSelect(
  loaded: BudgetExerciseSummary[],
  cockpit: BudgetDashboardResponse | undefined,
  selectedId: string | undefined,
): BudgetExerciseSummary[] {
  if (!cockpit || !selectedId || cockpit.exercise.id !== selectedId) {
    return loaded;
  }
  if (loaded.some((e) => e.id === selectedId)) {
    return loaded;
  }
  return [
    {
      id: cockpit.exercise.id,
      name: cockpit.exercise.name,
      code: cockpit.exercise.code,
      startDate: '2000-01-01',
      endDate: '2000-12-31',
      status: 'ACTIVE',
    },
    ...loaded,
  ];
}

function formatExerciseLabel(ex: BudgetExerciseSummary): string {
  return `${ex.code ? `${ex.code} — ` : ''}${ex.name}`;
}

function formatBudgetLabel(b: BudgetSummary): string {
  return `${b.code ? `${b.code} — ` : ''}${b.name}`;
}

function exerciseLabelFromCockpit(
  cockpit: BudgetDashboardResponse['exercise'],
): string {
  return `${cockpit.code ? `${cockpit.code} — ` : ''}${cockpit.name}`;
}

function budgetLabelFromCockpit(
  cockpit: BudgetDashboardResponse['budget'],
): string {
  return `${cockpit.code ? `${cockpit.code} — ` : ''}${cockpit.name}`;
}

function mergeBudgetOptionsForSelect(
  loaded: BudgetSummary[],
  cockpit: BudgetDashboardResponse | undefined,
  selectedId: string | undefined,
): BudgetSummary[] {
  if (!cockpit || !selectedId || cockpit.budget.id !== selectedId) {
    return loaded;
  }
  if (loaded.some((b) => b.id === selectedId)) {
    return loaded;
  }
  return [
    {
      id: cockpit.budget.id,
      exerciseId: cockpit.exercise.id,
      name: cockpit.budget.name,
      code: cockpit.budget.code,
      currency: cockpit.budget.currency,
      status: cockpit.budget.status as BudgetSummary['status'],
    },
    ...loaded,
  ];
}

export function useBudgetDashboardPage() {
  const { activeClient } = useActiveClient();
  const searchParams = useSearchParams();
  const [exerciseId, setExerciseId] = useState<string | undefined>();
  const [budgetId, setBudgetId] = useState<string | undefined>();
  /** Évite un fetch « défaut serveur » avant lecture du localStorage (refresh). */
  const [selectionHydrated, setSelectionHydrated] = useState(false);

  const params: BudgetDashboardQueryParams | undefined = useMemo(() => {
    const p: BudgetDashboardQueryParams = {};
    if (exerciseId !== undefined) p.exerciseId = exerciseId;
    if (budgetId !== undefined) p.budgetId = budgetId;
    return Object.keys(p).length > 0 ? p : undefined;
  }, [exerciseId, budgetId]);

  const exercisesQuery = useBudgetExerciseOptionsQuery();
  const exercisesReady = !exercisesQuery.isLoading;
  const exerciseOptions = exercisesQuery.data ?? [];
  /** Sans exercice en base, le cockpit renverrait 404 : on évite l’appel si le périmètre n’est pas forcé. */
  const emptyNoExerciseContext =
    exercisesReady &&
    params === undefined &&
    exerciseOptions.length === 0;

  useEffect(() => {
    if (!activeClient?.id) {
      setExerciseId(undefined);
      setBudgetId(undefined);
      setSelectionHydrated(false);
      return;
    }
    const urlExerciseId =
      searchParams.get('exerciseId')?.trim() || undefined;
    const urlBudgetId = searchParams.get('budgetId')?.trim() || undefined;
    if (urlExerciseId || urlBudgetId) {
      setExerciseId(urlExerciseId);
      setBudgetId(urlBudgetId);
      setSelectionHydrated(true);
      return;
    }
    const saved = loadBudgetCockpitSelection(activeClient.id);
    if (saved) {
      setExerciseId(saved.exerciseId);
      setBudgetId(saved.budgetId);
    } else {
      setExerciseId(undefined);
      setBudgetId(undefined);
    }
    setSelectionHydrated(true);
  }, [activeClient?.id, searchParams]);

  const dashboardEnabled =
    selectionHydrated &&
    (!exercisesReady || !emptyNoExerciseContext || params !== undefined);

  const dashboardQuery = useBudgetDashboardQuery(params, {
    enabled: dashboardEnabled,
  });
  const { data, error, refetch, isFetching } = dashboardQuery;
  const dashboardLoading = dashboardEnabled && dashboardQuery.isLoading;

  const budgetsQuery = useBudgetsQuery(
    { exerciseId: exerciseId ?? '', limit: 100 },
    { enabled: !!exerciseId },
  );

  useEffect(() => {
    if (!data) return;
    if (exerciseId === undefined && budgetId === undefined) {
      setExerciseId(data.exercise.id);
      setBudgetId(data.budget.id);
      return;
    }
    if (
      exerciseId !== undefined &&
      budgetId === undefined &&
      data.exercise.id === exerciseId
    ) {
      setBudgetId(data.budget.id);
    }
  }, [data, exerciseId, budgetId]);

  /** Deep link avec `budgetId` seul : complète l’exercice une fois la réponse cockpit connue. */
  useEffect(() => {
    if (!data) return;
    if (
      budgetId !== undefined &&
      exerciseId === undefined &&
      data.budget.id === budgetId
    ) {
      setExerciseId(data.exercise.id);
    }
  }, [data, budgetId, exerciseId]);

  useEffect(() => {
    if (!activeClient?.id || !exerciseId || !budgetId) return;
    saveBudgetCockpitSelection(activeClient.id, { exerciseId, budgetId });
  }, [activeClient?.id, exerciseId, budgetId]);

  const onExerciseChange = useCallback((nextExerciseId: string) => {
    setExerciseId(nextExerciseId);
    setBudgetId(undefined);
  }, []);

  const onBudgetChange = useCallback((nextBudgetId: string) => {
    setBudgetId(nextBudgetId);
  }, []);

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  const exercises = useMemo(
    () =>
      mergeExerciseOptionsForSelect(
        exercisesQuery.data ?? [],
        data,
        exerciseId,
      ),
    [exercisesQuery.data, data, exerciseId],
  );

  const budgets = useMemo(
    () =>
      mergeBudgetOptionsForSelect(
        budgetsQuery.data?.items ?? [],
        data,
        budgetId,
      ),
    [budgetsQuery.data?.items, data, budgetId],
  );

  /** Libellés affichés dans les Select (évite l’affichage des IDs bruts si le Value ne résout pas). */
  const exerciseSelectLabel = useMemo(() => {
    if (!exerciseId) return '';
    const found = exercises.find((e) => e.id === exerciseId);
    if (found) return formatExerciseLabel(found);
    if (data?.exercise.id === exerciseId) return exerciseLabelFromCockpit(data.exercise);
    return '';
  }, [exercises, exerciseId, data]);

  const budgetSelectLabel = useMemo(() => {
    if (!budgetId) return '';
    const found = budgets.find((b) => b.id === budgetId);
    if (found) return formatBudgetLabel(found);
    if (data?.budget.id === budgetId) return budgetLabelFromCockpit(data.budget);
    return '';
  }, [budgets, budgetId, data]);

  return {
    exerciseId,
    budgetId,
    exerciseSelectLabel,
    budgetSelectLabel,
    onExerciseChange,
    onBudgetChange,
    refresh,
    data,
    /**
     * En mode « résolution auto » (pas d’exercice/budget dans l’URL ni le stockage),
     * on attend la liste des exercices pour décider d’appeler le cockpit ou afficher l’état vide sans 404.
     */
    isLoading:
      !selectionHydrated ||
      (params === undefined && !exercisesReady) ||
      dashboardLoading,
    isFetching,
    error,
    exercises,
    exercisesLoading: exercisesQuery.isLoading,
    budgets,
    budgetsLoading: budgetsQuery.isLoading,
  };
}
