import {
  ProjectGovernanceCircleSystemKind,
  ProjectTeamColorToken,
} from '@prisma/client';

export const PROJECT_TEAM_COLOR_TOKENS: ReadonlyArray<ProjectTeamColorToken> = [
  ProjectTeamColorToken.BROWN,
  ProjectTeamColorToken.BLUE,
  ProjectTeamColorToken.VIOLET,
  ProjectTeamColorToken.TEAL,
  ProjectTeamColorToken.GREEN,
  ProjectTeamColorToken.RED,
];

export const DEFAULT_PROJECT_GOVERNANCE_CIRCLES: ReadonlyArray<{
  systemKind: ProjectGovernanceCircleSystemKind;
  name: string;
  label: string;
  colorToken: ProjectTeamColorToken;
  sortOrder: number;
}> = [
  {
    systemKind: ProjectGovernanceCircleSystemKind.COPROJ,
    name: 'COPROJ',
    label: 'Comité projet — hebdomadaire',
    colorToken: ProjectTeamColorToken.BROWN,
    sortOrder: 0,
  },
  {
    systemKind: ProjectGovernanceCircleSystemKind.COPIL,
    name: 'COPIL',
    label: 'Comité de pilotage — mensuel',
    colorToken: ProjectTeamColorToken.BLUE,
    sortOrder: 1,
  },
];

/** Équipe seed sans systemKind (COTECH). */
export const DEFAULT_COTECH_TEAM = {
  name: 'COTECH',
  label: 'Architecture & SSI',
  colorToken: ProjectTeamColorToken.RED,
  sortOrder: 2,
} as const;

export type ProjectTeamMemberResponse = {
  identityKey: string;
  userId: string | null;
  resourceId: string | null;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  /** E-mail externe (invitations) si pas de compte. */
  email: string | null;
  sortOrder: number;
};

export type ProjectGovernanceCircleResponse = {
  id: string;
  clientId: string;
  projectId: string;
  name: string;
  label: string | null;
  colorToken: ProjectTeamColorToken;
  pilotIdentityKey: string | null;
  pilotDisplayName: string | null;
  systemKind: ProjectGovernanceCircleSystemKind | null;
  sortOrder: number;
  isSystem: boolean;
  memberCount: number;
  reviewConvocationCount: number;
  members: ProjectTeamMemberResponse[];
  /** Lien permanent équipe ↔ modèle de point. */
  prepareTemplateId: string | null;
  prepareTemplateName: string | null;
  prepareTemplateTypeCode: string | null;
};

export function mapGovernanceCircle(
  row: {
    id: string;
    clientId: string;
    projectId: string;
    name: string;
    label?: string | null;
    colorToken?: ProjectTeamColorToken | null;
    pilotIdentityKey?: string | null;
    systemKind: ProjectGovernanceCircleSystemKind | null;
    sortOrder: number;
    prepareTemplateId?: string | null;
  },
  extras?: {
    members?: ProjectTeamMemberResponse[];
    reviewConvocationCount?: number;
    pilotDisplayName?: string | null;
    prepareTemplateName?: string | null;
    prepareTemplateTypeCode?: string | null;
  },
): ProjectGovernanceCircleResponse {
  const members = extras?.members ?? [];
  return {
    id: row.id,
    clientId: row.clientId,
    projectId: row.projectId,
    name: row.name,
    label: row.label ?? null,
    colorToken: row.colorToken ?? ProjectTeamColorToken.BROWN,
    pilotIdentityKey: row.pilotIdentityKey ?? null,
    pilotDisplayName: extras?.pilotDisplayName ?? null,
    systemKind: row.systemKind,
    sortOrder: row.sortOrder,
    isSystem: row.systemKind != null,
    memberCount: members.length,
    reviewConvocationCount: extras?.reviewConvocationCount ?? 0,
    members,
    prepareTemplateId: row.prepareTemplateId ?? null,
    prepareTemplateName: extras?.prepareTemplateName ?? null,
    prepareTemplateTypeCode: extras?.prepareTemplateTypeCode ?? null,
  };
}
