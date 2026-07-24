export const capacityQueryKeys = {
  all: (clientId: string) => ['capacity', clientId] as const,
  settingsMonthly: (clientId: string, from?: string, to?: string) =>
    [...capacityQueryKeys.all(clientId), 'settings-monthly', from, to] as const,
  memberMonthly: (clientId: string, resourceId: string, from?: string, to?: string) =>
    [...capacityQueryKeys.all(clientId), 'member-monthly', resourceId, from, to] as const,
  allocations: (clientId: string, params: Record<string, unknown>) =>
    [...capacityQueryKeys.all(clientId), 'allocations', params] as const,
  allocationsBySource: (
    clientId: string,
    sourceType: string,
    sourceId: string,
  ) =>
    [
      ...capacityQueryKeys.all(clientId),
      'allocations-by-source',
      sourceType,
      sourceId,
    ] as const,
  allocation: (clientId: string, id: string) =>
    [...capacityQueryKeys.all(clientId), 'allocation', id] as const,
  dashboardResources: (clientId: string, params: Record<string, unknown>) =>
    [...capacityQueryKeys.all(clientId), 'dashboard-resources', params] as const,
  dashboardWorkTeams: (clientId: string, params: Record<string, unknown>) =>
    [...capacityQueryKeys.all(clientId), 'dashboard-work-teams', params] as const,
  dashboardPortfolio: (clientId: string, params: Record<string, unknown>) =>
    [...capacityQueryKeys.all(clientId), 'dashboard-portfolio', params] as const,
};
