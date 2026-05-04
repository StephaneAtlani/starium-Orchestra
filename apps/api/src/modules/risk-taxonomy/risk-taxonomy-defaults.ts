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

export const RISK_V1_VISIBLE_DOMAIN_CODES = [
  'STRATEGY',
  'GOVERNANCE',
  'FINANCE',
  'PROJECTS',
  'OPERATIONS',
  'CONTINUITY',
  'IT',
  'CYBERSECURITY',
  'DATA',
  'SUPPLIERS',
  'LEGAL_COMPLIANCE',
  'HUMAN_RESOURCES',
  'REPUTATION',
] as const;

export type RiskUiFamily = {
  code: string;
  label: string;
};

const DOMAIN_UI_FAMILY_BY_CODE: Record<string, RiskUiFamily> = {
  STRATEGY: { code: 'PILOTAGE_STRATEGIE', label: 'Pilotage & stratégie' },
  GOVERNANCE: { code: 'PILOTAGE_STRATEGIE', label: 'Pilotage & stratégie' },
  FINANCE: { code: 'FINANCE_PERFORMANCE', label: 'Finance & performance' },
  PROJECTS: { code: 'OPERATIONS_CONTINUITE', label: 'Opérations & continuité' },
  OPERATIONS: { code: 'OPERATIONS_CONTINUITE', label: 'Opérations & continuité' },
  CONTINUITY: { code: 'OPERATIONS_CONTINUITE', label: 'Opérations & continuité' },
  IT: { code: 'TECHNOLOGIE_DONNEES', label: 'Technologie & données' },
  CYBERSECURITY: { code: 'TECHNOLOGIE_DONNEES', label: 'Technologie & données' },
  DATA: { code: 'TECHNOLOGIE_DONNEES', label: 'Technologie & données' },
  SUPPLIERS: { code: 'ECOSYSTEME_EXTERNE', label: 'Écosystème externe' },
  LEGAL_COMPLIANCE: { code: 'JURIDIQUE_CONFORMITE', label: 'Juridique & conformité' },
  HUMAN_RESOURCES: { code: 'HUMAIN_ORGANISATION', label: 'Humain & organisation' },
  REPUTATION: { code: 'IMAGE_REPUTATION', label: 'Image & réputation' },
  GENERAL: { code: 'PILOTAGE_STRATEGIE', label: 'Pilotage & stratégie' },
};

const DEFAULT_UI_FAMILY: RiskUiFamily = {
  code: 'PILOTAGE_STRATEGIE',
  label: 'Pilotage & stratégie',
};

const V1_GENERIC_TYPE_BY_DOMAIN: Record<string, { code: string; name: string }> = {
  STRATEGY: { code: 'OTHER_STRATEGIC_RISK', name: 'Autre risque stratégique' },
  GOVERNANCE: { code: 'OTHER_GOVERNANCE_RISK', name: 'Autre risque de gouvernance' },
  FINANCE: { code: 'OTHER_FINANCIAL_RISK', name: 'Autre risque financier' },
  PROJECTS: { code: 'OTHER_PROJECT_RISK', name: 'Autre risque projet' },
  OPERATIONS: { code: 'OTHER_OPERATIONAL_RISK', name: 'Autre risque opérationnel' },
  CONTINUITY: { code: 'OTHER_CONTINUITY_RISK', name: 'Autre risque de continuité' },
  IT: { code: 'OTHER_IT_RISK', name: 'Autre risque IT' },
  CYBERSECURITY: { code: 'OTHER_CYBER_RISK', name: 'Autre risque cyber' },
  DATA: { code: 'OTHER_DATA_RISK', name: 'Autre risque data' },
  SUPPLIERS: { code: 'OTHER_SUPPLIER_RISK', name: 'Autre risque fournisseurs' },
  LEGAL_COMPLIANCE: {
    code: 'OTHER_LEGAL_COMPLIANCE_RISK',
    name: 'Autre risque juridique & conformité',
  },
  HUMAN_RESOURCES: { code: 'OTHER_HR_RISK', name: 'Autre risque RH' },
  REPUTATION: { code: 'OTHER_REPUTATION_RISK', name: 'Autre risque de réputation' },
};

