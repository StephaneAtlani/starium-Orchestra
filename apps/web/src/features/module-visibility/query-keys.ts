export const moduleVisibilityKeys = {
  all: ['module-visibility'] as const,
  matrix: (activeClientId: string) =>
    [...moduleVisibilityKeys.all, 'matrix', activeClientId] as const,
};
