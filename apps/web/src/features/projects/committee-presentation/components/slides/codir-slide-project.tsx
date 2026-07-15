'use client';

import { Check, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HealthBadge } from '../../../components/project-badges';
import { PROJECT_TYPE_LABEL } from '../../../constants/project-enum-labels';
import { useProjectTeamQuery } from '../../../hooks/use-project-team-queries';
import {
  formatProjectBudget,
  formatProjectDateLong,
  projectBudgetConsumptionPercent,
  projectListProgressPercent,
  projectOwnerInitials,
  projectPortfolioCategoryIcon,
  projectPortfolioCategoryIconPresentation,
  projectPortfolioCategoryLabel,
} from '../../../lib/projects-list-display';
import type { ProjectListItem } from '../../../types/project.types';
import { useProjectMilestonesQuery } from '../../../hooks/use-project-milestones-query';
import { useProjectReviewDetailQuery } from '../../../hooks/use-project-review-detail-query';
import { useProjectReviewsQuery } from '../../../hooks/use-project-reviews-query';
import { useCommitteeWidgetLayout } from '../../hooks/use-committee-widget-layout';
import { codirReportStatusPresentation } from '../../lib/codir-report-status';
import {
  renderCommitteeWidgetSlide,
  WIDGET_BY_ID,
  type WidgetId,
  type WidgetRenderContext,
} from '../../widgets/committee-widget-registry';
import { CodirSlideDecisionsPanel } from './codir-slide-decisions-panel';
import { CodirSlideInsightRow } from './codir-slide-insight-row';
import { CodirSlideRoadmap } from './codir-slide-roadmap';

/** Widgets intégrés nativement dans la slide — exclus de la grille configurable. */
const BUILT_IN_WIDGET_IDS = new Set<WidgetId>([
  'planningTimeline',
  'decisionsTaken',
  'decisionsPending',
  'metrics',
]);

type CodirSlideProjectProps = {
  project: ProjectListItem;
  projectIndex: number;
  projectTotal: number;
};

