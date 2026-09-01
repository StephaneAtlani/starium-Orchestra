'use client';

import Link from 'next/link';
import {
  ArrowRightLeft,
  Bookmark,
  Download,
  Plus,
  TrendingUp,
  Upload,
} from 'lucide-react';
import { PermissionGate } from '@/components/PermissionGate';
import { PageHeader } from '@/components/layout/page-header';
import { ResourceAclTriggerButton } from '@/features/resource-acl/components/resource-acl-trigger-button';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { BudgetStatusBadge } from '@/features/budgets/components/budget-status-badge';
import {
  budgetEdit,
  budgetImport,
  budgetList,
} from '@/features/budgets/constants/budget-routes';
import {
  BUDGET_LABELS,
  formatBudgetSelectLabel,
} from '@/features/budgets/lib/budget-display-labels';
import type { Budget } from '@/features/budgets/types/budget-management.types';

export type BudgetDetailHeaderBudgetOption = {
  id: string;
  name: string;
  code: string | null;
};

export interface BudgetDetailHeaderProps {
  budget: Budget;
  exerciseYearLabel: string | null;
  budgetOptions: BudgetDetailHeaderBudgetOption[];
  onBudgetChange: (budgetId: string) => void;
  onExport: () => void;
  onCreateSnapshot: () => void;
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
      variant={pressed ? 'default' : 'outline'}
      size="sm"
      className="min-h-11 gap-1.5 sm:min-h-9"
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
 * En-tête fiche budget — `PageHeader` + actions (pas de navigation d’onglets).
 * Les 6 onglets métier sont dans `BudgetDetailTabs` (`WorkspaceTabBar`).
 */
export function BudgetDetailHeader({
  budget,
  exerciseYearLabel,
  budgetOptions,
  onBudgetChange,
  onExport,
  onCreateSnapshot,
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

  const currentLabel = formatBudgetSelectLabel(budget.name, budget.code);
  const showBudgetSwitch = budgetOptions.length > 1;

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

      <div
        className="flex flex-wrap items-end gap-2"
        role="toolbar"
        aria-label="Outils du budget"
      >
        {showBudgetSwitch ? (
          <div className="grid w-full min-w-0 gap-1 sm:w-64">
            <Label htmlFor="budget-detail-switch">Budget</Label>
            <Select
              value={budget.id}
              onValueChange={(value) => {
                if (value) onBudgetChange(value);
              }}
            >
              <SelectTrigger
                id="budget-detail-switch"
                className="h-auto min-h-11 w-full min-w-0 sm:min-h-9"
              >
                <SelectValue placeholder="Choisir un budget">{currentLabel}</SelectValue>
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
        <PermissionGate permission="budgets.update">
          <Link
            href={budgetImport(budget.id)}
            className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              'min-h-11 gap-1.5 sm:min-h-9',
            )}
          >
            <Upload className="size-4 shrink-0" aria-hidden />
            Importer
          </Link>
        </PermissionGate>
        <PermissionGate permission="budgets.update">
          <ToolbarAction
            icon={ArrowRightLeft}
            label="Réaffecter"
            onClick={onReallocate}
          />
        </PermissionGate>
        {landingForecastEnabled && budget.status === 'VALIDATED' && onOpenLandingForecast ? (
          <ToolbarAction
            icon={TrendingUp}
            label={BUDGET_LABELS.landingForecastExercise}
            pressed={landingForecastPressed}
            onClick={onOpenLandingForecast}
          />
        ) : null}
      </div>
    </div>
  );
}
