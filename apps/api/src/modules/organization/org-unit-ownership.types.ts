import type { OrgUnitType } from '@prisma/client';

/** Exposé liste/détail API — jamais UUID seul comme surface « affichable ». */
export type OwnerOrgUnitSummaryDto = {
  id: string;
  name: string;
  type: OrgUnitType;
  code: string | null;
} | null;

export type OwnerOrgUnitSource = 'line' | 'budget' | null;
