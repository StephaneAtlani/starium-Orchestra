'use client';

import Link from 'next/link';
import { FolderKanban } from 'lucide-react';
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
import { budgetDetail } from '@/features/budgets/constants/budget-routes';
import { useBudgetProjectBudgetKpisQuery } from '@/features/budgets/hooks/use-budget-project-budget-kpis-query';
import {
  driftSemanticLabel,
  PROJECT_BUDGET_IMPUTATION_DISCLAIMER,
} from '@/features/budgets/lib/project-budget-imputation';
import { CockpitSection, CockpitSurfaceCard } from './budget-cockpit-primitives';
import {
  cockpitTableHeadRow,
  cockpitTdFirstAfterAction,
  cockpitTdNum,
  cockpitThFirstAfterAction,
  cockpitThNum,
} from './budget-cockpit-table-classes';

const ALL_BUDGETS_SENTINEL = '__ALL__';

export type BudgetDashboardProjectsFundedCardProps = {
  budgetId: string | null | undefined;
  budgetName?: string | null;
};

/**
 * RFC-PROJ-010-B follow-up — KPI projets sur `/budgets/dashboard`.
 * Même API que la fiche budget ; pas de série inventée ; agrégat exercice = hors V1.
 */
export function BudgetDashboardProjectsFundedCard({
  budgetId,
  budgetName,
}: BudgetDashboardProjectsFundedCardProps) {
  const { has } = usePermissions();
  const canReadProjects = has('projects.read');
  const isAggregated = !budgetId || budgetId === ALL_BUDGETS_SENTINEL;
  const q = useBudgetProjectBudgetKpisQuery(isAggregated ? null : budgetId, {
    enabled: !isAggregated,
  });

  const ficheHref = budgetId && !isAggregated ? budgetDetail(budgetId) : null;

  return (
    <CockpitSection
      id="budget-dashboard-projects-funded-heading"
      className="mt-6"
      title="Projets financés"
      description={
        isAggregated
          ? 'Sélectionnez un budget précis pour afficher les KPI projet (cible, consommé, dérive).'
          : 'Agrégats ProjectBudgetLink du budget sélectionné — même lecture que la fiche budget.'
      }
      action={
        ficheHref ? (
          <Link
            href={ficheHref}
            className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              'min-h-11 min-w-[44px]',
            )}
          >
            Voir la fiche
            {budgetName ? ` — ${budgetName}` : ''}
          </Link>
        ) : null
      }
    >
      {isAggregated ? (
        <EmptyState
          title="Budget non sélectionné"
          description="Le mode « tous les budgets » n’agrège pas encore l’axe projet. Choisissez un budget dans le filtre du cockpit."
        />
      ) : q.isLoading ? (
        <LoadingState rows={3} />
      ) : q.isError ? (
        <ErrorState
          message="Impossible de charger les KPI projets de ce budget."
          onRetry={() => void q.refetch()}
        />
      ) : (
        <ProjectsFundedBody
          canReadProjects={canReadProjects}
          items={q.data?.items ?? []}
          totals={q.data?.totals}
          truncated={q.data?.truncated}
        />
      )}
    </CockpitSection>
  );
}

function ProjectsFundedBody({
  canReadProjects,
  items,
  totals,
  truncated,
}: {
  canReadProjects: boolean;
  items: NonNullable<
    ReturnType<typeof useBudgetProjectBudgetKpisQuery>['data']
  >['items'];
  totals:
    | NonNullable<
        ReturnType<typeof useBudgetProjectBudgetKpisQuery>['data']
      >['totals']
    | undefined;
  truncated?: boolean;
}) {
  if (items.length === 0 || !totals) {
    return (
      <EmptyState
        title="Aucun projet rattaché"
        description="Aucune liaison ProjectBudgetLink sur les lignes de ce budget."
      />
    );
  }

  const top = items.slice(0, 8);

  return (
    <div className="space-y-4">
      <Alert>
        <AlertTitle>Lecture indicative</AlertTitle>
        <AlertDescription>{PROJECT_BUDGET_IMPUTATION_DISCLAIMER}</AlertDescription>
      </Alert>

      {truncated ? (
        <p className="starium-text-muted text-sm" role="status">
          Affichage limité (liste tronquée côté API).
        </p>
      ) : null}

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

      <CockpitSurfaceCard
        title="Par projet"
        description={
          items.length > 8
            ? `Top 8 sur ${items.length} projets — détail complet sur la fiche budget.`
            : 'Cible, consommé et dérive par projet.'
        }
        icon={FolderKanban}
        accent="violet"
        contentPad={false}
        bodyClassName="p-0"
      >
        <div className="hidden sm:block">
          <StariumTableWrap>
            <Table>
              <TableHeader className="bg-transparent">
                <TableRow className={cockpitTableHeadRow}>
                  <TableHead className={cockpitThFirstAfterAction}>Projet</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className={cockpitThNum}>Cible</TableHead>
                  <TableHead className={cockpitThNum}>Consommé</TableHead>
                  <TableHead className={cockpitThNum}>Dérive</TableHead>
                  {canReadProjects ? (
                    <TableHead className="w-[1%]">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {top.map((row) => {
                  const label = firstDisplayLabel(
                    [row.project.name, row.project.code],
                    'Projet',
                  );
                  const statusLabel =
                    PROJECT_STATUS_LABEL[row.project.status] ?? 'Statut';
                  return (
                    <TableRow key={row.projectId}>
                      <TableCell className={cockpitTdFirstAfterAction}>
                        <p className="truncate font-medium">{label}</p>
                        <p className="starium-text-muted text-xs">
                          {row.linkCount} liaison{row.linkCount > 1 ? 's' : ''}
                        </p>
                      </TableCell>
                      <TableCell>{statusLabel}</TableCell>
                      <TableCell className={cockpitTdNum}>
                        {formatBudgetEur(row.targetAmount)}
                      </TableCell>
                      <TableCell className={cockpitTdNum}>
                        {formatBudgetEur(row.consumedAmount)}
                      </TableCell>
                      <TableCell className={cockpitTdNum}>
                        <span className="tabular-nums">
                          {formatBudgetEur(row.driftAmount)}
                        </span>
                        <span className="starium-text-muted ml-2 text-xs">
                          {driftSemanticLabel(row.driftAmount)}
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

        <ul
          className="divide-y divide-border/60 sm:hidden"
          aria-label="Projets financés"
        >
          {top.map((row) => {
            const label = firstDisplayLabel(
              [row.project.name, row.project.code],
              'Projet',
            );
            return (
              <li key={row.projectId} className="space-y-2 p-4">
                <p className="font-medium">{label}</p>
                <p className="text-sm tabular-nums">
                  Cible {formatBudgetEur(row.targetAmount)} · Consommé{' '}
                  {formatBudgetEur(row.consumedAmount)}
                </p>
                <p className="text-sm">
                  Dérive {formatBudgetEur(row.driftAmount)} —{' '}
                  {driftSemanticLabel(row.driftAmount)}
                </p>
                {canReadProjects ? (
                  <Link
                    href={`/projects/${row.project.id}/budget`}
                    className={cn(
                      buttonVariants({ variant: 'outline', size: 'sm' }),
                      'mt-1 inline-flex min-h-11 min-w-[44px]',
                    )}
                  >
                    Voir le budget projet
                  </Link>
                ) : null}
              </li>
            );
          })}
        </ul>
      </CockpitSurfaceCard>
    </div>
  );
}
