/** Contrat d’audit RFC-PROJ-009 — resourceType (snake_case) */

export const PROJECT_AUDIT_RESOURCE_TYPE = {
  PROJECT: 'project',
  PROJECT_TASK: 'project_task',
  PROJECT_ACTIVITY: 'project_activity',
  PROJECT_RISK: 'project_risk',
  PROJECT_MILESTONE: 'project_milestone',
  PROJECT_BUDGET_LINK: 'project_budget_link',
  /** RFC-PROJ-013 */
  PROJECT_REVIEW: 'project_review',
  PROJECT_PORTFOLIO_CATEGORY: 'project_portfolio_category',
} as const;

/** Actions exactes RFC-PROJ-009 */

export const PROJECT_AUDIT_ACTION = {
  PROJECT_CREATED: 'project.created',
  PROJECT_UPDATED: 'project.updated',
  PROJECT_DELETED: 'project.deleted',
  PROJECT_STATUS_UPDATED: 'project.status.updated',
  PROJECT_OWNER_UPDATED: 'project.owner.updated',
  PROJECT_PORTFOLIO_CATEGORY_UPDATED: 'project.portfolio_category.updated',
  PROJECT_PORTFOLIO_CATEGORY_CREATED: 'project.portfolio_category.created',
  PROJECT_PORTFOLIO_CATEGORY_DELETED: 'project.portfolio_category.deleted',
  PROJECT_PORTFOLIO_CATEGORY_REORDERED: 'project.portfolio_category.reordered',
  PROJECT_PORTFOLIO_CATEGORY_UPDATED_ON_PROJECT:
    'project.portfolio-category.updated',

  PROJECT_TASK_CREATED: 'project_task.created',
  PROJECT_TASK_UPDATED: 'project_task.updated',
  PROJECT_TASK_DELETED: 'project_task.deleted',
  PROJECT_TASK_STATUS_UPDATED: 'project_task.status.updated',
  PROJECT_TASK_ASSIGNED: 'project_task.assigned',

  PROJECT_ACTIVITY_CREATED: 'project_activity.created',
  PROJECT_ACTIVITY_UPDATED: 'project_activity.updated',

  PROJECT_RISK_CREATED: 'project_risk.created',
  PROJECT_RISK_UPDATED: 'project_risk.updated',
  PROJECT_RISK_DELETED: 'project_risk.deleted',
  PROJECT_RISK_LEVEL_UPDATED: 'project_risk.level.updated',

  PROJECT_MILESTONE_CREATED: 'project_milestone.created',
  PROJECT_MILESTONE_UPDATED: 'project_milestone.updated',
  PROJECT_MILESTONE_DELETED: 'project_milestone.deleted',

  PROJECT_BUDGET_LINK_CREATED: 'project.budget_link.created',
  PROJECT_BUDGET_LINK_UPDATED: 'project.budget_link.updated',
  PROJECT_BUDGET_LINK_DELETED: 'project.budget_link.deleted',

  /** RFC-PROJ-012 */
  PROJECT_SHEET_UPDATED: 'project.sheet.updated',
  PROJECT_ARBITRATION_VALIDATED: 'project.arbitration.validated',
  PROJECT_ARBITRATION_REJECTED: 'project.arbitration.rejected',
  PROJECT_SHEET_DECISION_SNAPSHOT_CREATED: 'project.sheet.decision_snapshot.created',

  /** RFC-PROJ-013 */
  PROJECT_REVIEW_CREATED: 'project.review.created',
  PROJECT_REVIEW_UPDATED: 'project.review.updated',
  PROJECT_REVIEW_FINALIZED: 'project.review.finalized',
  PROJECT_REVIEW_CANCELLED: 'project.review.cancelled',
} as const;
