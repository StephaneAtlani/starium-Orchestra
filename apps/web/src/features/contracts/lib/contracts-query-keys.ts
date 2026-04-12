export const contractsKeys = {
  root: (clientId: string) => ['contracts', clientId] as const,
  list: (
    clientId: string,
    params: Record<string, string | number | undefined>,
  ) => [...contractsKeys.root(clientId), 'list', params] as const,
  detail: (clientId: string, contractId: string) =>
    [...contractsKeys.root(clientId), 'detail', contractId] as const,
  attachments: (clientId: string, contractId: string) =>
    [...contractsKeys.root(clientId), 'attachments', contractId] as const,
  kindTypesMerged: (clientId: string) =>
    [...contractsKeys.root(clientId), 'kind-types-merged'] as const,
};
