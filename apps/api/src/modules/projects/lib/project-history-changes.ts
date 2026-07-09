import { PROJECT_AUDIT_ACTION } from '../project-audit.constants';

export type ProjectHistoryChangeDto = {
  field: string;
  label: string;
  before: string | null;
  after: string | null;
};

export type ProjectHistoryChangeRefs = {
  userDisplayNameById: Map<string, string | null>;
  projectLabelById: Map<string, string>;
  portfolioCategoryLabelById: Map<string, string>;
};

const EMPTY_VALUE = 'Non renseigné';

const PROJECT_AUDIT_FIELD_LABELS: Record<string, string> = {
  code: 'Code projet',
  name: 'Nom',
  description: 'Description',
  kind: 'Nature',
  type: 'Type de projet',
  status: 'Statut',
  priority: 'Priorité',
  criticality: 'Criticité',
  sponsorUserId: 'Sponsor',
  ownerUserId: 'Responsable',
  ownerFreeLabel: 'Responsable (nom libre)',
  ownerAffiliation: 'Affiliation du responsable',
  startDate: 'Date de début',
  targetEndDate: 'Date de fin cible',
  actualEndDate: 'Date de fin réelle',
  progressPercent: 'Avancement',
  targetBudgetAmount: 'Budget cible',
  pilotNotes: 'Notes de pilotage',
  businessValueScore: 'Score valeur métier',
  strategicAlignment: 'Alignement stratégique',
  urgencyScore: 'Score urgence',
  estimatedCost: 'Coût estimé',
  estimatedGain: 'Gain estimé',
  roi: 'ROI',
  riskLevel: 'Niveau de risque',
  riskResponse: 'Réponse au risque',
  priorityScore: 'Score de priorité',
  arbitrationStatus: 'Arbitrage (legacy)',
  arbitrationMetierStatus: 'Arbitrage métier',
  arbitrationComiteStatus: 'Arbitrage comité',
  arbitrationCodirStatus: 'Arbitrage CODIR',
  arbitrationMetierRefusalNote: 'Motif refus métier',
  arbitrationComiteRefusalNote: 'Motif refus comité',
  arbitrationCodirRefusalNote: 'Motif refus CODIR',
  copilRecommendation: 'Recommandation COPIL',
  copilRecommendationNote: 'Note recommandation COPIL',
  businessProblem: 'Problème métier',
  businessBenefits: 'Bénéfices attendus',
  cadreLocation: 'Cadre — lieu',
  cadreQui: 'Cadre — qui',
  involvedTeams: 'Équipes impliquées',
  businessSuccessKpis: 'KPIs de succès',
  swotStrengths: 'SWOT — forces',
  swotWeaknesses: 'SWOT — faiblesses',
  swotOpportunities: 'SWOT — opportunités',
  swotThreats: 'SWOT — menaces',
  towsActions: 'Actions TOWS',
  portfolioCategoryId: 'Catégorie portefeuille',
  previousParentProjectId: 'Projet parent',
  nextParentProjectId: 'Projet parent',
};

const PROJECT_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  PLANNED: 'Planifié',
  IN_PROGRESS: 'En cours',
  ON_HOLD: 'En pause',
  COMPLETED: 'Terminé',
  CANCELLED: 'Annulé',
  ARCHIVED: 'Archivé',
};

const PROJECT_TYPE_LABELS: Record<string, string> = {
  TRANSFORMATION: 'Transformation',
  INFRASTRUCTURE: 'Infrastructure',
  APPLICATION: 'Application',
  CYBERSECURITY: 'Cybersécurité',
  COMPLIANCE: 'Conformité',
  ORGANIZATION: 'Organisation',
  PROCUREMENT: 'Achats',
  GOVERNANCE: 'Gouvernance',
};

const PROJECT_KIND_LABELS: Record<string, string> = {
  PROJECT: 'Projet',
  ACTIVITY: 'Activité',
};

const PROJECT_PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Basse',
  MEDIUM: 'Moyenne',
  HIGH: 'Haute',
};

const PROJECT_CRITICALITY_LABELS: Record<string, string> = {
  LOW: 'Faible',
  MEDIUM: 'Moyenne',
  HIGH: 'Haute',
};

const ARBITRATION_LEVEL_STATUS_LABELS: Record<string, string> = {
  BROUILLON: 'Proposition de projet',
  EN_COURS: 'En préparation',
  SOUMIS_VALIDATION: 'Soumis à validation',
  VALIDE: 'Validé',
  REFUSE: 'Refusé',
};

const ARBITRATION_LEGACY_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  TO_REVIEW: 'À arbitrer',
  VALIDATED: 'Validé',
  REJECTED: 'Refusé',
};

