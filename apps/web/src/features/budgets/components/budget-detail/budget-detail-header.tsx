'use client';

import Link from 'next/link';
import {
  ArrowRightLeft,
  Bookmark,
  Download,
  GitCompareArrows,
  Plus,
  Table2,
  TrendingUp,
} from 'lucide-react';
import { PermissionGate } from '@/components/PermissionGate';
import { PageHeader } from '@/components/layout/page-header';
import { ResourceAclTriggerButton } from '@/features/resource-acl/components/resource-acl-trigger-button';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/lib/utils';
import { BudgetStatusBadge } from '@/features/budgets/components/budget-status-badge';
import { budgetEdit, budgetList } from '@/features/budgets/constants/budget-routes';
import { BUDGET_LABELS } from '@/features/budgets/lib/budget-display-labels';
import type { Budget } from '@/features/budgets/types/budget-management.types';
import type { BudgetDetailTabId } from '@/features/budgets/types/budget-detail-tabs.types';

export type BudgetDetailHeaderBudgetOption = {
  id: string;
  name: string;
  code: string | null;
};

export interface BudgetDetailHeaderProps {
  budget: Budget;
  exerciseYearLabel: string | null;
  budgetOptions: BudgetDetailHeaderBudgetOption[];
  activeTab: BudgetDetailTabId;
  onBudgetChange: (budgetId: string) => void;
  onExport: () => void;
  onCreateSnapshot: () => void;
  onNavigateTab: (tab: BudgetDetailTabId) => void;
  onReallocate: () => void;
  onRegisterExpense: () => void;
  onOpenLandingForecast?: () => void;
  landingForecastPressed?: boolean;
  landingForecastEnabled?: boolean;
}

function ToolbarAction({
  icon: Icon,
  label,
  onClick,
  pressed,
}: {
  icon: typeof Download;
  label: string;
  onClick: () => void;
  pressed?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn(
        'min-h-11 gap-1.5 sm:min-h-9',
        pressed && 'border-[color:var(--brand-gold)] bg-[color:var(--brand-gold-050)]',
      )}
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      {label}
    </Button>
  );
}

/**
 * En-tête fiche budget — `PageHeader` standard (comme le portefeuille) :
 * identité + CTA principaux à droite ; outils secondaires en barre sous la carte.
 */
export function BudgetDetailHeader({
  budget,
  exerciseYearLabel,
  budgetOptions,
  activeTab,
  onBudgetChange,
  onExport,
  onCreateSnapshot,
  onNavigateTab,
  onReallocate,
  onRegisterExpense,
  onOpenLandingForecast,
  landingForecastPressed,
  landingForecastEnabled,
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
    <div className="space-y-3">
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
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'min-h-11 sm:min-h-9')}
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

      <div
        className="flex flex-wrap items-center gap-2"
        role="toolbar"
        aria-label="Outils du budget"
      >
        <PermissionGate permission="budgets.read">
          <ToolbarAction icon={Download} label="Exporter" onClick={onExport} />
        </PermissionGate>
        <PermissionGate permission="budgets.create">
          <ToolbarAction
            icon={Bookmark}
            label="Version figée"
            onClick={onCreateSnapshot}
          />
        </PermissionGate>
        <ToolbarAction
          icon={GitCompareArrows}
          label="Comparaisons"
          pressed={activeTab === 'comparaisons'}
          onClick={() => onNavigateTab('comparaisons')}
        />
        <ToolbarAction
          icon={Table2}
          label={BUDGET_LABELS.planningTab}
          pressed={activeTab === 'previsionnel'}
          onClick={() => onNavigateTab('previsionnel')}
        />
        {landingForecastEnabled && budget.status === 'VALIDATED' && onOpenLandingForecast ? (
          <ToolbarAction
            icon={TrendingUp}
            label={BUDGET_LABELS.landingForecastExercise}
            pressed={landingForecastPressed}
            onClick={onOpenLandingForecast}
          />
        ) : null}
        <PermissionGate permission="budgets.update">
          <ToolbarAction
            icon={ArrowRightLeft}
            label="Réaffectations"
            pressed={activeTab === 'reallocations'}
            onClick={onReallocate}
          />
        </PermissionGate>
      </div>
    </div>
  );
}
