import React from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  /** Fil d'Ariane métier (ex. Pilotage › Projets) */
  eyebrow?: React.ReactNode;
  /** Affiche un bouton retour à gauche du fil */
  backHref?: string;
  /** Badge ou statut à côté du titre */
  status?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  backHref,
  status,
  className,
}: PageHeaderProps) {
  const showTopRow = Boolean(eyebrow || backHref);

  return (
    <header className={cn('starium-page-header', className)}>
      {showTopRow ? (
        <div className="starium-page-header__top flex items-center gap-2">
          {backHref ? (
            <Link
              href={backHref}
              className={cn(
                buttonVariants({ variant: 'outline', size: 'icon' }),
                'starium-page-header__back size-9 shrink-0',
              )}
              aria-label="Retour"
            >
              <ChevronLeft className="size-5" aria-hidden />
            </Link>
          ) : null}
          {eyebrow ? (
            <div className="starium-page-header__eyebrow min-w-0 truncate">{eyebrow}</div>
          ) : null}
        </div>
      ) : null}

      <div className="starium-page-header__body">
        <div className="starium-page-header__main flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="starium-page-header__intro min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                {title}
              </h1>
              {status ? <div className="shrink-0">{status}</div> : null}
            </div>
            {description ? (
              <p className="starium-page-header__description mt-1 text-sm leading-snug text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? (
            <div className="starium-page-header__actions">{actions}</div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
