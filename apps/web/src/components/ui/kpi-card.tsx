import React from 'react';
import { cn } from '@/lib/utils';

export type KpiCardFooterTone =
  | 'muted'
  | 'brand'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'violet';

const FOOTER_TONE_CLASS: Record<KpiCardFooterTone, string> = {
  muted: 'text-muted-foreground',
  brand: 'text-[color:var(--starium-primary)]',
  success: 'text-emerald-700 dark:text-emerald-400',
  warning: 'text-amber-800 dark:text-amber-400',
  danger: 'text-destructive',
  info: 'text-sky-700 dark:text-sky-400',
  violet: 'text-violet-700 dark:text-violet-400',
};

export interface KpiCardProps {
  title: string;
  value: string;
  /** Période ou précision (ex. "Ce mois", "30 jours") — affiché en muted. */
  subtitle?: string;
  /** @deprecated Préférer `footer` + `footerTone`. */
  trend?: string;
  /** Ligne sous la valeur (ex. « 50 % du portefeuille »). */
  footer?: string;
  footerTone?: KpiCardFooterTone;
  icon?: React.ReactNode;
  /** Remplace le wrapper icône par défaut (pastille colorée, etc.). */
  iconWrapperClassName?: string;
  /** `circle` — pastille ronde mockup portefeuille ; `rounded` — carré arrondi legacy. */
  iconShape?: 'circle' | 'rounded';
  /**
   * `dense` — grilles cockpit multi-KPI (portefeuille projets, tableaux de bord compacts).
   * `default` — carte hero (dashboard, détail budget).
   */
  variant?: 'default' | 'dense';
}

export function KpiCard({
  title,
  value,
  subtitle,
  trend,
  footer,
  footerTone = 'muted',
  icon,
  iconWrapperClassName,
  iconShape = 'rounded',
  variant = 'default',
}: KpiCardProps) {
  const dense = variant === 'dense';
  const resolvedFooter = footer ?? trend;
  const resolvedFooterTone: KpiCardFooterTone =
    footer != null ? footerTone : trend != null ? 'success' : 'muted';

  return (
    <div
      className={cn(
        'starium-kpi-card transition-shadow hover:shadow-[var(--ds-card-shadow-hover)]',
        dense && '!p-4',
      )}
    >
      <div className={cn('flex items-center', dense ? 'gap-3.5' : 'gap-[18px]')}>
        {icon && (
          <div
            className={cn(
              'flex shrink-0 items-center justify-center',
              iconShape === 'circle' ? 'size-10 rounded-full' : 'rounded-lg',
              iconWrapperClassName ?? 'text-[color:var(--brand-gold)]',
              dense && (iconShape === 'circle' ? '[&_svg]:size-[1.125rem]' : '[&_svg]:size-5'),
              !dense &&
                !iconWrapperClassName &&
                (iconShape === 'circle'
                  ? '[&_svg]:size-5'
                  : '[&_svg]:size-[38px] [&_svg]:[stroke-width:1.5]'),
            )}
          >
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <span className="starium-kpi-label block leading-snug">{title}</span>
          <div
            className={cn(
              'starium-kpi-value text-foreground',
              dense && 'starium-kpi-value--dense',
              iconShape === 'circle' && 'starium-kpi-value--portfolio',
            )}
          >
            {value}
          </div>
          {subtitle ? (
            <div className="mt-0.5 text-xs text-muted-foreground">{subtitle}</div>
          ) : null}
          {resolvedFooter ? (
            <div
              className={cn(
                'starium-kpi-footer mt-1 text-xs font-medium leading-snug',
                FOOTER_TONE_CLASS[resolvedFooterTone],
              )}
            >
              {resolvedFooter}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