const COPIL_RECOMMENDATION_LABELS: Record<string, string> = {
  FAVORABLE: 'Favorable',
  UNFAVORABLE: 'Défavorable',
  WITH_RESERVES: 'Avec réserves',
  NEUTRAL: 'Neutre',
};

const OWNER_AFFILIATION_LABELS: Record<string, string> = {
  INTERNAL: 'Interne',
  EXTERNAL: 'Externe',
};

const RISK_LEVEL_LABELS: Record<string, string> = {
  LOW: 'Faible',
  MEDIUM: 'Moyen',
  HIGH: 'Élevé',
};

const MAX_TEXT_LENGTH = 200;

function maybeObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readStringField(value: unknown, key: string): string | null {
  const objectValue = maybeObject(value);
  const field = objectValue?.[key];
  return typeof field === 'string' && field.trim() ? field.trim() : null;
}

function truncateText(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= MAX_TEXT_LENGTH) return trimmed;
  return `${trimmed.slice(0, MAX_TEXT_LENGTH)}…`;
}

function formatScalar(value: unknown, field: string, refs: ProjectHistoryChangeRefs): string | null {
  if (value === null || value === undefined || value === '') return null;

  if (field === 'ownerUserId' || field === 'sponsorUserId') {
    if (typeof value !== 'string') return null;
    return refs.userDisplayNameById.get(value) ?? null;
  }

  if (field === 'portfolioCategoryId') {
    if (typeof value !== 'string') return null;
    return refs.portfolioCategoryLabelById.get(value) ?? null;
  }

  if (field === 'previousParentProjectId' || field === 'nextParentProjectId') {
    if (typeof value !== 'string') return null;
    return refs.projectLabelById.get(value) ?? null;
  }

  if (field === 'status') {
    return typeof value === 'string' ? (PROJECT_STATUS_LABELS[value] ?? value) : null;
  }
  if (field === 'type') {
    return typeof value === 'string' ? (PROJECT_TYPE_LABELS[value] ?? value) : null;
  }
  if (field === 'kind') {
    return typeof value === 'string' ? (PROJECT_KIND_LABELS[value] ?? value) : null;
  }
  if (field === 'priority' || field === 'criticality') {
    const map = field === 'priority' ? PROJECT_PRIORITY_LABELS : PROJECT_CRITICALITY_LABELS;
    return typeof value === 'string' ? (map[value] ?? value) : null;
  }
  if (
    field === 'arbitrationMetierStatus' ||
    field === 'arbitrationComiteStatus' ||
    field === 'arbitrationCodirStatus'
  ) {
    return typeof value === 'string'
      ? (ARBITRATION_LEVEL_STATUS_LABELS[value] ?? value)
      : null;
  }
  if (field === 'arbitrationStatus') {
    return typeof value === 'string'
      ? (ARBITRATION_LEGACY_STATUS_LABELS[value] ?? value)
      : null;
  }
  if (field === 'copilRecommendation') {
    return typeof value === 'string' ? (COPIL_RECOMMENDATION_LABELS[value] ?? value) : null;
  }
  if (field === 'ownerAffiliation') {
    return typeof value === 'string' ? (OWNER_AFFILIATION_LABELS[value] ?? value) : null;
  }
  if (field === 'riskLevel') {
    return typeof value === 'string' ? (RISK_LEVEL_LABELS[value] ?? value) : null;
  }

  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  if (typeof value === 'number') return String(value);

  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      try {
        return new Intl.DateTimeFormat('fr-FR', {
          dateStyle: 'medium',
        }).format(new Date(value));
      } catch {
        return truncateText(value);
      }
    }
    return truncateText(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return 'Aucun élément';
    return `${value.length} élément(s)`;
  }

  if (typeof value === 'object') {
    return 'Contenu modifié';
  }

  return String(value);
}

function displayValue(
  value: unknown,
  field: string,
  refs: ProjectHistoryChangeRefs,
): string {
  return formatScalar(value, field, refs) ?? EMPTY_VALUE;
}

function fieldLabel(field: string): string {
  return PROJECT_AUDIT_FIELD_LABELS[field] ?? field;
}

function buildDiffChanges(
  oldValue: unknown,
  newValue: unknown,
  refs: ProjectHistoryChangeRefs,
): ProjectHistoryChangeDto[] {
  const oldObj = maybeObject(oldValue) ?? {};
  const newObj = maybeObject(newValue) ?? {};
  const keys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
  const changes: ProjectHistoryChangeDto[] = [];

  for (const field of keys) {
    if (field === 'previousParentProjectId' || field === 'nextParentProjectId') continue;
    const beforeRaw = oldObj[field];
    const afterRaw = newObj[field];
    if (JSON.stringify(beforeRaw) === JSON.stringify(afterRaw)) continue;

    changes.push({
      field,
      label: fieldLabel(field),
      before: displayValue(beforeRaw, field, refs),
      after: displayValue(afterRaw, field, refs),
    });
  }

  return changes;
}

