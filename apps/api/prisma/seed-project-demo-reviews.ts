import {
  PrismaClient,
  ProjectReviewType,
  ProjectReviewStatus,
  ProjectTaskStatus,
} from "@prisma/client";
import type { Prisma } from "@prisma/client";

function addDaysUtc(base: Date, days: number): Date {
  const x = new Date(base);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

type Health = "OK" | "WARNING" | "CRITICAL";

function demoSnapshotPayload(input: {
  project: { id: string; name: string; status: string; priority: string };
  health: Health;
  tasks: { open: number; inProgress: number; done: number; late: number };
  topRisks: Array<{ id: string; title: string; criticality: "LOW" | "MEDIUM" | "HIGH"; status: string }>;
}): Prisma.InputJsonValue {
  const { project, health, tasks, topRisks } = input;
  return {
    project: {
      id: project.id,
      name: project.name,
      status: project.status,
      health,
      priority: project.priority,
    },
    progress: { globalProgress: null },
    arbitration: {
      arbitrationMetierStatus: null,
      arbitrationComiteStatus: null,
      arbitrationCodirStatus: null,
      arbitrationStatus: null,
    },
    tasks,
    risks: {
      open: topRisks.filter((r) => r.status === "OPEN").length,
      mitigated: 0,
      closed: 0,
      monitored: 0,
      topRisks: topRisks.slice(0, 5),
    },
    milestones: [],
    budget: null,
    generatedAt: new Date().toISOString(),
  };
}

type ParticipantIn = {
  userId?: string | null;
  displayName?: string | null;
  attended: boolean;
  isRequired: boolean;
};

type DecisionIn = { title: string; description?: string | null };

type ActionIn = {
  title: string;
  status: ProjectTaskStatus;
  dueDaysFromNow?: number;
  linkTask?: boolean;
};

/** Contenu `contentPayload.postMortem` (retour d’expérience) — échelle indicateurs 0–5. */
type PostMortemSeed = {
  objectifs: string;
  resultats: string;
  ecarts: string;
  causes: string;
  leconsApprises: string;
  recommandations: string;
  indicateurs: {
    budget: number | null;
    delais: number | null;
    qualite: number | null;
    communication: number | null;
    pilotageRisques: number | null;
  };
};

type ReviewBlueprint = {
  daysFromNow: number;
  type: ProjectReviewType;
  status: ProjectReviewStatus;
  title: string;
  executiveSummary: string;
  committeeMood?: "GREEN" | "ORANGE" | "RED";
  /** Si défini avec `reviewType: POST_MORTEM`, remplit `contentPayload.postMortem` (pas de `committeeMood`). */
  postMortem?: PostMortemSeed;
  facilitatorUserId?: string | null;
  finalizedDaysFromNow?: number;
  finalizedByUserId?: string | null;
  nextReviewDaysFromNow?: number | null;
  snapshot?: (proj: {
    id: string;
    name: string;
    status: string;
    priority: string;
  }) => Prisma.InputJsonValue;
  participants: ParticipantIn[];
  decisions: DecisionIn[];
  actions: ActionIn[];
};

const BLUEPRINTS: Record<string, ReviewBlueprint[]> = {
  "01": [
    {
      daysFromNow: -21,
      type: ProjectReviewType.COPIL,
      status: ProjectReviewStatus.FINALIZED,
      title: "COPIL — cadrage SSO et planning pilote",
      executiveSummary:
        "Validation du périmètre IdP, budget OPEX validé au niveau métier. Le pilote France peut démarrer sur le créneau annoncé ; la charge équipe IAM est sous contrôle.",
      committeeMood: "GREEN",
      facilitatorUserId: "USER_A",
      finalizedDaysFromNow: -20,
      finalizedByUserId: "USER_A",
      nextReviewDaysFromNow: 45,
      snapshot: (p) =>
        demoSnapshotPayload({
          project: p,
          health: "OK",
          tasks: { open: 1, inProgress: 1, done: 3, late: 0 },
          topRisks: [
            {
              id: "r-seed-01",
              title: "Dépendance calendrier fournisseur IdP",
              criticality: "LOW",
              status: "OPEN",
            },
          ],
        }),
      participants: [
        { userId: "USER_A", displayName: null, attended: true, isRequired: true },
        { userId: "USER_B", displayName: null, attended: true, isRequired: true },
        {
          userId: null,
          displayName: "DSI adjoint — invité",
          attended: true,
          isRequired: false,
        },
      ],
      decisions: [
        {
          title: "Lancement pilote national — phase 1",
          description:
            "Go pour intégration des applications RH et messagerie sur le tenant pilote, hors périmètre industriel.",
        },
        {
          title: "Communication utilisateurs",
          description:
            "Valider le kit communication avec la COM interne avant J-10 du pilote.",
        },
      ],
      actions: [
        {
          title: "Publier le planning de bascule par lot sur le portail DSI",
          status: ProjectTaskStatus.IN_PROGRESS,
          dueDaysFromNow: 14,
          linkTask: true,
        },
        {
          title: "Point hebdo avec l’éditeur IdP — suivi SLA",
          status: ProjectTaskStatus.TODO,
          dueDaysFromNow: 7,
          linkTask: false,
        },
      ],
    },
    {
      daysFromNow: -3,
      type: ProjectReviewType.COPRO,
      status: ProjectReviewStatus.DRAFT,
      title: "COPRO — préparation industrialisation",
      executiveSummary:
        "Brouillon : préparer les critères de passage en prod nationale (volumétrie, support N2, fenêtres de changement).",
      committeeMood: "ORANGE",
      facilitatorUserId: "USER_B",
      nextReviewDaysFromNow: 60,
      participants: [
        { userId: "USER_B", displayName: null, attended: true, isRequired: true },
        { userId: "USER_A", displayName: null, attended: false, isRequired: false },
      ],
      decisions: [
        {
          title: "Périmètre industrialisation",
          description: "À préciser : nombre de sites et applications hors pilote.",
        },
      ],
      actions: [
        {
          title: "Consolider la matrice de dépendances applicatives",
          status: ProjectTaskStatus.TODO,
          dueDaysFromNow: 21,
          linkTask: false,
        },
      ],
    },
    {
      daysFromNow: -45,
      type: ProjectReviewType.AD_HOC,
      status: ProjectReviewStatus.CANCELLED,
      title: "Point exceptionnel — incident certificat (annulé)",
      executiveSummary:
        "Réunion annulée : l’incident a été résolu en astreinte ; pas de COPIL dédié. Les actions sont suivies en run.",
      participants: [{ userId: "USER_A", displayName: null, attended: false, isRequired: false }],
      decisions: [],
      actions: [],
    },
  ],
  "02": [
    {
      daysFromNow: -60,
      type: ProjectReviewType.COPIL,
      status: ProjectReviewStatus.FINALIZED,
      title: "COPIL — architecture lakehouse",
      executiveSummary:
        "Accord sur la zone sensible et le modèle de gouvernance des données ; la pipeline batch SOC2 reste la priorité.",
      committeeMood: "GREEN",
      facilitatorUserId: "USER_B",
      finalizedDaysFromNow: -59,
      finalizedByUserId: "USER_B",
      nextReviewDaysFromNow: 90,
      snapshot: (p) =>
        demoSnapshotPayload({
          project: p,
          health: "OK",
          tasks: { open: 2, inProgress: 2, done: 1, late: 0 },
          topRisks: [
            {
              id: "r-seed-02",
              title: "Charge équipe data vs. livrables SOC2",
              criticality: "MEDIUM",
              status: "OPEN",
            },
          ],
        }),
      participants: [
        { userId: "USER_B", displayName: null, attended: true, isRequired: true },
        { userId: "USER_A", displayName: null, attended: true, isRequired: false },
      ],
      decisions: [
        {
          title: "Validation schéma de zones (prod / préprod / lab)",
          description: null,
        },
      ],
      actions: [
        {
          title: "Documenter les contrôles d’accès par zone",
          status: ProjectTaskStatus.IN_PROGRESS,
          dueDaysFromNow: 30,
          linkTask: true,
        },
      ],
    },
    {
      daysFromNow: 10,
      type: ProjectReviewType.MILESTONE_REVIEW,
      status: ProjectReviewStatus.DRAFT,
      title: "Revue jalon — mise en prod zone sensible",
      executiveSummary: "Préparation du comité de passage : critères GO/NO-GO à finaliser.",
      facilitatorUserId: "USER_A",
      nextReviewDaysFromNow: null,
      participants: [{ userId: "USER_A", displayName: null, attended: true, isRequired: true }],
      decisions: [],
      actions: [
        {
          title: "Préparer le dossier de preuves SOC2 pour le jalon",
          status: ProjectTaskStatus.TODO,
          dueDaysFromNow: 8,
          linkTask: false,
        },
      ],
    },
  ],
  "03": [
    {
      daysFromNow: -120,
      type: ProjectReviewType.CODIR_REVIEW,
      status: ProjectReviewStatus.FINALIZED,
      title: "CODIR — clôture programme legacy",
      executiveSummary:
        "Bilan : objectifs de sortie de four atteints, réserves mineures sur la documentation exploitabilité.",
      committeeMood: "GREEN",
      facilitatorUserId: "USER_A",
      finalizedDaysFromNow: -119,
      finalizedByUserId: "USER_B",
      nextReviewDaysFromNow: null,
      snapshot: (p) =>
        demoSnapshotPayload({
          project: p,
          health: "OK",
          tasks: { open: 0, inProgress: 0, done: 12, late: 0 },
          topRisks: [],
        }),
      participants: [
        { userId: "USER_B", displayName: null, attended: true, isRequired: true },
        { userId: "USER_A", displayName: null, attended: true, isRequired: true },
      ],
      decisions: [
        {
          title: "Clôture budgétaire et report des enveloppes résiduelles",
          description: "Solde basculé sur le portefeuille applications de remplacement.",
        },
      ],
      actions: [],
    },
    {
      daysFromNow: -200,
      type: ProjectReviewType.COPIL,
      status: ProjectReviewStatus.CANCELLED,
      title: "COPIL de suivi (doublon avec atelier architecture)",
      executiveSummary:
        "Annulé : les sujets ont été traités en atelier architecture ; pas besoin de double séance.",
      participants: [{ userId: "USER_A", displayName: null, attended: false, isRequired: false }],
      decisions: [],
      actions: [],
    },
    {
      daysFromNow: -30,
      type: ProjectReviewType.POST_MORTEM,
      status: ProjectReviewStatus.FINALIZED,
      title: "Retour d'expérience — clôture programme legacy",
      executiveSummary:
        "Bilan de fin de projet : objectifs atteints avec écarts maîtrisés sur le lot industriel ; capitalisation pour les prochains programmes de désengagement.",
      facilitatorUserId: "USER_A",
      finalizedDaysFromNow: -28,
      finalizedByUserId: "USER_A",
      nextReviewDaysFromNow: null,
      snapshot: (p) =>
        demoSnapshotPayload({
          project: p,
          health: "OK",
          tasks: { open: 0, inProgress: 0, done: 12, late: 0 },
          topRisks: [],
        }),
      postMortem: {
        objectifs:
          "Sortir du fournisseur legacy dans les enveloppes budgétaires sans rupture métier critique.",
        resultats:
          "Bascule de 12 applications ; dette résiduelle documentée ; hypercare tenue sur le créneau annoncé.",
        ecarts:
          "Retard de 3 semaines sur le lot industriel (indisponibilité terrain). Léger dépassement OPEX absorbé par réserve.",
        causes:
          "Sous-estimation des tests d'intégration bout-en-bout ; fenêtre de gel des périmètres trop courte.",
        leconsApprises:
          "Gel des périmètres 2 semaines avant bascule ; binôme MOA/MOE renforcé sur le pilote industriel.",
        recommandations:
          "Répliquer le gabarit de communication et le runbook de bascule sur les prochains programmes de sortie.",
        indicateurs: {
          budget: 4,
          delais: 3,
          qualite: 4,
          communication: 5,
          pilotageRisques: 4,
        },
      },
      participants: [
        { userId: "USER_A", displayName: null, attended: true, isRequired: true },
        { userId: "USER_B", displayName: null, attended: true, isRequired: true },
      ],
      decisions: [
        {
          title: "Archivage des accès legacy",
          description: "Compte à rebours communiqué aux métiers ; support N2 en renfort 10 jours.",
        },
      ],
      actions: [],
    },
  ],
  "04": [
    {
      daysFromNow: -14,
      type: ProjectReviewType.COPIL,
      status: ProjectReviewStatus.FINALIZED,
      title: "COPIL — avant mise en pause budget",
      executiveSummary:
        "État des lieux ERP phase 2 : reporting satisfaisant mais arbitrage CODIR sur l’enveloppe actif non rendu.",
      committeeMood: "ORANGE",
      facilitatorUserId: "USER_A",
      finalizedDaysFromNow: -13,
      finalizedByUserId: "USER_A",
      nextReviewDaysFromNow: null,
      snapshot: (p) =>
        demoSnapshotPayload({
          project: p,
          health: "WARNING",
          tasks: { open: 4, inProgress: 1, done: 2, late: 1 },
          topRisks: [
            {
              id: "r-seed-04",
              title: "Décision budget actif retardée",
              criticality: "HIGH",
              status: "OPEN",
            },
          ],
        }),
      participants: [
        { userId: "USER_A", displayName: null, attended: true, isRequired: true },
        {
          userId: null,
          displayName: "Contrôle de gestion — finance",
          attended: true,
          isRequired: true,
        },
      ],
      decisions: [
        {
          title: "Reporter le go production module actif",
          description: "En attente de validation CODIR sur le capex.",
        },
      ],
      actions: [
        {
          title: "Actualiser le business case avec scénario report 6 mois",
          status: ProjectTaskStatus.BLOCKED,
          dueDaysFromNow: -5,
          linkTask: false,
        },
      ],
    },
    {
      daysFromNow: -5,
      type: ProjectReviewType.COPRO,
      status: ProjectReviewStatus.DRAFT,
      title: "COPRO — arbitrage et scénarios de report",
      executiveSummary:
        "Brouillon : préparer les options (réduction périmètre, phasage, maintien en charge) pour la prochaine CODIR.",
      committeeMood: "RED",
      facilitatorUserId: "USER_B",
      nextReviewDaysFromNow: 20,
      participants: [
        { userId: "USER_B", displayName: null, attended: true, isRequired: true },
        { userId: "USER_A", displayName: null, attended: true, isRequired: false },
      ],
      decisions: [],
      actions: [
        {
          title: "Chiffrer le coût de report vs. maintien en legacy",
          status: ProjectTaskStatus.TODO,
          dueDaysFromNow: 10,
          linkTask: false,
        },
      ],
    },
  ],
  "05": [
    {
      daysFromNow: -10,
      type: ProjectReviewType.COPIL,
      status: ProjectReviewStatus.FINALIZED,
      title: "COPIL — cyber PAM / segmentation",
      executiveSummary:
        "Priorisation des segments critiques validée ; la fenêtre de maintenance reste le principal sujet de tension.",
      committeeMood: "ORANGE",
      facilitatorUserId: "USER_A",
      finalizedDaysFromNow: -9,
      finalizedByUserId: "USER_A",
      nextReviewDaysFromNow: 30,
      snapshot: (p) =>
        demoSnapshotPayload({
          project: p,
          health: "WARNING",
          tasks: { open: 2, inProgress: 0, done: 1, late: 1 },
          topRisks: [
            {
              id: "r-seed-05",
              title: "Refus métier des fenêtres de maintenance",
              criticality: "HIGH",
              status: "OPEN",
            },
          ],
        }),
      participants: [
        { userId: "USER_A", displayName: null, attended: true, isRequired: true },
        { userId: "USER_B", displayName: null, attended: true, isRequired: false },
      ],
      decisions: [
        {
          title: "Escalade CODIR sur les créneaux de changement",
          description: null,
        },
      ],
      actions: [
        {
          title: "Proposer trois créneaux de maintenance avec impact métier chiffré",
          status: ProjectTaskStatus.IN_PROGRESS,
          dueDaysFromNow: 5,
          linkTask: true,
        },
      ],
    },
    {
      daysFromNow: 2,
      type: ProjectReviewType.RISK_REVIEW,
      status: ProjectReviewStatus.DRAFT,
      title: "Revue risques — cyber (session dédiée)",
      executiveSummary:
        "Préparation : cartographie des scénarios d’attaque sur les segments non encore isolés.",
      facilitatorUserId: "USER_B",
      nextReviewDaysFromNow: null,
      participants: [{ userId: "USER_B", displayName: null, attended: true, isRequired: true }],
      decisions: [],
      actions: [
        {
          title: "Mettre à jour la matrice risque × segment réseau",
          status: ProjectTaskStatus.TODO,
          dueDaysFromNow: 3,
          linkTask: false,
        },
      ],
    },
  ],
  "06": [
    {
      daysFromNow: -30,
      type: ProjectReviewType.COPIL,
      status: ProjectReviewStatus.FINALIZED,
      title: "COPIL — tunnel d’achat et retard calendaire",
      executiveSummary:
        "Constat de dérive sur la date initiale ; accord pour prioriser l’intégration paiement et reporter la recette large.",
      committeeMood: "ORANGE",
      facilitatorUserId: "USER_B",
      finalizedDaysFromNow: -29,
      finalizedByUserId: "USER_B",
      nextReviewDaysFromNow: 14,
      snapshot: (p) =>
        demoSnapshotPayload({
          project: p,
          health: "WARNING",
          tasks: { open: 1, inProgress: 1, done: 4, late: 1 },
          topRisks: [],
        }),
      participants: [
        { userId: "USER_B", displayName: null, attended: true, isRequired: true },
        { userId: "USER_A", displayName: null, attended: true, isRequired: false },
      ],
      decisions: [
        {
          title: "Nouvelle date cible e-commerce",
          description: "Validation du nouveau planning avec le métier ventes.",
        },
      ],
      actions: [
        {
          title: "Finaliser les tests de charge sur le parcours paiement",
          status: ProjectTaskStatus.IN_PROGRESS,
          dueDaysFromNow: 7,
          linkTask: true,
        },
      ],
    },
    {
      daysFromNow: -2,
      type: ProjectReviewType.AD_HOC,
      status: ProjectReviewStatus.DRAFT,
      title: "Point ad hoc — UX tunnel mobile",
      executiveSummary: "Atelier court sur les retours utilisateurs pilotes ; pas de décision formelle attendue.",
      facilitatorUserId: "USER_A",
      participants: [{ userId: "USER_A", displayName: null, attended: true, isRequired: false }],
      decisions: [],
      actions: [],
    },
    {
      daysFromNow: -14,
      type: ProjectReviewType.POST_MORTEM,
      status: ProjectReviewStatus.FINALIZED,
      title: "Retour d'expérience — bilan tunnel d'achat (phase 1)",
      executiveSummary:
        "Clôture de phase : perception globale correcte malgré dérive calendaire ; actions correctives intégrées au backlog.",
      facilitatorUserId: "USER_B",
      finalizedDaysFromNow: -13,
      finalizedByUserId: "USER_B",
      nextReviewDaysFromNow: null,
      snapshot: (p) =>
        demoSnapshotPayload({
          project: p,
          health: "WARNING",
          tasks: { open: 1, inProgress: 1, done: 4, late: 1 },
          topRisks: [],
        }),
      postMortem: {
        objectifs: "Tenir le tunnel d'achat et la date e-commerce avec une charge équipe maîtrisée.",
        resultats:
          "Intégration paiement priorisée ; recette large reportée avec accord métier.",
        ecarts: "Dérive initiale sur le planning ; tensions sur les créneaux de maintenance.",
        causes: "Charge tests sous-estimée ; aléas métier sur les fenêtres de changement.",
        leconsApprises: "Chiffrer l'impact métier sur trois scénarios de créneaux avant arbitrage.",
        recommandations: "Instaurer un rituel mensuel commerce / IT sur la vélocité restante.",
        indicateurs: {
          budget: 3,
          delais: 2,
          qualite: 4,
          communication: 3,
          pilotageRisques: 3,
        },
      },
      participants: [
        { userId: "USER_B", displayName: null, attended: true, isRequired: true },
        { userId: "USER_A", displayName: null, attended: true, isRequired: false },
      ],
      decisions: [],
      actions: [],
    },
  ],
  "07": [
    {
      daysFromNow: -7,
      type: ProjectReviewType.MILESTONE_REVIEW,
      status: ProjectReviewStatus.FINALIZED,
      title: "Revue jalon — bascule numéros pilotes",
      executiveSummary:
        "Jalon atteint sur le périmètre pilote ; bascule générale prévue sous dix jours avec plan de rollback validé.",
      committeeMood: "GREEN",
      facilitatorUserId: "USER_A",
      finalizedDaysFromNow: -6,
      finalizedByUserId: "USER_A",
      nextReviewDaysFromNow: 21,
      snapshot: (p) =>
        demoSnapshotPayload({
          project: p,
          health: "OK",
          tasks: { open: 0, inProgress: 1, done: 6, late: 0 },
          topRisks: [],
        }),
      participants: [
        { userId: "USER_A", displayName: null, attended: true, isRequired: true },
        { userId: "USER_B", displayName: null, attended: true, isRequired: false },
      ],
      decisions: [
        {
          title: "GO pour généralisation des numéros",
          description: "Sous réserve de la fenêtre opérateur du week-end J+5.",
        },
      ],
      actions: [
        {
          title: "Exécuter le script de portabilité sur le dernier site pilote",
          status: ProjectTaskStatus.IN_PROGRESS,
          dueDaysFromNow: 3,
          linkTask: true,
        },
      ],
    },
  ],
  "08": [
    {
      daysFromNow: -12,
      type: ProjectReviewType.COPIL,
      status: ProjectReviewStatus.FINALIZED,
      title: "COPIL — observabilité et retard jalon APM",
      executiveSummary:
        "Comité tendu : jalon critique en retard, dette agents ; plan de rattrapage sur 4 semaines.",
      committeeMood: "RED",
      facilitatorUserId: "USER_B",
      finalizedDaysFromNow: -11,
      finalizedByUserId: "USER_B",
      nextReviewDaysFromNow: 28,
      snapshot: (p) =>
        demoSnapshotPayload({
          project: p,
          health: "CRITICAL",
          tasks: { open: 3, inProgress: 2, done: 1, late: 2 },
          topRisks: [
            {
              id: "r-seed-08",
              title: "Dette agents sur parc serveurs",
              criticality: "MEDIUM",
              status: "OPEN",
            },
          ],
        }),
      participants: [
        { userId: "USER_B", displayName: null, attended: true, isRequired: true },
        { userId: "USER_A", displayName: null, attended: true, isRequired: true },
      ],
      decisions: [
        {
          title: "Renfort prestataire observabilité — 20 jours",
          description: "Budget OPEX validé en séance.",
        },
      ],
      actions: [
        {
          title: "Déployer les agents sur le périmètre critique listé",
          status: ProjectTaskStatus.IN_PROGRESS,
          dueDaysFromNow: 10,
          linkTask: false,
        },
      ],
    },
    {
      daysFromNow: 5,
      type: ProjectReviewType.COPRO,
      status: ProjectReviewStatus.DRAFT,
      title: "COPRO — suivi plan de rattrapage",
      executiveSummary: "Brouillon : point d’étape sur les correctifs agents et couverture APM.",
      facilitatorUserId: "USER_A",
      participants: [{ userId: "USER_A", displayName: null, attended: true, isRequired: true }],
      decisions: [],
      actions: [
        {
          title: "Mesurer le taux de couverture APM vs. objectif 95 %",
          status: ProjectTaskStatus.TODO,
          dueDaysFromNow: 12,
          linkTask: false,
        },
      ],
    },
  ],
  "09": [
    {
      daysFromNow: -8,
      type: ProjectReviewType.COPIL,
      status: ProjectReviewStatus.DRAFT,
      title: "COPIL — partenariat éditeur et API",
      executiveSummary:
        "Premier comité avec l’éditeur : contrat cadre en cours ; pas encore de responsable projet interne nominatif sur Starium.",
      committeeMood: "ORANGE",
      facilitatorUserId: "USER_A",
      nextReviewDaysFromNow: 40,
      participants: [
        { userId: "USER_A", displayName: null, attended: true, isRequired: true },
        {
          userId: null,
          displayName: "Account manager éditeur — partenaire",
          attended: true,
          isRequired: false,
        },
      ],
      decisions: [
        {
          title: "Livrables atelier contrat",
          description: "Déposer les annexes techniques D-15 signature.",
        },
      ],
      actions: [
        {
          title: "Rattacher un chef de projet interne sur la fiche Starium",
          status: ProjectTaskStatus.TODO,
          dueDaysFromNow: 14,
          linkTask: true,
        },
      ],
    },
    {
      daysFromNow: -2,
      type: ProjectReviewType.POST_MORTEM,
      status: ProjectReviewStatus.DRAFT,
      title: "Retour d'expérience — partenariat éditeur (brouillon)",
      executiveSummary:
        "Brouillon : synthétiser la perception sur budget, délais et qualité d'intégration avant finalisation.",
      facilitatorUserId: "USER_A",
      nextReviewDaysFromNow: null,
      postMortem: {
        objectifs:
          "Sécuriser l'intégration API, cadrer la gouvernance des accès et les SLA avec l'éditeur.",
        resultats: "",
        ecarts: "",
        causes: "",
        leconsApprises: "",
        recommandations: "",
        indicateurs: {
          budget: null,
          delais: 3,
          qualite: null,
          communication: 4,
          pilotageRisques: null,
        },
      },
      participants: [{ userId: "USER_A", displayName: null, attended: true, isRequired: true }],
      decisions: [],
      actions: [],
    },
  ],
  "10": [
    {
      daysFromNow: 40,
      type: ProjectReviewType.COPIL,
      status: ProjectReviewStatus.DRAFT,
      title: "COPIL — lancement programme IA documentaire",
      executiveSummary:
        "Projet en préparation : cadrage use cases, données personnelles et hébergement ; premier COPIL après kick-off.",
      committeeMood: "GREEN",
      facilitatorUserId: "USER_B",
      nextReviewDaysFromNow: 120,
      participants: [
        { userId: "USER_B", displayName: null, attended: true, isRequired: true },
        { userId: "USER_A", displayName: null, attended: false, isRequired: false },
      ],
      decisions: [],
      actions: [
        {
          title: "Valider la liste des corpus documentaires autorisés pour l’IA",
          status: ProjectTaskStatus.TODO,
          dueDaysFromNow: 60,
          linkTask: true,
        },
      ],
    },
    {
      daysFromNow: 15,
      type: ProjectReviewType.COPRO,
      status: ProjectReviewStatus.CANCELLED,
      title: "COPRO technique (annulé — report kick-off)",
      executiveSummary:
        "Réunion annulée : le kick-off projet a été repoussé ; les invitations seront renvoyées après validation DSI.",
      participants: [{ userId: "USER_B", displayName: null, attended: false, isRequired: false }],
      decisions: [],
      actions: [],
    },
  ],
};

function resolveUser(ref: string | null | undefined, userA: string, userB: string): string | null {
  if (ref === "USER_A") return userA;
  if (ref === "USER_B") return userB;
  return ref ?? null;
}

/** Reconnaît `…-SEED-01`, `…-SEED-1`, etc. et normalise en `01`…`10`. */
function seedSuffixFromProjectCode(code: string): string | null {
  const m = code.match(/(?:^|-)SEED-(\d{1,2})$/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (Number.isNaN(n) || n < 1 || n > 10) return null;
  return String(n).padStart(2, "0");
}

/**
 * Points projet (RFC-PROJ-013) : données riches, statuts DRAFT / FINALIZED / CANCELLED,
 * participants, décisions, actions, météo comité (`committeeMood`), snapshots figés pour les finalisés.
 * Inclut des retours d'expérience (`POST_MORTEM`, `contentPayload.postMortem`) sur certains jeux démo.
 * Réinitialise les points existants sur les projets démo `prefix-SEED-01` … `10` pour garantir un jeu cohérent à chaque seed.
 */
export async function ensureDemoProjectReviews(
  prisma: PrismaClient,
  clientId: string,
  prefix: string,
  now: Date,
  userA: string,
  userB: string,
): Promise<void> {
  const codes = Array.from({ length: 10 }, (_, i) => `${prefix}-SEED-${String(i + 1).padStart(2, "0")}`);
  const projects = await prisma.project.findMany({
    where: { clientId, code: { in: codes } },
    select: { id: true, code: true, name: true, status: true, priority: true },
    orderBy: { code: "asc" },
  });
  if (projects.length === 0) return;

  const projectIds = projects.map((p) => p.id);
  await prisma.projectReview.deleteMany({
    where: { clientId, projectId: { in: projectIds } },
  });

  const tasks = await prisma.projectTask.findMany({
    where: { clientId, projectId: { in: projectIds } },
    select: { id: true, projectId: true, sortOrder: true },
    orderBy: [{ projectId: "asc" }, { sortOrder: "asc" }],
  });
  const firstTaskByProject = new Map<string, string>();
  for (const t of tasks) {
    if (!firstTaskByProject.has(t.projectId)) {
      firstTaskByProject.set(t.projectId, t.id);
    }
  }

  for (const proj of projects) {
    const suffix = seedSuffixFromProjectCode(proj.code);
    if (!suffix) continue;
    const blueprints = BLUEPRINTS[suffix];
    if (!blueprints?.length) continue;
    const firstTaskId = firstTaskByProject.get(proj.id) ?? null;

    for (const bp of blueprints) {
      const reviewDate = addDaysUtc(now, bp.daysFromNow);
      const contentPayload: Prisma.InputJsonValue =
        bp.type === ProjectReviewType.POST_MORTEM && bp.postMortem
          ? { postMortem: bp.postMortem }
          : {
              ...(bp.committeeMood ? { committeeMood: bp.committeeMood } : {}),
            };

      const finalizedAt =
        bp.status === ProjectReviewStatus.FINALIZED && bp.finalizedDaysFromNow != null
          ? addDaysUtc(now, bp.finalizedDaysFromNow)
          : null;
      const finalizedByUserId =
        bp.status === ProjectReviewStatus.FINALIZED
          ? resolveUser(bp.finalizedByUserId ?? "USER_A", userA, userB)
          : null;

      const nextReviewDate =
        bp.type === ProjectReviewType.POST_MORTEM
          ? null
          : bp.nextReviewDaysFromNow != null
            ? addDaysUtc(now, bp.nextReviewDaysFromNow)
            : null;

      const snapshotPayload =
        bp.status === ProjectReviewStatus.FINALIZED && bp.snapshot
          ? bp.snapshot({
              id: proj.id,
              name: proj.name,
              status: proj.status,
              priority: proj.priority,
            })
          : undefined;

      await prisma.projectReview.create({
        data: {
          clientId,
          projectId: proj.id,
          reviewDate,
          reviewType: bp.type,
          status: bp.status,
          title: bp.title,
          executiveSummary: bp.executiveSummary,
          contentPayload,
          facilitatorUserId: resolveUser(bp.facilitatorUserId, userA, userB),
          finalizedAt,
          finalizedByUserId,
          nextReviewDate,
          ...(snapshotPayload !== undefined ? { snapshotPayload } : {}),
          participants: {
            create: bp.participants.map((p) => ({
              clientId,
              userId:
                p.userId === "USER_A" || p.userId === "USER_B"
                  ? resolveUser(p.userId, userA, userB)
                  : (p.userId ?? null),
              displayName: p.displayName ?? null,
              attended: p.attended,
              isRequired: p.isRequired,
            })),
          },
          ...(bp.decisions.length > 0
            ? {
                decisions: {
                  create: bp.decisions.map((d) => ({
                    clientId,
                    title: d.title,
                    description: d.description ?? null,
                  })),
                },
              }
            : {}),
          ...(bp.actions.length > 0
            ? {
                actionItems: {
                  create: bp.actions.map((a) => ({
                    clientId,
                    projectId: proj.id,
                    title: a.title,
                    status: a.status,
                    dueDate:
                      a.dueDaysFromNow != null ? addDaysUtc(now, a.dueDaysFromNow) : null,
                    linkedTaskId: a.linkTask && firstTaskId ? firstTaskId : null,
                  })),
                },
              }
            : {}),
        },
      });
    }
  }

  const reviewCounts = await prisma.projectReview.groupBy({
    by: ["projectId"],
    where: { clientId, projectId: { in: projectIds } },
    _count: { _all: true },
  });
  const countByProject = new Map(reviewCounts.map((r) => [r.projectId, r._count._all]));
  for (const proj of projects) {
    if ((countByProject.get(proj.id) ?? 0) > 0) continue;
    await prisma.projectReview.create({
      data: {
        clientId,
        projectId: proj.id,
        reviewDate: addDaysUtc(now, -1),
        reviewType: ProjectReviewType.COPIL,
        status: ProjectReviewStatus.DRAFT,
        title: `COPIL — suivi (${proj.code})`,
        executiveSummary:
          "Point projet démo généré automatiquement (seed de secours) : aucun jeu détaillé ne correspondait au code projet.",
        contentPayload: { committeeMood: "ORANGE" },
        facilitatorUserId: userA,
        participants: {
          create: [
            {
              clientId,
              userId: userA,
              displayName: null,
              attended: true,
              isRequired: true,
            },
            {
              clientId,
              userId: userB,
              displayName: null,
              attended: true,
              isRequired: false,
            },
          ],
        },
      },
    });
  }
}
