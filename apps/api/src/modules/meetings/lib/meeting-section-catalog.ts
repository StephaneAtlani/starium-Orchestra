import { MeetingSectionType } from '@prisma/client';

/**
 * RFC-MEET-001 §4.2 — catalogue **fermé** des sections restituables.
 *
 * Un client compose librement ses modèles à partir de ce catalogue, mais ne peut
 * pas créer un nouveau *type* de section : chaque type suppose du code
 * d'agrégation dédié (lot B). L'échappatoire produit est `FREE_TEXT`, qui est
 * instanciable autant de fois que voulu avec un titre libre (§8-11).
 */
export type MeetingSectionDefinition = {
  readonly type: MeetingSectionType;
  /** Libellé métier par défaut — surchargeable par `titleOverride`. */
  readonly defaultTitle: string;
  /** Ce que la section restitue, en une phrase (aide à la configuration). */
  readonly description: string;
  /**
   * `true` si la section lit des données d'autres modules (lot B).
   * `false` si elle ne restitue que des données propres au module Réunions.
   */
  readonly aggregatesExternalData: boolean;
  /** Instanciable plusieurs fois dans un même modèle / une même réunion. */
  readonly repeatable: boolean;
  /** Nécessite au moins un projet inscrit au périmètre pour avoir du sens. */
  readonly requiresProjectScope: boolean;
};

export const MEETING_SECTION_CATALOG: Readonly<
  Record<MeetingSectionType, MeetingSectionDefinition>
> = {
  COVER: {
    type: 'COVER',
    defaultTitle: 'Couverture',
    description:
      'Nom du comité, période couverte, date, animateur et projets à l’ordre du jour.',
    aggregatesExternalData: false,
    repeatable: false,
    requiresProjectScope: false,
  },
  ATTENDANCE: {
    type: 'ATTENDANCE',
    defaultTitle: 'Appel',
    description:
      'Convoqués, présence, délégations et quorum. Première section de la conduite.',
    aggregatesExternalData: false,
    repeatable: false,
    requiresProjectScope: false,
  },
  AGENDA: {
    type: 'AGENDA',
    defaultTitle: 'Ordre du jour',
    description: 'Points à traiter, durée prévue et porteur.',
    aggregatesExternalData: false,
    repeatable: false,
    requiresProjectScope: false,
  },
  PORTFOLIO_SYNTHESIS: {
    type: 'PORTFOLIO_SYNTHESIS',
    defaultTitle: 'Synthèse portefeuille',
    description:
      'Une ligne par projet : santé, avancement, statut, criticité, responsable et signaux d’attention.',
    aggregatesExternalData: true,
    repeatable: false,
    requiresProjectScope: true,
  },
  PROJECT_STATUS: {
    type: 'PROJECT_STATUS',
    defaultTitle: 'Avancement',
    description:
      'Avancement global, décompte des tâches et météo du comité précédent.',
    aggregatesExternalData: true,
    repeatable: false,
    requiresProjectScope: true,
  },
  PLANNING_MACRO: {
    type: 'PLANNING_MACRO',
    defaultTitle: 'Planning macro',
    description:
      'Une barre par phase et les jalons en marqueurs. Vue macro, jamais les tâches.',
    aggregatesExternalData: true,
    repeatable: false,
    requiresProjectScope: true,
  },
  ALERTS: {
    type: 'ALERTS',
    defaultTitle: 'Alertes',
    description:
      'Alertes actives sur le périmètre, triées par sévérité décroissante.',
    aggregatesExternalData: true,
    repeatable: false,
    requiresProjectScope: true,
  },
  RISKS: {
    type: 'RISKS',
    defaultTitle: 'Risques',
    description:
      'Risques les plus critiques et matrice probabilité × impact.',
    aggregatesExternalData: true,
    repeatable: false,
    requiresProjectScope: true,
  },
  BLOCKERS: {
    type: 'BLOCKERS',
    defaultTitle: 'Points bloquants',
    description:
      'Registre des points bloquants et candidats détectés à promouvoir.',
    aggregatesExternalData: true,
    repeatable: false,
    requiresProjectScope: false,
  },
  BUDGET_CONSUMPTION: {
    type: 'BUDGET_CONSUMPTION',
    defaultTitle: 'Budget et consommé',
    description:
      'Budget cible, engagé, consommé, reste à consommer et taux de consommation.',
    aggregatesExternalData: true,
    repeatable: false,
    requiresProjectScope: true,
  },
  CAPACITY: {
    type: 'CAPACITY',
    defaultTitle: 'Capacité',
    description:
      'Capacité, affectée, prévisionnelle, engagée et disponible par équipe.',
    aggregatesExternalData: true,
    repeatable: false,
    requiresProjectScope: false,
  },
  ARBITRATIONS: {
    type: 'ARBITRATIONS',
    defaultTitle: 'Arbitrages',
    description:
      'États Métier, Comité et CODIR, motifs de refus et recommandation COPIL.',
    aggregatesExternalData: true,
    repeatable: false,
    requiresProjectScope: true,
  },
  DECISIONS: {
    type: 'DECISIONS',
    defaultTitle: 'Décisions',
    description:
      'Décisions prises en séance, de portée comité, projet ou macro-tâche.',
    aggregatesExternalData: false,
    repeatable: false,
    requiresProjectScope: false,
  },
  ACTIONS: {
    type: 'ACTIONS',
    defaultTitle: 'Actions',
    description:
      'Actions confiées, responsables et échéances. Rattachables à une tâche projet.',
    aggregatesExternalData: true,
    repeatable: false,
    requiresProjectScope: true,
  },
  NEXT_STEPS: {
    type: 'NEXT_STEPS',
    defaultTitle: 'Prochaines étapes',
    description:
      'Prochain comité, sujets reportés et points d’ordre du jour non traités.',
    aggregatesExternalData: false,
    repeatable: false,
    requiresProjectScope: false,
  },
  FREE_TEXT: {
    type: 'FREE_TEXT',
    defaultTitle: 'Bloc libre',
    description:
      'Contenu libre. Instanciable plusieurs fois, avec un titre propre à chaque bloc.',
    aggregatesExternalData: false,
    repeatable: true,
    requiresProjectScope: false,
  },
};

/** Tous les types de section, dans l'ordre de déclaration de l'enum Prisma. */
export const MEETING_SECTION_TYPES = Object.keys(
  MEETING_SECTION_CATALOG,
) as MeetingSectionType[];

/** Libellé métier d'une section — jamais l'identifiant technique en UI. */
export function meetingSectionDefaultTitle(type: MeetingSectionType): string {
  return MEETING_SECTION_CATALOG[type].defaultTitle;
}

/** `true` si le type peut apparaître plusieurs fois dans un même modèle. */
export function isRepeatableSection(type: MeetingSectionType): boolean {
  return MEETING_SECTION_CATALOG[type].repeatable;
}

/**
 * Valide une composition de sections.
 * Retourne la liste des types en doublon interdit (non répétables).
 */
export function findDuplicateNonRepeatableSections(
  types: readonly MeetingSectionType[],
): MeetingSectionType[] {
  const seen = new Set<MeetingSectionType>();
  const duplicates = new Set<MeetingSectionType>();
  for (const type of types) {
    if (isRepeatableSection(type)) continue;
    if (seen.has(type)) duplicates.add(type);
    seen.add(type);
  }
  return [...duplicates];
}
