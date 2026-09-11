import type {
  ProjectReviewAgendaItemType,
  ProjectReviewType,
} from '../types/project.types';
import { REVIEW_TYPES_PILOTAGE, type PilotageReviewType } from './project-review-post-mortem';

export type ReviewAgendaPresetRow = {
  title: string;
  description: string;
  itemType: ProjectReviewAgendaItemType;
  /** Question à trancher — seed UI / API (`expectedDecision`). */
  expectedDecision: string;
};

/** Courte description du déroulé attendu — affichée sous le sélecteur de type. */
export const REVIEW_TYPE_AGENDA_HINT: Record<PilotageReviewType, string> = {
  COPIL:
    'Comité de pilotage : avancement, budget, risques, arbitrages et suivi des actions.',
  COPRO:
    'Comité projet : pilotage opérationnel, blocages, charge et planning à court terme.',
  CODIR_REVIEW:
    'Instance direction : synthèse exécutive, enjeux stratégiques et arbitrages de niveau CODIR.',
  RISK_REVIEW:
    'Revue risques : parcours du registre projet, criticité, plans de mitigation, acceptations et décisions.',
  MILESTONE_REVIEW:
    'Revue jalon : livrables, critères de passage et décision GO / NO GO.',
  AD_HOC: 'Point ciblé : structure minimale à adapter selon le sujet traité.',
};

export function defaultExpectedDecisionForItemType(
  itemType: ProjectReviewAgendaItemType,
): string {
  switch (itemType) {
    case 'ARBITRATION':
    case 'DECISION':
      return 'Quelle décision le comité doit-il trancher ?';
    case 'BUDGET':
      return 'Quel arbitrage budget / consommation ?';
    case 'RISK':
      return 'Quelle posture sur ce risque (mitiger / accepter / escalader) ?';
    case 'MILESTONE':
      return 'GO / NO GO — sur quels critères ?';
    case 'ACTION_REVIEW':
      return 'Quelles actions restent ouvertes et qui porte ?';
    default:
      return 'Qu’attend-on de ce point ?';
  }
}

function presetRow(
  title: string,
  description: string,
  itemType: ProjectReviewAgendaItemType,
  expectedDecision?: string,
): ReviewAgendaPresetRow {
  const question = expectedDecision?.trim() || defaultExpectedDecisionForItemType(itemType);
  return { title, description, itemType, expectedDecision: question };
}

