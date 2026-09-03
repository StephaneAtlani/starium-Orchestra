'use client';

import { useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  HomeDashboardChartOverlay,
  type HomeChartOverlayState,
} from './home-dashboard-chart-overlay';

type Props = {
  values: number[];
  className?: string;
  stroke?: string;
  fill?: string;
  label: string;
  /** Libellés métier par point (overlay). */
  labels?: string[];
  formatValue?: (n: number) => string;
};

/**
 * Mini sparkline dynamique + overlay hover.
 * Voir `.cursor/rules/charts-dynamic-only.mdc`.
 */
export function HomeDashboardSparkline({
  values,
  className,
  stroke = 'var(--brand-gold)',
  fill = 'color-mix(in srgb, var(--brand-gold) 18%, transparent)',
  label,
  labels,
  formatValue = (n) => String(n),
}: Props) {
  const w = 120;
  const h = 22;
  const pad = 2;
  const [overlay, setOverlay] = useState<HomeChartOverlayState>(null);

  const onLeave = useCallback(() => setOverlay(null), []);

  if (values.length < 2) {
    return null;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = (w - pad * 2) / (values.length - 1);
  const pts = values.map((v, i) => {
    const x = pad + i * step;
    const y = pad + ((max - v) / span) * (h - pad * 2);
    return { x, y, v, i };
  });
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const area = `${line} L ${pts[pts.length - 1]!.x} ${h - pad} L ${pts[0]!.x} ${h - pad} Z`;

  return (
    <div className="relative" onMouseLeave={onLeave}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className={cn('h-5 w-full', className)}
        role="img"
        aria-label={label}
      >
        <path d={area} fill={fill} />
        <path
          d={line}
          fill="none"
          stroke={stroke}
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {pts.map((p) => (
          <circle
            key={p.i}
            cx={p.x}
            cy={p.y}
            r={6}
            fill="transparent"
            className="cursor-crosshair"
            onMouseMove={(e) => {
              setOverlay({
                clientX: e.clientX,
                clientY: e.clientY,
                title: labels?.[p.i] ?? `Point ${p.i + 1}`,
                lines: [{ label: 'Valeur', value: formatValue(p.v), color: stroke }],
              });
            }}
          />
        ))}
      </svg>
      <HomeDashboardChartOverlay overlay={overlay} />
    </div>
  );
}
