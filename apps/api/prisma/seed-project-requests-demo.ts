/**
 * Jeu démo CDC Demandes de projet — 8 fiches alignées sur
 * `docs/RFC/_sources/.../reference-code/demandes.js` (RFC-PROJ-INTAKE-002 P5).
 */
import {
  Prisma,
  PrismaClient,
  ProjectRequestArbitrationInstance,
  ProjectRequestCircuitStep,
  ProjectRequestInstructionOpinion,
  ProjectRequestPriorityRequested,
  ProjectRequestStatus,
  ProjectRequestType,
} from "@prisma/client";

type DemoJournal = { label: string; authorLabel: string; at: Date };

type DemoRequest = {
  referenceCode: string;
  title: string;
  type: ProjectRequestType;
  requestingDirection: string;
  requesterDisplayName: string;
  sponsorLabel: string;
  createdAt: Date;
  description: string;
  objectives: string[];
  expectedBenefits: string;
  estimatedBudget: number;
  estimatedEffortDays: number;
  desiredDeadline: Date;
  priorityRequested: ProjectRequestPriorityRequested;
  status: ProjectRequestStatus;
  arbitrationInstance: ProjectRequestArbitrationInstance | null;
  meetingLabel: string | null;
  failedAtStep: ProjectRequestCircuitStep | null;
  instructionOpinion: ProjectRequestInstructionOpinion | null;
  instructionSummary: string | null;
  retainedBudget: number | null;
  journal: DemoJournal[];
};

function d(iso: string): Date {
  return new Date(`${iso}T12:00:00.000Z`);
}

