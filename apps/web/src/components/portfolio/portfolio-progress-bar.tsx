'use client';

import { cn } from '@/lib/utils';
import {
  consumptionTone,
  toneAmountClass,
  toneProgressFillClass,
  type StatusTone,
} from './status-tone';

export type PortfolioProgressBarProps = {
  /** Progression 0–100. */
  value: number;
  tone?: StatusTone;
  /** Dérive le tone : &lt;80 info, 80–99 warn, ≥100 danger. */
  variant?: 'default' | 'consumption';
  showPercent?: boolean;
  className?: string;
  trackClassName?: string;
  label?: string;
};

export function PortfolioProgressBar({
  value,
  tone: toneProp,
  variant = 'default',
  showPercent = false,
  className,
  trackClassName,
  label,
}: PortfolioProgressBarProps) {
  const displayPercent = Number.isFinite(value) ? Math.round(value) : 0;
  const widthPercent = Math.min(100, Math.max(0, displayPercent));
  const tone: StatusTone =
    variant === 'consumption'
      ? consumptionTone(widthPercent / 100)
      : (toneProp ?? 'muted');

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className={cn('starium-progress-track min-w-0 flex-1', trackClassName)}
        role="progressbar"
        aria-valuenow={displayPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? `Progression ${displayPercent} %`}
      >
        <div
          className={toneProgressFillClass(tone)}
          style={{ width: `${widthPercent}%` }}
        />
      </div>
      {showPercent ? (
        <span
          className={cn('shrink-0 text-xs font-bold tabular-nums', toneAmountClass(tone))}
        >
          {displayPercent} %
        </span>
      ) : null}
    </div>
  );
}

/** Convertit un ratio 0–1 en percent 0–100. */
export function rateToPercent(rate: number | null | undefined): number {
  if (rate == null || !Number.isFinite(rate)) return 0;
  return Math.round(rate * 100);
}
