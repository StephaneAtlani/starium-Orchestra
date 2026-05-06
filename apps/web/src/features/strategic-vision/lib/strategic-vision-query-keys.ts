export const strategicVisionKeys = {
  all: (clientId: string) => ['strategic-vision', clientId] as const,
  list: (clientId: string) => [...strategicVisionKeys.all(clientId), 'list'] as const,
  detail: (clientId: string, visionId: string) =>
    [...strategicVisionKeys.all(clientId), 'detail', visionId] as const,
  axes: (clientId: string, visionId: string | null = 'active') =>
    [...strategicVisionKeys.all(clientId), visionId ?? 'active', 'axes'] as const,
  objectives: (clientId: string, axisId: string | null = 'all') =>
    [...strategicVisionKeys.all(clientId), 'axis', axisId ?? 'all', 'objectives'] as const,
  links: (clientId: string, objectiveId: string) =>
    [...strategicVisionKeys.all(clientId), 'objective', objectiveId, 'links'] as const,
  kpis: (clientId: string) => [...strategicVisionKeys.all(clientId), 'kpis'] as const,
  kpisByDirection: (clientId: string) =>
    [...strategicVisionKeys.all(clientId), 'kpis-by-direction'] as const,
  directions: (clientId: string) => [...strategicVisionKeys.all(clientId), 'directions'] as const,
  alertsBase: (clientId: string) => [...strategicVisionKeys.all(clientId), 'alerts'] as const,
  alerts: (
    clientId: string,
    filters?: { directionId?: string; unassigned?: boolean },
  ) =>
    [
      ...strategicVisionKeys.alertsBase(clientId),
      filters?.directionId ?? null,
      filters?.unassigned ?? false,
    ] as const,
  // Legacy aliases: conserver durant migration progressive.
  root: (clientId: string) => strategicVisionKeys.all(clientId),
};
