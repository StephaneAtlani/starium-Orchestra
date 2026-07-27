import {
  MeetingAgendaItemStatus,
  MeetingScope,
  MeetingSectionType,
  MeetingTemplateKind,
} from '@prisma/client';

/**
 * RFC-MEET-001 §4.3 — modèles de rituel livrés par Starium.
 *
 * Ils sont instanciés **par client** au seed (`isSystem = true`) :
 * non supprimables et non modifiables, mais masquables (`isHidden`). Un client
 * qui veut les adapter les duplique — la copie a `isSystem = false`.
 *
 * Les ordres du jour par défaut reprennent les presets déjà éprouvés côté
 * points projet (`apps/web/src/features/projects/lib/project-review-agenda-presets.ts`)
 * plutôt que d'en réinventer : c'est le même vocabulaire métier.
 */
export type SystemAgendaRow = {
  readonly title: string;
  readonly description: string;
  readonly status?: MeetingAgendaItemStatus;
};

export type SystemMeetingTemplate = {
  readonly code: string;
  readonly name: string;
  readonly description: string;
  readonly kind: MeetingTemplateKind;
  readonly scope: MeetingScope;
  readonly defaultDurationMinutes: number;
  readonly sections: readonly MeetingSectionType[];
  readonly defaultAgenda: readonly SystemAgendaRow[];
};

