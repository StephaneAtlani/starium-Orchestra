import type { OrgOwnershipPolicyMode } from '@prisma/client';
import { FLAG_KEYS } from '../feature-flags/flag-keys';

export const ORG_OWNERSHIP_POLICY_FLAG_KEY = FLAG_KEYS.ORG_OWNERSHIP_REQUIRED;

export type OrganizationOwnershipPolicyView = {
  mode: OrgOwnershipPolicyMode;
  enforcementEnabled: boolean;
  flagKey: typeof ORG_OWNERSHIP_POLICY_FLAG_KEY;
};
