export const procedureQueryKeys = {
  all: (clientId: string) => ['procedures', clientId] as const,
  list: (clientId: string, filters?: Record<string, unknown>) =>
    [...procedureQueryKeys.all(clientId), 'list', filters ?? {}] as const,
  detail: (clientId: string, id: string) =>
    [...procedureQueryKeys.all(clientId), 'detail', id] as const,
};