export const SYSTEM_MEETING_TEMPLATES: readonly SystemMeetingTemplate[] = [
  {
    code: 'CODIR',
    name: 'CODIR',
    description:
      'Comité de direction : synthèse du portefeuille, arbitrages et décisions de niveau direction.',
    kind: 'CODIR',
    scope: 'PORTFOLIO',
    defaultDurationMinutes: 90,
    sections: [
      'COVER',
      'ATTENDANCE',
      'PORTFOLIO_SYNTHESIS',
      'ARBITRATIONS',
      'BUDGET_CONSUMPTION',
      'ALERTS',
      'DECISIONS',
      'NEXT_STEPS',
    ],
    defaultAgenda: [
      {
        title: 'Ouverture et rappel des décisions précédentes',
        description: 'Objectifs de la séance, suivi des décisions du dernier comité.',
      },
      {
        title: 'Synthèse du portefeuille',
        description: 'Santé des projets, avancement, points d’attention.',
      },
      {
        title: 'Arbitrages à rendre',
        description: 'Sujets à trancher au niveau direction.',
      },
      {
        title: 'Situation budgétaire',
        description: 'Engagé, consommé, écarts et prévisions.',
      },
      {
        title: 'Décisions et prochaines étapes',
        description: 'Formalisation des décisions et du prochain comité.',
      },
    ],
  },
  {
    code: 'COPIL',
    name: 'COPIL',
    description:
      'Comité de pilotage : avancement, budget, risques, arbitrages et suivi des actions.',
    kind: 'COPIL',
    scope: 'PROJECT',
    defaultDurationMinutes: 60,
    sections: [
      'COVER',
      'ATTENDANCE',
      'AGENDA',
      'PROJECT_STATUS',
      'PLANNING_MACRO',
      'BUDGET_CONSUMPTION',
      'RISKS',
      'BLOCKERS',
      'ARBITRATIONS',
      'DECISIONS',
      'ACTIONS',
      'NEXT_STEPS',
    ],
    defaultAgenda: [
      {
        title: 'Ouverture et rappel du contexte',
        description: 'Objectifs du COPIL, décisions du point précédent.',
      },
      {
        title: 'Avancement et état du projet',
        description: 'Tendance, jalons, écarts planning.',
      },
      {
        title: 'Budget et consommation',
        description: 'Engagé, consommé, écarts et prévisions.',
      },
      {
        title: 'Risques et points d’attention',
        description: 'Registre, nouveaux risques, signaux faibles.',
      },
      {
        title: 'Arbitrages en attente',
        description: 'Sujets à trancher au comité.',
      },
      {
        title: 'Suivi des actions ouvertes',
        description: 'Statut, retards, responsables.',
      },
      {
        title: 'Décisions et prochaines étapes',
        description: 'Formalisation des décisions et du prochain point.',
      },
    ],
  },
  {
    code: 'COPRO',
    name: 'COPRO',
    description:
      'Comité projet : pilotage opérationnel, blocages, charge et planning à court terme.',
    kind: 'COPRO',
    scope: 'PROJECT',
    defaultDurationMinutes: 45,
    sections: [
      'COVER',
      'ATTENDANCE',
      'AGENDA',
      'PROJECT_STATUS',
      'PLANNING_MACRO',
      'BLOCKERS',
      'ACTIONS',
      'NEXT_STEPS',
    ],
    defaultAgenda: [
      {
        title: 'Avancement depuis le dernier point',
        description: 'Ce qui a été livré, ce qui a glissé.',
      },
      {
        title: 'Planning à court terme',
        description: 'Prochaines échéances et charge associée.',
      },
      {
        title: 'Blocages et dépendances',
        description: 'Points bloquants, arbitrages opérationnels nécessaires.',
      },
      {
        title: 'Suivi des actions',
        description: 'Statut, retards, responsables.',
      },
      {
        title: 'Prochaines étapes',
        description: 'Engagements pour la période suivante.',
      },
    ],
  },
  {
    code: 'PROJECT_REVIEW',
    name: 'Revue de projet',
    description:
      'Revue complète d’un projet : avancement, planning, risques et décisions.',
    kind: 'PROJECT_REVIEW',
    scope: 'PROJECT',
    defaultDurationMinutes: 60,
    sections: [
      'COVER',
      'ATTENDANCE',
      'AGENDA',
      'PROJECT_STATUS',
      'PLANNING_MACRO',
      'RISKS',
      'DECISIONS',
      'ACTIONS',
      'NEXT_STEPS',
    ],
    defaultAgenda: [
      {
        title: 'Rappel du cadrage',
        description: 'Objectif, périmètre et enjeux du projet.',
      },
      {
        title: 'Avancement et planning',
        description: 'Phases, jalons et écarts.',
      },
      {
        title: 'Risques et points d’attention',
        description: 'Registre et plans de traitement.',
      },
      {
        title: 'Décisions et actions',
        description: 'Ce qui est tranché, ce qui est confié.',
      },
    ],
  },
  {
    code: 'BUDGET_REVIEW',
    name: 'Revue budgétaire',
    description:
      'Revue financière du portefeuille : consommation, capacité et arbitrages budgétaires.',
    kind: 'BUDGET_REVIEW',
    scope: 'PORTFOLIO',
    defaultDurationMinutes: 60,
    sections: [
      'COVER',
      'ATTENDANCE',
      'BUDGET_CONSUMPTION',
      'CAPACITY',
      'ARBITRATIONS',
      'DECISIONS',
      'NEXT_STEPS',
    ],
    defaultAgenda: [
      {
        title: 'Situation budgétaire consolidée',
        description: 'Engagé, consommé et reste à consommer par projet.',
      },
      {
        title: 'Capacité et charge',
        description: 'Disponibilité des équipes sur la période.',
      },
      {
        title: 'Arbitrages budgétaires',
        description: 'Réallocations et validations à rendre.',
      },
    ],
  },
  {
    code: 'RISK_COMMITTEE',
    name: 'Comité risques',
    description:
      'Revue du registre des risques : criticité, traitement, acceptations et points bloquants.',
    kind: 'RISK_COMMITTEE',
    scope: 'PORTFOLIO',
    defaultDurationMinutes: 60,
    sections: [
      'COVER',
      'ATTENDANCE',
      'RISKS',
      'BLOCKERS',
      'ALERTS',
      'DECISIONS',
      'ACTIONS',
      'NEXT_STEPS',
    ],
    defaultAgenda: [
      {
        title: 'Risques critiques et nouveaux risques',
        description: 'Parcours du registre par criticité décroissante.',
      },
      {
        title: 'Plans de traitement',
        description: 'Mitigation, contournement, acceptation.',
      },
      {
        title: 'Points bloquants et escalades',
        description: 'Ce qui nécessite une décision de niveau supérieur.',
      },
    ],
  },
  {
    code: 'ARBITRATION',
    name: 'Comité d’arbitrage',
    description:
      'Séance dédiée aux arbitrages de portefeuille : priorisation, engagement, report.',
    kind: 'ARBITRATION',
    scope: 'PORTFOLIO',
    defaultDurationMinutes: 90,
    sections: [
      'COVER',
      'ATTENDANCE',
      'PORTFOLIO_SYNTHESIS',
      'ARBITRATIONS',
      'BUDGET_CONSUMPTION',
      'CAPACITY',
      'DECISIONS',
    ],
    defaultAgenda: [
      {
        title: 'Candidats à l’arbitrage',
        description: 'Projets et demandes soumis à décision.',
      },
      {
        title: 'Contraintes budget et capacité',
        description: 'Ce que l’organisation peut absorber.',
      },
      {
        title: 'Arbitrages rendus',
        description: 'Retenu, différé, refusé — avec motif.',
      },
    ],
  },
  {
    code: 'CRISIS_POINT',
    name: 'Point de crise',
    description:
      'Séance exceptionnelle : blocages, risques majeurs et décisions immédiates.',
    kind: 'CRISIS_POINT',
    scope: 'PROJECT',
    defaultDurationMinutes: 45,
    sections: [
      'COVER',
      'ATTENDANCE',
      'BLOCKERS',
      'RISKS',
      'PLANNING_MACRO',
      'DECISIONS',
      'ACTIONS',
    ],
    defaultAgenda: [
      {
        title: 'Constat de la situation',
        description: 'Faits, impacts constatés, périmètre touché.',
      },
      {
        title: 'Points bloquants',
        description: 'Ce qui empêche d’avancer, et depuis quand.',
      },
      {
        title: 'Décisions immédiates',
        description: 'Mesures d’urgence et responsables désignés.',
      },
    ],
  },
  {
    code: 'POST_MORTEM',
    name: 'Retour d’expérience',
    description:
      'Bilan de fin de projet : ce qui a fonctionné, ce qui a manqué, ce qu’on retient.',
    kind: 'POST_MORTEM',
    scope: 'PROJECT',
    defaultDurationMinutes: 90,
    sections: [
      'COVER',
      'ATTENDANCE',
      'AGENDA',
      'PROJECT_STATUS',
      'BUDGET_CONSUMPTION',
      'FREE_TEXT',
      'DECISIONS',
      'NEXT_STEPS',
    ],
    defaultAgenda: [
      {
        title: 'Bilan du projet',
        description: 'Objectifs visés, résultats obtenus, écarts.',
      },
      {
        title: 'Ce qui a bien fonctionné',
        description: 'Pratiques à reconduire.',
      },
      {
        title: 'Ce qui a posé difficulté',
        description: 'Causes racines, sans recherche de responsabilité.',
      },
      {
        title: 'Enseignements à capitaliser',
        description: 'Ce que l’organisation retient pour les projets suivants.',
      },
    ],
  },
];

/** Codes des modèles système — utilisés par le seed et les tests de conformité. */
export const SYSTEM_MEETING_TEMPLATE_CODES = SYSTEM_MEETING_TEMPLATES.map(
  (template) => template.code,
);
