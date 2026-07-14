'use client';

import { cn } from '@/lib/utils';

type PillTone = 'success' | 'warning' | 'danger' | 'info' | 'muted' | 'violet' | 'brand';

const TONE_CLASS: Record<PillTone, { wrap: string; dot: string; text: string }> = {
  brand: {
    wrap: 'bg-[color:var(--brand-gold)]/12',
    dot: 'bg-[color:var(--brand-gold)]',
    text: 'text-[color:var(--brand-gold)]',
  },
  success: {
    wrap: 'bg-emerald-500/12',
    dot: 'bg-emerald-600',
    text: 'text-emerald-800 dark:text-emerald-400',
  },
  warning: {
    wrap: 'bg-amber-500/12',
    dot: 'bg-amber-600',
    text: 'text-amber-800 dark:text-amber-400',
  },
  danger: {
    wrap: 'bg-red-500/10',
    dot: 'bg-red-700',
    text: 'text-red-800 dark:text-red-400',
  },
  info: {
    wrap: 'bg-sky-500/12',
    dot: 'bg-sky-500',
    text: 'text-sky-800 dark:text-sky-400',
  },
  violet: {
    wrap: 'bg-violet-500/12',
    dot: 'bg-violet-600',
    text: 'text-violet-800 dark:text-violet-400',
  },
  muted: {
    wrap: 'bg-muted/50',
    dot: 'bg-muted-foreground/50',
    text: 'text-muted-foreground',
  },
};

export function GovernanceCyclesCockpitPill({
  label,
  tone = 'muted',
}: {
  label: string;
  tone?: PillTone;
}) {
  const c = TONE_CLASS[tone];
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        c.wrap,
        c.text,
      )}
    >
      <span className={cn('size-2 shrink-0 rounded-full', c.dot)} aria-hidden />
      <span className="truncate">{label}</span>
    </span>
  );
}
