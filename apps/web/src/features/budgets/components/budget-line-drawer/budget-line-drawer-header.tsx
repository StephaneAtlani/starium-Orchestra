'use client';

import React from 'react';
import {
  ArrowDownCircle,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Receipt,
  ShoppingCart,
  X,
} from 'lucide-react';
import type { BudgetLine } from '../../types/budget-management.types';
import type { BudgetLineDrilldownNavigation } from '../../lib/budget-envelope-navigation';
import { BudgetLineStatusBadge } from '../budget-line-status-badge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
export function BudgetLineDrawerHeader({
  line,
  budgetName,
  envelopeName,
  envelopeCode,
  envelopeType,
  hasRecentInvoice30d,
  onClose,
  onCreateOrder,
  onCreateInvoice,
  onCreateEngagement,
  onCreateConsumption,
  lineDrilldownNavigation,
}: {
  line: BudgetLine;
  budgetName?: string | null;
  envelopeName?: string | null;
  envelopeCode?: string | null;
  envelopeType?: string | null;
  hasRecentInvoice30d: boolean;
  onClose: () => void;
  onCreateOrder: () => void;
  onCreateInvoice: () => void;
  onCreateEngagement: () => void;
  onCreateConsumption: () => void;
  /** Ligne précédente / suivante dans l’ordre explorateur (drilldown inchangé). */
  lineDrilldownNavigation?: BudgetLineDrilldownNavigation | null;
}) {
  const isOverrun = line.consumedAmount > line.initialAmount;
  const isNegativeRemaining = line.remainingAmount < 0;
  const isUncoveredOrder = line.committedAmount > 0 && line.consumedAmount === 0;
  const envelopeCodeLabel = envelopeCode ?? '—';
  const envelopeTypeLabel = envelopeType ?? '—';

  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 bg-background/85 px-4 py-2.5 shadow-sm backdrop-blur-md supports-backdrop-filter:bg-background/70">
      <div className="min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          {line.code && (
            <span className="text-xs text-muted-foreground shrink-0">
              [{line.code}]
            </span>
          )}
          <h2 className="text-sm font-semibold leading-5 truncate">{line.name}</h2>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {isOverrun && (
            <Badge variant="destructive" className="h-4 px-1.5 text-[10px]">
              Dépassement
            </Badge>
          )}
          {isNegativeRemaining && (
            <Badge variant="destructive" className="h-4 px-1.5 text-[10px]">
              Reste négatif
            </Badge>
          )}
          {hasRecentInvoice30d && (
            <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
              Facture récente (30j)
            </Badge>
          )}
          {isUncoveredOrder && (
            <Badge variant="outline" className="h-4 px-1.5 text-[10px]">
              Commande non couverte
            </Badge>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
          <BudgetLineStatusBadge status={line.status} className="h-4 px-1.5 text-[10px] uppercase" />
          {envelopeName && (
            <>
              <span>·</span>
              <span className="truncate max-w-[240px]" title={envelopeName}>
                {envelopeName}
              </span>
            </>
          )}
          {envelopeName && (
            <>
              <span>·</span>
              <span className="shrink-0">{envelopeCodeLabel}</span>
              <span>·</span>
              <span className="shrink-0">{envelopeTypeLabel}</span>
            </>
          )}
          {budgetName && (
            <>
              <span>·</span>
              <span className="truncate max-w-[240px]" title={budgetName}>
                {budgetName}
              </span>
            </>
          )}
          <span>{line.expenseType}</span>
          <span>·</span>
          <span>{line.currency}</span>
        </div>
      </div>

      <TooltipProvider delay={280}>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <div
            className="flex flex-wrap items-center gap-0.5 rounded-xl border border-border/70 bg-muted/25 p-1 shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.05]"
            role="toolbar"
            aria-label="Actions ligne budgétaire"
          >
            {lineDrilldownNavigation ? (
              <>
                <span className="flex items-center gap-0.5 pr-1">
                  <Tooltip>
                    <TooltipTrigger render={<span className="inline-flex" />}>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        className="size-8 rounded-lg border border-transparent hover:border-border/60 hover:bg-background/80"
                        disabled={!lineDrilldownNavigation.hasPrev}
                        onClick={lineDrilldownNavigation.onPrevLine}
                        aria-label="Ligne précédente"
                      >
                        <ChevronLeft className="size-4" aria-hidden />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Ligne précédente</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger render={<span className="inline-flex" />}>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        className="size-8 rounded-lg border border-transparent hover:border-border/60 hover:bg-background/80"
                        disabled={!lineDrilldownNavigation.hasNext}
                        onClick={lineDrilldownNavigation.onNextLine}
                        aria-label="Ligne suivante"
                      >
                        <ChevronRight className="size-4" aria-hidden />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Ligne suivante</TooltipContent>
                  </Tooltip>
                </span>
                <span
                  className="hidden h-6 w-px shrink-0 bg-border/60 sm:block"
                  aria-hidden
                />
              </>
            ) : null}
            <span className="flex flex-wrap items-center gap-0.5">
              <Tooltip>
                <TooltipTrigger render={<span className="inline-flex" />}>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    className="size-8 rounded-lg border border-transparent hover:border-border/60 hover:bg-background/80"
                    onClick={onCreateOrder}
                    aria-label="Nouvelle commande"
                  >
                    <ShoppingCart className="size-4" aria-hidden />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Nouvelle commande</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger render={<span className="inline-flex" />}>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    className="size-8 rounded-lg border border-transparent hover:border-border/60 hover:bg-background/80"
                    onClick={onCreateInvoice}
                    aria-label="Nouvelle facture"
                  >
                    <Receipt className="size-4" aria-hidden />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Nouvelle facture</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger render={<span className="inline-flex" />}>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    className="size-8 rounded-lg border border-transparent hover:border-border/60 hover:bg-background/80"
                    onClick={onCreateEngagement}
                    aria-label="Saisir un engagement financier"
                  >
                    <CircleDollarSign className="size-4" aria-hidden />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Engagement financier</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger render={<span className="inline-flex" />}>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    className="size-8 rounded-lg border border-transparent hover:border-border/60 hover:bg-background/80"
                    onClick={onCreateConsumption}
                    aria-label="Saisir une consommation"
                  >
                    <ArrowDownCircle className="size-4" aria-hidden />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Consommation</TooltipContent>
              </Tooltip>
            </span>
          </div>

          <Tooltip>
            <TooltipTrigger render={<span className="inline-flex" />}>
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                onClick={onClose}
                className="size-8 shrink-0 rounded-lg border-border/70 bg-background/60 shadow-sm hover:bg-muted/50"
                aria-label="Fermer"
              >
                <X className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Fermer</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  );
}
