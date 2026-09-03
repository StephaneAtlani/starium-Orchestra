'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Briefcase,
  Calendar,
  Hexagon,
  Plus,
  Wallet,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { useQuery } from '@tanstack/react-query';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { displayLabel } from '@/lib/display-label';
import { usePortfolioSummaryQuery } from '@/features/projects/hooks/use-portfolio-summary-query';
import { useProjectsListQuery } from '@/features/projects/hooks/use-projects-list-query';
import { useBudgetDashboardQuery } from '@/features/budgets/hooks/use-budget-dashboard';
import { useBudgetExerciseOptionsQuery } from '@/features/budgets/hooks/use-budget-exercise-options-query';
import {
  buildRealizedVsPlannedChartRows,
} from '@/features/budgets/lib/build-realized-vs-planned-chart';
import {
  getCockpitKpiData,
} from '@/features/budgets/types/budget-dashboard.types';
import { listClientRisks } from '@/features/projects/api/projects.api';
import { projectQueryKeys } from '@/features/projects/lib/project-query-keys';
import {
  formatPortfolioBudgetCompact,
  projectBudgetConsumptionPercent,
} from '@/features/projects/lib/projects-list-display';
import {
  projectNew,
  projectsList,
} from '@/features/projects/constants/project-routes';
import { HomeDashboardKpiCard } from './components/home-dashboard-kpi-card';
import { HomeDashboardBudgetChart } from './components/home-dashboard-budget-chart';
import { HomeDashboardHealthCard } from './components/home-dashboard-health-card';
import { HomeDashboardPriorityProjects } from './components/home-dashboard-priority-projects';
import { HomeDashboardDeadlines } from './components/home-dashboard-deadlines';
import {
  buildHomeBudgetChartPoints,
  budgetChartHasSignal,
  countHealth,
  countMilestonesWithinDays,
  filterMonthlyRowsByPeriod,
  resolveTodayMonthIndex,
  selectMyProjects,
  selectPriorityProjects,
  selectUpcomingDeadlines,
  sparkFromBudgetPoints,
  sparkFromCriticalRiskDetectedDates,
  sparkFromProjectCreations,
  sparkFromUpcomingMilestonesByWeek,
} from './lib/home-dashboard-metrics';

export type HomeDashboardPeriod = 'month' | 'quarter' | 'year';

