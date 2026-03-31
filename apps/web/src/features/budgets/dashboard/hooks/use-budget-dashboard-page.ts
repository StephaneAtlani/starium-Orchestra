'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useActiveClient } from '@/hooks/use-active-client';
import { useAuth } from '@/context/auth-context';
import { useBudgetDashboardQuery } from '@/features/budgets/hooks/use-budget-dashboard';
import { useBudgetExerciseOptionsQuery } from '@/features/budgets/hooks/use-budget-exercise-options-query';
import { useBudgetsQuery } from '@/features/budgets/hooks/use-budgets-query';
import {
  loadBudgetCockpitSelection,
  saveBudgetCockpitSelection,
} from '@/features/budgets/lib/budget-cockpit-selection-storage';
import type {
  BudgetCockpitResponse,
  BudgetDashboardQueryParams,
} from '@/features/budgets/types/budget-dashboard.types';
import type {
  BudgetExerciseSummary,
  BudgetSummary,
} from '@/features/budgets/types/budget-list.types';

const ALL_BUDGETS_SENTINEL = '__ALL__';

/**
 * Les Select (Base UI) affichent la valeur brute si aucun SelectItem ne correspond.
 * Quand l’ID vient du dashboard avant que les listes soient chargées, on injecte
 * une option synthétique à partir de la réponse cockpit.
 */
function mergeExerciseOptionsForSelect(
  loaded: BudgetExerciseSummary[],
  cockpit: BudgetCockpitResponse | undefined,
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
  cockpit: BudgetCockpitResponse['exercise'],
): string {
  return `${cockpit.code ? `${cockpit.code} — ` : ''}${cockpit.name}`;
}

function budgetLabelFromCockpit(
  cockpit: BudgetCockpitResponse['budget'],
): string {
  return `${cockpit.code ? `${cockpit.code} — ` : ''}${cockpit.name}`;
}

