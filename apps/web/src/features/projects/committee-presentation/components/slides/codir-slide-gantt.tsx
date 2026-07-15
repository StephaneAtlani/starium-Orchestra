'use client';

import type { CSSProperties } from 'react';
import { useMemo } from 'react';
import { GanttChartSquare } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { RegistryBadge } from '@/lib/ui/registry-badge';
import { PortfolioGanttProjectTooltip } from '../../../components/portfolio-gantt-project-tooltip';
import { PROJECT_STATUS_LABEL } from '../../../constants/project-enum-labels';
import { projectTagBadgeStyle } from '../../../lib/project-tag-badge-style';
import {
  computeTimelineBounds,
  msToTimelinePercent,
  type GanttTaskLike,
} from '../../../lib/gantt-timeline-layout';
import { portfolioGanttBarSegmentClasses } from '../../../lib/portfolio-gantt-bar-styles';
import {
  groupPortfolioGanttByCategory,
  groupPortfolioGanttByTag,
  type PortfolioGanttSection,
} from '../../../lib/portfolio-gantt-group';
import {
  codirPresentationGanttUsesTagGrouping,
  filterPortfolioGanttForPresentation,
} from '../../lib/codir-presentation-filters';
import type { CodirPageSettings } from '../../hooks/use-codir-page-settings';
import type { PortfolioGanttRow } from '../../../types/project.types';

const GANTT_ROW_PX = 44;

function rowToGanttLike(row: PortfolioGanttRow): GanttTaskLike | null {
  const end = row.targetEndDate;
  const start = row.startDate;
  if (!end && !start) return null;
  if (start && end) return { plannedStartDate: start, plannedEndDate: end };
  if (end && !start) return { plannedStartDate: end, plannedEndDate: end };
  if (start && !end) return { plannedStartDate: start, plannedEndDate: start };
  return null;
}

function formatMonthShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
}

function sparseMonthMarkers(
  markers: Array<{ label: string; pct: number }>,
  minGapPct = 8,
): Array<{ label: string; pct: number }> {
  if (markers.length <= 1) return markers;
  const out: Array<{ label: string; pct: number }> = [markers[0]!];
  for (let i = 1; i < markers.length; i += 1) {
    const m = markers[i]!;
    if (m.pct - out[out.length - 1]!.pct >= minGapPct) {
      out.push(m);
    }
  }
  const last = markers[markers.length - 1]!;
  if (out[out.length - 1]!.pct !== last.pct) {
    out.push(last);
  }
  return out;
}

type CodirSlideGanttProps = {
  items: PortfolioGanttRow[];
  settings: CodirPageSettings;
  sectionKey: string;
  sectionLabel: string;
  sectionIndex: number;
  sectionTotal: number;
  isLoading?: boolean;
};

