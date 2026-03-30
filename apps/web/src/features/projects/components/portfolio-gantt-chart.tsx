'use client';

import Link from 'next/link';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { PortfolioGanttRow } from '../types/project.types';
import { projectDetail } from '../constants/project-routes';
import {
  GANTT_DAY_MS,
  GANTT_MIN_TIMELINE_PX,
  computeTimelineBounds,
  dateMsToPx,
  dateRangeToTimelineLayout,
  type GanttTaskLike,
  type TimelineBounds,
} from '../lib/gantt-timeline-layout';
import {
  GANTT_CATEGORY_HEADER_PX,
  PORTFOLIO_GANTT_ROW_GAP_PX,
  PORTFOLIO_GANTT_ROW_PX,
  flattenPortfolioGanttLayout,
  groupPortfolioGanttByCategory,
  portfolioGanttBodyHeightPx,
} from '../lib/portfolio-gantt-group';
import { portfolioGanttBarSegmentClasses } from '../lib/portfolio-gantt-bar-styles';
import { TooltipProvider } from '@/components/ui/tooltip';
import { PortfolioGanttProjectTooltip } from './portfolio-gantt-project-tooltip';
import { PortfolioGanttLegend } from './portfolio-gantt-legend';
import { cn } from '@/lib/utils';

/** Styles frise portefeuille — fonds de piste + chrome. */
const portfolioGantt = {
  outer: 'border-border/50 bg-card/40 dark:bg-card/20',
  sidebarHeader: 'border-border/40 bg-muted/30',
  monthHeader: 'border-border/40 bg-muted/30',
  monthBand: 'border-border/30 text-muted-foreground',
  todayLine: 'bg-sky-500/70 dark:bg-sky-400/60',
  category: {
    sidebar:
      'border-border/40 bg-primary/[0.06] text-foreground/85 border-l-[3px] border-l-primary dark:bg-primary/10',
    timeline:
      'border-border/40 bg-primary/[0.05] dark:bg-primary/[0.08]',
  },
  projectRow: {
    sidebar:
      'border-border/40 bg-card hover:bg-muted/40 dark:bg-muted/15 dark:hover:bg-muted/30',
    track:
      'border-border/40 bg-muted/25 dark:bg-muted/20',
    trackEmpty:
      'border-border/50 border-dashed bg-muted/15 dark:bg-muted/10',
  },
} as const;

function rowToGanttLike(row: PortfolioGanttRow): GanttTaskLike | null {
  const end = row.targetEndDate;
  const start = row.startDate;
  if (!end && !start) return null;
  if (start && end) return { plannedStartDate: start, plannedEndDate: end };
  if (end && !start) return { plannedStartDate: end, plannedEndDate: end };
  if (start && !end) return { plannedStartDate: start, plannedEndDate: start };
  return null;
}

function renderProjectTimelineRow(
  row: PortfolioGanttRow,
  bounds: TimelineBounds,
  pxPerDay: number,
  widthPx: number,
) {
  const like = rowToGanttLike(row);
  const eligible =
    like?.plannedStartDate && like?.plannedEndDate && bounds;
  const segment = portfolioGanttBarSegmentClasses(row);

  const emptyTrack = (
    <PortfolioGanttProjectTooltip
      row={row}
      side="top"
      align="center"
      sideOffset={6}
      triggerClassName="absolute inset-0 block min-h-[1.25rem]"
    >
      <span className="sr-only">
        {row.code} — {row.name}
      </span>
    </PortfolioGanttProjectTooltip>
  );

  if (!eligible || !like) {
    return (
      <div
        key={`task:${row.id}`}
        className={cn(
          'relative shrink-0 rounded-md border',
          portfolioGantt.projectRow.trackEmpty,
        )}
        style={{ height: PORTFOLIO_GANTT_ROW_PX, width: widthPx }}
      >
        {emptyTrack}
      </div>
    );
  }
  const start = like.plannedStartDate;
  const end = like.plannedEndDate;
  if (!start || !end) {
    return (
      <div
        key={`task:${row.id}`}
        className={cn(
          'relative shrink-0 rounded-md border',
          portfolioGantt.projectRow.trackEmpty,
        )}
        style={{ height: PORTFOLIO_GANTT_ROW_PX, width: widthPx }}
      >
        {emptyTrack}
      </div>
    );
  }
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const left = dateMsToPx(s, bounds, pxPerDay);
  const w = Math.max(4, dateMsToPx(e, bounds, pxPerDay) - left);
  const pct = Math.min(100, Math.max(0, row.progressPercent ?? 0));

  return (
    <div
      key={`task:${row.id}`}
      className={cn('relative shrink-0 rounded-md border', portfolioGantt.projectRow.track)}
      style={{ height: PORTFOLIO_GANTT_ROW_PX, width: widthPx }}
    >
      <PortfolioGanttProjectTooltip
        row={row}
        side="top"
        align="center"
        sideOffset={6}
        triggerClassName={cn(
          'absolute top-1/2 h-5 max-h-[calc(100%-8px)] -translate-y-1/2 rounded-md',
          segment.bar,
          segment.lateRing,
        )}
        triggerStyle={{ left, width: Math.max(w, 24) }}
      >
        <div
          className={cn('pointer-events-none h-full rounded-l-[5px]', segment.fill)}
          style={{ width: `${pct}%` }}
          aria-hidden
        />
      </PortfolioGanttProjectTooltip>
    </div>
  );
}

