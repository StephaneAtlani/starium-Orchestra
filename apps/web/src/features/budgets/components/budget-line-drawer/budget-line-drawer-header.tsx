'use client';

import React from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import type { BudgetLine } from '../../types/budget-management.types';
import { BudgetStatusBadge } from '../budget-status-badge';
import { Button, buttonVariants } from '@/components/ui/button';
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
  onCreateEvent,
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
  onCreateEvent: () => void;
}) {
  const isOverrun = line.consumedAmount > line.revisedAmount;
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
          <BudgetStatusBadge status={line.status} className="h-4 px-1.5 text-[10px] uppercase" />
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

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
        <Button size="sm" className="h-7 px-2" variant="outline" onClick={onCreateOrder}>
          + Commande
        </Button>
        <Button size="sm" className="h-7 px-2" variant="outline" onClick={onCreateInvoice}>
          + Facture
        </Button>
        <Button size="sm" className="h-7 px-2" variant="outline" onClick={onCreateEvent}>
          + Événement
        </Button>
        <Link
          href={`/budget-lines/${line.id}/edit`}
          className={cn(buttonVariants({ size: 'sm', variant: 'outline' }), 'h-7 px-2')}
        >
          Ouvrir la fiche
        </Link>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={onClose}
          className={cn('ml-1')}
          aria-label="Fermer"
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}

