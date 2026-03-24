export const meQueryKeys = {
  all: ['me'] as const,
  clients: () => [...meQueryKeys.all, 'clients'] as const,
  emailIdentities: () => [...meQueryKeys.all, 'email-identities'] as const,
};