function formatTodayLongFr(d = new Date()): string {
  const raw = d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function formatChartY(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} M€`;
  }
  if (n >= 1_000) {
    return `${Math.round(n / 1_000).toLocaleString('fr-FR')} k€`;
  }
  return `${Math.round(n).toLocaleString('fr-FR')} €`;
}

function PeriodToggle({
  value,
  onChange,
}: {
  value: HomeDashboardPeriod;
  onChange: (p: HomeDashboardPeriod) => void;
}) {
  const options: { id: HomeDashboardPeriod; label: string }[] = [
    { id: 'month', label: 'Ce mois' },
    { id: 'quarter', label: 'Trimestre' },
    { id: 'year', label: 'Année' },
  ];
  return (
    <div
      className="starium-tab-group w-full sm:w-auto"
      role="group"
      aria-label="Période d’analyse"
    >
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          className={cn(
            'starium-tab-btn min-h-11 flex-1 sm:min-h-9 sm:flex-none',
            value === opt.id && 'starium-tab-btn--active',
          )}
          aria-pressed={value === opt.id}
          onClick={() => onChange(opt.id)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function HomeDashboardPage() {
  const { user } = useAuth();
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const [period, setPeriod] = useState<HomeDashboardPeriod>('quarter');

  const firstName = user?.firstName?.trim() || null;
  const greeting = firstName
    ? `Bonjour, ${displayLabel(firstName, 'utilisateur')}`
    : 'Bonjour';

  const summaryQuery = usePortfolioSummaryQuery();
  const projectsQuery = useProjectsListQuery({
    page: 1,
    limit: 100,
    sortBy: 'priority',
    sortOrder: 'desc',
  });
  const budgetQuery = useBudgetDashboardQuery({
    includeEnvelopes: false,
    includeLines: false,
  });
  const exerciseOptionsQuery = useBudgetExerciseOptionsQuery();

  const risksQuery = useQuery({
    queryKey: [...projectQueryKeys.clientRisks(clientId), 'home-critical-spark'],
    queryFn: async () => {
      const risks = await listClientRisks(authFetch);
      const critical = risks.filter(
        (r) =>
          r.status === 'OPEN' &&
          (r.criticalityLevel === 'HIGH' || r.criticalityLevel === 'CRITICAL'),
      );
      return {
        count: critical.length,
        detectedAt: critical.map((r) => r.detectedAt),
      };
    },
    enabled: !!clientId,
    staleTime: 30_000,
  });

  const summary = summaryQuery.data;
  const projects = projectsQuery.data?.items ?? [];
  const health = useMemo(() => countHealth(projects), [projects]);
  const priorityProjects = useMemo(
    () => selectPriorityProjects(projects, 5),
    [projects],
  );

  const myProjects = useMemo(() => selectMyProjects(projects), [projects]);
  const deadlineWindow = period === 'month' ? 30 : period === 'quarter' ? 90 : 365;
  const deadlines = useMemo(
    () =>
      selectUpcomingDeadlines(myProjects, {
        withinDays: Math.min(deadlineWindow, 60),
        limit: 5,
      }),
    [myProjects, deadlineWindow],
  );
  const milestones30 = useMemo(
    () => countMilestonesWithinDays(projects, 30),
    [projects],
  );

  const budgetChart = useMemo(() => {
    const data = budgetQuery.data;
    if (!data) {
      return {
        points: [] as ReturnType<typeof buildHomeBudgetChartPoints>,
        todayIndex: null as number | null,
        yearLabel: '',
        hasSignal: false,
      };
    }
    const trendWidget = data.widgets.find(
      (w) => w.type === 'CHART' && w.data?.chartType === 'CONSUMPTION_TREND',
    );
    const monthlyTrend =
      trendWidget?.type === 'CHART' &&
      trendWidget.data?.chartType === 'CONSUMPTION_TREND'
        ? trendWidget.data.series
        : [];
    const kpi = getCockpitKpiData(data)?.kpis;
    const exerciseMeta = exerciseOptionsQuery.data?.find(
      (ex) => ex.id === data.exercise.id,
    );
    const startFromSeries = monthlyTrend[0]?.month
      ? `${monthlyTrend[0].month}-01`
      : null;
    const rows = buildRealizedVsPlannedChartRows({
      exerciseStartDateIso:
        exerciseMeta?.startDate ??
        startFromSeries ??
        `${new Date().getFullYear()}-01-01`,
      exerciseEndDateIso: exerciseMeta?.endDate,
      totalForecastAmount: kpi?.totalBudget ?? 0,
      monthlyTrend,
    });
    const scopedRows = filterMonthlyRowsByPeriod(rows, period);
    const points = buildHomeBudgetChartPoints(scopedRows);
    return {
      points,
      todayIndex: resolveTodayMonthIndex(points),
      yearLabel: displayLabel(
        data.exercise.name || data.exercise.code,
        'Exercice actif',
      ),
      hasSignal: budgetChartHasSignal(points),
    };
  }, [budgetQuery.data, exerciseOptionsQuery.data, period]);

  const budgetPct = summary
    ? projectBudgetConsumptionPercent(
        summary.totalTargetBudgetAmount,
        summary.totalConsumedBudgetAmount,
      )
    : null;

  const createdDelta = summary
    ? summary.projectsCreatedThisMonth - summary.projectsCreatedPreviousMonth
    : 0;

  const sparkBudget = sparkFromBudgetPoints(budgetChart.points);
  const sparkProjects = sparkFromProjectCreations(
    summary?.projectsCreatedPreviousMonth,
    summary?.projectsCreatedThisMonth,
  );
  const criticalRisks = risksQuery.data?.count ?? 0;
  const sparkRisks = sparkFromCriticalRiskDetectedDates(
    risksQuery.data?.detectedAt ?? [],
  );
  const sparkMilestones = sparkFromUpcomingMilestonesByWeek(
    projects,
    period === 'month' ? 4 : period === 'quarter' ? 8 : 12,
  );

  const loadingKpis =
    summaryQuery.isLoading || projectsQuery.isLoading || risksQuery.isLoading;
  const exerciseSubtitle = budgetChart.yearLabel
    ? `Réalisé vs budget cible — ${budgetChart.yearLabel}`
    : 'Réalisé vs budget cible sur l’exercice actif';

  return (
    <PageContainer>
      <PageHeader
        eyebrow={greeting}
        title="Tableau de bord"
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <PeriodToggle value={period} onChange={setPeriod} />
            <p className="hidden items-center gap-1.5 text-sm text-muted-foreground lg:inline-flex">
              <Calendar className="size-3.5 shrink-0" aria-hidden />
              <time dateTime={new Date().toISOString().slice(0, 10)}>
                {formatTodayLongFr()}
              </time>
            </p>
            <Link
              href={projectNew()}
              className={cn(
                buttonVariants({ variant: 'default', size: 'sm' }),
                'min-h-11 w-full justify-center gap-1.5 sm:min-h-9 sm:w-auto',
              )}
            >
              <Plus className="size-4" aria-hidden />
              Nouveau projet
            </Link>
          </div>
        }
      />

      <section
        className="starium-module space-y-3"
        aria-label="Indicateurs clés"
      >
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
          <HomeDashboardKpiCard
            title="Projets actifs"
            value={loadingKpis ? '—' : String(summary?.activeProjects ?? 0)}
            subtitle={
              summary
                ? `sur ${summary.totalProjects} au portefeuille`
                : 'Portefeuille client'
            }
            icon={Briefcase}
            iconWrapperClassName="bg-[color:var(--brand-gold-050)] text-[color:var(--brand-gold-700)]"
            sparkStroke="var(--brand-gold)"
            sparkFill="color-mix(in srgb, var(--brand-gold) 18%, transparent)"
            sparkValues={sparkProjects}
            sparkLabels={['Mois précédent', 'Ce mois']}
            formatSparkValue={(n) => `${n} créé${n > 1 ? 's' : ''}`}
            badge={
              summary
                ? {
                    label:
                      createdDelta === 0
                        ? 'Stable'
                        : `${createdDelta > 0 ? '↑' : '↓'} ${Math.abs(createdDelta)}`,
                    tone: createdDelta >= 0 ? 'success' : 'danger',
                  }
                : undefined
            }
            href={projectsList({ status: 'IN_PROGRESS' })}
          />

          <HomeDashboardKpiCard
            title="Budget consommé"
            value={
              loadingKpis
                ? '—'
                : budgetPct != null
                  ? `${Math.round(budgetPct)} %`
                  : '—'
            }
            subtitle={
              summary
                ? `${formatPortfolioBudgetCompact(summary.totalConsumedBudgetAmount)} / ${formatPortfolioBudgetCompact(summary.totalTargetBudgetAmount)}`
                : 'Cible portefeuille'
            }
            icon={Wallet}
            iconWrapperClassName="bg-[color:var(--state-info-bg)] text-[color:var(--state-info)]"
            sparkStroke="var(--state-info)"
            sparkFill="color-mix(in srgb, var(--state-info) 18%, transparent)"
            sparkValues={sparkBudget}
            sparkLabels={budgetChart.points.map((p) => p.label)}
            formatSparkValue={formatChartY}
            badge={
              budgetPct != null
                ? {
                    label:
                      budgetPct >= 90
                        ? '↑ Vigilance'
                        : budgetPct >= 60
                          ? '↑ En cours'
                          : 'Stable',
                    tone: budgetPct >= 90 ? 'danger' : 'success',
                  }
                : undefined
            }
            href="/budgets"
          />

          <HomeDashboardKpiCard
            title="Risques critiques"
            value={loadingKpis ? '—' : String(criticalRisks)}
            subtitle="à traiter en priorité"
            icon={AlertTriangle}
            iconWrapperClassName="bg-[color:var(--state-danger-bg)] text-[color:var(--state-danger)]"
            sparkStroke="var(--state-danger)"
            sparkFill="color-mix(in srgb, var(--state-danger) 16%, transparent)"
            sparkValues={sparkRisks}
            formatSparkValue={(n) => `${n}`}
            badge={
              criticalRisks > 0
                ? { label: `${criticalRisks} ouverts`, tone: 'danger' }
                : { label: 'Aucun', tone: 'success' }
            }
            href="/risks"
          />

          <HomeDashboardKpiCard
            title="Jalons (30 j)"
            value={
              projectsQuery.isLoading ? '—' : String(milestones30.total)
            }
            subtitle="prochains jalons clés"
            icon={Hexagon}
            iconWrapperClassName="bg-violet-500/12 text-violet-700 dark:text-violet-400"
            sparkStroke="var(--color-violet-600, #7c3aed)"
            sparkFill="color-mix(in srgb, var(--color-violet-600, #7c3aed) 16%, transparent)"
            sparkValues={sparkMilestones}
            formatSparkValue={(n) => `${n} jalon${n > 1 ? 's' : ''}`}
            badge={{
              label:
                milestones30.thisWeek > 0
                  ? `${milestones30.thisWeek} cette sem.`
                  : 'Aucune cette sem.',
              tone: 'muted',
            }}
            href={projectsList()}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <section
          className="starium-section flex flex-col gap-3 xl:col-span-2"
          aria-labelledby="home-budget-chart-heading"
        >
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2
                id="home-budget-chart-heading"
                className="starium-section-title text-base"
              >
                Consommation budgétaire du portefeuille
              </h2>
              <p className="starium-text-muted text-sm">{exerciseSubtitle}</p>
            </div>
            <ul className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <li className="inline-flex items-center gap-1.5">
                <span
                  className="h-0.5 w-3 rounded-full bg-[color:var(--brand-gold)]"
                  aria-hidden
                />
                Réalisé
              </li>
              <li className="inline-flex items-center gap-1.5">
                <span
                  className="h-0.5 w-3 border-t-2 border-dashed border-muted-foreground/60"
                  aria-hidden
                />
                Budget cible
              </li>
            </ul>
          </div>
          {budgetQuery.isLoading ? (
            <div className="h-52 animate-pulse rounded-lg bg-muted/40" />
          ) : budgetChart.hasSignal ? (
            <HomeDashboardBudgetChart
              points={budgetChart.points}
              formatY={formatChartY}
              todayIndex={budgetChart.todayIndex}
            />
          ) : (
            <p className="starium-text-muted py-10 text-center text-sm">
              Aucune consommation budgétaire à afficher pour la période.
            </p>
          )}
        </section>

        <HomeDashboardHealthCard
          green={health.green}
          orange={health.orange}
          red={health.red}
          loading={projectsQuery.isLoading}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <HomeDashboardPriorityProjects
            projects={priorityProjects}
            loading={projectsQuery.isLoading}
          />
        </div>
        <HomeDashboardDeadlines
          items={deadlines}
          loading={projectsQuery.isLoading}
        />
      </div>
    </PageContainer>
  );
}
