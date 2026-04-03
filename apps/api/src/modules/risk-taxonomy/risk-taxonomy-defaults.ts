/**
 * Bootstrap idempotent de la taxonomie risques (RiskDomain / RiskType) par client.
 * Référence métier : domaines et types normalisés (codes stables en SCREAMING_SNAKE_CASE).
 */
import type { PrismaClient, ProjectRiskImpactCategory } from '@prisma/client';

/** Domaines connus (hors extension admin client). */
export const RISK_DOMAIN_CODES = [
  'GENERAL',
  'STRATEGY',
  'GOVERNANCE',
  'FINANCE',
  'OPERATIONS',
  'HUMAN_RESOURCES',
  'IT',
  'CYBERSECURITY',
  'DATA',
  'LEGAL',
  'COMPLIANCE',
  'TAX',
  'REPUTATION',
  'SUPPLIERS',
  'PARTNERS',
  'CUSTOMERS',
  'PRODUCTS_SERVICES',
  'INNOVATION',
  'PROJECTS',
  'ASSETS',
  'PHYSICAL_SECURITY',
  'ENVIRONMENTAL',
  'SOCIAL',
  'GEOPOLITICAL',
  'ECONOMIC',
  'DEPENDENCY',
  'THIRD_PARTY',
  'CONTINUITY',
] as const;

type DomainDef = {
  code: string;
  name: string;
  description?: string | null;
  types: Array<{ code: string; name: string }>;
};

/**
 * Taxonomie par défaut : domaine → types.
 * Les libellés `name` sont en français (affichage UI / registre).
 */
