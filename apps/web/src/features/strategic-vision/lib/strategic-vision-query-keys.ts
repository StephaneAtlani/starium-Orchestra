export const strategicVisionKeys = {
  root: (clientId: string) => ['strategic-vision', clientId] as const,
  objectives: (clientId: string) =>
    [...strategicVisionKeys.root(clientId), 'objectives'] as const,
  kpis: (clientId: string) => [...strategicVisionKeys.root(clientId), 'kpis'] as const,
  kpisByDirection: (clientId: string) =>
    [...strategicVisionKeys.root(clientId), 'kpis-by-direction'] as const,
  directions: (clientId: string) =>
    [...strategicVisionKeys.root(clientId), 'directions'] as const,
  alerts: (
    clientId: string,
    filters?: { directionId?: string; unassigned?: boolean },
  ) =>
    [
      ...strategicVisionKeys.root(clientId),
      'alerts',
      filters?.directionId ?? null,
      filters?.unassigned ?? false,
    ] as const,
};
