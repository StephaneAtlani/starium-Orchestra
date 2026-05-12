/** RFC-ORG-003 — audit changement de Direction propriétaire (ownerOrgUnitId). */
export const RESOURCE_OWNERSHIP_AUDIT = {
  PROJECT: 'project.ownership.changed',
  BUDGET: 'budget.ownership.changed',
  BUDGET_LINE: 'budget_line.ownership.changed',
  SUPPLIER: 'supplier.ownership.changed',
  CONTRACT: 'contract.ownership.changed',
  STRATEGIC_OBJECTIVE: 'strategic_objective.ownership.changed',
} as const;

export const RESOURCE_OWNERSHIP_AUDIT_RESOURCE_TYPES = {
  PROJECT: 'Project',
  BUDGET: 'Budget',
  BUDGET_LINE: 'BudgetLine',
  SUPPLIER: 'Supplier',
  CONTRACT: 'SupplierContract',
  STRATEGIC_OBJECTIVE: 'StrategicObjective',
} as const;
