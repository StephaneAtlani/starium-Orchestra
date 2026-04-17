import { ResourceType } from '@prisma/client';

export const PROJECT_SCENARIO_CAPACITY_STATUSES = [
  'OVER_CAPACITY',
  'OK',
  'UNDER_CAPACITY',
] as const;

export type ProjectScenarioCapacityStatus =
  (typeof PROJECT_SCENARIO_CAPACITY_STATUSES)[number];

export type ProjectScenarioCapacitySnapshotDto = {
  id: string;
  clientId: string;
  projectId: string;
  scenarioId: string;
  resourceId: string;
  snapshotDate: string;
  plannedLoadPct: string;
  availableCapacityPct: string;
  variancePct: string;
  status: ProjectScenarioCapacityStatus;
  resource: {
    id: string;
    name: string;
    type: ResourceType;
  } | null;
};
