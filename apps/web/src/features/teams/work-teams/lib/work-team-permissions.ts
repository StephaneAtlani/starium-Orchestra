/** Flags dérivés des permissions `teams.*` — utile pour tests et UI cohérente. */
export function getTeamsPermissionFlags(has: (code: string) => boolean) {
  return {
    canReadStructure: has('teams.read'),
    canMutateTeams: has('teams.update'),
    canManageScopes: has('teams.manage_scopes'),
  };
}
