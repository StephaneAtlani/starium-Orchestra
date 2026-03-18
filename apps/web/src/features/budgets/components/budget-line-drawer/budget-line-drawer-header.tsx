'use client';

import React from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import type { BudgetLine } from '../../types/budget-management.types';
import { BudgetStatusBadge } from '../budget-status-badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function BudgetLineDrawerHeader({
  line,
  budgetName,
  envelopeName,
  onClose,
  onCreateOrder,
  onCreateInvoice,
  onCreateEvent,
}: {
  line: BudgetLine;
  budgetName?: string | null;
  envelopeName?: string | null;
  onClose: () => void;
  onCreateOrder: () => void;
  onCreateInvoice: () => void;
  onCreateEvent: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b bg-background/80 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          {line.code && (
            <span className="text-xs text-muted-foreground shrink-0">
              [{line.code}]
            </span>
          )}
          <h2 className="text-base font-semibold truncate">{line.name}</h2>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <BudgetStatusBadge status={line.status} className="h-5 px-2 text-[10px] uppercase" />
          {envelopeName && (
            <>
              <span>·</span>
              <span className="truncate max-w-[240px]" title={envelopeName}>
                {envelopeName}
              </span>
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

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
        <Button size="sm" variant="outline" onClick={onCreateOrder}>
          + Commande
        </Button>
        <Button size="sm" variant="outline" onClick={onCreateInvoice}>
          + Facture
        </Button>
        <Button size="sm" variant="outline" onClick={onCreateEvent}>
          + Événement
        </Button>
        <Link
          href={`/budget-lines/${line.id}/edit`}
          className={cn(buttonVariants({ size: 'sm', variant: 'outline' }))}
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