export function CodirSlideGantt({
  items,
  settings,
  sectionKey,
  sectionLabel,
  sectionIndex,
  sectionTotal,
  isLoading,
}: CodirSlideGanttProps) {
  const filtered = useMemo(
    () => filterPortfolioGanttForPresentation(items, settings),
    [items, settings],
  );

  const groupByTag = codirPresentationGanttUsesTagGrouping(settings);

  const allSections = useMemo(() => {
    if (groupByTag) {
      return groupPortfolioGanttByTag(filtered, {
        visibleTagIds: settings.presentationIncludedTagIds,
      });
    }
    return groupPortfolioGanttByCategory(filtered);
  }, [filtered, groupByTag, settings.presentationIncludedTagIds]);

  const section = useMemo((): PortfolioGanttSection | null => {
    if (sectionKey === 'gantt:all') {
      return {
        key: 'gantt:all',
        label: sectionLabel,
        rows: filtered,
      };
    }
    const found = allSections.find((s) => s.key === sectionKey);
    if (found) return found;
    if (sectionKey.startsWith('tag:')) {
      return { key: sectionKey, label: sectionLabel, rows: [] };
    }
    return null;
  }, [allSections, filtered, sectionKey, sectionLabel]);

  const bounds = useMemo(() => {
    const rows = section?.rows ?? [];
    const tasks = rows.map(rowToGanttLike).filter((t): t is GanttTaskLike => t != null);
    return computeTimelineBounds(tasks, []);
  }, [section]);

  const monthMarkers = useMemo(() => {
    if (!bounds) return [];
    const markers: Array<{ label: string; pct: number }> = [];
    const cursor = new Date(bounds.min);
    cursor.setUTCDate(1);
    cursor.setUTCHours(12, 0, 0, 0);
    while (cursor.getTime() <= bounds.max) {
      markers.push({
        label: formatMonthShort(cursor.toISOString()),
        pct: msToTimelinePercent(cursor.getTime(), bounds),
      });
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
    return sparseMonthMarkers(markers);
  }, [bounds]);

  const nowPct = bounds ? msToTimelinePercent(Date.now(), bounds) : null;
  const tagColor = section?.tagColor ?? null;
  const title =
    groupByTag && sectionTotal > 1
      ? sectionLabel
      : groupByTag
        ? 'Planning par étiquette'
        : 'Planning par catégorie';

  const hasRenderableRows =
    sectionKey === 'gantt:all' && !groupByTag
      ? allSections.some((s) => s.rows.length > 0)
      : (section?.rows.length ?? 0) > 0;

  return (
    <TooltipProvider delay={120}>
      <div className="starium-present-gantt-slide flex h-full min-h-0 w-full flex-col overflow-hidden">
        <p className="starium-present-eyebrow mb-2 shrink-0">
          <GanttChartSquare className="size-4 shrink-0" aria-hidden />
          Frise portefeuille
          {sectionTotal > 1 ? (
            <span className="starium-present-text-muted font-semibold normal-case tracking-normal">
              {' '}
              · {sectionIndex + 1}/{sectionTotal}
            </span>
          ) : null}
        </p>
        <div className="mb-3 flex min-w-0 shrink-0 flex-wrap items-center gap-2">
          <h2 className="starium-present-title text-2xl sm:text-3xl">{title}</h2>
          {groupByTag && tagColor ? (
            <RegistryBadge className="text-xs" style={projectTagBadgeStyle(tagColor)}>
              {sectionLabel}
            </RegistryBadge>
          ) : null}
        </div>

        {isLoading ? (
          <p className="text-sm starium-present-text-muted">Chargement de la frise…</p>
        ) : !hasRenderableRows || !section ? (
          <p className="text-sm starium-present-text-muted">
            {groupByTag
              ? 'Aucun projet planifié pour cette étiquette.'
              : 'Aucun projet planifié sur le portefeuille.'}
          </p>
        ) : (
          <div className="starium-present-gantt min-h-0 flex-1">
            <div className="starium-present-gantt__head">
              <div className="starium-present-gantt__head-label" aria-hidden>
                Projet
              </div>
              {bounds ? (
                <div className="starium-present-gantt__timeline-head" aria-hidden>
                  {monthMarkers.map((m) => (
                    <span
                      key={`${m.label}-${m.pct}`}
                      className="starium-present-gantt__month"
                      style={{ left: `${Math.min(98, Math.max(0, m.pct))}%` }}
                    >
                      {m.label}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="starium-present-gantt__timeline-head" aria-hidden />
              )}
            </div>

            {nowPct != null && nowPct >= 0 && nowPct <= 100 ? (
              <div
                className="starium-present-gantt__today-overlay"
                style={{ '--today-pct': `${nowPct}%` } as CSSProperties}
                aria-hidden
              >
                <span className="starium-present-gantt__today-line" />
                <span className="starium-present-gantt__today">Auj.</span>
              </div>
            ) : null}

            <div className="starium-present-gantt__body" role="list">
              {sectionKey === 'gantt:all' && !groupByTag ? (
                allSections.map((catSection) => (
                  <div key={catSection.key}>
                    <p className="starium-present-gantt__section-label">{catSection.label}</p>
                    {catSection.rows.map((row) => (
                      <GanttRow
                        key={`${catSection.key}:${row.id}`}
                        row={row}
                        bounds={bounds}
                      />
                    ))}
                  </div>
                ))
              ) : (
                <>
                  {!groupByTag || sectionTotal === 1 ? (
                    <p className="starium-present-gantt__section-label">{section.label}</p>
                  ) : null}
                  {section.rows.map((row) => (
                    <GanttRow key={`${section.key}:${row.id}`} row={row} bounds={bounds} />
                  ))}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

function GanttRow({
  row,
  bounds,
}: {
  row: PortfolioGanttRow;
  bounds: ReturnType<typeof computeTimelineBounds>;
}) {
  const like = rowToGanttLike(row);
  const segment = portfolioGanttBarSegmentClasses(row);
  const statusLabel = PROJECT_STATUS_LABEL[row.status] ?? row.status;

  let barStyle: { left: string; width: string } | null = null;
  if (like?.plannedStartDate && like.plannedEndDate && bounds) {
    const startMs = new Date(like.plannedStartDate).getTime();
    const endMs = new Date(like.plannedEndDate).getTime();
    const left = msToTimelinePercent(Math.max(startMs, bounds.min), bounds);
    const right = msToTimelinePercent(Math.min(endMs, bounds.max), bounds);
    const width = right - left;
    if (width > 0) {
      barStyle = {
        left: `${left}%`,
        width: `${Math.max(1.2, width)}%`,
      };
    }
  }

  const progress =
    row.progressPercent != null
      ? Math.min(100, Math.max(0, Math.round(row.progressPercent)))
      : null;

  const tooltipTriggerCursor = '!cursor-pointer active:cursor-pointer';

  return (
    <div
      className="starium-present-gantt__row"
      role="listitem"
      aria-label={`${row.name}, ${statusLabel}`}
      style={{ minHeight: GANTT_ROW_PX }}
    >
      <PortfolioGanttProjectTooltip
        row={row}
        side="right"
        align="center"
        sideOffset={10}
        triggerClassName={cn(
          'starium-present-gantt__row-label-trigger block min-w-0 w-full text-left',
          tooltipTriggerCursor,
        )}
      >
        <div className="starium-present-gantt__row-label">
          <p className="starium-present-gantt__row-name" title={row.name}>
            {row.name}
            {row.code ? (
              <>
                {' · '}
                <span className="starium-present-gantt__row-code">{row.code}</span>
              </>
            ) : null}
          </p>
          <p className="starium-present-gantt__row-meta">{statusLabel}</p>
        </div>
      </PortfolioGanttProjectTooltip>

      <div className="starium-present-gantt__track">
        {barStyle ? (
          <PortfolioGanttProjectTooltip
            row={row}
            side="top"
            align="center"
            sideOffset={6}
            triggerClassName={cn(
              'starium-present-gantt__bar absolute top-1/2 h-5 max-h-[calc(100%-8px)] -translate-y-1/2 rounded-md',
              tooltipTriggerCursor,
              segment.bar,
              segment.lateRing,
            )}
            triggerStyle={barStyle}
          >
            {progress != null ? (
              <div
                className={cn('pointer-events-none h-full rounded-l-[5px]', segment.fill)}
                style={{ width: `${progress}%` }}
                aria-hidden
              />
            ) : (
              <span className="sr-only">{row.name}</span>
            )}
          </PortfolioGanttProjectTooltip>
        ) : (
          <PortfolioGanttProjectTooltip
            row={row}
            side="top"
            align="center"
            sideOffset={6}
            triggerClassName={cn(
              'absolute inset-0 block min-h-[1.25rem]',
              tooltipTriggerCursor,
            )}
          >
            <span className="sr-only">{row.name}</span>
            <span className="starium-present-gantt__no-date">Dates non renseignées</span>
          </PortfolioGanttProjectTooltip>
        )}
      </div>
    </div>
  );
}
