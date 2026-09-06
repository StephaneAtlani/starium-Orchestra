/** RFC-PROJ-010-B — réponses API vue inverse / KPI. */

export type ImputationBasisV1 = 'PROPORTIONAL_V1';

export type ProjectBudgetAllocationTypeApi =
  | 'FULL'
  | 'PERCENTAGE'
  | 'BUDGET_PERCENTAGE'
  | 'FIXED';

export type BudgetLineLinkedProject = {
  id: string;
  code: string;
  name: string;
  status: string;
};

export type BudgetLineProjectLinkItem = {
  id: string;
  allocationType: ProjectBudgetAllocationTypeApi;
  percentage: string | null;
  amount: string | null;
  projectAllocatedAmount: number | null;
  imputedCommittedAmount: number | null;
  imputedConsumedAmount: number | null;
  lineCommittedAmount: number;
  lineConsumedAmount: number;
  project: BudgetLineLinkedProject;
};

export type BudgetLineProjectLinksPage = {
  imputationBasis: ImputationBasisV1;
  items: BudgetLineProjectLinkItem[];
  total: number;
  limit: number;
  offset: number;
};

export type BudgetProjectBudgetKpiItem = {
  projectId: string;
  project: BudgetLineLinkedProject;
  targetAmount: number;
  committedAmount: number;
  consumedAmount: number;
  driftAmount: number;
  linkCount: number;
};

export type BudgetProjectBudgetKpisResponse = {
  imputationBasis: ImputationBasisV1;
  items: BudgetProjectBudgetKpiItem[];
  totals: {
    targetAmount: number;
    committedAmount: number;
    consumedAmount: number;
    driftAmount: number;
    projectCount: number;
  };
  truncated?: boolean;
};
