'use client';

import Link from 'next/link';
import { ChevronLeft, FileText, Monitor, Settings2 } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
      <TooltipProvider delay={200}>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
          <Tooltip>
            <TooltipTrigger
              render={
                <Link
                  href={projectsList()}
                  aria-label="Retour au portefeuille"
                  className={cn(buttonVariants({ variant: 'outline', size: 'icon-sm' }))}
                />
              }
            >
              <ChevronLeft className="size-3.5" aria-hidden />
            </TooltipTrigger>
            <TooltipContent side="bottom">Portefeuille</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="Configurer la présentation"
                  onClick={onConfigure}
                />
              }
            >
              <Settings2 className="size-3.5" aria-hidden />
            </TooltipTrigger>
            <TooltipContent side="bottom">Configurer</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  size="icon-sm"
                  aria-label="Lancer le mode présentation"
                  onClick={onOpenPresentationLaunch}
                />
              }
            >
              <Monitor className="size-3.5" aria-hidden />
            </TooltipTrigger>
            <TooltipContent side="bottom">Mode présentation</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger render={<span className="inline-flex" />}>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                disabled
                aria-label="Exporter le PDF — bientôt disponible"
              >
                <FileText className="size-3.5" aria-hidden />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Exporter le PDF — bientôt disponible</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </header>
  );
}
