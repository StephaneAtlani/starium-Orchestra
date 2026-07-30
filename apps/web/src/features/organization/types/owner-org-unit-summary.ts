/** RFC-ORG-003 — résumé unité propriétaire (aligné API Nest). */
import type { EntityVisual } from '@starium-orchestra/types';

export type OwnerOrgUnitSummary = {
  id: string;
  name: string;
  type: string;
  code: string | null;
  visual?: EntityVisual | null;
} | null;
