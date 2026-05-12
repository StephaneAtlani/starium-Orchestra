/** RFC-ORG-003 — résumé unité propriétaire (aligné API Nest). */
export type OwnerOrgUnitSummary = {
  id: string;
  name: string;
  type: string;
  code: string | null;
} | null;
