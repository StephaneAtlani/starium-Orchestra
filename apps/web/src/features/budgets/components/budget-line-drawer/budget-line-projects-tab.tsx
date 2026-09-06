'use client';

import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
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
import { ALLOCATION_MODE_LABELS } from '@/features/projects/lib/project-budget-allocation';
import { PROJECT_STATUS_LABEL } from '@/features/projects/constants/project-enum-labels';
import { formatBudgetEur } from '@/features/projects/lib/project-budget-display';
import { useBudgetLineProjectLinksQuery } from '../../hooks/use-budget-line-project-links-query';
import { PROJECT_BUDGET_IMPUTATION_DISCLAIMER } from '../../lib/project-budget-imputation';
import type { ProjectBudgetAllocationTypeApi } from '../../types/budget-project-links.types';

function allocationModeLabel(type: ProjectBudgetAllocationTypeApi): string {
  return ALLOCATION_MODE_LABELS[type] ?? type;
}

function formatPart(
  type: ProjectBudgetAllocationTypeApi,
  percentage: string | null,
  amount: string | null,
  allocated: number | null,
): string {
  if (type === 'FIXED') {
    return formatBudgetEur(allocated ?? (amount != null ? Number(amount) : null));
  }
  if (type === 'FULL') return '100 %';
  if (percentage != null && percentage !== '') return `${percentage} %`;
  return formatBudgetEur(allocated);
}

export function BudgetLineProjectsTab({
  budgetLineId,
  enabled,
}: {
  budgetLineId: string;
  enabled: boolean;
}) {
  const { has } = usePermissions();
  const canReadProjects = has('projects.read');
  const q = useBudgetLineProjectLinksQuery(budgetLineId, { enabled });

  if (!enabled) return null;

  if (q.isLoading) {
    return <LoadingState rows={4} />;
  }

  if (q.isError) {
    return (
      <ErrorState
        message="Impossible de charger les projets liés. Réessayez dans un instant."
        onRetry={() => void q.refetch()}
      />
    );
  }

  const items = q.data?.items ?? [];

  return (
    <div className="space-y-4">
      <Alert>
        <AlertTitle>Lecture indicative</AlertTitle>
        <AlertDescription>{PROJECT_BUDGET_IMPUTATION_DISCLAIMER}</AlertDescription>
      </Alert>

      {items.length === 0 ? (
        <EmptyState
          title="Aucun projet lié"
          description="Cette ligne n’est rattachée à aucun projet. Les liaisons se gèrent depuis la fiche budget du projet."
        />
      ) : (
        <>
          <div className="hidden sm:block">
            <StariumTableWrap>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Projet</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead className="text-right tabular-nums">Part allouée</TableHead>
                    <TableHead className="text-right tabular-nums">
                      Consommé imputé
                    </TableHead>
                    {canReadProjects ? <TableHead className="w-[1%] whitespace-nowrap" /> : null}
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
                    return (
                      <TableRow key={row.id}>
                        <TableCell>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">{label}</p>
                            {row.project.code ? (
                              <p className="starium-text-muted truncate text-xs">
                                {row.project.code}
                              </p>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>{statusLabel}</TableCell>
                        <TableCell>{allocationModeLabel(row.allocationType)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatPart(
                            row.allocationType,
                            row.percentage,
                            row.amount,
                            row.projectAllocatedAmount,
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatBudgetEur(row.imputedConsumedAmount)}
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
                              Voir budget projet
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

          <ul className="space-y-3 sm:hidden" aria-label="Projets liés à la ligne">
            {items.map((row) => {
              const label = firstDisplayLabel(
                [row.project.name, row.project.code],
                'Projet',
              );
              const statusLabel =
                PROJECT_STATUS_LABEL[row.project.status] ?? 'Statut';
              return (
                <li
                  key={row.id}
                  className="rounded-[var(--radius-lg)] border border-border/70 bg-card p-4"
                >
                  <p className="font-medium text-foreground">{label}</p>
                  <p className="starium-text-muted mt-1 text-sm">{statusLabel}</p>
                  <p className="mt-2 text-sm">
                    {allocationModeLabel(row.allocationType)} ·{' '}
                    {formatPart(
                      row.allocationType,
                      row.percentage,
                      row.amount,
                      row.projectAllocatedAmount,
                    )}
                  </p>
                  <p className="mt-1 text-sm tabular-nums">
                    Consommé imputé : {formatBudgetEur(row.imputedConsumedAmount)}
                  </p>
                  {canReadProjects ? (
                    <Link
                      href={`/projects/${row.project.id}/budget`}
                      className={cn(
                        buttonVariants({ variant: 'outline', size: 'sm' }),
                        'mt-3 inline-flex min-h-11 min-w-[44px]',
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
    </div>
  );
}
