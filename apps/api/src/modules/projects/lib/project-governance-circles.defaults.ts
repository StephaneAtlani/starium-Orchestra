import { ProjectGovernanceCircleSystemKind } from '@prisma/client';

export const DEFAULT_PROJECT_GOVERNANCE_CIRCLES: ReadonlyArray<{
  systemKind: ProjectGovernanceCircleSystemKind;
  name: string;
  sortOrder: number;
}> = [
  {
    systemKind: ProjectGovernanceCircleSystemKind.COPIL,
    name: 'Comité de pilotage',
    sortOrder: 0,
  },
  {
    systemKind: ProjectGovernanceCircleSystemKind.COPROJ,
    name: 'Comité de projet',
    sortOrder: 1,
  },
];

export type ProjectGovernanceCircleResponse = {
  id: string;
  clientId: string;
  projectId: string;
  name: string;
  systemKind: ProjectGovernanceCircleSystemKind | null;
  sortOrder: number;
  isSystem: boolean;
};

export function mapGovernanceCircle(row: {
  id: string;
  clientId: string;
  projectId: string;
  name: string;
  systemKind: ProjectGovernanceCircleSystemKind | null;
  sortOrder: number;
}): ProjectGovernanceCircleResponse {
  return {
    id: row.id,
    clientId: row.clientId,
    projectId: row.projectId,
    name: row.name,
    systemKind: row.systemKind,
    sortOrder: row.sortOrder,
    isSystem: row.systemKind != null,
  };
}
