export const strategicVisionKeys = {
  root: (clientId: string) => ['strategic-vision', clientId] as const,
  objectives: (
    clientId: string,
    filters: Record<string, string | number | undefined>,
  ) => [...strategicVisionKeys.root(clientId), 'objectives', filters] as const,
  kpis: (clientId: string) => [...strategicVisionKeys.root(clientId), 'kpis'] as const,
  alerts: (clientId: string) => [...strategicVisionKeys.root(clientId), 'alerts'] as const,
  axes: (clientId: string) => [...strategicVisionKeys.root(clientId), 'axes'] as const,
};
