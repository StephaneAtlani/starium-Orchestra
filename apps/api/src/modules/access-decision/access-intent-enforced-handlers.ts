import type { AccessIntentKind } from '../../common/decorators/require-access-intent.decorator';

/**
 * Clés stables `ControllerName.methodName` — RFC-ACL-024.
 * Référencées dans le registre service-enforced et les tests (pas d’URL HTTP).
 */
export const ACCESS_ENFORCED_HANDLERS = {
  ProjectsController: {
    list: 'ProjectsController.list',
    getById: 'ProjectsController.getById',
    update: 'ProjectsController.update',
    remove: 'ProjectsController.remove',
  },
  BudgetsController: {
    list: 'BudgetsController.list',
    getById: 'BudgetsController.getById',
    update: 'BudgetsController.update',
  },
  BudgetLinesController: {
    list: 'BudgetLinesController.list',
    getById: 'BudgetLinesController.getById',
    update: 'BudgetLinesController.update',
  },
  ContractsController: {
    list: 'ContractsController.list',
    getOne: 'ContractsController.getOne',
    update: 'ContractsController.update',
    remove: 'ContractsController.remove',
  },
  SuppliersController: {
    list: 'SuppliersController.list',
    getById: 'SuppliersController.getById',
    update: 'SuppliersController.update',
  },
  StrategicVisionController: {
    listObjectives: 'StrategicVisionController.listObjectives',
    listObjectivesByAxis: 'StrategicVisionController.listObjectivesByAxis',
    getObjectiveNested: 'StrategicVisionController.getObjectiveNested',
    updateObjective: 'StrategicVisionController.updateObjective',
    updateObjectiveNested: 'StrategicVisionController.updateObjectiveNested',
  },
} as const;

export type ServiceEnforcedRegistryEntry = {
  handlerKey: string;
  moduleCode: string;
  intent: AccessIntentKind;
};

/** Entrées V1 — route + service AccessDecision branchés (checklist RFC-ACL-024 §5). */
export const SERVICE_ENFORCED_REGISTRY: readonly ServiceEnforcedRegistryEntry[] = [
  { handlerKey: ACCESS_ENFORCED_HANDLERS.ProjectsController.list, moduleCode: 'projects', intent: 'read' },
  { handlerKey: ACCESS_ENFORCED_HANDLERS.ProjectsController.getById, moduleCode: 'projects', intent: 'read' },
  { handlerKey: ACCESS_ENFORCED_HANDLERS.ProjectsController.update, moduleCode: 'projects', intent: 'write' },
  { handlerKey: ACCESS_ENFORCED_HANDLERS.ProjectsController.remove, moduleCode: 'projects', intent: 'admin' },

  { handlerKey: ACCESS_ENFORCED_HANDLERS.BudgetsController.list, moduleCode: 'budgets', intent: 'read' },
  { handlerKey: ACCESS_ENFORCED_HANDLERS.BudgetsController.getById, moduleCode: 'budgets', intent: 'read' },
  { handlerKey: ACCESS_ENFORCED_HANDLERS.BudgetsController.update, moduleCode: 'budgets', intent: 'write' },

  { handlerKey: ACCESS_ENFORCED_HANDLERS.BudgetLinesController.list, moduleCode: 'budgets', intent: 'read' },
  { handlerKey: ACCESS_ENFORCED_HANDLERS.BudgetLinesController.getById, moduleCode: 'budgets', intent: 'read' },
  { handlerKey: ACCESS_ENFORCED_HANDLERS.BudgetLinesController.update, moduleCode: 'budgets', intent: 'write' },

  { handlerKey: ACCESS_ENFORCED_HANDLERS.ContractsController.list, moduleCode: 'contracts', intent: 'read' },
  { handlerKey: ACCESS_ENFORCED_HANDLERS.ContractsController.getOne, moduleCode: 'contracts', intent: 'read' },
  { handlerKey: ACCESS_ENFORCED_HANDLERS.ContractsController.update, moduleCode: 'contracts', intent: 'write' },
  { handlerKey: ACCESS_ENFORCED_HANDLERS.ContractsController.remove, moduleCode: 'contracts', intent: 'admin' },

  { handlerKey: ACCESS_ENFORCED_HANDLERS.SuppliersController.list, moduleCode: 'procurement', intent: 'read' },
  { handlerKey: ACCESS_ENFORCED_HANDLERS.SuppliersController.getById, moduleCode: 'procurement', intent: 'read' },
  { handlerKey: ACCESS_ENFORCED_HANDLERS.SuppliersController.update, moduleCode: 'procurement', intent: 'write' },

  {
    handlerKey: ACCESS_ENFORCED_HANDLERS.StrategicVisionController.listObjectives,
    moduleCode: 'strategic_vision',
    intent: 'read',
  },
  {
    handlerKey: ACCESS_ENFORCED_HANDLERS.StrategicVisionController.listObjectivesByAxis,
    moduleCode: 'strategic_vision',
    intent: 'read',
  },
  {
    handlerKey: ACCESS_ENFORCED_HANDLERS.StrategicVisionController.getObjectiveNested,
    moduleCode: 'strategic_vision',
    intent: 'read',
  },
  {
    handlerKey: ACCESS_ENFORCED_HANDLERS.StrategicVisionController.updateObjective,
    moduleCode: 'strategic_vision',
    intent: 'write',
  },
  {
    handlerKey: ACCESS_ENFORCED_HANDLERS.StrategicVisionController.updateObjectiveNested,
    moduleCode: 'strategic_vision',
    intent: 'write',
  },
];
