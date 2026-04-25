export const strategicVisionKeys = {
  root: (clientId: string) => ['strategic-vision', clientId] as const,
  objectives: (clientId: string) =>
    [...strategicVisionKeys.root(clientId), 'objectives'] as const,
  kpis: (clientId: string) => [...strategicVisionKeys.root(clientId), 'kpis'] as const,
  alerts: (clientId: string) => [...strategicVisionKeys.root(clientId), 'alerts'] as const,
};