const MINIMUM_TYPE_CODES_BY_DOMAIN: Record<string, string[]> = {
  STRATEGY: [
    'STRATEGIC_MISALIGNMENT',
    'WRONG_POSITIONING',
    'MARKET_EVOLUTION_MISSED',
    'BUSINESS_MODEL_FAILURE',
    'INVESTMENT_MISALLOCATION',
    'LOSS_OF_COMPETITIVE_ADVANTAGE',
    'POOR_PORTFOLIO_PRIORITIZATION',
    'STRATEGIC_DEPENDENCY',
    'STRATEGIC_OBJECTIVE_FAILURE',
    'DIGITAL_TRANSFORMATION_FAILURE',
    'INNOVATION_ROADMAP_FAILURE',
    'MERGER_INTEGRATION_FAILURE',
    'OTHER_STRATEGIC_RISK',
  ],
  GOVERNANCE: [
    'POOR_DECISION_PROCESS',
    'LACK_OF_STEERING',
    'NO_CLEAR_ACCOUNTABILITY',
    'KPI_MISSING_OR_UNUSED',
    'CONFLICT_OF_INTEREST',
    'MANAGEMENT_FAILURE',
    'GOVERNANCE_ROLE_AMBIGUITY',
    'ESCALATION_PROCESS_FAILURE',
    'COMMITTEE_DECISION_DELAY',
    'POLICY_NOT_APPLIED',
    'INTERNAL_CONTROL_WEAKNESS',
    'LACK_OF_AUDIT_TRAIL',
    'OTHER_GOVERNANCE_RISK',
  ],
  FINANCE: [
    'BUDGET_OVERRUN',
    'CASHFLOW_SHORTAGE',
    'LIQUIDITY_RISK',
    'PROFITABILITY_DROP',
    'COST_UNDER_ESTIMATION',
    'FRAUD',
    'FINANCIAL_REPORTING_ERROR',
    'UNPLANNED_EXPENSE',
    'FUNDING_DELAY',
    'ROI_NOT_ACHIEVED',
    'COST_ALLOCATION_ERROR',
    'FORECASTING_ERROR',
    'INVOICE_DISPUTE',
    'OTHER_FINANCIAL_RISK',
  ],
  PROJECTS: [
    'PROJECT_DELAY',
    'COST_OVERRUN_PROJECT',
    'SCOPE_CREEP',
    'PROJECT_FAILURE',
    'RESOURCE_MISMANAGEMENT',
    'POOR_REQUIREMENTS_DEFINITION',
    'STAKEHOLDER_ALIGNMENT_FAILURE',
    'PLANNING_ERROR',
    'DEPENDENCY_BLOCKER',
    'CHANGE_MANAGEMENT_FAILURE',
    'DELIVERY_QUALITY_FAILURE',
    'VENDOR_PROJECT_FAILURE',
    'BENEFITS_NOT_REALIZED',
    'OTHER_PROJECT_RISK',
  ],
  OPERATIONS: [
    'PROCESS_BREAKDOWN',
    'DELIVERY_DELAY',
    'SERVICE_INTERRUPTION',
    'RESOURCE_SHORTAGE',
    'CAPACITY_OVERLOAD',
    'QUALITY_FAILURE',
    'INTERNAL_COORDINATION_FAILURE',
    'PROCEDURE_NOT_FOLLOWED',
    'MANUAL_ERROR',
    'OPERATIONAL_BACKLOG',
    'SUPPORT_OVERLOAD',
    'SLA_BREACH',
    'STOCK_OR_SUPPLY_SHORTAGE',
    'OTHER_OPERATIONAL_RISK',
  ],
  CONTINUITY: [
    'BUSINESS_INTERRUPTION',
    'DISASTER',
    'RECOVERY_FAILURE',
    'NO_BCP_PLAN',
    'BACKUP_FAILURE',
    'RESTORE_FAILURE',
    'CRISIS_MANAGEMENT_FAILURE',
    'SITE_UNAVAILABILITY',
    'CRITICAL_SERVICE_UNAVAILABLE',
    'SINGLE_POINT_OF_FAILURE',
    'INCIDENT_RESPONSE_DELAY',
    'RESILIENCE_TEST_FAILURE',
    'OTHER_CONTINUITY_RISK',
  ],
  IT: [
    'SYSTEM_OUTAGE',
    'APPLICATION_FAILURE',
    'PERFORMANCE_DEGRADATION',
    'TECHNICAL_DEBT',
    'ARCHITECTURE_LIMITATION',
    'OBSOLESCENCE',
    'INTEGRATION_FAILURE',
    'CONFIGURATION_ERROR',
    'CHANGE_DEPLOYMENT_FAILURE',
    'PATCHING_DELAY',
    'CLOUD_SERVICE_FAILURE',
    'LICENSE_NON_COMPLIANCE',
    'MONITORING_GAP',
    'OTHER_IT_RISK',
  ],
  CYBERSECURITY: [
    'UNAUTHORIZED_ACCESS',
    'DATA_BREACH',
    'RANSOMWARE_ATTACK',
    'PHISHING_ATTACK',
    'VULNERABILITY_EXPLOITATION',
    'PRIVILEGE_ESCALATION',
    'IDENTITY_COMPROMISE',
    'DENIAL_OF_SERVICE',
    'MALWARE_INFECTION',
    'WEAK_PASSWORD_POLICY',
    'MFA_NOT_ENFORCED',
    'SECURITY_LOGGING_GAP',
    'THIRD_PARTY_CYBER_RISK',
    'OTHER_CYBER_RISK',
  ],
  DATA: [
    'DATA_LOSS',
    'DATA_CORRUPTION',
    'DATA_INCONSISTENCY',
    'POOR_DATA_QUALITY',
    'DATA_UNAVAILABILITY',
    'WRONG_ANALYTICS',
    'DECISION_ON_INVALID_DATA',
    'MASTER_DATA_ERROR',
    'DATA_DUPLICATION',
    'DATA_OWNERSHIP_GAP',
    'GDPR_DATA_RETENTION_ISSUE',
    'DATA_ACCESS_ERROR',
    'REPORTING_DELAY',
    'OTHER_DATA_RISK',
  ],
  SUPPLIERS: [
    'SUPPLIER_DEFAULT',
    'DELIVERY_FAILURE',
    'QUALITY_DEFECT',
    'COST_INCREASE',
    'SINGLE_SUPPLIER_DEPENDENCY',
    'CONTRACTOR_UNAVAILABILITY',
    'OUTSOURCING_RISK',
    'VENDOR_LOCK_IN',
    'THIRD_PARTY_FAILURE',
    'PARTNER_FAILURE',
    'SLA_PROVIDER_BREACH',
    'SUPPLIER_SECURITY_FAILURE',
    'SUPPLIER_FINANCIAL_WEAKNESS',
    'OTHER_SUPPLIER_RISK',
  ],
  LEGAL_COMPLIANCE: [
    'REGULATORY_NON_COMPLIANCE',
    'CONTRACT_BREACH',
    'LITIGATION',
    'LIABILITY_EXPOSURE',
    'NON_COMPLIANT_CONTRACT',
    'INTELLECTUAL_PROPERTY_ISSUE',
    'AUDIT_FAILURE',
    'CONTROL_DEFICIENCY',
    'DOCUMENTATION_GAP',
    'CERTIFICATION_LOSS',
    'TAX_NON_COMPLIANCE',
    'VAT_ERROR',
    'GDPR_NON_COMPLIANCE',
    'OTHER_LEGAL_COMPLIANCE_RISK',
  ],
  HUMAN_RESOURCES: [
    'SKILL_SHORTAGE',
    'KEY_PERSON_DEPENDENCY',
    'HIGH_TURNOVER',
    'ABSENTEEISM',
    'INTERNAL_CONFLICT',
    'LOW_ENGAGEMENT',
    'BURNOUT',
    'RECRUITMENT_FAILURE',
    'KNOWLEDGE_LOSS',
    'TRAINING_GAP',
    'SUCCESSION_PLANNING_GAP',
    'WORKLOAD_IMBALANCE',
    'MANAGERIAL_FAILURE',
    'OTHER_HR_RISK',
  ],
  REPUTATION: [
    'BRAND_DAMAGE',
    'NEGATIVE_MEDIA_EXPOSURE',
    'SOCIAL_MEDIA_CRISIS',
    'CUSTOMER_TRUST_LOSS',
    'PUBLIC_COMMUNICATION_FAILURE',
    'CUSTOMER_COMPLAINT_ESCALATION',
    'ETHICAL_ISSUE_PUBLICIZED',
    'EXECUTIVE_REPUTATION_RISK',
    'PRODUCT_OR_SERVICE_BAD_BUZZ',
    'PARTNER_REPUTATION_CONTAGION',
    'EMPLOYER_BRAND_DAMAGE',
    'LOSS_OF_CREDIBILITY',
    'OTHER_REPUTATION_RISK',
  ],
};

