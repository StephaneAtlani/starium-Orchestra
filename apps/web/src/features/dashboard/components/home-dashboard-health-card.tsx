'use client';

import { useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  HomeDashboardChartOverlay,
  type HomeChartOverlayState,
} from './home-dashboard-chart-overlay';

type Props = {
  green: number;
  orange: number;
  red: number;
  loading?: boolean;
};

const FILL = {
  green: 'var(--state-success)',
  orange: 'var(--state-warning)',
  red: 'var(--state-danger)',
} as const;

function portfolioStability(
  green: number,
  orange: number,
  red: number,
): { label: string; className: string } {
  const total = green + orange + red;
  if (total === 0) {
    return { label: 'Sans données', className: 'text-muted-foreground' };
  }
  const redShare = red / total;
  if (redShare >= 0.25) {
    return {
      label: 'Sous tension',
      className: 'text-[color:var(--state-danger)]',
    };
  }
  if (orange / total >= 0.35 || redShare > 0) {
    return {
      label: 'À surveiller',
      className: 'text-[color:var(--state-warning)]',
    };
  }
  return {
    label: 'Stable',
    className: 'text-[color:var(--state-success)]',
  };
}

function donutSlicePath(
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  a0: number,
  a1: number,
): string {
  const polar = (r: number, a: number) => {
    const rad = ((a - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };
  const large = a1 - a0 > 180 ? 1 : 0;
  const p0o = polar(rOuter, a0);
  const p1o = polar(rOuter, a1);
  const p1i = polar(rInner, a1);
  const p0i = polar(rInner, a0);
  return `M ${p0o.x} ${p0o.y} A ${rOuter} ${rOuter} 0 ${large} 1 ${p1o.x} ${p1o.y} L ${p1i.x} ${p1i.y} A ${rInner} ${rInner} 0 ${large} 0 ${p0i.x} ${p0i.y} Z`;
}

export function HomeDashboardHealthCard({
  green,
  orange,
  red,
  loading,
}: Props) {
  const total = green + orange + red;
  const healthyPct = total > 0 ? Math.round((green / total) * 100) : 0;
  const stability = portfolioStability(green, orange, red);
  const [overlay, setOverlay] = useState<HomeChartOverlayState>(null);
  const onLeave = useCallback(() => setOverlay(null), []);

  const slices = [
    { name: 'En bonne trajectoire', value: green, fill: FILL.green },
    { name: 'À surveiller', value: orange, fill: FILL.orange },
    { name: 'En difficulté', value: red, fill: FILL.red },
  ].filter((s) => s.value > 0);

  let angle = 0;
  const vb = 200;
  const cx = 100;
  const cy = 100;
  const rOuter = 78;
  const rInner = 52;

  return (
    <section
      className="starium-section flex h-full flex-col gap-3"
      aria-labelledby="home-health-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="home-health-heading" className="starium-section-title text-base">
          Santé du portefeuille
        </h2>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 text-xs font-semibold',
            stability.className,
          )}
        >
          <span className="size-1.5 rounded-full bg-current" aria-hidden />
          {loading ? '…' : stability.label}
        </span>
      </div>

      <div
        className="relative mx-auto w-full max-w-[9.5rem]"
        onMouseLeave={onLeave}
      >
        {loading || total === 0 ? (
          <div
            className="aspect-square rounded-full border border-border/70 bg-muted/30"
            aria-hidden
          />
        ) : (
          <>
            <svg
              viewBox={`0 0 ${vb} ${vb}`}
              className="h-auto w-full"
              role="img"
              aria-label={`Santé du portefeuille : ${healthyPct} % sains`}
            >
              {slices.map((sl) => {
                const sweep = (sl.value / total) * 360;
                const a0 = angle;
                const a1 = angle + sweep;
                angle = a1;
                const pct = Math.round((sl.value / total) * 100);
                return (
                  <path
                    key={sl.name}
                    d={donutSlicePath(cx, cy, rInner, rOuter, a0, a1)}
                    fill={sl.fill}
                    stroke="var(--card)"
                    strokeWidth={2}
                    className="cursor-pointer transition-opacity hover:opacity-90"
                    onMouseMove={(e) => {
                      setOverlay({
                        clientX: e.clientX,
                        clientY: e.clientY,
                        title: sl.name,
                        lines: [
                          {
                            label: 'Projets',
                            value: String(sl.value),
                            color: sl.fill,
                          },
                          {
                            label: 'Part',
                            value: `${pct} %`,
                            color: sl.fill,
                          },
                        ],
                      });
                    }}
                  />
                );
              })}
            </svg>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-xl font-bold tabular-nums tracking-tight text-foreground">
                {healthyPct} %
              </p>
              <p className="text-[0.6875rem] text-muted-foreground">sains</p>
            </div>
            <HomeDashboardChartOverlay overlay={overlay} />
          </>
        )}
      </div>

      <ul className="mt-auto space-y-2">
        {(
          [
            { label: 'En bonne trajectoire', count: green, color: FILL.green },
            { label: 'À surveiller', count: orange, color: FILL.orange },
            { label: 'En difficulté', count: red, color: FILL.red },
          ] as const
        ).map((row) => (
          <li
            key={row.label}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: row.color }}
                aria-hidden
              />
              <span className="truncate text-muted-foreground">{row.label}</span>
            </span>
            <span className="font-semibold tabular-nums text-foreground">
              {loading ? '—' : row.count}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