/** Données figées prototype CDC (statuts couverts A1). */
const DEMO_REQUESTS: DemoRequest[] = [
  {
    referenceCode: "DP-2026-018",
    title: "Portail fournisseurs self-care",
    type: ProjectRequestType.TRANSFORMATION,
    requestingDirection: "Direction Achats",
    requesterDisplayName: "Nadia Cherif",
    sponsorLabel: "Marc Delaunay — DSI",
    createdAt: d("2026-09-02"),
    description:
      "Les fournisseurs transmettent leurs factures et pièces justificatives par e-mail. Le traitement est manuel, non traçable, et génère 4 à 6 jours de retard sur les paiements.",
    objectives: [
      "Dématérialiser le dépôt des factures et des pièces contractuelles",
      "Réduire le délai de traitement de 5 à 1 jour ouvré",
      "Tracer les échanges pour les audits fournisseurs",
    ],
    expectedBenefits:
      "Gain estimé de 1,2 ETP sur le service Achats, réduction des pénalités de retard et conformité au devoir de vigilance.",
    estimatedBudget: 180000,
    estimatedEffortDays: 210,
    desiredDeadline: d("2027-03-31"),
    priorityRequested: ProjectRequestPriorityRequested.HIGH,
    status: ProjectRequestStatus.IN_CYCLE,
    arbitrationInstance: ProjectRequestArbitrationInstance.COPIL,
    meetingLabel: "COPIL Transformation — 24 sept. 2026",
    failedAtStep: null,
    instructionOpinion: ProjectRequestInstructionOpinion.FAVORABLE,
    instructionSummary: "Avis favorable — inscription COPIL",
    retainedBudget: 180000,
    journal: [
      { label: "Demande créée", authorLabel: "Nadia Cherif", at: d("2026-09-02") },
      { label: "Soumise pour validation", authorLabel: "Nadia Cherif", at: d("2026-09-03") },
      {
        label: "Validée par le N+1",
        authorLabel: "Claire Besson — Dir. Achats",
        at: d("2026-09-04"),
      },
      {
        label: "Instruction terminée · avis favorable",
        authorLabel: "Julie Fontaine — PMO",
        at: d("2026-09-10"),
      },
      {
        label: "Inscrite à l'ordre du jour du COPIL du 24 sept.",
        authorLabel: "Julie Fontaine — PMO",
        at: d("2026-09-11"),
      },
    ],
  },
  {
    referenceCode: "DP-2026-017",
    title: "Mise en conformité DORA — registre des prestataires",
    type: ProjectRequestType.REGULATORY,
    requestingDirection: "Direction Risques",
    requesterDisplayName: "Amélie Rousseau",
    sponsorLabel: "Isabelle Fournier — DG",
    createdAt: d("2026-08-28"),
    description:
      "Le règlement DORA impose un registre complet des prestataires TIC critiques avant janvier 2027. Le recensement actuel est partiel et tenu sous Excel.",
    objectives: [
      "Constituer le registre réglementaire complet",
      "Automatiser la collecte auprès des métiers",
      "Produire les états exigés par le superviseur",
    ],
    expectedBenefits:
      "Évite le risque de sanction et sécurise la supervision des prestataires critiques.",
    estimatedBudget: 40000,
    estimatedEffortDays: 60,
    desiredDeadline: d("2026-12-31"),
    priorityRequested: ProjectRequestPriorityRequested.HIGH,
    status: ProjectRequestStatus.APPROVED,
    arbitrationInstance: null,
    meetingLabel: null,
    failedAtStep: null,
    instructionOpinion: ProjectRequestInstructionOpinion.FAVORABLE,
    instructionSummary: "Validée hors cycle — type réglementaire exempté",
    retainedBudget: 40000,
    journal: [
      { label: "Demande créée", authorLabel: "Amélie Rousseau", at: d("2026-08-28") },
      { label: "Soumise pour validation", authorLabel: "Amélie Rousseau", at: d("2026-08-28") },
      {
        label: "Validée par le N+1",
        authorLabel: "Isabelle Fournier — DG",
        at: d("2026-08-29"),
      },
      {
        label: "Instruction terminée · avis favorable",
        authorLabel: "Julie Fontaine — PMO",
        at: d("2026-09-05"),
      },
      {
        label: "Validée hors cycle — type réglementaire exempté",
        authorLabel: "Julie Fontaine — PMO",
        at: d("2026-09-05"),
      },
    ],
  },
  {
    referenceCode: "DP-2026-016",
    title: "Refonte du parcours de souscription mobile",
    type: ProjectRequestType.PRODUCT,
    requestingDirection: "Direction Marketing",
    requesterDisplayName: "Sophie Marchand",
    sponsorLabel: "Antoine Roy — Dir. Marketing",
    createdAt: d("2026-09-08"),
    description:
      "Le taux d'abandon du parcours de souscription mobile atteint 62 %. Aucune refonte n'a été menée depuis 2022.",
    objectives: [
      "Réduire l'abandon sous 40 %",
      "Aligner le parcours sur la nouvelle identité",
      "Ouvrir le paiement fractionné",
    ],
    expectedBenefits:
      "+ 3 200 souscriptions annuelles estimées, soit 480 k€ de chiffre d'affaires additionnel.",
    estimatedBudget: 260000,
    estimatedEffortDays: 340,
    desiredDeadline: d("2027-06-30"),
    priorityRequested: ProjectRequestPriorityRequested.MEDIUM,
    status: ProjectRequestStatus.IN_REVIEW,
    arbitrationInstance: null,
    meetingLabel: null,
    failedAtStep: null,
    instructionOpinion: null,
    instructionSummary: null,
    retainedBudget: null,
    journal: [
      { label: "Demande créée", authorLabel: "Sophie Marchand", at: d("2026-09-08") },
      { label: "Soumise pour validation", authorLabel: "Sophie Marchand", at: d("2026-09-08") },
      {
        label: "Validée par le N+1",
        authorLabel: "Antoine Roy — Dir. Marketing",
        at: d("2026-09-09"),
      },
      {
        label: "Instruction affectée au PMO",
        authorLabel: "Julie Fontaine — PMO",
        at: d("2026-09-10"),
      },
    ],
  },
  {
    referenceCode: "DP-2026-015",
    title: "Espace documentaire RH unifié",
    type: ProjectRequestType.EVOLUTION,
    requestingDirection: "Direction RH",
    requesterDisplayName: "Farida Haddad",
    sponsorLabel: "Sophie Marchand — DRH adj.",
    createdAt: d("2026-09-11"),
    description:
      "Les documents RH sont répartis sur trois espaces distincts, ce qui multiplie les demandes au service du personnel.",
    objectives: [
      "Regrouper les documents dans un espace unique",
      "Gérer les droits par population",
    ],
    expectedBenefits: "Réduction estimée de 30 % des sollicitations du service RH.",
    estimatedBudget: 28000,
    estimatedEffortDays: 45,
    desiredDeadline: d("2027-01-31"),
    priorityRequested: ProjectRequestPriorityRequested.LOW,
    status: ProjectRequestStatus.SUBMITTED,
    arbitrationInstance: null,
    meetingLabel: null,
    failedAtStep: null,
    instructionOpinion: null,
    instructionSummary: null,
    retainedBudget: null,
    journal: [
      { label: "Demande créée", authorLabel: "Farida Haddad", at: d("2026-09-11") },
      { label: "Soumise pour validation", authorLabel: "Farida Haddad", at: d("2026-09-11") },
    ],
  },
  {
    referenceCode: "DP-2026-014",
    title: "Supervision applicative temps réel",
    type: ProjectRequestType.INFRASTRUCTURE,
    requestingDirection: "Direction Technique",
    requesterDisplayName: "Marc Lefèvre",
    sponsorLabel: "Marc Delaunay — DSI",
    createdAt: d("2026-09-12"),
    description:
      "Les incidents de production sont détectés par les utilisateurs avant l'exploitation. Aucune supervision centralisée.",
    objectives: [
      "Détecter 90 % des incidents avant signalement",
      "Unifier les alertes des 14 applications critiques",
    ],
    expectedBenefits: "Réduction du temps moyen de rétablissement de 4 h à 45 min.",
    estimatedBudget: 95000,
    estimatedEffortDays: 120,
    desiredDeadline: d("2027-02-28"),
    priorityRequested: ProjectRequestPriorityRequested.HIGH,
    status: ProjectRequestStatus.DRAFT,
    arbitrationInstance: null,
    meetingLabel: null,
    failedAtStep: null,
    instructionOpinion: null,
    instructionSummary: null,
    retainedBudget: null,
    journal: [
      { label: "Demande créée", authorLabel: "Marc Lefèvre", at: d("2026-09-12") },
    ],
  },
  {
    referenceCode: "DP-2026-011",
    title: "Chatbot de support niveau 1",
    type: ProjectRequestType.PRODUCT,
    requestingDirection: "Direction Client",
    requesterDisplayName: "Julie Fontaine",
    sponsorLabel: "Antoine Roy — Dir. Marketing",
    createdAt: d("2026-07-15"),
    description: "Volume d'appels de niveau 1 en hausse de 18 % sur un an.",
    objectives: ["Automatiser 35 % des demandes de niveau 1"],
    expectedBenefits: "Économie estimée de 0,8 ETP sur le centre de contact.",
    estimatedBudget: 120000,
    estimatedEffortDays: 150,
    desiredDeadline: d("2027-04-30"),
    priorityRequested: ProjectRequestPriorityRequested.LOW,
    status: ProjectRequestStatus.POSTPONED,
    arbitrationInstance: ProjectRequestArbitrationInstance.COPIL,
    meetingLabel: "COPIL Transformation — 27 août 2026",
    failedAtStep: ProjectRequestCircuitStep.ARBITRATION,
    instructionOpinion: ProjectRequestInstructionOpinion.RESERVED,
    instructionSummary: "Avis réservé (gains non étayés)",
    retainedBudget: 120000,
    journal: [
      { label: "Demande créée", authorLabel: "Julie Fontaine", at: d("2026-07-15") },
      { label: "Soumise pour validation", authorLabel: "Julie Fontaine", at: d("2026-07-16") },
      { label: "Validée par le N+1", authorLabel: "Antoine Roy", at: d("2026-07-17") },
      {
        label: "Instruction terminée · avis réservé (gains non étayés)",
        authorLabel: "Julie Fontaine — PMO",
        at: d("2026-08-05"),
      },
      {
        label: "Ajournée en COPIL du 27 août — dossier de gains à consolider",
        authorLabel: "COPIL Transformation",
        at: d("2026-08-27"),
      },
    ],
  },
  {
    referenceCode: "DP-2026-009",
    title: "Migration du parc bureautique Windows 12",
    type: ProjectRequestType.INFRASTRUCTURE,
    requestingDirection: "Direction Technique",
    requesterDisplayName: "Jean Tissot",
    sponsorLabel: "Marc Delaunay — DSI",
    createdAt: d("2026-06-20"),
    description: "Fin de support de l'OS actuel en décembre 2027.",
    objectives: ["Migrer 1 400 postes", "Industrialiser le masterisation"],
    expectedBenefits: "Maintien du support éditeur et du niveau de sécurité.",
    estimatedBudget: 310000,
    estimatedEffortDays: 260,
    desiredDeadline: d("2027-11-30"),
    priorityRequested: ProjectRequestPriorityRequested.MEDIUM,
    status: ProjectRequestStatus.CONVERTED_TO_PROJECT,
    arbitrationInstance: ProjectRequestArbitrationInstance.CODIR,
    meetingLabel: "CODIR — 2 juil. 2026",
    failedAtStep: null,
    instructionOpinion: ProjectRequestInstructionOpinion.FAVORABLE,
    instructionSummary: "Arbitrage favorable en CODIR",
    retainedBudget: 310000,
    journal: [
      { label: "Demande créée", authorLabel: "Jean Tissot", at: d("2026-06-20") },
      { label: "Soumise pour validation", authorLabel: "Jean Tissot", at: d("2026-06-20") },
      {
        label: "Validée par le N+1",
        authorLabel: "Marc Delaunay — DSI",
        at: d("2026-06-22"),
      },
      {
        label: "Instruction terminée · avis favorable",
        authorLabel: "Julie Fontaine — PMO",
        at: d("2026-06-28"),
      },
      {
        label: "Arbitrage favorable en CODIR du 2 juil.",
        authorLabel: "CODIR",
        at: d("2026-07-02"),
      },
      {
        label: "Projet « Migration Poste de travail » créé",
        authorLabel: "Julie Fontaine — PMO",
        at: d("2026-07-03"),
      },
    ],
  },
  {
    referenceCode: "DP-2026-006",
    title: "Application de covoiturage interne",
    type: ProjectRequestType.PRODUCT,
    requestingDirection: "Direction RSE",
    requesterDisplayName: "Hugo Petit",
    sponsorLabel: "Isabelle Fournier — DG",
    createdAt: d("2026-05-04"),
    description: "Demande interne portée par le comité RSE.",
    objectives: [
      "Réduire l'empreinte carbone des déplacements domicile-travail",
    ],
    expectedBenefits: "Gain d'image, contribution au bilan carbone.",
    estimatedBudget: 75000,
    estimatedEffortDays: 90,
    desiredDeadline: d("2027-09-30"),
    priorityRequested: ProjectRequestPriorityRequested.LOW,
    status: ProjectRequestStatus.REJECTED,
    arbitrationInstance: ProjectRequestArbitrationInstance.COPIL,
    meetingLabel: "COPIL Transformation — 28 mai 2026",
    failedAtStep: ProjectRequestCircuitStep.ARBITRATION,
    instructionOpinion: ProjectRequestInstructionOpinion.UNFAVORABLE,
    instructionSummary: "Avis défavorable (hors trajectoire SI)",
    retainedBudget: 75000,
    journal: [
      { label: "Demande créée", authorLabel: "Hugo Petit", at: d("2026-05-04") },
      { label: "Soumise pour validation", authorLabel: "Hugo Petit", at: d("2026-05-05") },
      {
        label: "Validée par le N+1",
        authorLabel: "Isabelle Fournier — DG",
        at: d("2026-05-06"),
      },
      {
        label: "Instruction terminée · avis défavorable (hors trajectoire SI)",
        authorLabel: "Julie Fontaine — PMO",
        at: d("2026-05-20"),
      },
      {
        label: "Refusée en COPIL du 28 mai — hors priorités du schéma directeur",
        authorLabel: "COPIL Transformation",
        at: d("2026-05-28"),
      },
    ],
  },
];