/**
 * Libellés FR explicites pour les codes générés via `MINIMUM_TYPE_CODES_BY_DOMAIN`
 * mais absents des `RAW_DOMAIN_DEFINITIONS`. Couvre l'ensemble des codes seedés.
 * Pour tout code admin non listé, fallback dans `humanizeRiskTypeCode`.
 */
const FRENCH_NAME_BY_CODE: Record<string, string> = {
  STRATEGIC_DEPENDENCY: 'Dépendance stratégique',
  POOR_PORTFOLIO_PRIORITIZATION: 'Mauvaise priorisation du portefeuille',
  STRATEGIC_OBJECTIVE_FAILURE: 'Échec d’un objectif stratégique',
  DIGITAL_TRANSFORMATION_FAILURE: 'Échec de transformation digitale',
  INNOVATION_ROADMAP_FAILURE: 'Échec de roadmap innovation',
  MERGER_INTEGRATION_FAILURE: 'Échec d’intégration post-fusion',

  GOVERNANCE_ROLE_AMBIGUITY: 'Ambiguïté des rôles de gouvernance',
  ESCALATION_PROCESS_FAILURE: 'Défaillance du processus d’escalade',
  COMMITTEE_DECISION_DELAY: 'Retard des décisions en comité',
  POLICY_NOT_APPLIED: 'Politique non appliquée',
  INTERNAL_CONTROL_WEAKNESS: 'Faiblesse du contrôle interne',
  LACK_OF_AUDIT_TRAIL: 'Absence de piste d’audit',

  UNPLANNED_EXPENSE: 'Dépense non prévue',
  FUNDING_DELAY: 'Retard de financement',
  ROI_NOT_ACHIEVED: 'ROI non atteint',
  COST_ALLOCATION_ERROR: 'Erreur d’imputation des coûts',
  FORECASTING_ERROR: 'Erreur de prévision',
  INVOICE_DISPUTE: 'Litige de facturation',

  POOR_REQUIREMENTS_DEFINITION: 'Mauvaise définition des besoins',
  STAKEHOLDER_ALIGNMENT_FAILURE: 'Défaut d’alignement des parties prenantes',
  PLANNING_ERROR: 'Erreur de planification',
  DEPENDENCY_BLOCKER: 'Dépendance bloquante',
  CHANGE_MANAGEMENT_FAILURE: 'Défaut de conduite du changement',
  DELIVERY_QUALITY_FAILURE: 'Défaut de qualité de livraison',
  VENDOR_PROJECT_FAILURE: 'Défaillance d’un fournisseur projet',
  BENEFITS_NOT_REALIZED: 'Bénéfices non réalisés',

  PROCEDURE_NOT_FOLLOWED: 'Procédure non respectée',
  MANUAL_ERROR: 'Erreur manuelle',
  OPERATIONAL_BACKLOG: 'Backlog opérationnel',
  SUPPORT_OVERLOAD: 'Surcharge du support',
  SLA_BREACH: 'Non-respect d’un SLA',
  STOCK_OR_SUPPLY_SHORTAGE: 'Rupture de stock / d’approvisionnement',

  BACKUP_FAILURE: 'Échec de sauvegarde',
  RESTORE_FAILURE: 'Échec de restauration',
  CRISIS_MANAGEMENT_FAILURE: 'Défaillance de gestion de crise',
  SITE_UNAVAILABILITY: 'Indisponibilité d’un site',
  CRITICAL_SERVICE_UNAVAILABLE: 'Indisponibilité d’un service critique',
  SINGLE_POINT_OF_FAILURE: 'Point unique de défaillance (SPOF)',
  INCIDENT_RESPONSE_DELAY: 'Retard de réponse à incident',
  RESILIENCE_TEST_FAILURE: 'Échec d’un test de résilience',

  CONFIGURATION_ERROR: 'Erreur de configuration',
  CHANGE_DEPLOYMENT_FAILURE: 'Échec d’un déploiement / change',
  PATCHING_DELAY: 'Retard de patching',
  CLOUD_SERVICE_FAILURE: 'Défaillance d’un service cloud',
  LICENSE_NON_COMPLIANCE: 'Non-conformité de licence',
  MONITORING_GAP: 'Lacune de supervision',

  MALWARE_INFECTION: 'Infection par malware',
  WEAK_PASSWORD_POLICY: 'Politique de mot de passe faible',
  MFA_NOT_ENFORCED: 'MFA non appliquée',
  SECURITY_LOGGING_GAP: 'Lacune de journalisation de sécurité',
  THIRD_PARTY_CYBER_RISK: 'Risque cyber lié à un tiers',

  MASTER_DATA_ERROR: 'Erreur de données de référence (MDM)',
  DATA_DUPLICATION: 'Duplication de données',
  DATA_OWNERSHIP_GAP: 'Propriété de la donnée non définie',
  GDPR_DATA_RETENTION_ISSUE: 'Problème de rétention RGPD',
  DATA_ACCESS_ERROR: 'Erreur d’accès aux données',
  REPORTING_DELAY: 'Retard de reporting',

  CONTRACTOR_UNAVAILABILITY: 'Indisponibilité d’un prestataire',
  SLA_PROVIDER_BREACH: 'Non-respect SLA fournisseur',
  SUPPLIER_SECURITY_FAILURE: 'Défaillance de sécurité fournisseur',
  SUPPLIER_FINANCIAL_WEAKNESS: 'Fragilité financière fournisseur',

  GDPR_NON_COMPLIANCE: 'Non-conformité RGPD',

  KNOWLEDGE_LOSS: 'Perte de connaissance',
  TRAINING_GAP: 'Lacune de formation',
  SUCCESSION_PLANNING_GAP: 'Absence de plan de succession',
  WORKLOAD_IMBALANCE: 'Déséquilibre de charge',
  MANAGERIAL_FAILURE: 'Défaillance managériale',

  PUBLIC_COMMUNICATION_FAILURE: 'Défaillance de communication publique',
  CUSTOMER_COMPLAINT_ESCALATION: 'Escalade de plaintes clients',
  ETHICAL_ISSUE_PUBLICIZED: 'Affaire éthique médiatisée',
  EXECUTIVE_REPUTATION_RISK: 'Réputation d’un dirigeant',
  PRODUCT_OR_SERVICE_BAD_BUZZ: 'Bad buzz produit / service',
  PARTNER_REPUTATION_CONTAGION: 'Contagion réputationnelle d’un partenaire',
  EMPLOYER_BRAND_DAMAGE: 'Atteinte à la marque employeur',
  LOSS_OF_CREDIBILITY: 'Perte de crédibilité',
};

