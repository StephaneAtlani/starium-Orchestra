export const licensesCockpitKeys = {
  all: ['licenses-cockpit'] as const,
  platformClientUsers: (clientId: string) =>
    [...licensesCockpitKeys.all, 'platform-client-users', clientId] as const,
};