function mergeBudgetOptionsForSelect(
  loaded: BudgetSummary[],
  cockpit: BudgetCockpitResponse | undefined,
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
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [exerciseId, setExerciseId] = useState<string | undefined>();
  const [budgetId, setBudgetId] = useState<string | undefined>();
  /** Évite un fetch « défaut serveur » avant lecture du localStorage (refresh). */
  const [selectionHydrated, setSelectionHydrated] = useState(false);

  const cockpitModeStorageKey = useMemo(() => {
    const cId = activeClient?.id ?? '';
    const uId = user?.id ?? '';
    return `starium.budgetCockpit.mode:${cId}:${uId}`;
  }, [activeClient?.id, user?.id]);

  const animateAmountsStorageKey = useMemo(() => {
    const cId = activeClient?.id ?? '';
    const uId = user?.id ?? '';
    return `starium.budgetCockpit.animateAmounts:${cId}:${uId}`;
  }, [activeClient?.id, user?.id]);

  // Par défaut : version "global" (config client) tant qu’aucune préférence user n’est stockée.
  const [useUserOverrides, setUseUserOverrides] = useState(false);

  /** Animation des chiffres sur les cartes KPI (localStorage par client + utilisateur). */
  const [animateAmounts, setAnimateAmounts] = useState(true);

  useEffect(() => {
    if (!cockpitModeStorageKey) return;
    if (!user?.id || !activeClient?.id) return;
    const raw = window.localStorage.getItem(cockpitModeStorageKey);
    // MVP : défaut = global, seul la valeur explicite 'personal' active les overrides user.
    setUseUserOverrides(raw === 'personal');
  }, [cockpitModeStorageKey, user?.id, activeClient?.id]);

  useEffect(() => {
    if (!user?.id || !activeClient?.id) return;
    window.localStorage.setItem(
      cockpitModeStorageKey,
      useUserOverrides ? 'personal' : 'global',
    );
  }, [cockpitModeStorageKey, useUserOverrides, user?.id, activeClient?.id]);

  useEffect(() => {
    if (!animateAmountsStorageKey) return;
    if (!user?.id || !activeClient?.id) return;
    const raw = window.localStorage.getItem(animateAmountsStorageKey);
    if (raw === '0' || raw === 'false') setAnimateAmounts(false);
    else if (raw === '1' || raw === 'true') setAnimateAmounts(true);
  }, [animateAmountsStorageKey, user?.id, activeClient?.id]);

  useEffect(() => {
    if (!user?.id || !activeClient?.id) return;
    window.localStorage.setItem(
      animateAmountsStorageKey,
      animateAmounts ? '1' : '0',
    );
  }, [animateAmountsStorageKey, animateAmounts, user?.id, activeClient?.id]);

  const params: BudgetDashboardQueryParams | undefined = useMemo(() => {
    // Ne pas déclencher l’appel cockpit tant qu’on n’a pas d’exercice/budget.
    if (exerciseId === undefined && budgetId === undefined) return undefined;

    const p: BudgetDashboardQueryParams = {};
    if (exerciseId !== undefined) p.exerciseId = exerciseId;
    if (budgetId !== undefined) {
      if (budgetId === ALL_BUDGETS_SENTINEL) {
        p.aggregateBudgetsForExercise = true;
      } else {
        p.budgetId = budgetId;
      }
    }
    if (useUserOverrides === false) p.useUserOverrides = false;
    return p;
  }, [exerciseId, budgetId, useUserOverrides]);

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
    const personal = useUserOverrides && !!user?.id;
    const saved = personal
      ? loadBudgetCockpitSelection(activeClient.id, { userId: user!.id }) ??
        loadBudgetCockpitSelection(activeClient.id)
      : loadBudgetCockpitSelection(activeClient.id);
    if (saved) {
      setExerciseId(saved.exerciseId);
      setBudgetId(saved.budgetId);
    } else {
      setExerciseId(undefined);
      setBudgetId(undefined);
    }
    setSelectionHydrated(true);
  }, [activeClient?.id, searchParams, useUserOverrides, user?.id]);

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
    const personal = useUserOverrides && !!user?.id;
    saveBudgetCockpitSelection(
      activeClient.id,
      { exerciseId, budgetId },
      personal ? { userId: user!.id } : undefined,
    );
  }, [activeClient?.id, exerciseId, budgetId, useUserOverrides, user?.id]);

  const onExerciseChange = useCallback((nextExerciseId: string) => {
    setExerciseId(nextExerciseId);
    setBudgetId(undefined);
  }, []);

  const onBudgetChange = useCallback((nextBudgetId: string) => {
    setBudgetId(nextBudgetId);
  }, []);

  const onUserOverridesModeChange = useCallback((next: boolean) => {
    setUseUserOverrides(next);
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
      (() => {
        const loaded = budgetsQuery.data?.items ?? [];
        if (!exerciseId) {
          return mergeBudgetOptionsForSelect(loaded, data, budgetId);
        }

        // Ajoute une option synthétique dans le dropdown pour piloter l’agrégation.
        const rep = loaded[0];
        const withAggregateOption =
          rep && !loaded.some((b) => b.id === ALL_BUDGETS_SENTINEL)
            ? ([
                {
                  ...rep,
                  id: ALL_BUDGETS_SENTINEL,
                  name: 'Tous les budgets',
                  /** Pas le code d’un budget précis : l’agrégat n’est pas un seul budget. */
                  code: null,
                },
                ...loaded,
              ] as BudgetSummary[])
            : loaded;

        // Si le backend renvoie déjà le budget synthétique (id == '__ALL__'),
        // on aligne le label affiché avec la réponse cockpit.
        if (data?.budget.id === ALL_BUDGETS_SENTINEL) {
          const idx = withAggregateOption.findIndex(
            (b) => b.id === ALL_BUDGETS_SENTINEL,
          );
          if (idx >= 0) {
            withAggregateOption[idx] = {
              ...withAggregateOption[idx],
              name: data.budget.name,
              code: data.budget.code,
              currency: data.budget.currency,
            };
          }
        }

        return mergeBudgetOptionsForSelect(withAggregateOption, data, budgetId);
      })(),
    [budgetsQuery.data?.items, data, budgetId, exerciseId],
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
    useUserOverrides,
    onUserOverridesModeChange,
    animateAmounts,
    onAnimateAmountsChange: setAnimateAmounts,
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