/**
 * Upsert idempotent des 8 demandes CDC pour un client (requester = 1er user actif).
 */
export async function ensureDemoProjectRequests(
  prisma: PrismaClient,
  clientSlug: string,
  clientId: string,
  requesterUserId: string,
): Promise<number> {
  await prisma.projectRequestWorkflowSettings.upsert({
    where: { clientId },
    create: {
      clientId,
      copilThresholdAmount: new Prisma.Decimal(50000),
      codirThresholdAmount: new Prisma.Decimal(250000),
      instructionSlaBusinessDays: 10,
      requireN1Validation: true,
      requirePmoInstruction: true,
      autoCreateProjectOnApproval: false,
      exemptRequestTypes: [ProjectRequestType.REGULATORY],
    },
    update: {
      copilThresholdAmount: new Prisma.Decimal(50000),
      codirThresholdAmount: new Prisma.Decimal(250000),
      instructionSlaBusinessDays: 10,
      requireN1Validation: true,
      requirePmoInstruction: true,
      autoCreateProjectOnApproval: false,
      exemptRequestTypes: [ProjectRequestType.REGULATORY],
    },
  });

  let upserted = 0;
  for (const demo of DEMO_REQUESTS) {
    const existing = await prisma.projectRequest.findFirst({
      where: { clientId, referenceCode: demo.referenceCode },
      select: { id: true },
    });

    const data = {
      title: demo.title,
      description: demo.description,
      type: demo.type,
      requestingDirection: demo.requestingDirection,
      sponsorLabel: demo.sponsorLabel,
      status: demo.status,
      urgency: null as null,
      priorityRequested: demo.priorityRequested,
      estimatedBudget: new Prisma.Decimal(demo.estimatedBudget),
      estimatedEffortDays: new Prisma.Decimal(demo.estimatedEffortDays),
      desiredDeadline: demo.desiredDeadline,
      expectedBenefits: demo.expectedBenefits,
      objectives: demo.objectives,
      arbitrationInstance: demo.arbitrationInstance,
      meetingLabel: demo.meetingLabel,
      failedAtStep: demo.failedAtStep,
      instructionOpinion: demo.instructionOpinion,
      instructionSummary: demo.instructionSummary,
      retainedBudget:
        demo.retainedBudget != null
          ? new Prisma.Decimal(demo.retainedBudget)
          : null,
      createdAt: demo.createdAt,
      updatedAt: new Date(),
    };

    let requestId: string;
    if (existing) {
      await prisma.projectRequest.update({
        where: { id: existing.id },
        data,
      });
      requestId = existing.id;
      await prisma.projectRequestJournalEntry.deleteMany({
        where: { projectRequestId: requestId, clientId },
      });
    } else {
      const created = await prisma.projectRequest.create({
        data: {
          clientId,
          referenceCode: demo.referenceCode,
          requesterUserId,
          ...data,
        },
      });
      requestId = created.id;
    }

    if (demo.journal.length > 0) {
      await prisma.projectRequestJournalEntry.createMany({
        data: demo.journal.map((j) => ({
          clientId,
          projectRequestId: requestId,
          label: j.label,
          authorLabel: j.authorLabel,
          authorUserId: null,
          at: j.at,
        })),
      });
    }
    upserted += 1;
  }

  console.log(
    `✅ [${clientSlug}] Demandes projet CDC démo : ${upserted} fiche(s) (DP-2026-006…018)`,
  );
  return upserted;
}
