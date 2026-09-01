'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { PermissionGate } from '@/components/PermissionGate';
import { PageHeader } from '@/components/layout/page-header';
import { ResourceAclTriggerButton } from '@/features/resource-acl/components/resource-acl-trigger-button';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/lib/utils';
import { BudgetStatusBadge } from '@/features/budgets/components/budget-status-badge';
import { budgetEdit, budgetList } from '@/features/budgets/constants/budget-routes';
import type { Budget } from '@/features/budgets/types/budget-management.types';

export interface BudgetDetailHeaderProps {
  budget: Budget;
  exerciseYearLabel: string | null;
  onRegisterExpense: () => void;
}

/**
 * En-tête fiche budget — `PageHeader` + actions principales.
 * Les 6 onglets métier sont dans `BudgetDetailTabs` (`WorkspaceTabBar`).
 */
export function BudgetDetailHeader({
  budget,
  exerciseYearLabel,
  onRegisterExpense,
}: BudgetDetailHeaderProps) {
  const description = [
    budget.ownerOrgUnitSummary?.name ?? 'Sans direction rattachée',
    exerciseYearLabel ? `Exercice ${exerciseYearLabel}` : null,
    budget.currency,
    budget.ownerUserName ? `Resp. ${budget.ownerUserName}` : null,
  ]
    .filter((part): part is string => Boolean(part))
    .join(' · ');

  return (
    <PageHeader
      backHref={budgetList()}
      eyebrow="Pilotage › Budgets"
      title={budget.name}
      status={<BudgetStatusBadge status={budget.status} className="shrink-0" />}
      description={description}
      actions={
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          <PermissionGate permission="budgets.update">
            <Link
              href={budgetEdit(budget.id)}
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                'min-h-11 sm:min-h-9',
              )}
            >
              Modifier
            </Link>
          </PermissionGate>
          <ResourceAclTriggerButton
            resourceType="BUDGET"
            resourceId={budget.id}
            resourceLabel={budget.name}
            size="sm"
            label="Accès"
          />
          <PermissionGate permission="budgets.create">
            <Button
              type="button"
              size="sm"
              className="min-h-11 sm:min-h-9"
              onClick={onRegisterExpense}
            >
              <Plus className="size-4" aria-hidden />
              Saisir une dépense
            </Button>
          </PermissionGate>
        </div>
      }
    />
  );
}
