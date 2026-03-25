/** RFC-PROJ-OPT-001 — query keys (inclut toujours clientId). */
export const projectOptionsKeys = {
  all: (clientId: string) => ['projects', 'options', clientId] as const,
  detail: (clientId: string, projectId: string) =>
    [...projectOptionsKeys.all(clientId), projectId] as const,
  microsoftLink: (clientId: string, projectId: string) =>
    ['projects', 'microsoft-link', clientId, projectId] as const,
};
