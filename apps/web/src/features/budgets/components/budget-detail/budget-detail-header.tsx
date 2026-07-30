'use client';

import {
  ArrowRightLeft,
  Bookmark,
  Download,
  GitCompareArrows,
  Plus,
  Table2,
} from 'lucide-react';
import { PermissionGate } from '@/components/PermissionGate';
import { PageHeader } from '@/components/layout/page-header';
import { ResourceAclTriggerButton } from '@/features/resource-acl/components/resource-acl-trigger-button';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { BudgetStatusBadge } from '@/features/budgets/components/budget-status-badge';
import { budgetList } from '@/features/budgets/constants/budget-routes';
import { formatBudgetSelectLabel } from '@/features/budgets/lib/budget-display-labels';
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
            {budgetOptions.length > 1 ? (
              <div className="min-w-0 flex-1 sm:w-[14rem] sm:flex-none">
                <label htmlFor="budget-detail-switch" className="sr-only">
                  Budget affiché
                </label>
                <Select
                  value={budget.id}
                  onValueChange={(nextBudgetId) => {
                    if (nextBudgetId && nextBudgetId !== budget.id) {
                      onBudgetChange(nextBudgetId);
                    }
                  }}
                >
                  <SelectTrigger
                    id="budget-detail-switch"
                    className="min-h-11 w-full sm:min-h-9"
                  >
                    <SelectValue placeholder="Choisir un budget">
                      {formatBudgetSelectLabel(budget.name, budget.code)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {budgetOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {formatBudgetSelectLabel(option.name, option.code)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
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
          label="Prévisionnel"
          pressed={activeTab === 'previsionnel'}
          onClick={() => onNavigateTab('previsionnel')}
        />
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
