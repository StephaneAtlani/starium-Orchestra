/** Actions audit RFC-ORG-001 §11 */
export const ORGANIZATION_AUDIT = {
  UNIT_CREATED: 'organization.unit.created',
  UNIT_UPDATED: 'organization.unit.updated',
  UNIT_ARCHIVED: 'organization.unit.archived',
  UNIT_MEMBER_ADDED: 'organization.unit.member.added',
  UNIT_MEMBER_REMOVED: 'organization.unit.member.removed',
  GROUP_CREATED: 'organization.group.created',
  GROUP_UPDATED: 'organization.group.updated',
  GROUP_ARCHIVED: 'organization.group.archived',
  GROUP_MEMBER_ADDED: 'organization.group.member.added',
  GROUP_MEMBER_REMOVED: 'organization.group.member.removed',
} as const;

export const ORG_AUDIT_RESOURCE_TYPES = {
  ORG_UNIT: 'org_unit',
  ORG_GROUP: 'org_group',
  ORG_UNIT_MEMBERSHIP: 'org_unit_membership',
  ORG_GROUP_MEMBERSHIP: 'org_group_membership',
} as const;
