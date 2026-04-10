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
    <div className="flex items-start justify-between gap-4 border-b border-border/60 bg-background/80 px-4 py-2 backdrop-blur supports-backdrop-filter:bg-background/60">
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

      <TooltipProvider delay={300}>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
          {lineDrilldownNavigation && (
            <>
              <Tooltip>
                <TooltipTrigger render={<span className="inline-flex" />}>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="outline"
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
                    variant="outline"
                    disabled={!lineDrilldownNavigation.hasNext}
                    onClick={lineDrilldownNavigation.onNextLine}
                    aria-label="Ligne suivante"
                  >
                    <ChevronRight className="size-4" aria-hidden />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Ligne suivante</TooltipContent>
              </Tooltip>
            </>
          )}
          <Tooltip>
            <TooltipTrigger render={<span className="inline-flex" />}>
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
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
                variant="outline"
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
                variant="outline"
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
                variant="outline"
                onClick={onCreateConsumption}
                aria-label="Saisir une consommation"
              >
                <ArrowDownCircle className="size-4" aria-hidden />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Consommation</TooltipContent>
          </Tooltip>

          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={onClose}
            className="ml-0.5"
            aria-label="Fermer"
          >
            <X className="size-4" />
          </Button>
        </div>
      </TooltipProvider>
    </div>
  );
}
