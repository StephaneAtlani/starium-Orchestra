'use client';

import Link from 'next/link';
import { ChevronLeft, FileDown, Monitor, Settings2 } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { projectsList } from '../../constants/project-routes';

type CodirHeroProps = {
  onOpenPresentationLaunch: () => void;
  onConfigure: () => void;
  className?: string;
};

export function CodirHero({ onOpenPresentationLaunch, onConfigure, className }: CodirHeroProps) {
  return (
    <header className={cn('starium-codir-hero', className)}>
      <div className="min-w-0 flex-1">
        <p className="starium-codir-eyebrow">
          <Monitor className="size-3 shrink-0" aria-hidden />
          Comité de direction
        </p>
        <h1 className="starium-codir-title">Présentation — Revue de portefeuille</h1>
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
        <Link
          href={projectsList()}
          className={cn(buttonVariants({ variant: 'outline', size: 'xs' }), 'gap-1')}
        >
          <ChevronLeft className="size-3" aria-hidden />
          Portefeuille
        </Link>
        <Button
          type="button"
          variant="outline"
          size="xs"
          className="gap-1"
          onClick={onConfigure}
        >
          <Settings2 className="size-3" aria-hidden />
          Configurer
        </Button>
        <Button
          type="button"
          size="xs"
          className="gap-1"
          onClick={onOpenPresentationLaunch}
        >
          <Monitor className="size-3" aria-hidden />
          Mode présentation
        </Button>
        <Button
          type="button"
          size="xs"
          variant="outline"
          disabled
          className="gap-1"
          title="Export PDF — bientôt disponible"
        >
          <FileDown className="size-3" aria-hidden />
          Exporter le PDF
        </Button>
      </div>
    </header>
  );
}
