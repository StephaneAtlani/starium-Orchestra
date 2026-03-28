/**
 * Bootstrap idempotent de la taxonomie risques (RiskDomain / RiskType) par client.
 * Aligné sur la migration SQL `20260331150000_risk_taxonomy_domains_types` (codes stables).
 */
import type { PrismaClient, ProjectRiskImpactCategory } from '@prisma/client';

export const RISK_DOMAIN_CODES = [
  'GENERAL',
  'FINANCE',
  'OPERATIONS',
  'LEGAL',
  'REPUTATION',
  'STRATEGY',
  'IT',
  'CYBERSECURITY',
] as const;

type DomainDef = {
  code: string;
  name: string;
  description?: string | null;
  types: Array<{ code: string; name: string }>;
};

const DOMAIN_DEFINITIONS: DomainDef[] = [
  {
    code: 'GENERAL',
    name: 'Général',
    types: [{ code: 'UNCLASSIFIED', name: 'Non classé' }],
  },
  {
    code: 'FINANCE',
    name: 'Financier',
    types: [
      { code: 'LEGACY_FINANCIAL', name: 'Ancien mapping impact financier' },
      { code: 'BUDGET_OVERRUN', name: 'Dépassement budgétaire' },
    ],
  },
  {
    code: 'OPERATIONS',
    name: 'Opérationnel',
    types: [{ code: 'LEGACY_OPERATIONAL', name: 'Ancien mapping impact opérationnel' }],
  },
  {
    code: 'LEGAL',
    name: 'Juridique',
    types: [{ code: 'LEGACY_LEGAL', name: 'Ancien mapping impact juridique' }],
  },
  {
    code: 'REPUTATION',
    name: 'Réputation',
    types: [{ code: 'LEGACY_REPUTATION', name: 'Ancien mapping réputation' }],
  },
  {
    code: 'STRATEGY',
    name: 'Stratégie',
    types: [{ code: 'STRATEGIC_MISALIGNMENT', name: 'Décalage stratégique' }],
  },
  {
    code: 'IT',
    name: 'IT',
    types: [{ code: 'IT_OUTAGE', name: 'Indisponibilité SI' }],
  },
  {
    code: 'CYBERSECURITY',
    name: 'Cybersécurité',
    types: [{ code: 'DATA_BREACH', name: 'Fuite / violation de données' }],
  },
];

/** Mapping enum legacy `impactCategory` → type seed (domaine implicite). */
export function legacyImpactToTypeCode(
  impact: ProjectRiskImpactCategory | null | undefined,
): { domainCode: string; typeCode: string } {
  switch (impact) {
    case 'FINANCIAL':
      return { domainCode: 'FINANCE', typeCode: 'LEGACY_FINANCIAL' };
    case 'OPERATIONAL':
      return { domainCode: 'OPERATIONS', typeCode: 'LEGACY_OPERATIONAL' };
    case 'LEGAL':
      return { domainCode: 'LEGAL', typeCode: 'LEGACY_LEGAL' };
    case 'REPUTATION':
      return { domainCode: 'REPUTATION', typeCode: 'LEGACY_REPUTATION' };
    default:
      return { domainCode: 'GENERAL', typeCode: 'UNCLASSIFIED' };
  }
}

export async function ensureRiskTaxonomyForClient(
  prisma: PrismaClient,
  clientId: string,
): Promise<void> {
  for (const d of DOMAIN_DEFINITIONS) {
    const domain = await prisma.riskDomain.upsert({
      where: { clientId_code: { clientId, code: d.code } },
      create: {
        clientId,
        code: d.code,
        name: d.name,
        description: d.description ?? null,
        isActive: true,
      },
      update: {
        name: d.name,
        description: d.description ?? null,
      },
    });
    for (const t of d.types) {
      await prisma.riskType.upsert({
        where: {
          domainId_code: { domainId: domain.id, code: t.code },
        },
        create: {
          clientId,
          domainId: domain.id,
          code: t.code,
          name: t.name,
          isActive: true,
        },
        update: {
          name: t.name,
        },
      });
    }
  }
}

export async function resolveRiskTypeIdForLegacyImpact(
  prisma: PrismaClient,
  clientId: string,
  impactCategory: ProjectRiskImpactCategory | null | undefined,
): Promise<string> {
  const { domainCode, typeCode } = legacyImpactToTypeCode(impactCategory);
  const row = await prisma.riskType.findFirst({
    where: {
      clientId,
      code: typeCode,
      domain: { code: domainCode },
    },
    select: { id: true },
  });
  if (row) return row.id;
  const fallback = await prisma.riskType.findFirst({
    where: { clientId, code: 'UNCLASSIFIED', domain: { code: 'GENERAL' } },
    select: { id: true },
  });
  if (!fallback) {
    throw new Error(
      `Taxonomie risques incomplète pour le client ${clientId} (GENERAL/UNCLASSIFIED manquant).`,
    );
  }
  return fallback.id;
}
