import type { OrgUnitType } from '@prisma/client';
import type { EntityVisual } from '@starium-orchestra/types';

/** Exposé liste/détail API — jamais UUID seul comme surface « affichable ». */
export type OwnerOrgUnitSummaryDto = {
  id: string;
  name: string;
  type: OrgUnitType;
  code: string | null;
  visual?: EntityVisual | null;
} | null;

export type OwnerOrgUnitSource = 'line' | 'budget' | null;
