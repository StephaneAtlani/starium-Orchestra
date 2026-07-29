'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { toneAccentClass, toneIconClass, type StatusTone } from './status-tone';

export type PortfolioEntityCardProps = {
  tone?: StatusTone;
  icon?: ReactNode;
  title: ReactNode;
  badges?: ReactNode;
  subtitle?: ReactNode;
  metric?: ReactNode;
  progress?: ReactNode;
  footer?: ReactNode;
  href?: string;
  ariaLabel?: string;
  className?: string;
  actions?: ReactNode;
  /** Enveloppe externe — `li` pour listes. */
  as?: 'article' | 'li';
  children?: ReactNode;
  onClick?: () => void;
  /** Padding compact (listes mobiles projets). */
  density?: 'default' | 'compact';
};

export function PortfolioEntityCard({
  tone = 'muted',
  icon,
  title,
  badges,
  subtitle,
  metric,
  progress,
  footer,
  href,
  ariaLabel,
  className,
  actions,
  as = 'article',
  children,
  onClick,
  density = 'default',
}: PortfolioEntityCardProps) {
  const shellClass = cn(
    'starium-portfolio-card starium-project-mobile-card relative overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-[var(--ds-card-shadow)]',
    'transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-2)]',
    href &&
      'block min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-gold)]',
    className,
  );

  const padClass = density === 'compact' ? 'p-3 pl-4' : 'p-4 pl-4 sm:p-5 sm:pl-5';

  const body = (
    <>
      <div className={toneAccentClass(tone)} aria-hidden />
      <div className={cn('relative', padClass)}>
        {actions ? (
          <div className="absolute right-2 top-2 z-10 sm:right-3 sm:top-3">{actions}</div>
        ) : null}
        <div className="flex items-start gap-2.5 sm:gap-3">
          {icon ? (
            <div
              className={cn(
                'flex size-11 shrink-0 items-center justify-center rounded-xl',
                toneIconClass(tone),
              )}
              aria-hidden
            >
              {icon}
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <div
              className={cn(
                'text-base font-semibold leading-tight text-foreground',
                density === 'compact' && 'starium-proj-name',
              )}
            >
              {title}
            </div>
            {badges ? (
              <div className="mt-1 flex flex-wrap items-center gap-1">{badges}</div>
            ) : null}
            {subtitle ? (
              <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div>
            ) : null}
            {progress ? <div className="mt-1.5">{progress}</div> : null}
          </div>
        </div>
        {metric ? <div className={density === 'compact' ? 'mt-0' : 'mt-4 sm:mt-5'}>{metric}</div> : null}
        {children}
        {footer ? <div className={density === 'compact' ? 'mt-2.5' : 'mt-3 sm:mt-4'}>{footer}</div> : null}
      </div>
    </>
  );

  const card = href ? (
    <Link href={href} className={shellClass} aria-label={ariaLabel} onClick={onClick}>
      {body}
    </Link>
  ) : (
    <article className={shellClass} onClick={onClick}>
      {body}
    </article>
  );

  if (as === 'li') {
    return <li>{card}</li>;
  }
  return card;
}
