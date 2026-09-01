'use client';

import {
  ArrowRightLeft,
  BarChart3,
  GitCompareArrows,
  History,
  LayoutDashboard,
  Table2,
} from 'lucide-react';
import {
  WorkspaceTabBar,
  type WorkspaceTabBarItem,
} from '@/components/layout/workspace-tab-bar';
import {
  BUDGET_DETAIL_TABS,
  isBudgetDetailTabId,
  type BudgetDetailTabId,
} from '@/features/budgets/types/budget-detail-tabs.types';

const TAB_ICONS: Record<BudgetDetailTabId, WorkspaceTabBarItem['icon']> = {
  overview: LayoutDashboard,
  previsionnel: Table2,
  suivi: BarChart3,
  comparaisons: GitCompareArrows,
  reallocations: ArrowRightLeft,
  historique: History,
};

const TAB_ITEMS: WorkspaceTabBarItem[] = BUDGET_DETAIL_TABS.map((item) => ({
  id: item.id,
  label: item.label,
  icon: TAB_ICONS[item.id],
}));

export interface BudgetDetailTabsProps {
  /** `null` : rituel PA hors tablist — aucun onglet actif (RFC-BUD-041 C5). */
  tab: BudgetDetailTabId | null;
  onTabChange: (tab: BudgetDetailTabId) => void;
  className?: string;
}

/**
 * Navigation de la zone de travail (RFC-FE-BUD-032 §3.B) : 6 onglets métier
 * via le bandeau DS `WorkspaceTabBar` (icône + soulignement or, sélecteur mobile).
 */
export function BudgetDetailTabs({ tab, onTabChange, className }: BudgetDetailTabsProps) {
  return (
    <div className={className} data-testid="budget-detail-tabs">
      <WorkspaceTabBar
        items={TAB_ITEMS}
        activeId={tab ?? ''}
        onSelect={(id) => {
          if (isBudgetDetailTabId(id)) onTabChange(id);
        }}
        ariaLabel="Zone de travail du budget"
        mobileEyebrow="Section du budget"
        selectId="budget-detail-tab-select"
        mobileAriaLabel="Choisir une section du budget"
      />
    </div>
  );
}
