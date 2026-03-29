'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { usePermissions } from '@/hooks/use-permissions';
import { useExerciseDetail } from '../hooks/use-exercise-detail';
import {
  useBudgetPilotagePlanningQueries,
  zipPilotagePlanningResults,
} from '../hooks/use-budget-pilotage-planning-queries';
import { useUpdateBudgetLinePlanningManualForBudgetMutation } from '../hooks/use-budget-line-planning';
import type { BudgetLine } from '../types/budget-management.types';
import type { BudgetPilotageDensity, BudgetPilotageView } from '../types/budget-pilotage.types';
import { getBudgetPilotageMonthColumnLabels } from '../lib/budget-exercise-month-labels';
import {
  BUDGET_PILOTAGE_DEFAULT_PAGE_SIZE,
  BUDGET_PILOTAGE_LINE_THRESHOLD,
  buildManualPlanningPutPayload,
  lineIdsForPilotagePage,
  pilotagePageCount,
  planningMonthsToTwelveArray,
  twelveAmountsEqual,
} from '../lib/budget-planning-grid';
import { BudgetViewTabs } from './budget-view-tabs';
import { BudgetDensityToggle } from './budget-density-toggle';
import { BudgetScenarioSelect } from './budget-scenario-select';
import { BudgetTable, type BudgetTableRowModel } from './budget-table';

function lineLabel(line: BudgetLine): string {
  const code = line.code?.trim();
  const name = line.name?.trim() ?? '';
  if (code && name) return `${code} — ${name}`;
  return name || code || 'Ligne';
}

export interface BudgetPilotageSectionProps {
  budgetId: string;
  exerciseId: string;
  currency: string;
  lines: BudgetLine[];
}

