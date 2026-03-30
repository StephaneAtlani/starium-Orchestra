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
import { cn } from '@/lib/utils';

/** Styles frise portefeuille — barres de santé + fonds de piste. */
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

const healthBarStyles: Record<
  PortfolioGanttRow['computedHealth'],
  { bar: string; fill: string }
> = {
  GREEN: {
    bar: 'border border-emerald-600/45 bg-emerald-500/[0.22] shadow-sm dark:border-emerald-500/35 dark:bg-emerald-500/18',
    fill: 'bg-emerald-600/55 dark:bg-emerald-400/45',
  },
  ORANGE: {
    bar: 'border border-amber-600/50 bg-amber-500/[0.22] shadow-sm dark:border-amber-500/40 dark:bg-amber-500/15',
    fill: 'bg-amber-600/50 dark:bg-amber-400/40',
  },
  RED: {
    bar: 'border border-red-600/55 bg-red-500/[0.2] shadow-sm dark:border-red-500/45 dark:bg-red-500/22',
    fill: 'bg-red-600/60 dark:bg-red-400/45',
  },
};

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
  const styles = healthBarStyles[row.computedHealth];
  if (!eligible || !like) {
    return (
      <div
        key={`task:${row.id}`}
        className={cn(
          'relative shrink-0 rounded-md border',
          portfolioGantt.projectRow.trackEmpty,
        )}
        style={{ height: PORTFOLIO_GANTT_ROW_PX, width: widthPx }}
      />
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
      />
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
      <div
        className={cn(
          'absolute top-1/2 h-5 max-h-[calc(100%-8px)] -translate-y-1/2 rounded-md',
          styles.bar,
          row.isLate &&
            'ring-2 ring-amber-500/90 ring-offset-1 ring-offset-background dark:ring-amber-400/80',
        )}
        style={{ left, width: w }}
        title={`${row.name} — ${pct}% — ${row.status}`}
      >
        <div
          className={cn('h-full rounded-l-[5px]', styles.fill)}
          style={{ width: `${pct}%` }}
        />
      </div>
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
                  <Link
                    href={projectDetail(lr.row.id)}
                    className="hover:text-primary line-clamp-2 min-w-0 text-left text-xs leading-snug font-medium underline-offset-2 hover:underline"
                    title={`${lr.row.code} — ${lr.row.name}`}
                  >
                    <span className="text-muted-foreground">{lr.row.code}</span> · {lr.row.name}
                  </Link>
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
  );
}
