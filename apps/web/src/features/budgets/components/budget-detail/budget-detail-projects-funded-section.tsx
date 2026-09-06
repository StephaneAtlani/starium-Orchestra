'use client';

import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { KpiCard } from '@/components/ui/kpi-card';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StariumTableWrap } from '@/components/ui/starium-table-wrap';
import { usePermissions } from '@/hooks/use-permissions';
import { cn } from '@/lib/utils';
import { firstDisplayLabel } from '@/lib/display-label';
import { PROJECT_STATUS_LABEL } from '@/features/projects/constants/project-enum-labels';
import { formatBudgetEur } from '@/features/projects/lib/project-budget-display';
import { useBudgetProjectBudgetKpisQuery } from '../../hooks/use-budget-project-budget-kpis-query';
import {
  driftSemanticLabel,
  PROJECT_BUDGET_IMPUTATION_DISCLAIMER,
} from '../../lib/project-budget-imputation';

export type BudgetDetailProjectsFundedSectionProps = {
  budgetId: string;
};

/**
 * RFC-PROJ-010-B lot B — section « Projets financés » sous la bande KPI fiche budget.
 */
export function BudgetDetailProjectsFundedSection({
  budgetId,
}: BudgetDetailProjectsFundedSectionProps) {
  const { has } = usePermissions();
  const canReadProjects = has('projects.read');
  const q = useBudgetProjectBudgetKpisQuery(budgetId);

  if (q.isLoading) {
    return (
      <section className="starium-module" aria-labelledby="budget-projects-funded-title">
        <h2 id="budget-projects-funded-title" className="text-base font-semibold text-foreground">
          Projets financés
        </h2>
        <LoadingState rows={3} />
      </section>
    );
  }

  if (q.isError) {
    return (
      <section className="starium-module" aria-labelledby="budget-projects-funded-title">
        <h2 id="budget-projects-funded-title" className="text-base font-semibold text-foreground">
          Projets financés
        </h2>
        <ErrorState
          message="Impossible de charger les KPI projets de ce budget."
          onRetry={() => void q.refetch()}
        />
      </section>
    );
  }

  const data = q.data;
  const items = data?.items ?? [];
  const totals = data?.totals;

  return (
    <section className="starium-module space-y-4" aria-labelledby="budget-projects-funded-title">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <h2 id="budget-projects-funded-title" className="text-base font-semibold text-foreground">
          Projets financés
        </h2>
        {data?.truncated ? (
          <p className="starium-text-muted text-sm">
            Affichage limité aux 500 premiers liens (liste tronquée).
          </p>
        ) : null}
      </div>

      <Alert>
        <AlertTitle>Lecture indicative</AlertTitle>
        <AlertDescription>{PROJECT_BUDGET_IMPUTATION_DISCLAIMER}</AlertDescription>
      </Alert>

      {items.length === 0 || !totals ? (
        <EmptyState
          title="Aucun projet rattaché"
          description="Aucune liaison ProjectBudgetLink sur les lignes de ce budget."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <KpiCard
              variant="dense"
              title="Budget projet (cible)"
              value={formatBudgetEur(totals.targetAmount)}
              footer={`${totals.projectCount} projet${totals.projectCount > 1 ? 's' : ''}`}
            />
            <KpiCard
              variant="dense"
              title="Consommé projet"
              value={formatBudgetEur(totals.consumedAmount)}
              footer="Imputation V1"
            />
            <KpiCard
              variant="dense"
              title="Dérive"
              value={formatBudgetEur(totals.driftAmount)}
              footer={driftSemanticLabel(totals.driftAmount)}
              footerTone={
                totals.driftAmount > 0
                  ? 'danger'
                  : totals.driftAmount < 0
                    ? 'success'
                    : 'muted'
              }
            />
          </div>

          <div className="hidden sm:block">
            <StariumTableWrap>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Projet</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right tabular-nums">Cible</TableHead>
                    <TableHead className="text-right tabular-nums">Consommé</TableHead>
                    <TableHead className="text-right tabular-nums">Dérive</TableHead>
                    {canReadProjects ? <TableHead className="w-[1%]" /> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((row) => {
                    const label = firstDisplayLabel(
                      [row.project.name, row.project.code],
                      'Projet',
                    );
                    const statusLabel =
                      PROJECT_STATUS_LABEL[row.project.status] ?? 'Statut';
                    const driftText = driftSemanticLabel(row.driftAmount);
                    return (
                      <TableRow key={row.projectId}>
                        <TableCell>
                          <p className="truncate font-medium">{label}</p>
                          <p className="starium-text-muted text-xs">
                            {row.linkCount} liaison{row.linkCount > 1 ? 's' : ''}
                          </p>
                        </TableCell>
                        <TableCell>{statusLabel}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatBudgetEur(row.targetAmount)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatBudgetEur(row.consumedAmount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="tabular-nums">
                            {formatBudgetEur(row.driftAmount)}
                          </span>
                          <span className="starium-text-muted ml-2 text-xs">
                            {driftText}
                          </span>
                        </TableCell>
                        {canReadProjects ? (
                          <TableCell>
                            <Link
                              href={`/projects/${row.project.id}/budget`}
                              className={cn(
                                buttonVariants({ variant: 'outline', size: 'sm' }),
                                'min-h-11 min-w-[44px]',
                              )}
                            >
                              Voir
                            </Link>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </StariumTableWrap>
          </div>

          <ul className="space-y-3 sm:hidden" aria-label="Projets financés par ce budget">
            {items.map((row) => {
              const label = firstDisplayLabel(
                [row.project.name, row.project.code],
                'Projet',
              );
              return (
                <li
                  key={row.projectId}
                  className="rounded-[var(--radius-lg)] border border-border/70 bg-card p-4"
                >
                  <p className="font-medium">{label}</p>
                  <p className="mt-2 text-sm tabular-nums">
                    Cible {formatBudgetEur(row.targetAmount)} · Consommé{' '}
                    {formatBudgetEur(row.consumedAmount)}
                  </p>
                  <p className="mt-1 text-sm">
                    Dérive {formatBudgetEur(row.driftAmount)} —{' '}
                    {driftSemanticLabel(row.driftAmount)}
                  </p>
                  {canReadProjects ? (
                    <Link
                      href={`/projects/${row.project.id}/budget`}
                      className={cn(
                        buttonVariants({ variant: 'outline', size: 'sm' }),
                        'mt-3 inline-flex min-h-11',
                      )}
                    >
                      Voir budget projet
                    </Link>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
