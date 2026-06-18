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
                'starium-page-header__back shrink-0',
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
        <div className="starium-page-header__intro min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
            {status ? <div className="shrink-0">{status}</div> : null}
          </div>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="starium-page-header__actions">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}
