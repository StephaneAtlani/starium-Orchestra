'use client';

import { useCallback, useId, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  HomeDashboardChartOverlay,
  type HomeChartOverlayState,
} from './home-dashboard-chart-overlay';

export type HomeBudgetChartPoint = {
  label: string;
  realized: number;
  target: number;
  monthKey: string;
};

type Props = {
  points: HomeBudgetChartPoint[];
  formatY: (n: number) => string;
  className?: string;
  todayIndex?: number | null;
};

/**
 * Courbe Réalisé vs Budget cible + overlay hover par mois.
 */
export function HomeDashboardBudgetChart({
  points,
  formatY,
  className,
  todayIndex = null,
}: Props) {
  const gradId = useId();
  const w = 560;
  const h = 220;
  const padL = 48;
  const padR = 16;
  const padT = 20;
  const padB = 28;
  const iw = w - padL - padR;
  const ih = h - padT - padB;
  const [overlay, setOverlay] = useState<HomeChartOverlayState>(null);

  const onLeave = useCallback(() => setOverlay(null), []);

  const { maxY, pathRealized, pathTarget, areaRealized, xs, ysR, ysT } = useMemo(() => {
    const maxYLocal = Math.max(
      1,
      ...points.flatMap((p) => [p.realized, p.target]),
    );
    const n = points.length;
    const step = n <= 1 ? iw / 2 : iw / (n - 1);
    const xsLocal = points.map((_, i) => padL + i * step);
    const ysRLocal = points.map((p) => padT + ih - (p.realized / maxYLocal) * ih);
    const ysTLocal = points.map((p) => padT + ih - (p.target / maxYLocal) * ih);
    const line = (xsArr: number[], ysArr: number[]) =>
      xsArr.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x} ${ysArr[i]}`).join(' ');
    const pathR = line(xsLocal, ysRLocal);
    const pathT = line(xsLocal, ysTLocal);
    const area =
      n > 0
        ? `${pathR} L ${xsLocal[n - 1]} ${padT + ih} L ${xsLocal[0]} ${padT + ih} Z`
        : '';
    return {
      maxY: maxYLocal,
      pathRealized: pathR,
      pathTarget: pathT,
      areaRealized: area,
      xs: xsLocal,
      ysR: ysRLocal,
      ysT: ysTLocal,
    };
  }, [points, iw, ih]);

  if (points.length === 0) {
    return (
      <p className="starium-text-muted py-10 text-center text-sm">
        Aucune série budgétaire à afficher.
      </p>
    );
  }

  const todayX =
    todayIndex != null && todayIndex >= 0 && todayIndex < points.length
      ? xs[todayIndex]!
      : null;
  const todayLabelW = 72;
  const todayLabelLeft =
    todayX == null
      ? 0
      : Math.min(w - padR - todayLabelW, Math.max(padL, todayX - todayLabelW / 2));

  return (
    <div className="relative" onMouseLeave={onLeave}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className={cn('h-auto w-full', className)}
        role="img"
        aria-label="Consommation budgétaire : réalisé versus budget cible"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand-gold)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--brand-gold)" stopOpacity={0.02} />
          </linearGradient>
        </defs>

        {[0, 0.5, 1].map((t) => {
          const y = padT + ih * (1 - t);
          return (
            <g key={t}>
              <line
                x1={padL}
                y1={y}
                x2={w - padR}
                y2={y}
                stroke="var(--neutral-200)"
                strokeDasharray="4 4"
              />
              <text x={4} y={y + 3} className="fill-muted-foreground text-[9px]">
                {formatY(maxY * t)}
              </text>
            </g>
          );
        })}

        <path d={areaRealized} fill={`url(#${gradId})`} />
        <path
          d={pathTarget}
          fill="none"
          stroke="var(--neutral-900)"
          strokeOpacity={0.35}
          strokeWidth={1.75}
          strokeDasharray="6 5"
          strokeLinejoin="round"
        />
        <path
          d={pathRealized}
          fill="none"
          stroke="var(--brand-gold)"
          strokeWidth={2.4}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {todayX != null && todayIndex != null ? (
          <g>
            <line
              x1={todayX}
              y1={padT}
              x2={todayX}
              y2={padT + ih}
              stroke="var(--brand-gold)"
              strokeWidth={1.25}
              strokeDasharray="3 3"
            />
            <rect
              x={todayLabelLeft}
              y={padT - 2}
              width={todayLabelW}
              height={16}
              rx={8}
              fill="var(--brand-gold)"
            />
            <text
              x={todayLabelLeft + todayLabelW / 2}
              y={padT + 10}
              textAnchor="middle"
              className="fill-white text-[8px] font-semibold"
            >
              Aujourd&apos;hui
            </text>
            <circle
              cx={todayX}
              cy={ysR[todayIndex]}
              r={4}
              fill="var(--brand-gold)"
              stroke="var(--card)"
              strokeWidth={2}
            />
          </g>
        ) : null}

        {points.map((p, i) => (
          <g key={p.monthKey}>
            <text
              x={xs[i]}
              y={h - 6}
              textAnchor="middle"
              className="fill-muted-foreground text-[9px]"
            >
              {p.label}
            </text>
            <circle cx={xs[i]} cy={ysR[i]} r={3.5} fill="var(--brand-gold)" />
            <circle
              cx={xs[i]}
              cy={ysT[i]}
              r={3}
              fill="var(--card)"
              stroke="var(--neutral-900)"
              strokeOpacity={0.45}
              strokeWidth={1.25}
            />
            <rect
              x={(xs[i] ?? 0) - (i === 0 ? 0 : iw / (points.length * 2))}
              y={padT}
              width={Math.max(12, iw / points.length)}
              height={ih}
              fill="transparent"
              className="cursor-crosshair"
              onMouseMove={(e) => {
                setOverlay({
                  clientX: e.clientX,
                  clientY: e.clientY,
                  title: p.label,
                  lines: [
                    {
                      label: 'Réalisé',
                      value: formatY(p.realized),
                      color: 'var(--brand-gold)',
                    },
                    {
                      label: 'Budget cible',
                      value: formatY(p.target),
                      color: 'var(--neutral-900)',
                    },
                  ],
                });
              }}
            />
          </g>
        ))}
      </svg>
      <HomeDashboardChartOverlay overlay={overlay} />
    </div>
  );
}
