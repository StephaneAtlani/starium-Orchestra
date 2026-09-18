export const procedureQueryKeys = {
  all: (clientId: string) => ['procedures', clientId] as const,
  list: (clientId: string, filters?: Record<string, unknown>) =>
    [...procedureQueryKeys.all(clientId), 'list', filters ?? {}] as const,
  detail: (clientId: string, id: string) =>
    [...procedureQueryKeys.all(clientId), 'detail', id] as const,
  settings: (clientId: string) =>
    [...procedureQueryKeys.all(clientId), 'settings'] as const,
  categories: (clientId: string, activeOnly?: boolean) =>
    [...procedureQueryKeys.all(clientId), 'categories', { activeOnly }] as const,
};
