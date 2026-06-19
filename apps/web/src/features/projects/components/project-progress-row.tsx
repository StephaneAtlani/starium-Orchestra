'use client';

import type { ComputedHealth } from '../types/project.types';
import { cn } from '@/lib/utils';

function progressFillTone(
  percent: number | null,
  health: ComputedHealth,
  variant: 'manual' | 'derived',
): 'ok' | 'warn' | 'danger' | 'muted' {
  if (percent == null) return 'muted';
  if (variant === 'derived') return percent >= 100 ? 'ok' : 'muted';
  if (percent >= 100) return 'ok';
  if (health === 'RED') return 'danger';
  if (health === 'ORANGE') return 'warn';
  return 'ok';
}

export function ProjectProgressRow({
  percent,
  health,
  variant,
}: {
  percent: number | null;
  health: ComputedHealth;
  variant: 'manual' | 'derived';
}) {
  if (percent == null) {
    return <span className="text-sm text-muted-foreground/50">—</span>;
  }
  const tone = progressFillTone(percent, health, variant);
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <div className="flex items-center gap-1.5">
      <div className="starium-progress-track min-w-0 flex-1">
        <div
          className={cn('starium-progress-fill', `starium-progress-fill--${tone}`)}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span
        className={cn(
          'shrink-0 text-[11.5px] font-semibold tabular-nums',
          variant === 'derived' && 'font-normal text-muted-foreground',
          variant === 'manual' && tone === 'ok' && 'text-[color:var(--state-success)]',
          variant === 'manual' && tone === 'warn' && 'text-[color:var(--state-warning)]',
          variant === 'manual' && tone === 'danger' && 'text-destructive',
        )}
      >
        {percent} %
      </span>
    </div>
  );
}
