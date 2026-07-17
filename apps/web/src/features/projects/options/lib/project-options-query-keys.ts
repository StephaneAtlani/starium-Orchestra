/** RFC-PROJ-OPT-001 — query keys (inclut toujours clientId). */
export const projectOptionsKeys = {
  all: (clientId: string) => ['projects', 'options', clientId] as const,
  detail: (clientId: string, projectId: string) =>
    [...projectOptionsKeys.all(clientId), projectId] as const,
  microsoftTeamsProvisioningSettings: (clientId: string) =>
    ['projects', 'microsoft-teams-provisioning-settings', clientId] as const,
  microsoftTeamsChannelTemplates: (clientId: string) =>
    ['projects', 'microsoft-teams-channel-templates', clientId] as const,
  microsoftLink: (clientId: string, projectId: string) =>
    ['projects', 'microsoft-link', clientId, projectId] as const,
  microsoftProvisioning: (clientId: string, projectId: string) =>
    ['projects', 'microsoft-teams-provisioning', clientId, projectId] as const,
};
