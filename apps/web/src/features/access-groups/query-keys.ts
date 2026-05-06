export const accessGroupsKeys = {
  all: ['access-groups'] as const,
  list: (activeClientId: string) =>
    [...accessGroupsKeys.all, 'list', activeClientId] as const,
  group: (activeClientId: string, groupId: string) =>
    [...accessGroupsKeys.all, 'group', activeClientId, groupId] as const,
  members: (activeClientId: string, groupId: string) =>
    [...accessGroupsKeys.all, 'members', activeClientId, groupId] as const,
};