/** Monté uniquement quand l’onglet Pilotage est affiché (évite les GET planning sur Structure). */
export function BudgetPilotageSection({
  budgetId,
  exerciseId,
  currency,
  lines,
}: BudgetPilotageSectionProps) {
  const { has } = usePermissions();
  const canUpdate = has('budgets.update');

  const { data: exercise, isLoading: exerciseLoading } = useExerciseDetail(exerciseId);

  const [view, setView] = useState<BudgetPilotageView>('previsionnel');
  const [density, setDensity] = useState<BudgetPilotageDensity>('mensuel');
  const [page, setPage] = useState(0);
  const [draftMonthsByLineId, setDraftMonthsByLineId] = useState<Record<string, number[]>>({});
  const [pendingLineId, setPendingLineId] = useState<string | null>(null);

  const mutation = useUpdateBudgetLinePlanningManualForBudgetMutation(budgetId);

  const sortedLines = useMemo(
    () => [...lines].sort((a, b) => a.name.localeCompare(b.name, 'fr')),
    [lines],
  );
  const allLineIds = useMemo(() => sortedLines.map((l) => l.id), [sortedLines]);
  const lineById = useMemo(() => new Map(sortedLines.map((l) => [l.id, l])), [sortedLines]);

  const totalLines = allLineIds.length;
  const pageCount = pilotagePageCount(totalLines, BUDGET_PILOTAGE_DEFAULT_PAGE_SIZE);
  const lineIdsPage = useMemo(
    () => lineIdsForPilotagePage(allLineIds, page, BUDGET_PILOTAGE_DEFAULT_PAGE_SIZE),
    [allLineIds, page],
  );

  const planningQueries = useBudgetPilotagePlanningQueries({
    lineIdsToFetch: lineIdsPage,
    pilotageActive: true,
  });

  const zipped = useMemo(
    () => zipPilotagePlanningResults(lineIdsPage, planningQueries),
    [lineIdsPage, planningQueries],
  );

  const monthLabels = useMemo(() => {
    if (!exercise?.startDate) return [];
    return getBudgetPilotageMonthColumnLabels(exercise.startDate);
  }, [exercise?.startDate]);

  const tableRows: BudgetTableRowModel[] = useMemo(() => {
    return zipped.map((z) => {
      const line = lineById.get(z.lineId);
      return {
        lineId: z.lineId,
        lineLabel: line ? lineLabel(line) : 'Ligne',
        planning: z.data,
        isLoading: z.isLoading,
        isError: z.isError,
      };
    });
  }, [zipped, lineById]);

  useEffect(() => {
    setPage((p) => Math.min(p, Math.max(0, pageCount - 1)));
  }, [pageCount]);

  const onDraftChange = useCallback((lineId: string, months12: number[]) => {
    setDraftMonthsByLineId((prev) => ({ ...prev, [lineId]: months12 }));
  }, []);

  const onCommitRow = useCallback(
    (lineId: string, months12: number[]) => {
      if (!canUpdate || view !== 'previsionnel' || density !== 'mensuel') return;
      const zip = zipped.find((z) => z.lineId === lineId);
      const prev = planningMonthsToTwelveArray(zip?.data?.months);
      if (twelveAmountsEqual(prev, months12)) return;

      const payload = buildManualPlanningPutPayload(months12);
      setPendingLineId(lineId);
      mutation.mutate(
        { lineId, payload },
        {
          onSettled: () => setPendingLineId(null),
          onSuccess: () => {
            setDraftMonthsByLineId((d) => {
              const n = { ...d };
              delete n[lineId];
              return n;
            });
          },
        },
      );
    },
    [canUpdate, view, density, zipped, mutation],
  );

  const showCondenseHint = view === 'previsionnel' && density === 'condense';
  const showScenario = view === 'forecast';
  const showDensity = view === 'previsionnel';

  if (exerciseLoading || !exercise) {
    return (
      <Card size="sm" className="overflow-hidden shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Pilotage</CardTitle>
          <CardDescription>Chargement de l’exercice…</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (monthLabels.length !== 12) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Exercice invalide</AlertTitle>
        <AlertDescription>Impossible de calculer les libellés des mois pour cet exercice.</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card size="sm" className="overflow-hidden shadow-sm">
      <CardHeader className="border-b border-border/60 pb-4">
        <CardTitle className="text-base">Pilotage budgétaire</CardTitle>
        <CardDescription>Prévisionnel, atterrissage et forecast (RFC-024).</CardDescription>
        <div className="mt-4 flex flex-col gap-3">
          <BudgetViewTabs value={view} onValueChange={setView} />
          <div className="flex flex-wrap items-center gap-3">
            {showDensity && (
              <BudgetDensityToggle value={density} onValueChange={setDensity} />
            )}
            {showScenario && <BudgetScenarioSelect />}
          </div>
          {showCondenseHint && (
            <Alert>
              <AlertTitle>Mode condensé</AlertTitle>
              <AlertDescription>
                Passer en mode mensuel pour éditer les montants.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {totalLines > BUDGET_PILOTAGE_LINE_THRESHOLD && (
          <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-2 text-sm">
            <span className="text-muted-foreground">
              Lignes {totalLines} — pagination ({BUDGET_PILOTAGE_DEFAULT_PAGE_SIZE} par page)
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                disabled={page <= 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                aria-label="Page précédente"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="tabular-nums text-muted-foreground">
                {page + 1} / {pageCount}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                disabled={page >= pageCount - 1}
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                aria-label="Page suivante"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
        {totalLines === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            Aucune ligne budgétaire à afficher.
          </div>
        ) : (
          <BudgetTable
            currency={currency}
            monthLabels={monthLabels}
            view={view}
            density={density}
            rows={tableRows}
            canUpdate={canUpdate}
            draftMonthsByLineId={draftMonthsByLineId}
            onDraftChange={onDraftChange}
            onCommitRow={onCommitRow}
            pendingLineId={pendingLineId}
          />
        )}
      </CardContent>
    </Card>
  );
}
