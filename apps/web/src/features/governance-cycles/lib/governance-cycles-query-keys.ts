export const governanceCyclesKeys = {
  all: (clientId: string) => ['governance-cycles', clientId] as const,
  lists: (clientId: string) => ['governance-cycles', clientId, 'list'] as const,
  list: (clientId: string, filters: object) =>
    ['governance-cycles', clientId, 'list', filters] as const,
  detail: (clientId: string, cycleId: string) =>
    ['governance-cycles', clientId, 'detail', cycleId] as const,
  items: (clientId: string, cycleId: string, filters?: object) =>
    ['governance-cycles', clientId, 'items', cycleId, filters ?? {}] as const,
  summary: (clientId: string, cycleId: string) =>
    ['governance-cycles', clientId, 'summary', cycleId] as const,
  byProject: (clientId: string, projectId: string) =>
    ['governance-cycles', clientId, 'by-project', projectId] as const,
  instances: (clientId: string, cycleId: string) =>
    ['governance-cycles', clientId, 'instances', cycleId] as const,
  instanceDetail: (clientId: string, cycleId: string, instanceId: string) =>
    ['governance-cycles', clientId, 'instances', cycleId, instanceId] as const,
};
