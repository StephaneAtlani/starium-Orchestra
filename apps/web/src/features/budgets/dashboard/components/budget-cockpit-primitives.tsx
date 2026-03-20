'use client';

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Surface carte cockpit — alignée KPI / tables / analytics */
export const cockpitCardClass =
  'rounded-2xl border border-border bg-card text-card-foreground shadow-sm ring-1 ring-border/50';

export function CockpitSection({
  title,
  description,
  id,
  children,
  className,
  action,
}: {
  title: string;
  description?: React.ReactNode;
  id?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <section
      className={cn('space-y-4', className)}
      aria-labelledby={id}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h2
            id={id}
            className="text-lg font-semibold tracking-tight text-foreground"
          >
            {title}
          </h2>
          {description ? (
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

const iconSurface: Record<
  'default' | 'primary' | 'amber' | 'emerald' | 'sky' | 'violet' | 'rose',
  string
> = {
  default: 'border-border bg-muted/80 text-muted-foreground',
  primary: 'border-primary/25 bg-primary/10 text-primary',
  amber: 'border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-200',
  emerald: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
  sky: 'border-sky-500/25 bg-sky-500/10 text-sky-800 dark:text-sky-300',
  violet: 'border-violet-500/25 bg-violet-500/10 text-violet-800 dark:text-violet-300',
  rose: 'border-rose-500/25 bg-rose-500/10 text-rose-800 dark:text-rose-300',
};

export type CockpitSurfaceAccent = keyof typeof iconSurface;

/**
 * Carte avec bandeau titre + corps (tables : `contentPad={false}` + padding manuel sur Table).
 */
export function CockpitSurfaceCard({
  title,
  description,
  icon: Icon,
  accent = 'default',
  children,
  footer,
  className,
  bodyClassName,
  headerClassName,
  contentPad = true,
  ...rest
}: {
  title: string;
  description?: React.ReactNode;
  icon?: LucideIcon;
  accent?: CockpitSurfaceAccent;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  headerClassName?: string;
  contentPad?: boolean;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-border bg-card shadow-sm ring-1 ring-border/40 transition-shadow hover:shadow-md',
        className,
      )}
      {...rest}
    >
      <div
        className={cn(
          'flex gap-3 border-b border-border/80 bg-muted/25 px-5 py-4',
          headerClassName,
        )}
      >
        {Icon ? (
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border',
              iconSurface[accent],
            )}
            aria-hidden
          >
            <Icon className="h-5 w-5" strokeWidth={1.75} />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold tracking-tight text-foreground">
            {title}
          </h3>
          {description ? (
            <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      <div className={cn(contentPad && 'p-5', bodyClassName)}>{children}</div>
      {footer ? (
        <div className="border-t border-border/70 bg-muted/15 px-5 py-3 text-xs leading-relaxed text-muted-foreground">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