const DOMAIN_DEFINITIONS: DomainDef[] = [
  {
    code: 'GENERAL',
    name: 'Général',
    types: [{ code: 'UNCLASSIFIED', name: 'Non classé' }],
  },
  {
    code: 'STRATEGY',
    name: 'Stratégie',
    types: [
      { code: 'STRATEGIC_MISALIGNMENT', name: 'Désalignement stratégique' },
      { code: 'WRONG_POSITIONING', name: 'Mauvais positionnement' },
      { code: 'MARKET_EVOLUTION_MISSED', name: 'Évolution de marché non anticipée' },
      { code: 'FAILED_MERGER_ACQUISITION', name: 'Échec fusion / acquisition' },
      { code: 'BUSINESS_MODEL_FAILURE', name: 'Défaillance du modèle économique' },
      { code: 'INVESTMENT_MISALLOCATION', name: 'Mauvaise allocation des investissements' },
      { code: 'LOSS_OF_COMPETITIVE_ADVANTAGE', name: 'Perte d’avantage concurrentiel' },
    ],
  },
  {
    code: 'GOVERNANCE',
    name: 'Gouvernance',
    types: [
      { code: 'POOR_DECISION_PROCESS', name: 'Processus de décision défaillant' },
      { code: 'LACK_OF_STEERING', name: 'Pilotage insuffisant' },
      { code: 'NO_CLEAR_ACCOUNTABILITY', name: 'Responsabilités floues' },
      { code: 'KPI_MISSING_OR_UNUSED', name: 'KPI absents ou inutilisés' },
      { code: 'CONFLICT_OF_INTEREST', name: 'Conflit d’intérêts' },
      { code: 'MANAGEMENT_FAILURE', name: 'Défaillance de direction' },
    ],
  },
  {
    code: 'FINANCE',
    name: 'Finance',
    types: [
      { code: 'BUDGET_OVERRUN', name: 'Dépassement budgétaire' },
      { code: 'CASHFLOW_SHORTAGE', name: 'Tension de trésorerie' },
      { code: 'LIQUIDITY_RISK', name: 'Risque de liquidité' },
      { code: 'PROFITABILITY_DROP', name: 'Baisse de rentabilité' },
      { code: 'COST_UNDER_ESTIMATION', name: 'Sous-estimation des coûts' },
      { code: 'FRAUD', name: 'Fraude' },
      { code: 'FINANCIAL_REPORTING_ERROR', name: 'Erreur de reporting financier' },
    ],
  },
  {
    code: 'OPERATIONS',
    name: 'Opérations',
    types: [
      { code: 'PROCESS_BREAKDOWN', name: 'Rupture de processus' },
      { code: 'DELIVERY_DELAY', name: 'Retard de livraison' },
      { code: 'SERVICE_INTERRUPTION', name: 'Interruption de service' },
      { code: 'RESOURCE_SHORTAGE', name: 'Manque de ressources' },
      { code: 'CAPACITY_OVERLOAD', name: 'Surcharge de capacité' },
      { code: 'QUALITY_FAILURE', name: 'Défaut de qualité' },
      { code: 'INTERNAL_COORDINATION_FAILURE', name: 'Défaillance de coordination interne' },
    ],
  },
  {
    code: 'HUMAN_RESOURCES',
    name: 'Ressources humaines',
    types: [
      { code: 'SKILL_SHORTAGE', name: 'Manque de compétences' },
      { code: 'KEY_PERSON_DEPENDENCY', name: 'Dépendance à un acteur clé' },
      { code: 'HIGH_TURNOVER', name: 'Turnover élevé' },
      { code: 'ABSENTEEISM', name: 'Absentéisme' },
      { code: 'INTERNAL_CONFLICT', name: 'Conflit interne' },
      { code: 'LOW_ENGAGEMENT', name: 'Faible engagement' },
      { code: 'BURNOUT', name: 'Burn-out' },
      { code: 'RECRUITMENT_FAILURE', name: 'Échec de recrutement' },
    ],
  },
  {
    code: 'IT',
    name: 'IT',
    types: [
      { code: 'SYSTEM_OUTAGE', name: 'Indisponibilité système' },
      { code: 'APPLICATION_FAILURE', name: 'Défaillance applicative' },
      { code: 'PERFORMANCE_DEGRADATION', name: 'Dégradation des performances' },
      { code: 'TECHNICAL_DEBT', name: 'Dette technique' },
      { code: 'ARCHITECTURE_LIMITATION', name: 'Limitation d’architecture' },
      { code: 'OBSOLESCENCE', name: 'Obsolescence' },
      { code: 'INTEGRATION_FAILURE', name: 'Échec d’intégration' },
    ],
  },
  {
    code: 'CYBERSECURITY',
    name: 'Cybersécurité',
    types: [
      { code: 'UNAUTHORIZED_ACCESS', name: 'Accès non autorisé' },
      { code: 'DATA_BREACH', name: 'Fuite / violation de données' },
      { code: 'RANSOMWARE_ATTACK', name: 'Attaque ransomware' },
      { code: 'PHISHING_ATTACK', name: 'Attaque par hameçonnage' },
      { code: 'VULNERABILITY_EXPLOITATION', name: 'Exploitation de vulnérabilité' },
      { code: 'PRIVILEGE_ESCALATION', name: 'Élévation de privilèges' },
      { code: 'IDENTITY_COMPROMISE', name: 'Compromission d’identité' },
      { code: 'DENIAL_OF_SERVICE', name: 'Déni de service' },
    ],
  },
  {
    code: 'DATA',
    name: 'Données',
    types: [
      { code: 'DATA_LOSS', name: 'Perte de données' },
      { code: 'DATA_CORRUPTION', name: 'Corruption de données' },
      { code: 'DATA_INCONSISTENCY', name: 'Incohérence des données' },
      { code: 'POOR_DATA_QUALITY', name: 'Mauvaise qualité des données' },
      { code: 'DATA_UNAVAILABILITY', name: 'Indisponibilité des données' },
      { code: 'WRONG_ANALYTICS', name: 'Analyses erronées' },
      { code: 'DECISION_ON_INVALID_DATA', name: 'Décision sur données invalides' },
    ],
  },
  {
    code: 'LEGAL',
    name: 'Juridique',
    types: [
      { code: 'CONTRACT_BREACH', name: 'Violation de contrat' },
      { code: 'LITIGATION', name: 'Contentieux' },
      { code: 'LIABILITY_EXPOSURE', name: 'Exposition à la responsabilité' },
      { code: 'NON_COMPLIANT_CONTRACT', name: 'Contrat non conforme' },
      { code: 'INTELLECTUAL_PROPERTY_ISSUE', name: 'Problème de propriété intellectuelle' },
    ],
  },
  {
    code: 'COMPLIANCE',
    name: 'Conformité',
    types: [
      { code: 'REGULATORY_NON_COMPLIANCE', name: 'Non-conformité réglementaire' },
      { code: 'AUDIT_FAILURE', name: 'Échec d’audit' },
      { code: 'CONTROL_DEFICIENCY', name: 'Défaut de contrôle interne' },
      { code: 'DOCUMENTATION_GAP', name: 'Lacune documentaire' },
      { code: 'CERTIFICATION_LOSS', name: 'Perte de certification' },
    ],
  },
  {
    code: 'TAX',
    name: 'Fiscalité',
    types: [
      { code: 'TAX_NON_COMPLIANCE', name: 'Non-conformité fiscale' },
      { code: 'TAX_OPTIMIZATION_RISK', name: 'Risque lié à l’optimisation fiscale' },
      { code: 'TAX_PENALTY', name: 'Pénalité fiscale' },
      { code: 'VAT_ERROR', name: 'Erreur de TVA' },
    ],
  },
  {
    code: 'REPUTATION',
    name: 'Réputation',
    types: [
      { code: 'BRAND_DAMAGE', name: 'Atteinte à la marque' },
      { code: 'NEGATIVE_MEDIA_EXPOSURE', name: 'Exposition médiatique négative' },
      { code: 'SOCIAL_MEDIA_CRISIS', name: 'Crise sur les réseaux sociaux' },
      { code: 'CUSTOMER_TRUST_LOSS', name: 'Perte de confiance client' },
    ],
  },
  {
    code: 'SUPPLIERS',
    name: 'Fournisseurs',
    types: [
      { code: 'SUPPLIER_DEFAULT', name: 'Défaillance fournisseur' },
      { code: 'DELIVERY_FAILURE', name: 'Échec de livraison' },
      { code: 'QUALITY_DEFECT', name: 'Défaut de qualité' },
      { code: 'COST_INCREASE', name: 'Hausse de coûts' },
      { code: 'SINGLE_SUPPLIER_DEPENDENCY', name: 'Dépendance à un fournisseur unique' },
    ],
  },
  {
    code: 'PARTNERS',
    name: 'Partenaires',
    types: [
      { code: 'PARTNER_FAILURE', name: 'Défaillance partenaire' },
      { code: 'MISALIGNED_INTERESTS', name: 'Intérêts non alignés' },
      { code: 'PARTNERSHIP_BREAKDOWN', name: 'Rupture de partenariat' },
    ],
  },
  {
    code: 'CUSTOMERS',
    name: 'Clients',
    types: [
      { code: 'CUSTOMER_CHURN', name: 'Départ de clients' },
      { code: 'NON_PAYMENT', name: 'Impayés' },
      { code: 'CUSTOMER_DISSATISFACTION', name: 'Insatisfaction client' },
      { code: 'CONTRACT_TERMINATION', name: 'Résiliation de contrat' },
    ],
  },
  {
    code: 'PRODUCTS_SERVICES',
    name: 'Produits & services',
    types: [
      { code: 'PRODUCT_DEFECT', name: 'Défaut de produit' },
      { code: 'SERVICE_FAILURE', name: 'Défaillance du service' },
      { code: 'NON_COMPLIANCE_PRODUCT', name: 'Non-conformité produit' },
      { code: 'SAFETY_ISSUE', name: 'Problème de sécurité (sûreté)' },
    ],
  },
  {
    code: 'INNOVATION',
    name: 'Innovation',
    types: [
      { code: 'TECHNOLOGY_FAILURE', name: 'Échec technologique' },
      { code: 'R_AND_D_FAILURE', name: 'Échec R&D' },
      { code: 'WRONG_TECHNOLOGY_CHOICE', name: 'Mauvais choix technologique' },
      { code: 'LATE_INNOVATION', name: 'Innovation tardive' },
    ],
  },
  {
    code: 'PROJECTS',
    name: 'Projets',
    types: [
      { code: 'PROJECT_DELAY', name: 'Retard de projet' },
      { code: 'COST_OVERRUN_PROJECT', name: 'Dépassement de coût projet' },
      { code: 'SCOPE_CREEP', name: 'Dérive du périmètre' },
      { code: 'PROJECT_FAILURE', name: 'Échec de projet' },
      { code: 'RESOURCE_MISMANAGEMENT', name: 'Mauvaise gestion des ressources' },
    ],
  },
  {
    code: 'ASSETS',
    name: 'Actifs',
    types: [
      { code: 'ASSET_LOSS', name: 'Perte d’actif' },
      { code: 'ASSET_DAMAGE', name: 'Dégât sur actif' },
      { code: 'MISUSE_OF_ASSETS', name: 'Mauvaise utilisation des actifs' },
    ],
  },
  {
    code: 'PHYSICAL_SECURITY',
    name: 'Sécurité physique',
    types: [
      { code: 'INTRUSION', name: 'Intrusion' },
      { code: 'THEFT', name: 'Vol' },
      { code: 'VANDALISM', name: 'Vandalisme' },
      { code: 'SAFETY_INCIDENT', name: 'Incident de sûreté' },
    ],
  },
  {
    code: 'ENVIRONMENTAL',
    name: 'Environnement',
    types: [
      { code: 'POLLUTION', name: 'Pollution' },
      { code: 'ENVIRONMENTAL_DAMAGE', name: 'Dommage environnemental' },
      { code: 'NON_COMPLIANCE_ENVIRONMENT', name: 'Non-conformité environnementale' },
      { code: 'CLIMATE_IMPACT', name: 'Impact climatique' },
    ],
  },
  {
    code: 'SOCIAL',
    name: 'Social',
    types: [
      { code: 'SOCIAL_CONFLICT', name: 'Conflit social' },
      { code: 'STRIKE', name: 'Grève' },
      { code: 'ETHICAL_ISSUE', name: 'Problème d’éthique' },
      { code: 'HUMAN_RIGHTS_VIOLATION', name: 'Violation des droits humains' },
    ],
  },
  {
    code: 'GEOPOLITICAL',
    name: 'Géopolitique',
    types: [
      { code: 'POLITICAL_INSTABILITY', name: 'Instabilité politique' },
      { code: 'WAR', name: 'Guerre' },
      { code: 'SANCTIONS', name: 'Sanctions' },
      { code: 'BORDER_RESTRICTIONS', name: 'Restrictions aux frontières' },
    ],
  },
  {
    code: 'ECONOMIC',
    name: 'Économique',
    types: [
      { code: 'MARKET_CRISIS', name: 'Crise de marché' },
      { code: 'INFLATION', name: 'Inflation' },
      { code: 'INTEREST_RATE_INCREASE', name: 'Hausse des taux d’intérêt' },
      { code: 'CURRENCY_FLUCTUATION', name: 'Fluctuation de change' },
    ],
  },
  {
    code: 'DEPENDENCY',
    name: 'Dépendance',
    types: [
      { code: 'VENDOR_LOCK_IN', name: 'Verrouillage fournisseur' },
      { code: 'TECHNOLOGY_DEPENDENCY', name: 'Dépendance technologique' },
      { code: 'KEY_RESOURCE_DEPENDENCY', name: 'Dépendance à une ressource clé' },
    ],
  },
  {
    code: 'THIRD_PARTY',
    name: 'Tiers',
    types: [
      { code: 'THIRD_PARTY_FAILURE', name: 'Défaillance d’un tiers' },
      { code: 'OUTSOURCING_RISK', name: 'Risque d’externalisation' },
      { code: 'EXTERNAL_SECURITY_RISK', name: 'Risque de sécurité externe' },
    ],
  },
  {
    code: 'CONTINUITY',
    name: 'Continuité d’activité',
    types: [
      { code: 'BUSINESS_INTERRUPTION', name: 'Interruption d’activité' },
      { code: 'DISASTER', name: 'Catastrophe' },
      { code: 'RECOVERY_FAILURE', name: 'Échec de reprise' },
      { code: 'NO_BCP_PLAN', name: 'Absence de plan de continuité (PCA/PRI)' },
    ],
  },
];

/** Mapping enum legacy `impactCategory` → type seed (domaine explicite). */
export function legacyImpactToTypeCode(
  impact: ProjectRiskImpactCategory | null | undefined,
): { domainCode: string; typeCode: string } {
  switch (impact) {
    case 'FINANCIAL':
      return { domainCode: 'FINANCE', typeCode: 'BUDGET_OVERRUN' };
    case 'OPERATIONAL':
      return { domainCode: 'OPERATIONS', typeCode: 'PROCESS_BREAKDOWN' };
    case 'LEGAL':
      return { domainCode: 'LEGAL', typeCode: 'CONTRACT_BREACH' };
    case 'REPUTATION':
      return { domainCode: 'REPUTATION', typeCode: 'BRAND_DAMAGE' };
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