export function PortfolioGanttChart({ items }: { items: PortfolioGanttRow[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [viewportW, setViewportW] = useState(960);

  const layoutRows = useMemo(
    () => flattenPortfolioGanttLayout(groupPortfolioGanttByCategory(items)),
    [items],
  );

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewportW(Math.max(el.clientWidth, GANTT_MIN_TIMELINE_PX)));
    ro.observe(el);
    setViewportW(Math.max(el.clientWidth, GANTT_MIN_TIMELINE_PX));
    return () => ro.disconnect();
  }, []);

  const { bounds, pxPerDay, layout } = useMemo(() => {
    const likes = items.map(rowToGanttLike).filter(
      (t): t is GanttTaskLike => t != null && !!t.plannedStartDate && !!t.plannedEndDate,
    );
    const b: TimelineBounds | null = computeTimelineBounds(likes, []);
    if (!b) return { bounds: null as TimelineBounds | null, pxPerDay: 4, layout: null };
    const span = (b.max - b.min) / GANTT_DAY_MS;
    const px = Math.max(2, viewportW / Math.max(span, 21));
    const lay = dateRangeToTimelineLayout(b, px);
    return { bounds: b, pxPerDay: px, layout: lay };
  }, [items, viewportW]);

  const bodyHeightPx = useMemo(
    () => portfolioGanttBodyHeightPx(layoutRows),
    [layoutRows],
  );

  if (!bounds || !layout) {
    return (
      <p className="text-muted-foreground text-sm">
        Aucun projet avec début <strong>et</strong> fin cible renseignés dans le périmètre filtré.
        Complétez les dates sur les fiches projet ou élargissez les filtres.
      </p>
    );
  }

  const widthPx = layout.widthPx;

  return (
    <TooltipProvider delay={250}>
      <div className="flex min-w-0 flex-col gap-3">
    <div
      className={cn(
        'flex min-h-[min(70vh,720px)] min-w-0 flex-col overflow-hidden rounded-lg border',
        portfolioGantt.outer,
      )}
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-row">
        <div
          className="border-border/50 bg-muted/20 shrink-0 overflow-y-auto border-r dark:bg-muted/10"
          style={{ width: 280, minWidth: 200 }}
        >
          <div
            style={{ height: 56 }}
            className={cn('shrink-0 border-b px-2 py-2', portfolioGantt.sidebarHeader)}
          >
            <span className="text-muted-foreground text-xs font-medium">Projet par catégorie</span>
          </div>
          <div
            className="flex min-h-0 flex-col px-2 pb-2 pt-2"
            style={{ gap: PORTFOLIO_GANTT_ROW_GAP_PX }}
          >
            {layoutRows.map((lr) =>
              lr.kind === 'category' ? (
                <div
                  key={lr.key}
                  className={cn(
                    'flex shrink-0 items-center rounded-md border px-2 text-[11px] font-semibold tracking-wide uppercase',
                    portfolioGantt.category.sidebar,
                  )}
                  style={{ height: GANTT_CATEGORY_HEADER_PX }}
                >
                  <span className="line-clamp-2 min-w-0">{lr.label}</span>
                </div>
              ) : (
                <div
                  key={`sidebar:${lr.row.id}`}
                  className={cn(
                    'flex shrink-0 items-center rounded-md border px-2.5 transition-colors',
                    portfolioGantt.projectRow.sidebar,
                  )}
                  style={{ height: PORTFOLIO_GANTT_ROW_PX }}
                >
                  <PortfolioGanttProjectTooltip
                    row={lr.row}
                    side="right"
                    align="center"
                    sideOffset={10}
                    triggerClassName="block min-w-0 flex-1 text-left"
                  >
                    <Link
                      href={projectDetail(lr.row.id)}
                      className="cursor-pointer hover:text-primary line-clamp-2 min-w-0 text-left text-xs leading-snug font-medium underline-offset-2 hover:underline"
                    >
                      <span className="text-muted-foreground">{lr.row.code}</span> · {lr.row.name}
                    </Link>
                  </PortfolioGanttProjectTooltip>
                </div>
              ),
            )}
          </div>
        </div>
        <div
          ref={scrollRef}
          className="bg-muted/10 min-h-0 min-w-0 flex-1 overflow-auto dark:bg-muted/5"
        >
          <div style={{ width: widthPx, minWidth: '100%' }}>
            <div
              className={cn('relative sticky top-0 z-10 border-b', portfolioGantt.monthHeader)}
              style={{ height: 56, width: widthPx }}
            >
              {layout.monthBands.map((band, idx) => (
                <div
                  key={`m-${idx}-${band.label}`}
                  className={cn(
                    'absolute border-l px-1 text-[10px] font-medium',
                    portfolioGantt.monthBand,
                  )}
                  style={{
                    left: band.leftPx,
                    width: Math.max(1, band.widthPx),
                    top: 0,
                    height: 56,
                  }}
                >
                  {band.label}
                </div>
              ))}
            </div>
            <div className="relative pb-2 pt-2" style={{ width: widthPx }}>
              {layout.todayPx != null && (
                <div
                  className={cn(
                    'pointer-events-none absolute top-2 z-[5] w-0.5 rounded-full shadow-sm',
                    portfolioGantt.todayLine,
                  )}
                  style={{
                    left: layout.todayPx,
                    height: bodyHeightPx,
                  }}
                  aria-hidden
                />
              )}
              <div
                className="relative flex flex-col"
                style={{ gap: PORTFOLIO_GANTT_ROW_GAP_PX }}
              >
                {layoutRows.map((lr) =>
                  lr.kind === 'category' ? (
                    <div
                      key={`tl:${lr.key}`}
                      className={cn(
                        'relative shrink-0 rounded-md border',
                        portfolioGantt.category.timeline,
                      )}
                      style={{ height: GANTT_CATEGORY_HEADER_PX, width: widthPx }}
                    />
                  ) : (
                    renderProjectTimelineRow(lr.row, bounds, pxPerDay, widthPx)
                  ),
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
        <PortfolioGanttLegend />
      </div>
    </TooltipProvider>
  );
}
