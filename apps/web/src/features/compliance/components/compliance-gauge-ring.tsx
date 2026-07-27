'use client';

import { cn } from '@/lib/utils';

const SIZE = 72;
const STROKE = 9;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Bandes de lisibilité du taux de conformité (mêmes seuils que les badges). */
export type ComplianceTone = 'success' | 'progress' | 'risk' | 'unknown';

export function complianceTone(percent: number | null): ComplianceTone {
  if (percent == null) return 'unknown';
  if (percent >= 80) return 'success';
  if (percent >= 50) return 'progress';
  return 'risk';
}

const TONE_STROKE: Record<ComplianceTone, string> = {
  success: 'var(--state-success)',
  progress: 'var(--brand-gold)',
  risk: 'var(--state-danger)',
  unknown: 'var(--neutral-300)',
};

const TONE_TEXT: Record<ComplianceTone, string> = {
  success: 'text-[color:var(--state-success)]',
  progress: 'text-[color:var(--brand-gold-700)]',
  risk: 'text-destructive',
  unknown: 'text-muted-foreground',
};

/**
 * Jauge circulaire d'avancement. Le pourcentage est écrit au centre : la couleur
 * ne porte jamais seule l'information (RGAA).
 */
export function ComplianceGaugeRing({
  percent,
  label,
  className,
}: {
  percent: number | null;
  /** Libellé accessible décrivant ce que mesure la jauge. */
  label: string;
  className?: string;
}) {
  const tone = complianceTone(percent);
  const clamped = percent == null ? 0 : Math.min(100, Math.max(0, percent));
  const offset = CIRCUMFERENCE * (1 - clamped / 100);

  return (
    <div className={cn('relative shrink-0', className)} style={{ width: SIZE, height: SIZE }}>
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={
          percent == null ? `${label} : non évalué` : `${label} : ${percent} %`
        }
      >
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--neutral-200)"
          strokeWidth={STROKE}
        />
        {percent != null && (
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={TONE_STROKE[tone]}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        )}
      </svg>
      <span
        aria-hidden
        className={cn(
          'absolute inset-0 flex items-center justify-center text-sm font-bold tabular-nums',
          TONE_TEXT[tone],
        )}
      >
        {percent == null ? '—' : `${percent}%`}
      </span>
    </div>
  );
}
