'use client';

import React from 'react';
import { LoadingState } from '@/components/feedback/loading-state';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useBudgetLinePlanning } from '../../hooks/use-budget-line-planning';
import { formatAmount } from '../../lib/budget-formatters';
import type { ApiFormError } from '../../api/types';
import { amounts12FromPlanningMonths } from '../../lib/budget-planning-grid';

export interface BudgetLinePlanningTabProps {
  budgetLineId: string;
  currency: string;
  /** Ne charge le planning que lorsque l’onglet est actif. */
  enabled: boolean;
}

/**
 * Prévisionnel 12 mois + indicateurs RFC-023 (lecture depuis GET planning).
 */
export function BudgetLinePlanningTab({
  budgetLineId,
  currency,
  enabled,
}: BudgetLinePlanningTabProps) {
  const { data, isLoading, error, isError } = useBudgetLinePlanning(
    enabled ? budgetLineId : null,
  );

  if (!enabled) {
    return null;
  }

  if (isLoading) {
    return <LoadingState rows={4} />;
  }

  if (isError || !data) {
    const msg =
      error && typeof error === 'object' && 'message' in error
        ? String((error as ApiFormError).message)
        : 'Impossible de charger le planning de la ligne.';
    return (
      <Alert variant="destructive">
        <AlertTitle>Planning indisponible</AlertTitle>
        <AlertDescription>{msg}</AlertDescription>
      </Alert>
    );
  }

  const amounts12 = amounts12FromPlanningMonths(data.months);
  const labels = data.monthColumnLabels?.length === 12 ? data.monthColumnLabels : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Prévisionnel (12 mois)</CardTitle>
          <CardDescription>
            Montants issus du planning RFC-023 — édition détaillée depuis le tableau budget
            (vue Prévisionnel).
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Indicateur</TableHead>
                <TableHead className="text-right">Montant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Total prévision</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatAmount(data.planningTotalAmount, currency)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Budget révisé</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatAmount(data.revisedAmount, currency)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Écart prévision / révisé</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatAmount(data.planningDelta, currency)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Consommé</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatAmount(data.consumedAmount, currency)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Engagé</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatAmount(data.committedAmount, currency)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Prévision restante</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatAmount(data.remainingPlanning, currency)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Atterrissage</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatAmount(data.landing, currency)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Écart atterrissage</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatAmount(data.landingVariance, currency)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Détail mensuel</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {amounts12.map((_, i) => (
                  <TableHead key={i} className="min-w-[4.5rem] whitespace-nowrap text-right text-xs">
                    {labels?.[i] ?? `M${i + 1}`}
                  </TableHead>
                ))}
                <TableHead className="text-right font-semibold">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                {amounts12.map((amt, i) => (
                  <TableCell key={i} className="text-right tabular-nums text-sm">
                    {formatAmount(amt, currency)}
                  </TableCell>
                ))}
                <TableCell className="text-right tabular-nums font-medium">
                  {formatAmount(data.planningTotalAmount, currency)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
