'use client';

import { CheckSquare } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import type {
  StrategicAxisDto,
  StrategicObjectiveDto,
  StrategicVisionDto,
  StrategicVisionKpisResponseDto,
} from '../types/strategic-vision.types';
import { buildAxisNameMap, splitAxisLogoAndTitle } from '../lib/strategic-vision-tabs-view';
import {
  axisProgress,
  progressTone,
  toneStatusLabel,
} from '../lib/strategic-overview-progress';
import {
  axisObjectiveTrajectoryCounts,
  countAxesOnTrack,
  trajectoryBadgeClass,
} from '../lib/strategic-overview-view';
import {
  getAxisTheme,
  STRATEGIC_OVERVIEW_ICON_SIZE,
} from '../lib/strategic-overview-theme';
import { STRATEGIC_AXIS_ICONS } from './strategic-axis-icons';
import { StrategicAlignmentDonut } from './strategic-alignment-donut';
import { StrategicKpiCards } from './strategic-kpi-cards';
import { StrategicVisionHero } from './strategic-vision-hero';
import { StrategicObjectivesOverviewTable } from './strategic-objectives-overview-table';
import { cn } from '@/lib/utils';

function AxisProgressBar({ pct, barClass }: { pct: number; barClass: string }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-[color:var(--neutral-200)]">
      <div className={cn('h-full rounded-full', barClass)} style={{ width: `${pct}%` }} />
    </div>
  );
}

function StrategicOverviewAxisCard({
  axis,
  index,
}: {
  axis: StrategicAxisDto;
  index: number;
}) {
  const { logo, title, color } = splitAxisLogoAndTitle(axis.name);
  const AxisIcon = logo ? STRATEGIC_AXIS_ICONS[logo as keyof typeof STRATEGIC_AXIS_ICONS] : null;
  const pct = axisProgress(axis.objectives);
  const tone = progressTone(pct);
  const theme = getAxisTheme(color, index);
  const { onTrajectory, total } = axisObjectiveTrajectoryCounts(axis);
  const axisNumber = String(index + 1).padStart(2, '0');

  return (
    <article className="starium-section flex flex-col gap-4 !p-5">
      <div className="flex items-start gap-3">
        <span className={theme.iconShell} aria-hidden>
          {AxisIcon ? (
            <AxisIcon className={STRATEGIC_OVERVIEW_ICON_SIZE} />
          ) : (
            <span className="text-sm font-bold">{axisNumber}</span>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="starium-overline text-muted-foreground">Axe {axisNumber}</p>
          <div className="mt-0.5 flex items-start justify-between gap-3">
            <h3 className="text-base font-semibold leading-snug text-foreground">{title}</h3>
            <span
              className={cn(
                'shrink-0 text-2xl font-bold leading-none tracking-tight tabular-nums',
                theme.pctText,
              )}
            >
              {pct}%
            </span>
          </div>
        </div>
      </div>

      {axis.description ? (
        <p className="text-sm leading-relaxed text-muted-foreground">{axis.description}</p>
      ) : null}

      <AxisProgressBar pct={pct} barClass={theme.barClass} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
            trajectoryBadgeClass(tone),
          )}
        >
          <span
            aria-hidden
            className={cn('size-1.5 rounded-full', {
              'bg-[color:var(--state-success)]': tone === 'success',
              'bg-[color:var(--state-warning)]': tone === 'warning',
              'bg-[color:var(--state-danger)]': tone === 'danger',
            })}
          />
          {toneStatusLabel(tone)}
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <CheckSquare className={cn(STRATEGIC_OVERVIEW_ICON_SIZE, 'size-3.5')} aria-hidden />
          <span className="tabular-nums">
            {onTrajectory}/{total || 0} objectif{total === 1 ? '' : 's'}
          </span>
        </span>
      </div>
    </article>
  );
}

export function StrategicVisionOverviewTab({
  vision,
  axes,
  objectives,
  kpis,
  kpisLoading,
  kpisError,
  isLoading,
  isError,
}: {
  vision: StrategicVisionDto | null;
  axes: StrategicAxisDto[];
  objectives: StrategicObjectiveDto[];
  kpis?: StrategicVisionKpisResponseDto;
  kpisLoading?: boolean;
  kpisError?: boolean;
  isLoading: boolean;
  isError: boolean;
  isEditMode: boolean;
  canUpdate: boolean;
}) {
  if (isLoading) {
    return (
      <section className="space-y-6" aria-busy="true">
        <Skeleton className="h-52 w-full rounded-xl" />
        <Skeleton className="h-36 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </section>
    );
  }

  if (isError) {
    return (
      <ErrorState message="Impossible de charger la vue d'ensemble de la vision stratégique." />
    );
  }

  if (!vision) {
    return (
      <Card size="sm" className="starium-panel">
        <CardContent className="py-10">
          <EmptyState
            title="Aucune vision"
            description="Aucune vision disponible pour ce client."
          />
        </CardContent>
      </Card>
    );
  }

  const axisNameMap = buildAxisNameMap(axes);
  const axesOnTrack = countAxesOnTrack(axes);
  const alignmentRate = kpis?.projectAlignmentRate ?? 0;

  return (
    <section className="space-y-6">
      <StrategicVisionHero vision={vision} />

      <section className="starium-section !p-0" aria-labelledby="sv-alignment-heading">
        <div className="flex flex-col gap-6 p-5 sm:flex-row sm:items-center sm:gap-8 sm:p-6">
          {kpisLoading ? (
            <Skeleton className="size-[130px] shrink-0 rounded-full" />
          ) : kpisError || !kpis ? (
            <div className="flex size-[130px] shrink-0 items-center justify-center rounded-full border border-dashed border-border text-sm text-muted-foreground">
              —
            </div>
          ) : (
            <StrategicAlignmentDonut rate={alignmentRate} />
          )}
          <div className="min-w-0 flex-1 space-y-2">
            <h2 id="sv-alignment-heading" className="starium-section-title">
              Alignement stratégique global
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Mesure de l&apos;adéquation entre le portefeuille de projets et les{' '}
              {axes.length} axe{axes.length > 1 ? 's' : ''} stratégique
              {axes.length > 1 ? 's' : ''}.
              {axes.length > 0 ? (
                <>
                  {' '}
                  {axesOnTrack} axe{axesOnTrack > 1 ? 's' : ''} sur {axes.length}{' '}
                  {axesOnTrack > 1 ? 'sont' : 'est'} en bonne trajectoire.
                </>
              ) : null}
            </p>
            {kpis && kpis.unalignedProjectsCount > 0 ? (
              <p className="text-sm font-medium text-[color:var(--state-warning)]">
                {kpis.unalignedProjectsCount} projet
                {kpis.unalignedProjectsCount > 1 ? 's' : ''} non aligné
                {kpis.unalignedProjectsCount > 1 ? 's' : ''} sur le portefeuille actif.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <StrategicKpiCards
        kpis={kpis}
        isLoading={kpisLoading}
        isError={kpisError}
      />

      <section aria-labelledby="sv-axes-heading">
        <h2 id="sv-axes-heading" className="starium-section-title">
          {axes.length > 0
            ? `Les ${axes.length} axes stratégiques`
            : 'Axes stratégiques'}
        </h2>
        {axes.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Aucun axe stratégique disponible pour ce client.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {axes.map((axis, index) => (
              <StrategicOverviewAxisCard key={axis.id} axis={axis} index={index} />
            ))}
          </div>
        )}
      </section>

      <StrategicObjectivesOverviewTable
        objectives={objectives}
        axisNameById={axisNameMap}
      />
    </section>
  );
}