function humanizeRiskTypeCode(code: string): string {
  const explicit = FRENCH_NAME_BY_CODE[code];
  if (explicit) return explicit;
  return code
    .replace(/^OTHER_/, 'AUTRE_')
    .split('_')
    .join(' ')
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

type DomainDef = {
  code: string;
  name: string;
  description?: string | null;
  isVisibleInCatalog?: boolean;
  types: Array<{ code: string; name: string; isRecommended?: boolean }>;
};

/**
 * Taxonomie par défaut : domaine → types.
 * Les libellés `name` sont en français (affichage UI / registre).
 */
const RAW_DOMAIN_DEFINITIONS: DomainDef[] = [
  {
    code: 'GENERAL',
    name: 'Général',
    isVisibleInCatalog: true,
    types: [{ code: 'UNCLASSIFIED', name: 'Non classé', isRecommended: true }],
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
    code: 'LEGAL_COMPLIANCE',
    name: 'Juridique & conformité',
    types: [
      { code: 'CONTRACT_BREACH', name: 'Violation de contrat' },
      { code: 'LITIGATION', name: 'Contentieux' },
      { code: 'LIABILITY_EXPOSURE', name: 'Exposition à la responsabilité' },
      { code: 'NON_COMPLIANT_CONTRACT', name: 'Contrat non conforme' },
      { code: 'INTELLECTUAL_PROPERTY_ISSUE', name: 'Problème de propriété intellectuelle' },
      { code: 'REGULATORY_NON_COMPLIANCE', name: 'Non-conformité réglementaire' },
      { code: 'AUDIT_FAILURE', name: 'Échec d’audit' },
      { code: 'CONTROL_DEFICIENCY', name: 'Défaut de contrôle interne' },
      { code: 'DOCUMENTATION_GAP', name: 'Lacune documentaire' },
      { code: 'CERTIFICATION_LOSS', name: 'Perte de certification' },
      { code: 'TAX_NON_COMPLIANCE', name: 'Non-conformité fiscale' },
      { code: 'TAX_OPTIMIZATION_RISK', name: 'Risque lié à l’optimisation fiscale' },
      { code: 'TAX_PENALTY', name: 'Pénalité fiscale' },
      { code: 'VAT_ERROR', name: 'Erreur de TVA' },
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
      { code: 'PARTNER_FAILURE', name: 'Défaillance partenaire' },
      { code: 'MISALIGNED_INTERESTS', name: 'Intérêts non alignés' },
      { code: 'PARTNERSHIP_BREAKDOWN', name: 'Rupture de partenariat' },
      { code: 'THIRD_PARTY_FAILURE', name: 'Défaillance d’un tiers' },
      { code: 'OUTSOURCING_RISK', name: 'Risque d’externalisation' },
      { code: 'EXTERNAL_SECURITY_RISK', name: 'Risque de sécurité externe' },
      { code: 'VENDOR_LOCK_IN', name: 'Verrouillage fournisseur' },
      { code: 'TECHNOLOGY_DEPENDENCY', name: 'Dépendance technologique' },
      { code: 'KEY_RESOURCE_DEPENDENCY', name: 'Dépendance à une ressource clé' },
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

const DOMAIN_DEFINITIONS: DomainDef[] = RAW_DOMAIN_DEFINITIONS.map((d) => {
  const byCode = new Map(
    d.types.map((t) => [t.code, { ...t, isRecommended: t.isRecommended ?? false }]),
  );

  const generic = V1_GENERIC_TYPE_BY_DOMAIN[d.code];
  if (generic && !byCode.has(generic.code)) {
    byCode.set(generic.code, { ...generic, isRecommended: true });
  }

  const minimumCodes = MINIMUM_TYPE_CODES_BY_DOMAIN[d.code] ?? [];
  for (const code of minimumCodes) {
    if (!byCode.has(code)) {
      byCode.set(code, {
        code,
        name: humanizeRiskTypeCode(code),
        isRecommended: code.startsWith('OTHER_'),
      });
    }
  }

  return {
    ...d,
    isVisibleInCatalog: isRiskDomainVisibleInV1Catalog(d.code),
    types: [...byCode.values()],
  };
});

export function getRiskDefaultDomainDefinitions(): ReadonlyArray<DomainDef> {
  return DOMAIN_DEFINITIONS;
}

export function isRiskDomainVisibleInV1Catalog(domainCode: string): boolean {
  return (
    domainCode === 'GENERAL' ||
    RISK_V1_VISIBLE_DOMAIN_CODES.includes(
      domainCode as (typeof RISK_V1_VISIBLE_DOMAIN_CODES)[number],
    )
  );
}

export function getRiskDomainUiFamily(domainCode: string): RiskUiFamily {
  return DOMAIN_UI_FAMILY_BY_CODE[domainCode] ?? DEFAULT_UI_FAMILY;
}

/** Mapping enum legacy `impactCategory` → type seed (domaine explicite). */
export function legacyImpactToTypeCode(
  impact: ProjectRiskImpactCategory | null | undefined,
): { domainCode: string; typeCode: string } {
  switch (impact) {
    case 'FINANCIAL':
      return { domainCode: 'FINANCE', typeCode: 'OTHER_FINANCIAL_RISK' };
    case 'OPERATIONAL':
      return { domainCode: 'OPERATIONS', typeCode: 'OTHER_OPERATIONAL_RISK' };
    case 'LEGAL':
      return { domainCode: 'LEGAL_COMPLIANCE', typeCode: 'OTHER_LEGAL_COMPLIANCE_RISK' };
    case 'REPUTATION':
      return { domainCode: 'REPUTATION', typeCode: 'OTHER_REPUTATION_RISK' };
    default:
      return { domainCode: 'GENERAL', typeCode: 'UNCLASSIFIED' };
  }
}

export async function ensureRiskTaxonomyForClient(
  prisma: PrismaClient,
  clientId: string,
): Promise<void> {
  for (const d of DOMAIN_DEFINITIONS) {
    const domainVisibleInV1 = d.isVisibleInCatalog ?? isRiskDomainVisibleInV1Catalog(d.code);
    const domain = await prisma.riskDomain.upsert({
      where: { clientId_code: { clientId, code: d.code } },
      create: {
        clientId,
        code: d.code,
        name: d.name,
        description: d.description ?? null,
        isActive: true,
        isVisibleInCatalog: domainVisibleInV1,
      },
      update: {
        name: d.name,
        description: d.description ?? null,
        isVisibleInCatalog: domainVisibleInV1,
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
          isVisibleInCatalog: domainVisibleInV1,
          isRecommended: t.isRecommended ?? false,
        },
        update: {
          name: t.name,
          isVisibleInCatalog: domainVisibleInV1,
          isRecommended: t.isRecommended ?? false,
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
