import {
  budgetDashboardForBudget,
  budgetDetail,
  budgetReporting,
} from '@/features/budgets/constants/budget-routes';
import { projectsList } from '@/features/projects/constants/project-routes';
import type { DashboardBudgetKpiKey } from '../types/dashboard-widgets.types';
import type { DashboardProjectKpiKey } from '../types/dashboard-widgets.types';
import type { DashboardSupplierKpiKey } from '../types/dashboard-widgets.types';

function budgetCockpit(exerciseId: string, budgetId: string): string {
  return budgetDashboardForBudget(exerciseId, budgetId);
}

/** Lien cible pour une carte KPI budget du dashboard principal. */
export function dashboardBudgetKpiHref(
  key: DashboardBudgetKpiKey,
  exerciseId: string,
  budgetId: string,
): string {
  const cockpit = budgetCockpit(exerciseId, budgetId);
  switch (key) {
    case 'revised':
      return budgetDetail(budgetId);
    case 'committed':
      return '/suppliers/purchase-orders';
    case 'consumed':
      return budgetReporting(budgetId);
    case 'remaining':
      return `${cockpit}#budget-critical-lines-heading`;
    case 'forecast':
    case 'forecastGap':
      return budgetReporting(budgetId);
    default:
      return cockpit;
  }
}

/** Lien vers les alertes budget du cockpit (lignes critiques). */
export function dashboardBudgetAlertsHref(
  exerciseId: string,
  budgetId: string,
): string {
  return `${budgetCockpit(exerciseId, budgetId)}#budget-critical-lines-heading`;
}

/** Lien cible pour une carte KPI projets du dashboard principal. */
export function dashboardProjectKpiHref(key: DashboardProjectKpiKey): string {
  switch (key) {
    case 'totalProjects':
      return projectsList();
    case 'inProgressProjects':
      return projectsList({ status: 'IN_PROGRESS' });
    case 'completedProjects':
      return projectsList({ status: 'COMPLETED' });
    case 'lateProjects':
      return projectsList({ atRiskOnly: true });
    case 'criticalProjects':
      return projectsList({ computedHealth: 'RED' });
    case 'blockedProjects':
      return projectsList({ status: 'ON_HOLD' });
    case 'noRiskProjects':
      return '/risks';
    case 'noOwnerProjects':
      return projectsList();
    case 'noMilestoneProjects':
      return projectsList();
    default:
      return projectsList();
  }
}

/** Lien cible pour une carte KPI fournisseurs du dashboard principal. */
export function dashboardSupplierKpiHref(key: DashboardSupplierKpiKey): string {
  switch (key) {
    case 'suppliersListed':
      return '/suppliers';
    case 'suppliersArchived':
      return '/suppliers/dashboard';
    case 'purchaseOrdersCount':
      return '/suppliers/purchase-orders';
    case 'invoicesCount':
      return '/suppliers/invoices';
    case 'contactsActiveCount':
      return '/suppliers/contacts';
    default:
      return '/suppliers/dashboard';
  }
}