export function collectHistoryPortfolioCategoryIds(
  rows: Array<{ oldValue: unknown | null; newValue: unknown | null }>,
): string[] {
  const ids = new Set<string>();
  for (const row of rows) {
    for (const value of [row.oldValue, row.newValue]) {
      const categoryId = readStringField(value, 'portfolioCategoryId');
      if (categoryId) ids.add(categoryId);
    }
    const oldObj = maybeObject(row.oldValue);
    const newObj = maybeObject(row.newValue);
    for (const obj of [oldObj, newObj]) {
      if (!obj) continue;
      for (const key of Object.keys(obj)) {
        if (key === 'portfolioCategoryId' && typeof obj[key] === 'string') {
          ids.add(obj[key] as string);
        }
      }
    }
  }
  return [...ids];
}

export function collectHistoryUserIds(
  rows: Array<{ userId: string | null; oldValue: unknown | null; newValue: unknown | null }>,
): string[] {
  const ids = new Set<string>();
  for (const row of rows) {
    if (row.userId) ids.add(row.userId);
    for (const value of [row.oldValue, row.newValue]) {
      const obj = maybeObject(value);
      if (!obj) continue;
      for (const key of ['ownerUserId', 'sponsorUserId']) {
        const userId = obj[key];
        if (typeof userId === 'string' && userId.trim()) ids.add(userId.trim());
      }
    }
  }
  return [...ids];
}

export function buildProjectHistoryChanges(
  row: { action: string; oldValue: unknown | null; newValue: unknown | null },
  refs: ProjectHistoryChangeRefs,
): ProjectHistoryChangeDto[] {
  switch (row.action) {
    case PROJECT_AUDIT_ACTION.PROJECT_PARENT_ASSIGNED:
    case PROJECT_AUDIT_ACTION.PROJECT_PARENT_CHANGED: {
      const previousId = readStringField(row.oldValue, 'previousParentProjectId');
      const nextId = readStringField(row.newValue, 'nextParentProjectId');
      const before = previousId ? refs.projectLabelById.get(previousId) ?? null : null;
      const after = nextId ? refs.projectLabelById.get(nextId) ?? null : null;
      if (!before && !after) return [];
      return [
        {
          field: 'parentProject',
          label: 'Projet parent',
          before: before ?? EMPTY_VALUE,
          after: after ?? EMPTY_VALUE,
        },
      ];
    }
    case PROJECT_AUDIT_ACTION.PROJECT_PARENT_DETACHED: {
      const previousId = readStringField(row.oldValue, 'previousParentProjectId');
      const before = previousId ? refs.projectLabelById.get(previousId) ?? null : null;
      if (!before) return [];
      return [
        {
          field: 'parentProject',
          label: 'Projet parent',
          before,
          after: EMPTY_VALUE,
        },
      ];
    }
    case PROJECT_AUDIT_ACTION.PROJECT_STATUS_UPDATED: {
      const before = displayValue(maybeObject(row.oldValue)?.status, 'status', refs);
      const after = displayValue(maybeObject(row.newValue)?.status, 'status', refs);
      return [{ field: 'status', label: 'Statut', before, after }];
    }
    case PROJECT_AUDIT_ACTION.PROJECT_OWNER_UPDATED: {
      const before = displayValue(
        maybeObject(row.oldValue)?.ownerUserId,
        'ownerUserId',
        refs,
      );
      const after = displayValue(maybeObject(row.newValue)?.ownerUserId, 'ownerUserId', refs);
      return [{ field: 'ownerUserId', label: 'Responsable', before, after }];
    }
    case PROJECT_AUDIT_ACTION.PROJECT_PORTFOLIO_CATEGORY_UPDATED_ON_PROJECT: {
      const before = displayValue(
        maybeObject(row.oldValue)?.portfolioCategoryId,
        'portfolioCategoryId',
        refs,
      );
      const after = displayValue(
        maybeObject(row.newValue)?.portfolioCategoryId,
        'portfolioCategoryId',
        refs,
      );
      return [{ field: 'portfolioCategoryId', label: 'Catégorie portefeuille', before, after }];
    }
    default:
      return buildDiffChanges(row.oldValue, row.newValue, refs);
  }
}
