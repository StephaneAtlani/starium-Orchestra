export const strategicDirectionStrategyKeys = {
  root: (clientId: string) => ['strategic-direction-strategies', clientId] as const,
  list: (
    clientId: string,
    filters?: {
      directionId?: string;
      alignedVisionId?: string;
      status?: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'ARCHIVED';
      search?: string;
      includeArchived?: boolean;
    },
  ) =>
    [
      ...strategicDirectionStrategyKeys.root(clientId),
      'list',
      'v3',
      filters?.directionId ?? null,
      filters?.alignedVisionId ?? null,
      filters?.status ?? null,
      filters?.search ?? null,
      filters?.includeArchived ?? false,
    ] as const,
  detail: (clientId: string, strategyId: string | null) =>
    [...strategicDirectionStrategyKeys.root(clientId), 'detail', strategyId] as const,
  links: (clientId: string, strategyId: string | null) =>
    [...strategicDirectionStrategyKeys.root(clientId), 'links', strategyId] as const,
  versions: (clientId: string, strategyId: string | null) =>
    [...strategicDirectionStrategyKeys.root(clientId), 'versions', strategyId] as const,
  compare: (clientId: string, baseStrategyId: string | null, targetStrategyId: string | null) =>
    [
      ...strategicDirectionStrategyKeys.root(clientId),
      'compare',
      baseStrategyId,
      targetStrategyId,
    ] as const,
  workflowSettings: (clientId: string) =>
    [...strategicDirectionStrategyKeys.root(clientId), 'workflow-settings'] as const,
  validatorOptions: (clientId: string) =>
    [...strategicDirectionStrategyKeys.root(clientId), 'validator-options'] as const,
};
