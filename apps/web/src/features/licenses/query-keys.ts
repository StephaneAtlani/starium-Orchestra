export const licensesKeys = {
  all: ['licenses'] as const,
  platformSubscriptions: (clientId: string) =>
    [...licensesKeys.all, 'platform-subscriptions', clientId] as const,
  platformUsage: (clientId: string) =>
    [...licensesKeys.all, 'platform-usage', clientId] as const,
  clientUsage: (activeClientId: string) =>
    [...licensesKeys.all, 'client-usage', activeClientId] as const,
};
