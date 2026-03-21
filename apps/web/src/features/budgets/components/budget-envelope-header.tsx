'use client';

import React from 'react';
import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/use-permissions';
import { BudgetEnvelopeDetail } from '../types/budget-envelope-detail.types';
import { BudgetEnvelopeStatusBadge } from './budget-envelope-status-badge';
import { BudgetPageHeader } from './budget-page-header';
import { budgetDetail, budgetEnvelopeEdit } from '../constants/budget-routes';

interface BudgetEnvelopeHeaderProps {
  envelope: BudgetEnvelopeDetail;
}

export function BudgetEnvelopeHeader({ envelope }: BudgetEnvelopeHeaderProps) {
  const budgetLabel = envelope.budgetName || envelope.budgetId;
  const { has, isLoading: isPermissionsLoading } = usePermissions();
  const canEditEnvelope = !isPermissionsLoading && has('budgets.update');

  return (
    <div className="space-y-2">
      <div className="text-sm text-muted-foreground">
        <Link href="/budgets" className="hover:underline">
          Budgets
        </Link>
        <span className="mx-1">/</span>
        <Link href={budgetDetail(envelope.budgetId)} className="hover:underline">
          {budgetLabel}
        </Link>
        <span className="mx-1">/</span>
        <span>{envelope.name}</span>
      </div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <BudgetPageHeader
            title={envelope.name}
            description={
              envelope.code
                ? `${envelope.code} · ${envelope.currency}`
                : envelope.currency
            }
            actions={
              canEditEnvelope ? (
                <Link
                  href={budgetEnvelopeEdit(envelope.id)}
                  className={cn(
                    buttonVariants({ variant: 'ghost', size: 'icon' }),
                    'size-9 shrink-0 text-muted-foreground hover:text-foreground',
                  )}
                  aria-label={`Modifier l’enveloppe ${envelope.name}`}
                >
                  <Pencil className="size-4" />
                </Link>
              ) : undefined
            }
          />
        </div>
        <BudgetEnvelopeStatusBadge status={envelope.status} />
      </div>
    </div>
  );
}

