/**
 * Lecture seule — filtres audit compatibles historique vs RFC (RFC-PROJ-009 §4).
 * Ne modifie aucune donnée ; uniquement élargissement des clauses `where` Prisma.
 */

import { BUDGET_PLANNING_AUDIT_ACTION_VARIANTS } from './budget-planning-audit-action-map';

/** resourceType RFC → variantes persistées (snake_case + PascalCase legacy) */
const RESOURCE_TYPE_VARIANTS: Record<string, string[]> = {
  project: ['project', 'Project'],
  Project: ['project', 'Project'],
  project_task: ['project_task', 'ProjectTask'],
  ProjectTask: ['project_task', 'ProjectTask'],
  project_risk: ['project_risk', 'ProjectRisk'],
  ProjectRisk: ['project_risk', 'ProjectRisk'],
  project_milestone: ['project_milestone', 'ProjectMilestone'],
  ProjectMilestone: ['project_milestone', 'ProjectMilestone'],
};

/** action RFC → variantes legacy (suffixe .created vs .create, etc.) */
const ACTION_VARIANTS: Record<string, string[]> = {
  'project.created': ['project.created', 'project.create'],
  'project.create': ['project.created', 'project.create'],
  'project.updated': ['project.updated', 'project.update'],
  'project.update': ['project.updated', 'project.update'],
  'project.deleted': ['project.deleted', 'project.delete'],
  'project.delete': ['project.deleted', 'project.delete'],
  'project.status.updated': ['project.status.updated'],
  'project.owner.updated': ['project.owner.updated'],

  'project_task.created': ['project_task.created', 'project_task.create'],
  'project_task.create': ['project_task.created', 'project_task.create'],
  'project_task.updated': ['project_task.updated', 'project_task.update'],
  'project_task.update': ['project_task.updated', 'project_task.update'],
  'project_task.deleted': ['project_task.deleted', 'project_task.delete'],
  'project_task.delete': ['project_task.deleted', 'project_task.delete'],
  'project_task.status.updated': ['project_task.status.updated'],
  'project_task.assigned': ['project_task.assigned'],

  'project_risk.created': ['project_risk.created', 'project_risk.create'],
  'project_risk.create': ['project_risk.created', 'project_risk.create'],
  'project_risk.updated': ['project_risk.updated', 'project_risk.update'],
  'project_risk.update': ['project_risk.updated', 'project_risk.update'],
  'project_risk.deleted': ['project_risk.deleted', 'project_risk.delete'],
  'project_risk.delete': ['project_risk.deleted', 'project_risk.delete'],
  'project_risk.level.updated': ['project_risk.level.updated'],

  'project_milestone.created': ['project_milestone.created', 'project_milestone.create'],
  'project_milestone.create': ['project_milestone.created', 'project_milestone.create'],
  'project_milestone.updated': ['project_milestone.updated', 'project_milestone.update'],
  'project_milestone.update': ['project_milestone.updated', 'project_milestone.update'],
  'project_milestone.deleted': ['project_milestone.deleted', 'project_milestone.delete'],
  'project_milestone.delete': ['project_milestone.deleted', 'project_milestone.delete'],

  ...BUDGET_PLANNING_AUDIT_ACTION_VARIANTS,
};

export function auditLogResourceTypeWhere(
  resourceType: string | undefined,
): { resourceType: { in: string[] } } | { resourceType: string } | Record<string, never> {
  if (resourceType === undefined || resourceType === '') {
    return {};
  }
  const variants = RESOURCE_TYPE_VARIANTS[resourceType];
  if (variants) {
    return { resourceType: { in: variants } };
  }
  return { resourceType };
}

export function auditLogActionWhere(
  action: string | undefined,
): { action: { in: string[] } } | { action: string } | Record<string, never> {
  if (action === undefined || action === '') {
    return {};
  }
  const variants = ACTION_VARIANTS[action];
  if (variants) {
    return { action: { in: variants } };
  }
  return { action };
}
