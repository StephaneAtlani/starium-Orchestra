'use client';

import Link from 'next/link';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { PortfolioGanttRow } from '../types/project.types';
import { projectDetail } from '../constants/project-routes';
import {
  GANTT_DAY_MS,
  GANTT_MIN_TIMELINE_PX,
  GANTT_ROW_PX,
  computeTimelineBounds,
  dateMsToPx,
  dateRangeToTimelineLayout,
  type GanttTaskLike,
  type TimelineBounds,
} from '../lib/gantt-timeline-layout';
import { cn } from '@/lib/utils';

function rowToGanttLike(row: PortfolioGanttRow): GanttTaskLike | null {
  const end = row.targetEndDate;
  const start = row.startDate;
  if (!end && !start) return null;
  if (start && end) return { plannedStartDate: start, plannedEndDate: end };
  if (end && !start) return { plannedStartDate: end, plannedEndDate: end };
  if (start && !end) return { plannedStartDate: start, plannedEndDate: start };
  return null;
}

const healthBar: Record<PortfolioGanttRow['computedHealth'], string> = {
  GREEN: 'bg-primary/40 border-primary/55',
  ORANGE: 'bg-amber-500/35 border-amber-600/50',
  RED: 'bg-destructive/30 border-destructive/55',
};

export function PortfolioGanttChart({ items }: { items: PortfolioGanttRow[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [viewportW, setViewportW] = useState(960);

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
    <div className="border-border/60 flex min-h-[min(70vh,720px)] min-w-0 flex-col overflow-hidden rounded-lg border">
      <div className="flex min-h-0 min-w-0 flex-1 flex-row">
        <div
          className="border-border/60 bg-muted/10 shrink-0 overflow-y-auto border-r"
          style={{ width: 280, minWidth: 200 }}
        >
          <div style={{ height: 56 }} className="border-border/50 shrink-0 border-b px-2 py-2">
            <span className="text-muted-foreground text-xs font-medium">Projet</span>
          </div>
          {items.map((row) => (
            <div
              key={`sidebar:${row.id}`}
              className="border-border/40 flex items-center border-b px-2"
              style={{ height: GANTT_ROW_PX }}
            >
              <Link
                href={projectDetail(row.id)}
                className="hover:text-primary line-clamp-2 min-w-0 text-left text-xs leading-tight font-medium underline-offset-2 hover:underline"
                title={`${row.code} — ${row.name}`}
              >
                <span className="text-muted-foreground">{row.code}</span> · {row.name}
              </Link>
            </div>
          ))}
        </div>
        <div ref={scrollRef} className="bg-muted/5 min-h-0 min-w-0 flex-1 overflow-auto">
          <div style={{ width: widthPx, minWidth: '100%' }}>
            <div
              className="border-border/50 bg-muted/20 relative sticky top-0 z-10 border-b"
              style={{ height: 56, width: widthPx }}
            >
              {layout.monthBands.map((band, idx) => (
                <div
                  key={`m-${idx}-${band.label}`}
                  className="text-muted-foreground absolute border-border/40 border-l px-1 text-[10px] font-medium"
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
            <div className="relative" style={{ width: widthPx }}>
            {layout.todayPx != null && (
              <div
                className="bg-primary/30 pointer-events-none absolute top-0 z-[5] w-px"
                style={{
                  left: layout.todayPx,
                  height: items.length * GANTT_ROW_PX,
                }}
                aria-hidden
              />
            )}
              {items.map((row) => {
                const like = rowToGanttLike(row);
                const eligible =
                  like?.plannedStartDate &&
                  like?.plannedEndDate &&
                  bounds;
                if (!eligible || !like) {
                  return (
                    <div
                      key={`task:${row.id}`}
                      className="border-border/40 relative border-b"
                      style={{ height: GANTT_ROW_PX, width: widthPx }}
                    />
                  );
                }
                const start = like.plannedStartDate;
                const end = like.plannedEndDate;
                if (!start || !end) {
                  return (
                    <div
                      key={`task:${row.id}`}
                      className="border-border/40 relative border-b"
                      style={{ height: GANTT_ROW_PX, width: widthPx }}
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
                    className="border-border/40 relative border-b"
                    style={{ height: GANTT_ROW_PX, width: widthPx }}
                  >
                    <div
                      className={cn(
                        'absolute top-1/2 h-4 -translate-y-1/2 rounded-sm border',
                        healthBar[row.computedHealth],
                        row.isLate && 'ring-1 ring-destructive/80',
                      )}
                      style={{ left, width: w }}
                      title={`${row.name} — ${pct}% — ${row.status}`}
                    >
                      <div
                        className="bg-foreground/25 h-full rounded-l-sm"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            </div>
          </div>
        </div>
      </div>
  );
}