const AGENDA_PRESETS: Record<PilotageReviewType, ReviewAgendaPresetRow[]> = {
  COPIL: [
    presetRow(
      'Ouverture et rappel du contexte',
      'Objectifs du COPIL, décisions du point précédent.',
      'INFORMATION',
      'Le contexte et les objectifs du COPIL sont-ils partagés ?',
    ),
    presetRow(
      'Avancement et état du projet',
      'Tendance, jalons, écarts planning.',
      'INFORMATION',
      'Quel message d’avancement retenons-nous pour le comité ?',
    ),
    presetRow(
      'Budget et consommation',
      'Engagé, consommé, écarts et prévisions.',
      'BUDGET',
    ),
    presetRow(
      'Risques et points d’attention',
      'Registre, nouveaux risques, signaux faibles.',
      'RISK',
    ),
    presetRow(
      'Arbitrages en attente',
      'Sujets à trancher au comité.',
      'ARBITRATION',
    ),
    presetRow(
      'Suivi des actions ouvertes',
      'Statut, retards, responsables.',
      'ACTION_REVIEW',
    ),
    presetRow(
      'Décisions et prochaines étapes',
      'Synthèse des décisions et date du prochain point.',
      'DECISION',
    ),
  ],
  COPRO: [
    presetRow(
      'Ouverture COPRO',
      'Objectif du point et priorités de la période.',
      'INFORMATION',
      'Quelles priorités opérationnelles pour cette période ?',
    ),
    presetRow(
      'Avancement opérationnel',
      'Tâches, livrables en cours, blocages terrain.',
      'INFORMATION',
      'Quels livrables avancent / bloquent ?',
    ),
    presetRow(
      'Blocages et dépendances',
      'Impediments, attentes externes, escalades.',
      'OTHER',
      'Quels blocages exigent une escalade ?',
    ),
    presetRow(
      'Charge et ressources',
      'Disponibilités, besoins complémentaires.',
      'INFORMATION',
      'La charge est-elle tenable — faut-il arbitrer des ressources ?',
    ),
    presetRow(
      'Planning à court terme',
      'Jalons proches, engagements équipe.',
      'MILESTONE',
    ),
    presetRow(
      'Suivi des actions',
      'Actions ouvertes et échéances.',
      'ACTION_REVIEW',
    ),
  ],
  CODIR_REVIEW: [
    presetRow(
      'Synthèse exécutive',
      'Message clé, faits marquants, tendance projet.',
      'INFORMATION',
      'Quel message clé pour la direction ?',
    ),
    presetRow(
      'Enjeux stratégiques',
      'Impacts métier, dépendances organisationnelles.',
      'INFORMATION',
      'Quels enjeux stratégiques doivent être tranchés ?',
    ),
    presetRow(
      'Budget et investissement',
      'Enveloppe, demandes de rallonge, arbitrage financier.',
      'BUDGET',
    ),
    presetRow(
      'Arbitrages direction',
      'Sujets nécessitant une décision CODIR.',
      'ARBITRATION',
    ),
    presetRow(
      'Décisions CODIR',
      'Validation des orientations et prochaines étapes.',
      'DECISION',
    ),
  ],
  RISK_REVIEW: [
    presetRow(
      'Ouverture et cadrage de la revue',
      'Rappeler l’objectif de la session, le périmètre projet et les décisions attendues. Confirmer les participants et la durée.',
      'INFORMATION',
      'Périmètre et décisions attendues de la revue sont-ils clairs ?',
    ),
    presetRow(
      'Revue du registre des risques',
      'Parcourir le registre des risques du projet (onglet Risques) : nouveaux risques, risques clos, évolution depuis la dernière revue.',
      'RISK',
      'Quels risques nouveaux ou évolutifs à retenir ?',
    ),
    presetRow(
      'Risques critiques et signaux faibles',
      'Focus sur les risques ouverts à criticité élevée : exposition, tendance, dépendances. Identifier les signaux faibles non encore formalisés.',
      'RISK',
    ),
    presetRow(
      'Plans de mitigation et actions en cours',
      'Pour chaque risque majeur : état du plan d’action, responsable, échéance, efficacité des mesures. Relever les retards et manques.',
      'ACTION_REVIEW',
    ),
    presetRow(
      'Acceptations, transferts et escalades',
      'Arbitrer les risques résiduels : acceptation formalisée, transfert (assurance, contrat, tiers), ou escalade vers le COPIL / CODIR.',
      'ARBITRATION',
    ),
    presetRow(
      'Décisions et prochaine revue risques',
      'Synthèse des décisions, risques à surveiller en priorité, date et participants de la prochaine revue risques.',
      'DECISION',
    ),
  ],
  MILESTONE_REVIEW: [
    presetRow(
      'Rappel du jalon',
      'Objectif, date cible, critères attendus.',
      'MILESTONE',
      'Le jalon et ses critères sont-ils toujours les bons ?',
    ),
    presetRow(
      'Critères de passage',
      'Check-list qualité, conformité, prérequis.',
      'INFORMATION',
      'Tous les critères de passage sont-ils couverts ?',
    ),
    presetRow(
      'État des livrables',
      'Avancement, complétude, validation métier.',
      'INFORMATION',
      'Les livrables sont-ils prêts pour la décision ?',
    ),
    presetRow(
      'Écarts et impacts',
      'Retards, risques liés au jalon.',
      'RISK',
    ),
    presetRow(
      'Décision GO / NO GO',
      'Validation ou report du jalon.',
      'DECISION',
      'GO / NO GO — sur quels critères ?',
    ),
    presetRow(
      'Actions de clôture jalon',
      'Actions correctives et responsables.',
      'ACTION_REVIEW',
    ),
  ],
  AD_HOC: [
    presetRow(
      'Contexte et objectif du point',
      'Pourquoi ce point, résultat attendu.',
      'INFORMATION',
      'Quel résultat concret attend-on de ce point ?',
    ),
    presetRow(
      'Points à traiter',
      'Sujets à aborder pendant la séance.',
      'OTHER',
      'Quels sujets doivent absolument être traités ?',
    ),
    presetRow(
      'Décisions attendues',
      'Arbitrages ou validations visés.',
      'DECISION',
    ),
  ],
};

export function isPilotageReviewType(
  reviewType: ProjectReviewType,
): reviewType is PilotageReviewType {
  return (REVIEW_TYPES_PILOTAGE as readonly string[]).includes(reviewType);
}

/** Mappe types menu création (Revue / Ad hoc) vers presets pilotage. */
function resolvePresetKey(
  reviewType: ProjectReviewType,
): PilotageReviewType | null {
  if (reviewType === 'PROJECT_REVIEW') return 'MILESTONE_REVIEW';
  if (reviewType === 'OTHER') return 'AD_HOC';
  if (isPilotageReviewType(reviewType)) return reviewType;
  return null;
}

export function getAgendaPresetForReviewType(
  reviewType: ProjectReviewType,
): ReviewAgendaPresetRow[] {
  const key = resolvePresetKey(reviewType);
  if (!key) return [];
  return AGENDA_PRESETS[key].map((row) => ({ ...row }));
}

export function cloneAgendaPresetRows(
  rows: ReviewAgendaPresetRow[],
): ReviewAgendaPresetRow[] {
  return rows.map((row) => ({ ...row }));
}

export function agendaRowsMatchPreset(
  rows: ReviewAgendaPresetRow[],
  preset: ReviewAgendaPresetRow[],
): boolean {
  if (rows.length !== preset.length) return false;
  return rows.every((row, index) => {
    const expected = preset[index];
    return (
      row.title === expected.title &&
      row.description === expected.description &&
      row.itemType === expected.itemType &&
      row.expectedDecision === expected.expectedDecision
    );
  });
}
