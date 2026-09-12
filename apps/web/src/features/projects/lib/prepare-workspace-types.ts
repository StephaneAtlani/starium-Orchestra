/** Mapping Point projet → code kit atelier (prep-workspace). */

export type PrepWorkspaceMode = 'simple' | 'sections';

export type PrepWorkspaceCustomBlock = {
  id: string;
  title: string;
  defaultMin: number;
};

export type PrepWorkspacePayload = {
  mode: PrepWorkspaceMode;
  selectedBlockIds: string[];
  customBlocks: PrepWorkspaceCustomBlock[];
  templateId: string | null;
  templateEditorOpen?: boolean;
};

export const PREP_TYPE_CODE = {
  COPIL: 'COPIL',
  COPROJ: 'COPROJ',
  REVUE: 'REVUE',
  REX: 'REX',
  BUDGET: 'BUDGET',
  ARBITRAGE: 'ARBITRAGE',
  CRISE: 'CRISE',
  CODIR: 'CODIR',
  RISQUES: 'RISQUES',
  JALONS: 'JALONS',
  ADHOC: 'ADHOC',
} as const;

export type PrepTypeCode = (typeof PREP_TYPE_CODE)[keyof typeof PREP_TYPE_CODE];

const REVIEW_TYPE_TO_TYPE_CODE: Record<string, PrepTypeCode> = {
  COPIL: PREP_TYPE_CODE.COPIL,
  COPRO: PREP_TYPE_CODE.COPROJ,
  PROJECT_REVIEW: PREP_TYPE_CODE.REVUE,
  POST_MORTEM: PREP_TYPE_CODE.REX,
  BUDGET_REVIEW: PREP_TYPE_CODE.BUDGET,
  ARBITRATION: PREP_TYPE_CODE.ARBITRAGE,
  CRISIS_POINT: PREP_TYPE_CODE.CRISE,
  CODIR_REVIEW: PREP_TYPE_CODE.CODIR,
  RISK_REVIEW: PREP_TYPE_CODE.RISQUES,
  MILESTONE_REVIEW: PREP_TYPE_CODE.JALONS,
  AD_HOC: PREP_TYPE_CODE.ADHOC,
  OTHER: PREP_TYPE_CODE.ADHOC,
};

export function reviewTypeToTypeCode(reviewType: string): PrepTypeCode {
  return REVIEW_TYPE_TO_TYPE_CODE[reviewType] ?? PREP_TYPE_CODE.ADHOC;
}

export function typeCodeLabel(typeCode: PrepTypeCode): string {
  const labels: Record<PrepTypeCode, string> = {
    COPIL: 'Comité de pilotage',
    COPROJ: 'Comité projet',
    REVUE: 'Point projet',
    REX: "Retour d'expérience",
    BUDGET: 'Revue budgétaire',
    ARBITRAGE: 'Arbitrage',
    CRISE: 'Point de crise',
    CODIR: 'Point CODIR',
    RISQUES: 'Point risques',
    JALONS: 'Point jalons',
    ADHOC: 'Point ad hoc',
  };
  return labels[typeCode];
}

/** Préfixe notes agenda pour lier un bloc PW (Lot A, sans migration Prisma). */
export function pwBlockNotesMarker(blockId: string): string {
  return `[pw:${blockId}]`;
}

export function parsePwBlockIdFromNotes(
  notes: string | null | undefined,
): string | null {
  if (!notes) return null;
  const m = /^\[pw:([^\]]+)\]/.exec(notes.trim());
  return m?.[1] ?? null;
}

export function defaultPrepWorkspace(
  selectedBlockIds: string[],
): PrepWorkspacePayload {
  return {
    mode: 'simple',
    selectedBlockIds,
    customBlocks: [],
    templateId: null,
  };
}

export function parsePrepWorkspace(
  contentPayload: unknown,
  fallbackSelected: string[],
): PrepWorkspacePayload {
  const root =
    contentPayload &&
    typeof contentPayload === 'object' &&
    !Array.isArray(contentPayload)
      ? (contentPayload as Record<string, unknown>)
      : null;
  const raw = root?.prepWorkspace;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return defaultPrepWorkspace(fallbackSelected);
  }
  const o = raw as Record<string, unknown>;
  const mode = o.mode === 'sections' ? 'sections' : 'simple';
  const selectedBlockIds = Array.isArray(o.selectedBlockIds)
    ? o.selectedBlockIds.filter((id): id is string => typeof id === 'string')
    : fallbackSelected;
  const customBlocks = Array.isArray(o.customBlocks)
    ? o.customBlocks
        .filter(
          (b): b is PrepWorkspaceCustomBlock =>
            !!b &&
            typeof b === 'object' &&
            typeof (b as PrepWorkspaceCustomBlock).id === 'string' &&
            typeof (b as PrepWorkspaceCustomBlock).title === 'string' &&
            typeof (b as PrepWorkspaceCustomBlock).defaultMin === 'number',
        )
        .map((b) => ({
          id: b.id,
          title: b.title,
          defaultMin: b.defaultMin,
        }))
    : [];
  const templateId =
    typeof o.templateId === 'string' || o.templateId === null
      ? (o.templateId as string | null)
      : null;
  return {
    mode,
    selectedBlockIds,
    customBlocks,
    templateId,
    templateEditorOpen: o.templateEditorOpen === true,
  };
}

export function mergeContentPayloadWithPrep(
  contentPayload: unknown,
  prepWorkspace: PrepWorkspacePayload,
): Record<string, unknown> {
  const base =
    contentPayload &&
    typeof contentPayload === 'object' &&
    !Array.isArray(contentPayload)
      ? { ...(contentPayload as Record<string, unknown>) }
      : {};
  return { ...base, prepWorkspace };
}
