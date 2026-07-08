'use client';

import {
  STRATEGIC_OVERVIEW_DONUT_STROKE,
  STRATEGIC_OVERVIEW_DONUT_TRACK,
} from '../lib/strategic-overview-theme';

const DONUT_RADIUS = 54;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;

export function StrategicAlignmentDonut({
  rate,
  label = 'alignement',
}: {
  rate: number;
  label?: string;
}) {
  const pct = Math.round(Math.max(0, Math.min(rate, 1)) * 100);
  const offset = DONUT_CIRCUMFERENCE * (1 - pct / 100);

  return (
    <div
      className="starium-bud-donut mx-0 shrink-0"
      role="img"
      aria-label={`${pct}% d'${label}`}
    >
      <svg width="130" height="130" viewBox="0 0 130 130" aria-hidden>
        <circle
          cx="65"
          cy="65"
          r={DONUT_RADIUS}
          fill="none"
          stroke={STRATEGIC_OVERVIEW_DONUT_TRACK}
          strokeWidth="16"
        />
        <circle
          cx="65"
          cy="65"
          r={DONUT_RADIUS}
          fill="none"
          stroke={STRATEGIC_OVERVIEW_DONUT_STROKE}
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={DONUT_CIRCUMFERENCE}
          strokeDashoffset={offset}
          className="chart-donut-slice"
        />
      </svg>
      <div className="starium-bud-donut-center">
        <div className="starium-bud-donut-pct text-[color:var(--teal)]">{pct}%</div>
      </div>
    </div>
  );
}