export function CodirSlideProject({ project, projectIndex, projectTotal }: CodirSlideProjectProps) {
  const reviewsQ = useProjectReviewsQuery(project.id, { enabled: true });
  const latestReview = (reviewsQ.data ?? [])[0] ?? null;
  const reviewDetailQ = useProjectReviewDetailQuery(project.id, latestReview?.id ?? null);
  const milestonesQ = useProjectMilestonesQuery(project.id, { enabled: true });
  const teamQ = useProjectTeamQuery(project.id, { enabled: true });
  const layout = useCommitteeWidgetLayout(project.id);

  const status = codirReportStatusPresentation(project);
  const CategoryIcon = projectPortfolioCategoryIcon(project);
  const iconPresentation = projectPortfolioCategoryIconPresentation(project);
  const categoryLabel =
    projectPortfolioCategoryLabel(project) ??
    (PROJECT_TYPE_LABEL[project.type] ?? project.type);
  const progress = projectListProgressPercent(project);
  const budgetPct = projectBudgetConsumptionPercent(
    project.targetBudgetAmount,
    project.consumedBudgetAmount,
  );
  const openTasks = project.openTasksCount;
  const deadlineOnTrack = !project.signals.isLate && project.computedHealth !== 'RED';

  const ctx: WidgetRenderContext = {
    project,
    reviews: reviewsQ.data ?? [],
    reviewDetail: reviewDetailQ.data ?? null,
    milestones: milestonesQ.data?.items ?? [],
    isLoading: {
      reviews: reviewsQ.isLoading,
      reviewDetail: reviewDetailQ.isLoading,
      milestones: milestonesQ.isLoading,
    },
  };

  const extraWidgetIds = layout.slideWidgetIds.filter((id) => !BUILT_IN_WIDGET_IDS.has(id));

  return (
    <div className="starium-present-project-slide flex h-full min-h-0 w-full flex-col overflow-hidden">
      <p className="starium-present-eyebrow mb-3 shrink-0">
        <LayoutGrid className="size-4 shrink-0" aria-hidden />
        Reporting projet · {projectIndex + 1}/{projectTotal}
      </p>

      <div className="starium-present-project-grid min-h-0 flex-1">
        <aside className="starium-present-project-sidebar flex min-h-0 flex-col overflow-hidden">
          <div
            className={cn(iconPresentation.className, 'mb-3 size-14 rounded-2xl')}
            style={iconPresentation.style}
            aria-hidden
          >
            <CategoryIcon className="size-7" strokeWidth={1.75} />
          </div>
          <h3
            className="starium-present-text text-xl font-extrabold leading-tight tracking-tight sm:text-2xl"
            style={{ fontSize: 'clamp(1.125rem, 2.5vw, 1.75rem)' }}
          >
            {project.name}
          </h3>
          <p className="mt-1 text-sm starium-present-text-muted">{categoryLabel}</p>
          <div className="mt-3 flex items-center gap-2">
            <span className="starium-present-avatar-pill grid size-9 place-items-center rounded-full text-xs font-bold">
              {projectOwnerInitials(project.ownerDisplayName ?? '?')}
            </span>
            <span className="starium-present-text truncate text-sm font-medium">
              {project.ownerDisplayName?.trim() || 'Non renseigné'}
            </span>
          </div>

          <div className="mt-3">
            <HealthBadge health={project.computedHealth} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <MiniKpi
              label="Avancement"
              value={`${progress} %`}
              sub={openTasks > 0 ? `${openTasks} tâche${openTasks > 1 ? 's' : ''} ouverte${openTasks > 1 ? 's' : ''}` : undefined}
            />
            <MiniKpi
              label="Budget"
              value={budgetPct != null ? `${Math.round(budgetPct)} %` : '—'}
              sub={
                project.targetBudgetAmount
                  ? `${formatProjectBudget(project.consumedBudgetAmount) ?? '—'} / ${formatProjectBudget(project.targetBudgetAmount)}`
                  : undefined
              }
            />
            <MiniKpi
              label="Risques"
              value={String(project.openRisksCount)}
              sub={
                project.openRisksCount === 0
                  ? '0 critique'
                  : project.computedHealth === 'RED'
                    ? '1+ critique'
                    : '0 critique'
              }
            />
            <MiniKpi
              label="Échéance"
              value={formatProjectDateLong(project.targetEndDate).split(' ').slice(0, 2).join(' ')}
              valueClassName={deadlineOnTrack ? 'text-[color:var(--state-success)]' : undefined}
              sub={deadlineOnTrack ? 'Dans les temps' : 'À surveiller'}
            />
          </div>

          {status.healthLabel ? (
            <p className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full starium-present-surface-pill px-2.5 py-1 text-xs font-semibold starium-present-text-soft">
              <Check className="size-3.5 text-[color:var(--state-success)]" aria-hidden />
              {status.healthLabel}
            </p>
          ) : null}
        </aside>

        <div className="starium-present-project-main flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
          <CodirSlideRoadmap
            milestones={milestonesQ.data?.items ?? []}
            project={project}
            isLoading={milestonesQ.isLoading}
          />

          <CodirSlideDecisionsPanel
            review={latestReview}
            reviewDetail={reviewDetailQ.data ?? null}
            isLoading={reviewDetailQ.isLoading}
          />

          <CodirSlideInsightRow
            project={project}
            milestones={milestonesQ.data?.items ?? []}
            team={teamQ.data ?? []}
            milestonesLoading={milestonesQ.isLoading}
            teamLoading={teamQ.isLoading}
          />

          {extraWidgetIds.length > 0 ? (
            <section
              className="starium-present-widgets-grid min-h-0 flex-1 overflow-hidden"
              aria-label="Widgets complémentaires"
            >
              {extraWidgetIds.map((id: WidgetId) => {
                const widget = WIDGET_BY_ID[id];
                if (!widget) return null;
                return (
                  <div
                    key={id}
                    className={cn(widget.size === 'full' && 'col-span-full')}
                  >
                    {renderCommitteeWidgetSlide(widget, ctx)}
                  </div>
                );
              })}
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function MiniKpi({
  label,
  value,
  sub,
  valueClassName,
}: {
  label: string;
  value: string;
  sub?: string;
  valueClassName?: string;
}) {
  return (
    <div className="starium-present-sidebar-kpi">
      <p className="starium-present-sidebar-kpi__label">{label}</p>
      <p className={cn('starium-present-sidebar-kpi__value', valueClassName)}>{value}</p>
      {sub ? <p className="starium-present-sidebar-kpi__sub">{sub}</p> : null}
    </div>
  );
}
