import type {
  ProjectReviewAgendaItemType,
  ProjectReviewType,
} from '../types/project.types';
import { REVIEW_TYPES_PILOTAGE } from './project-review-post-mortem';

export type ReviewAgendaPresetRow = {
  title: string;
  description: string;
  itemType: ProjectReviewAgendaItemType;
};

/** Courte description du déroulé attendu — affichée sous le sélecteur de type. */
export const REVIEW_TYPE_AGENDA_HINT: Record<
  (typeof REVIEW_TYPES_PILOTAGE)[number],
  string
> = {
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

const AGENDA_PRESETS: Record<
  (typeof REVIEW_TYPES_PILOTAGE)[number],
  ReviewAgendaPresetRow[]
> = {
  COPIL: [
    {
      title: 'Ouverture et rappel du contexte',
      description: 'Objectifs du COPIL, décisions du point précédent.',
      itemType: 'INFORMATION',
    },
    {
      title: 'Avancement et état du projet',
      description: 'Tendance, jalons, écarts planning.',
      itemType: 'INFORMATION',
    },
    {
      title: 'Budget et consommation',
      description: 'Engagé, consommé, écarts et prévisions.',
      itemType: 'BUDGET',
    },
    {
      title: 'Risques et points d’attention',
      description: 'Registre, nouveaux risques, signaux faibles.',
      itemType: 'RISK',
    },
    {
      title: 'Arbitrages en attente',
      description: 'Sujets à trancher au comité.',
      itemType: 'ARBITRATION',
    },
    {
      title: 'Suivi des actions ouvertes',
      description: 'Statut, retards, responsables.',
      itemType: 'ACTION_REVIEW',
    },
    {
      title: 'Décisions et prochaines étapes',
      description: 'Synthèse des décisions et date du prochain point.',
      itemType: 'DECISION',
    },
  ],
  COPRO: [
    {
      title: 'Ouverture COPRO',
      description: 'Objectif du point et priorités de la période.',
      itemType: 'INFORMATION',
    },
    {
      title: 'Avancement opérationnel',
      description: 'Tâches, livrables en cours, blocages terrain.',
      itemType: 'INFORMATION',
    },
    {
      title: 'Blocages et dépendances',
      description: 'Impediments, attentes externes, escalades.',
      itemType: 'OTHER',
    },
    {
      title: 'Charge et ressources',
      description: 'Disponibilités, besoins complémentaires.',
      itemType: 'INFORMATION',
    },
    {
      title: 'Planning à court terme',
      description: 'Jalons proches, engagements équipe.',
      itemType: 'MILESTONE',
    },
    {
      title: 'Suivi des actions',
      description: 'Actions ouvertes et échéances.',
      itemType: 'ACTION_REVIEW',
    },
  ],
  CODIR_REVIEW: [
    {
      title: 'Synthèse exécutive',
      description: 'Message clé, faits marquants, tendance projet.',
      itemType: 'INFORMATION',
    },
    {
      title: 'Enjeux stratégiques',
      description: 'Impacts métier, dépendances organisationnelles.',
      itemType: 'INFORMATION',
    },
    {
      title: 'Budget et investissement',
      description: 'Enveloppe, demandes de rallonge, arbitrage financier.',
      itemType: 'BUDGET',
    },
    {
      title: 'Arbitrages direction',
      description: 'Sujets nécessitant une décision CODIR.',
      itemType: 'ARBITRATION',
    },
    {
      title: 'Décisions CODIR',
      description: 'Validation des orientations et prochaines étapes.',
      itemType: 'DECISION',
    },
  ],
  RISK_REVIEW: [
    {
      title: 'Ouverture et cadrage de la revue',
      description:
        'Rappeler l’objectif de la session, le périmètre projet et les décisions attendues. Confirmer les participants et la durée.',
      itemType: 'INFORMATION',
    },
    {
      title: 'Revue du registre des risques',
      description:
        'Parcourir le registre des risques du projet (onglet Risques) : nouveaux risques, risques clos, évolution depuis la dernière revue.',
      itemType: 'RISK',
    },
    {
      title: 'Risques critiques et signaux faibles',
      description:
        'Focus sur les risques ouverts à criticité élevée : exposition, tendance, dépendances. Identifier les signaux faibles non encore formalisés.',
      itemType: 'RISK',
    },
    {
      title: 'Plans de mitigation et actions en cours',
      description:
        'Pour chaque risque majeur : état du plan d’action, responsable, échéance, efficacité des mesures. Relever les retards et manques.',
      itemType: 'ACTION_REVIEW',
    },
    {
      title: 'Acceptations, transferts et escalades',
      description:
        'Arbitrer les risques résiduels : acceptation formalisée, transfert (assurance, contrat, tiers), ou escalade vers le COPIL / CODIR.',
      itemType: 'ARBITRATION',
    },
    {
      title: 'Décisions et prochaine revue risques',
      description:
        'Synthèse des décisions, risques à surveiller en priorité, date et participants de la prochaine revue risques.',
      itemType: 'DECISION',
    },
  ],
  MILESTONE_REVIEW: [
    {
      title: 'Rappel du jalon',
      description: 'Objectif, date cible, critères attendus.',
      itemType: 'MILESTONE',
    },
    {
      title: 'Critères de passage',
      description: 'Check-list qualité, conformité, prérequis.',
      itemType: 'INFORMATION',
    },
    {
      title: 'État des livrables',
      description: 'Avancement, complétude, validation métier.',
      itemType: 'INFORMATION',
    },
    {
      title: 'Écarts et impacts',
      description: 'Retards, risques liés au jalon.',
      itemType: 'RISK',
    },
    {
      title: 'Décision GO / NO GO',
      description: 'Validation ou report du jalon.',
      itemType: 'DECISION',
    },
    {
      title: 'Actions de clôture jalon',
      description: 'Actions correctives et responsables.',
      itemType: 'ACTION_REVIEW',
    },
  ],
  AD_HOC: [
    {
      title: 'Contexte et objectif du point',
      description: 'Pourquoi ce point, résultat attendu.',
      itemType: 'INFORMATION',
    },
    {
      title: 'Points à traiter',
      description: 'Sujets à aborder pendant la séance.',
      itemType: 'OTHER',
    },
    {
      title: 'Décisions attendues',
      description: 'Arbitrages ou validations visés.',
      itemType: 'DECISION',
    },
  ],
};

export function isPilotageReviewType(
  reviewType: ProjectReviewType,
): reviewType is (typeof REVIEW_TYPES_PILOTAGE)[number] {
  return (REVIEW_TYPES_PILOTAGE as readonly string[]).includes(reviewType);
}

export function getAgendaPresetForReviewType(
  reviewType: ProjectReviewType,
): ReviewAgendaPresetRow[] {
  if (!isPilotageReviewType(reviewType)) {
    return [];
  }
  return AGENDA_PRESETS[reviewType].map((row) => ({ ...row }));
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
      row.itemType === expected.itemType
    );
  });
}
