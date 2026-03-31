'use client';

import Link from 'next/link';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
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

/** Zoom sur l’échelle temps (multiplicateur sur px/j, base = vue adaptée à la largeur). */
const PORTFOLIO_GANTT_TIME_ZOOM_MIN = 0.2;
const PORTFOLIO_GANTT_TIME_ZOOM_MAX = 5;
const PORTFOLIO_GANTT_TIME_ZOOM_STEP = 1.12;

function clampPortfolioTimeZoom(z: number): number {
  return Math.min(PORTFOLIO_GANTT_TIME_ZOOM_MAX, Math.max(PORTFOLIO_GANTT_TIME_ZOOM_MIN, z));
}

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
  tooltipsEnabled: boolean,
  inlineInfosEnabled: boolean,
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
      tooltipsEnabled={tooltipsEnabled}
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
  const progressLabel = `${Math.round(pct)}%`;
  const projectTags = (row.tags ?? [])
    .map((t) => t.name?.trim())
    .filter((name): name is string => Boolean(name))
    .slice(0, 3);
  const ownerLabel = row.ownerDisplayName?.trim() || 'Sans responsable';
  const barWidth = Math.max(w, 24);
  const rightMetaLeft = Math.min(left + barWidth + 6, Math.max(8, widthPx - 220));
  const rightMeta = inlineInfosEnabled ? (
    <div
      className="pointer-events-none absolute top-1/2 z-[6] -translate-y-1/2"
      style={{ left: rightMetaLeft }}
    >
      <div className="inline-flex max-w-[34rem] items-center gap-1.5 overflow-hidden">
        {projectTags.length > 0 ? (
          <>
            {projectTags.map((tag) => (
              <span
                key={`${row.id}:${tag}`}
                className="bg-muted text-foreground/90 inline-flex shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold tracking-wide uppercase"
              >
                {tag}
              </span>
            ))}
            <span className="text-muted-foreground opacity-60">|</span>
          </>
        ) : null}
        <span className="text-muted-foreground text-[10px] font-medium whitespace-nowrap">
          Resp. {ownerLabel}
        </span>
        <span className="text-muted-foreground opacity-60">|</span>
        <span className="text-muted-foreground text-[10px] font-medium whitespace-nowrap">
          Av. {progressLabel}
        </span>
      </div>
    </div>
  ) : null;

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
        tooltipsEnabled={tooltipsEnabled}
        triggerClassName={cn(
          'absolute top-1/2 h-5 max-h-[calc(100%-8px)] -translate-y-1/2 rounded-md',
          segment.bar,
          segment.lateRing,
        )}
        triggerStyle={{ left, width: barWidth }}
      >
        <div
          className={cn('pointer-events-none h-full rounded-l-[5px]', segment.fill)}
          style={{ width: `${pct}%` }}
          aria-hidden
        />
      </PortfolioGanttProjectTooltip>
      {rightMeta}
    </div>
  );
}

export function PortfolioGanttChart({
  items,
  timeZoom,
  onTimeZoomChange,
  tooltipsEnabled = true,
  inlineInfosEnabled = true,
}: {
  items: PortfolioGanttRow[];
  timeZoom: number;
  onTimeZoomChange: React.Dispatch<React.SetStateAction<number>>;
  /** Si false, pas d’infobulle sur les lignes et barres (liens liste restent cliquables). */
  tooltipsEnabled?: boolean;
  /** Si false, masque les infos textuelles affichées à droite des barres. */
  inlineInfosEnabled?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const panStateRef = useRef<{
    startX: number;
    startY: number;
    startScrollLeft: number;
    startScrollTop: number;
  } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
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
    const pxBase = Math.max(2, viewportW / Math.max(span, 21));
    const px = pxBase * timeZoom;
    const lay = dateRangeToTimelineLayout(b, px);
    return { bounds: b, pxPerDay: px, layout: lay };
  }, [items, viewportW, timeZoom]);

  const bodyHeightPx = useMemo(
    () => portfolioGanttBodyHeightPx(layoutRows),
    [layoutRows],
  );

  /** Zoom : molette + Ctrl/Cmd sur la zone frise (scroll horizontal inchangé sans modificateur). */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const delta = e.deltaY;
      onTimeZoomChange((z) => {
        const next = delta > 0 ? z / PORTFOLIO_GANTT_TIME_ZOOM_STEP : z * PORTFOLIO_GANTT_TIME_ZOOM_STEP;
        return clampPortfolioTimeZoom(next);
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [bounds, layout, onTimeZoomChange]);

  /** Pan souris (grab) sur la zone frise sans casser les éléments interactifs. */
  useEffect(() => {
    if (!isPanning) return;
    const onMouseMove = (e: MouseEvent) => {
      const el = scrollRef.current;
      const pan = panStateRef.current;
      if (!el || !pan) return;
      const dx = e.clientX - pan.startX;
      const dy = e.clientY - pan.startY;
      el.scrollLeft = pan.startScrollLeft - dx;
      el.scrollTop = pan.startScrollTop - dy;
      e.preventDefault();
    };
    const stopPanning = () => {
      panStateRef.current = null;
      setIsPanning(false);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', stopPanning);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', stopPanning);
    };
  }, [isPanning]);

  const handleTimelineMouseDown = useCallback((e: ReactMouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('a, button, [role="button"], input, textarea, select, label')) return;
    const el = scrollRef.current;
    if (!el) return;
    panStateRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startScrollLeft: el.scrollLeft,
      startScrollTop: el.scrollTop,
    };
    setIsPanning(true);
    e.preventDefault();
  }, []);

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
            'flex min-w-0 flex-col overflow-hidden rounded-lg border',
            portfolioGantt.outer,
          )}
        >
      <div className="flex min-h-[min(70vh,720px)] min-h-0 min-w-0 flex-1 flex-row">
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
                    tooltipsEnabled={tooltipsEnabled}
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
          onMouseDown={handleTimelineMouseDown}
          className={cn(
            'bg-muted/10 min-h-0 min-w-0 flex-1 overflow-auto dark:bg-muted/5',
            isPanning ? 'cursor-grabbing select-none' : 'cursor-grab',
          )}
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
                    renderProjectTimelineRow(
                      lr.row,
                      bounds,
                      pxPerDay,
                      widthPx,
                      tooltipsEnabled,
                      inlineInfosEnabled,
                    )
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
