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
import { cn } from '@/lib/utils';

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

  const actionBtn =
    'h-auto min-h-6 gap-1 px-1.5 py-0.5 text-[0.625rem] font-medium leading-none sm:min-h-6 sm:px-2 sm:py-0.5 sm:text-[0.6875rem]';

  return (
    <div className="flex flex-col gap-2 bg-background/85 px-3 py-2 backdrop-blur-md supports-backdrop-filter:bg-background/70 sm:flex-row sm:items-start sm:justify-between sm:gap-3 sm:px-4 sm:py-2">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-1.5">
          {line.code && (
            <span className="shrink-0 text-[10px] text-muted-foreground">
              [{line.code}]
            </span>
          )}
          <h2 className="truncate text-xs font-semibold leading-tight sm:text-[0.8125rem]">
            {line.name}
          </h2>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1">
          {isOverrun && (
            <Badge variant="destructive" className="h-3.5 px-1 py-0 text-[9px]">
              Dépassement
            </Badge>
          )}
          {isNegativeRemaining && (
            <Badge variant="destructive" className="h-3.5 px-1 py-0 text-[9px]">
              Reste négatif
            </Badge>
          )}
          {hasRecentInvoice30d && (
            <Badge variant="secondary" className="h-3.5 px-1 py-0 text-[9px]">
              Facture récente (30j)
            </Badge>
          )}
          {isUncoveredOrder && (
            <Badge variant="outline" className="h-3.5 px-1 py-0 text-[9px]">
              Commande non couverte
            </Badge>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] text-muted-foreground">
          <BudgetLineStatusBadge
            status={line.status}
            className="h-3.5 px-1 py-0 text-[9px] uppercase"
          />
          {envelopeName && (
            <>
              <span>·</span>
              <span className="max-w-[240px] truncate" title={envelopeName}>
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
              <span className="max-w-[240px] truncate" title={budgetName}>
                {budgetName}
              </span>
            </>
          )}
          <span>{line.expenseType}</span>
          <span>·</span>
          <span>{line.currency}</span>
        </div>
      </div>

      <div className="flex w-full shrink-0 flex-col gap-1.5 sm:w-auto sm:items-end">
        <div
          className="flex flex-wrap items-stretch justify-end gap-1"
          role="toolbar"
          aria-label="Actions ligne budgétaire"
        >
          {lineDrilldownNavigation ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                disabled={!lineDrilldownNavigation.hasPrev}
                title={
                  lineDrilldownNavigation.hasPrev
                    ? 'Ligne précédente'
                    : 'Première ligne de la liste'
                }
                className={actionBtn}
                onClick={lineDrilldownNavigation.onPrevLine}
              >
                <ChevronLeft className="size-3 shrink-0 opacity-90" aria-hidden />
                <span className="whitespace-nowrap">Précédent</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                disabled={!lineDrilldownNavigation.hasNext}
                title={
                  lineDrilldownNavigation.hasNext
                    ? 'Ligne suivante'
                    : 'Dernière ligne de la liste'
                }
                className={actionBtn}
                onClick={lineDrilldownNavigation.onNextLine}
              >
                <span className="whitespace-nowrap">Suivant</span>
                <ChevronRight className="size-3 shrink-0 opacity-90" aria-hidden />
              </Button>
            </>
          ) : null}

          <Button
            type="button"
            variant="default"
            size="xs"
            className={actionBtn}
            onClick={onCreateOrder}
          >
            <ShoppingCart className="size-3 shrink-0 opacity-90" aria-hidden />
            <span className="whitespace-nowrap">Commande</span>
          </Button>
          <Button
            type="button"
            variant="default"
            size="xs"
            className={actionBtn}
            onClick={onCreateInvoice}
          >
            <Receipt className="size-3 shrink-0 opacity-90" aria-hidden />
            <span className="whitespace-nowrap">Facture</span>
          </Button>
          <Button
            type="button"
            variant="default"
            size="xs"
            className={actionBtn}
            onClick={onCreateEngagement}
          >
            <CircleDollarSign className="size-3 shrink-0 opacity-90" aria-hidden />
            <span className="whitespace-nowrap">Engagement</span>
          </Button>
          <Button
            type="button"
            variant="default"
            size="xs"
            className={actionBtn}
            onClick={onCreateConsumption}
          >
            <ArrowDownCircle className="size-3 shrink-0 opacity-90" aria-hidden />
            <span className="whitespace-nowrap">Consommation</span>
          </Button>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="xs"
          className={cn(actionBtn, 'w-full justify-center sm:w-auto')}
          onClick={onClose}
        >
          <X className="size-3 shrink-0 opacity-90" aria-hidden />
          Fermer
        </Button>
      </div>
    </div>
  );
}
