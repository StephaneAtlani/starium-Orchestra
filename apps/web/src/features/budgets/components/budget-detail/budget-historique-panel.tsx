'use client';

import Link from 'next/link';
import { Upload } from 'lucide-react';
import { PermissionGate } from '@/components/PermissionGate';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BudgetDecisionTimeline } from '@/features/budgets/components/budget-decision-timeline';
import { budgetImport } from '@/features/budgets/constants/budget-routes';

export interface BudgetHistoriquePanelProps {
  budgetId: string;
}

/**
 * Onglet Historique (RFC-FE-BUD-032 §3.B) : décisions budgétaires tracées (RFC-032).
 * Les imports ne disposent pas d'entité de journal côté API : accès direct à l'assistant.
 */
export function BudgetHistoriquePanel({ budgetId }: BudgetHistoriquePanelProps) {
  return (
    <div className="space-y-4" data-testid="budget-historique-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h3 className="text-base font-semibold text-foreground">Décisions budgétaires</h3>
          <p className="text-sm text-muted-foreground">
            Changements de statut, révisions et arbitrages enregistrés sur ce budget.
          </p>
        </div>
        <PermissionGate permission="budgets.update">
          <Link
            href={budgetImport(budgetId)}
            className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              'min-h-11 sm:min-h-9',
            )}
          >
            <Upload className="size-4" aria-hidden />
            Importer des données
          </Link>
        </PermissionGate>
      </div>
      <BudgetDecisionTimeline budgetId={budgetId} />
    </div>
  );
}
