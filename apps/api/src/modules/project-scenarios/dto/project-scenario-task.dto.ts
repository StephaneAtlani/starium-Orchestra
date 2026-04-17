export const PROJECT_SCENARIO_TASK_TYPES = ['TASK', 'MILESTONE'] as const;
export type ProjectScenarioTaskType = (typeof PROJECT_SCENARIO_TASK_TYPES)[number];

export type ProjectScenarioTaskDto = {
  id: string;
  clientId: string;
  scenarioId: string;
  sourceProjectTaskId: string | null;
  title: string;
  taskType: ProjectScenarioTaskType | null;
  startDate: string | null;
  endDate: string | null;
  durationDays: number | null;
  dependencyIds: string[];
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
};
