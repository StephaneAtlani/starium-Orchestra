'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { PROJECT_RISK_CRITICALITY_LABEL } from '../../constants/project-enum-labels';
import { riskPiShortLabel } from '../../lib/project-risk-display';
import {
  buildRiskMatrix,
  matrixCellSurfaceClass,
  RISK_MATRIX_IMPACT_COLS,
  RISK_MATRIX_LEGEND,
} from '../lib/risk-criticality-matrix';
import type { ProjectRiskRegistryRow } from '../hooks/use-project-risks-registry-query';

type Props = {
  rows: ProjectRiskRegistryRow[];
  isLoading: boolean;
};

/**
 * Matrice globale vraisemblance × gravité du registre — même grille 1–5 et mêmes
 * seuils que la fiche EBIOS (`risk-criticality-matrix`). Reflète la sélection
 * courante (filtres appliqués).
 */
export function RisksRegistryMatrix({ rows, isLoading }: Props) {
  const { cells, total, outOfScale } = useMemo(() => buildRiskMatrix(rows), [rows]);

  return (
    <Card
      size="sm"
      className="starium-panel flex flex-col overflow-hidden border border-border shadow-sm"
      data-testid="risks-registry-matrix"
    >
      <CardHeader className="border-b border-border/60 pb-3">
        <CardTitle className="text-sm font-semibold">Matrice globale des risques</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Répartition vraisemblance × gravité sur la sélection courante.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 pt-4">
        {isLoading ? (
          <Skeleton className="h-[13.5rem] w-full rounded-lg" />
        ) : (
          <>
            {/* Matrice P×I dense : scroll horizontal contrôlé, exception RFC-FE-MOB-003 (pas DataTable). */}
            <div className="overflow-x-auto rounded-lg border border-border/60 bg-muted/10 p-2">
              <table className="w-full min-w-[19rem] border-collapse text-center text-xs">
                <caption className="sr-only">
                  Nombre de risques par couple vraisemblance / gravité
                </caption>
                <thead>
                  <tr>
                    <th className="p-1.5 font-normal text-muted-foreground" scope="col">
                      <span className="sr-only">Vraisemblance par gravité</span>
                      <span aria-hidden>V \ G</span>
                    </th>
                    {RISK_MATRIX_IMPACT_COLS.map((impact) => (
                      <th
                        key={impact}
                        className="p-1.5 font-medium text-muted-foreground"
                        scope="col"
                        title={`Gravité ${impact} — ${riskPiShortLabel(impact)}`}
                      >
                        {impact}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cells.map((row) => (
                    <tr key={row[0].probability}>
                      <th
                        className="p-1.5 font-medium text-muted-foreground"
                        scope="row"
                        title={`Vraisemblance ${row[0].probability} — ${riskPiShortLabel(row[0].probability)}`}
                      >
                        {row[0].probability}
                      </th>
                      {row.map((cell) => (
                        <td key={cell.impact} className="p-0.5">
                          <div
                            className={cn(
                              'flex h-9 w-full min-w-[2.25rem] items-center justify-center rounded-md tabular-nums font-semibold',
                              matrixCellSurfaceClass(cell.level),
                              cell.count === 0 && 'opacity-45',
                            )}
                            title={`V=${cell.probability}, G=${cell.impact} → score ${cell.score} (${PROJECT_RISK_CRITICALITY_LABEL[cell.level]}) — ${cell.count} risque${cell.count > 1 ? 's' : ''}`}
                          >
                            {cell.count === 0 ? (
                              <span aria-hidden>–</span>
                            ) : (
                              cell.count
                            )}
                            <span className="sr-only">
                              {`${cell.count} risque${cell.count > 1 ? 's' : ''} en vraisemblance ${cell.probability} et gravité ${cell.impact}`}
                            </span>
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
              {RISK_MATRIX_LEGEND.map((entry) => (
                <span key={entry.label} className="inline-flex items-center gap-1.5">
                  <span className={cn('size-2.5 rounded-sm', entry.dotClass)} aria-hidden />
                  {entry.label}
                </span>
              ))}
            </div>

            <p className="mt-auto text-xs text-muted-foreground">
              {total === 0
                ? 'Aucun risque positionné sur la grille.'
                : `${total} risque${total > 1 ? 's' : ''} positionné${total > 1 ? 's' : ''}.`}
              {outOfScale > 0
                ? ` ${outOfScale} hors échelle 1–5 (non représenté${outOfScale > 1 ? 's' : ''}).`
                : ''}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
