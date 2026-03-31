import {
  PrismaClient,
  ActionPlanPriority,
  ActionPlanStatus,
  ProjectTaskPriority,
  ProjectTaskStatus,
} from "@prisma/client";
import { Prisma } from "@prisma/client";

function addDaysUtc(base: Date, days: number): Date {
  const x = new Date(base);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

function progressFromTaskStatuses(statuses: ProjectTaskStatus[]): number {
  const active = statuses.filter((s) => s !== ProjectTaskStatus.CANCELLED).length;
  const done = statuses.filter((s) => s === ProjectTaskStatus.DONE).length;
  return active === 0 ? 0 : Math.round((100 * done) / active);
}

type DemoPlanDef = {
  codeSuffix: string;
  title: string;
  description: string;
  status: ActionPlanStatus;
  priority: ActionPlanPriority;
  startOffsetDays: number;
  targetOffsetDays: number;
};

type DemoActionTaskSeed = {
  name: string;
  description: string;
  status: ProjectTaskStatus;
  priority: ProjectTaskPriority;
  progress: number;
  sortOrder: number;
  /** index du plan dans l’ordre créé : 0 = COPIL, 1 = cyber, 2 = RGPD */
  planIndex: 0 | 1 | 2;
  projectSuffix?: string | null;
  riskOnProjectSuffix?: string | null;
  useResourceInt?: boolean;
  useResourceExt?: boolean;
  plannedStartOffset?: number | null;
  plannedEndOffset?: number | null;
  estimatedHours?: number | null;
  tags?: string[];
};

const PLANS: DemoPlanDef[] = [
  {
    codeSuffix: "PA-COPIL-Q1",
    title: "COPIL DSI — pilotage trimestriel (T1)",
    description:
      "Plan de suivi CODIR / COPIL : arbitrages budget, feux rouge portefeuille, relances fournisseurs et chantiers transverses.",
    status: ActionPlanStatus.ACTIVE,
    priority: ActionPlanPriority.HIGH,
    startOffsetDays: -50,
    targetOffsetDays: 40,
  },
  {
    codeSuffix: "PA-CYBER-AUDIT",
    title: "Remédiation cyber — suite audit et comité risques",
    description:
      "Actions correctives et consolidations après audit : PAM, segmentation, preuves pour le régulateur et le CA.",
    status: ActionPlanStatus.ACTIVE,
    priority: ActionPlanPriority.HIGH,
    startOffsetDays: -35,
    targetOffsetDays: 90,
  },
  {
    codeSuffix: "PA-RGPD-2026",
    title: "RGPD — registre, DSR et IA documentaire",
    description:
      "Mise à jour du registre des traitements, traitement des demandes personnes, cadrage des usages IA sur documents internes.",
    status: ActionPlanStatus.ON_HOLD,
    priority: ActionPlanPriority.MEDIUM,
    startOffsetDays: -20,
    targetOffsetDays: 120,
  },
];

/** Tâches métier crédibles, reliées aux projets démo SEED-xx quand c’est pertinent. */
const TASKS: DemoActionTaskSeed[] = [
  {
    planIndex: 0,
    sortOrder: 0,
    name: "Préparer dossier COPIL — synthèse consommation cloud et SaaS",
    description:
      "Chiffrer YTD vs budget, identifier dérives par BU ; support pour arbitrage NEO/BAT.",
    status: ProjectTaskStatus.DONE,
    priority: ProjectTaskPriority.HIGH,
    progress: 100,
    projectSuffix: "01",
    plannedStartOffset: -40,
    plannedEndOffset: -32,
    estimatedHours: 6,
    tags: ["COPIL", "budget"],
    useResourceInt: true,
  },
  {
    planIndex: 0,
    sortOrder: 1,
    name: "Relancer arbitrage budget — phase 2 ERP (blocage actuel)",
    description:
      "Relire proposition éditeur, mettre à jour business case et date cible ; point DAF + PMO.",
    status: ProjectTaskStatus.IN_PROGRESS,
    priority: ProjectTaskPriority.CRITICAL,
    progress: 40,
    projectSuffix: "04",
    plannedStartOffset: -25,
    plannedEndOffset: 15,
    estimatedHours: 8,
    tags: ["ERP", "arbitrage"],
    useResourceInt: true,
  },
  {
    planIndex: 0,
    sortOrder: 2,
    name: "Feuille de route intégration SSO — écarts restants applications métier",
    description:
      "Lister apps non raccordées, dates cibles et owners ; alimenter la slide portefeuille.",
    status: ProjectTaskStatus.IN_PROGRESS,
    priority: ProjectTaskPriority.MEDIUM,
    progress: 55,
    projectSuffix: "01",
    plannedStartOffset: -30,
    plannedEndOffset: 20,
    estimatedHours: 10,
    tags: ["identité", "SSO"],
    useResourceExt: true,
  },
  {
    planIndex: 0,
    sortOrder: 3,
    name: "Point avancement tunnel e-commerce — risque dépassement échéance",
    description:
      "Passer en revue jalons, dette technique restante et besoin renfort front.",
    status: ProjectTaskStatus.TODO,
    priority: ProjectTaskPriority.HIGH,
    progress: 0,
    projectSuffix: "06",
    plannedStartOffset: -10,
    plannedEndOffset: 25,
    estimatedHours: 4,
    tags: ["e-commerce", "jalon"],
  },
  {
    planIndex: 0,
    sortOrder: 4,
    name: "Uniformiser reporting COPIL (template et indicateurs)",
    description:
      "Une slide par projet : santé, budget, risques ouverts, prochaine décision attendue.",
    status: ProjectTaskStatus.TODO,
    priority: ProjectTaskPriority.LOW,
    progress: 0,
    projectSuffix: null,
    plannedStartOffset: 0,
    plannedEndOffset: 18,
    estimatedHours: 5,
    tags: ["reporting"],
  },
  {
    planIndex: 0,
    sortOrder: 5,
    name: "Suivi téléphonie — bascule opérateur (fin de programme proche)",
    description:
      "Vérifier planning de coupure, PRA vocal et communication sites.",
    status: ProjectTaskStatus.IN_PROGRESS,
    priority: ProjectTaskPriority.MEDIUM,
    progress: 78,
    projectSuffix: "07",
    plannedStartOffset: -15,
    plannedEndOffset: 12,
    estimatedHours: 3,
    tags: ["télécom"],
  },
  {
    planIndex: 0,
    sortOrder: 6,
    name: "Cartographier dépendances critiques data lake — comité données",
    description:
      "Préparer vue pipelines sensibles pour prochain comité données.",
    status: ProjectTaskStatus.DONE,
    priority: ProjectTaskPriority.MEDIUM,
    progress: 100,
    projectSuffix: "02",
    plannedStartOffset: -45,
    plannedEndOffset: -20,
    estimatedHours: 12,
    tags: ["data", "gouvernance"],
    useResourceInt: true,
  },
  {
    planIndex: 0,
    sortOrder: 7,
    name: "Annuler — doublon avec suivi hebdo Jira (test annulation)",
    description: "Tâche annulée volontairement pour varier les statuts du plan.",
    status: ProjectTaskStatus.CANCELLED,
    priority: ProjectTaskPriority.LOW,
    progress: 0,
    projectSuffix: null,
    plannedStartOffset: null,
    plannedEndOffset: null,
    tags: ["annulé"],
  },
  {
    planIndex: 1,
    sortOrder: 0,
    name: "Durcir comptes à privilèges — revue PAM (lot 1)",
    description:
      "Inventaire comptes admin, rotation mots de passe, justification accès.",
    status: ProjectTaskStatus.DONE,
    priority: ProjectTaskPriority.HIGH,
    progress: 100,
    projectSuffix: "05",
    riskOnProjectSuffix: "05",
    plannedStartOffset: -40,
    plannedEndOffset: -28,
    estimatedHours: 16,
    tags: ["PAM", "cyber"],
    useResourceExt: true,
  },
  {
    planIndex: 1,
    sortOrder: 1,
    name: "Segmentation réseau — zoning DMZ / prod / admin",
    description:
      "Mettre à jour schéma, règles firewall et flux autorisés ; validation RSSI.",
    status: ProjectTaskStatus.IN_PROGRESS,
    priority: ProjectTaskPriority.CRITICAL,
    progress: 35,
    projectSuffix: "05",
    riskOnProjectSuffix: "05",
    plannedStartOffset: -25,
    plannedEndOffset: 45,
    estimatedHours: 24,
    tags: ["réseau", "segmentation"],
    useResourceInt: true,
  },
  {
    planIndex: 1,
    sortOrder: 2,
    name: "Jeux de preuve audit — exports SIEM et tickets de changement",
    description:
      "Constituer dossier pour auditeur : 90 jours de logs, échantillon incidents.",
    status: ProjectTaskStatus.IN_PROGRESS,
    priority: ProjectTaskPriority.HIGH,
    progress: 50,
    projectSuffix: "05",
    plannedStartOffset: -20,
    plannedEndOffset: 20,
    estimatedHours: 10,
    tags: ["audit", "SIEM"],
  },
  {
    planIndex: 1,
    sortOrder: 3,
    name: "Atelier sensibilisation RSSI — population encadrants",
    description:
      "Session 2h + support de prise de conscience phishing et supply chain.",
    status: ProjectTaskStatus.TODO,
    priority: ProjectTaskPriority.MEDIUM,
    progress: 0,
    projectSuffix: null,
    plannedStartOffset: 5,
    plannedEndOffset: 30,
    estimatedHours: 6,
    tags: ["sensibilisation"],
    useResourceExt: true,
  },
  {
    planIndex: 1,
    sortOrder: 4,
    name: "Revue configurations IdP — alignement MFA et politique session",
    description:
      "Contrôle durée session, géo-restrictions et méthodes MFA autorisées.",
    status: ProjectTaskStatus.TODO,
    priority: ProjectTaskPriority.HIGH,
    progress: 0,
    projectSuffix: "01",
    plannedStartOffset: 0,
    plannedEndOffset: 35,
    estimatedHours: 8,
    tags: ["MFA", "identité"],
  },
  {
    planIndex: 1,
    sortOrder: 5,
    name: "Plan de communication incident — diffusion CA et opérationnel",
    description:
      "Gabarits email, portail intranet et point presse light si incident majeur.",
    status: ProjectTaskStatus.BLOCKED,
    priority: ProjectTaskPriority.MEDIUM,
    progress: 10,
    projectSuffix: null,
    plannedStartOffset: -10,
    plannedEndOffset: 40,
    estimatedHours: 4,
    tags: ["com", "incident"],
  },
  {
    planIndex: 1,
    sortOrder: 6,
    name: "Clôturer action « agents endpoint non déployés » — revalidation périmètre",
    description:
      "Dernière vague de déploiement ; passage en revue avec infogéreur.",
    status: ProjectTaskStatus.DONE,
    priority: ProjectTaskPriority.MEDIUM,
    progress: 100,
    projectSuffix: "05",
    plannedStartOffset: -50,
    plannedEndOffset: -10,
    estimatedHours: 6,
    tags: ["endpoint"],
  },
  {
    planIndex: 2,
    sortOrder: 0,
    name: "Mettre à jour le registre des traitements — nouveaux outils RH / paie",
    description:
      "Identifier sous-traitants, DPA signés et localisations des données.",
    status: ProjectTaskStatus.IN_PROGRESS,
    priority: ProjectTaskPriority.HIGH,
    progress: 45,
    projectSuffix: null,
    plannedStartOffset: -18,
    plannedEndOffset: 25,
    estimatedHours: 12,
    tags: ["RGPD", "registre"],
    useResourceInt: true,
  },
  {
    planIndex: 2,
    sortOrder: 1,
    name: "Traiter file DSR — demandes en retard du trimestre",
    description:
      "Prioriser accès, rectification et effacement ; preuves de réponse.",
    status: ProjectTaskStatus.TODO,
    priority: ProjectTaskPriority.CRITICAL,
    progress: 0,
    projectSuffix: null,
    plannedStartOffset: 0,
    plannedEndOffset: 21,
    estimatedHours: 20,
    tags: ["DSR", "RGPD"],
  },
  {
    planIndex: 2,
    sortOrder: 2,
    name: "AIPD projet assistant documentaire IA — cas d’usage internes",
    description:
      "Documenter finalités, base légale, mesures et DPIA si nécessaire.",
    status: ProjectTaskStatus.TODO,
    priority: ProjectTaskPriority.HIGH,
    progress: 0,
    projectSuffix: "10",
    plannedStartOffset: 10,
    plannedEndOffset: 70,
    estimatedHours: 14,
    tags: ["IA", "AIPD"],
    useResourceExt: true,
  },
  {
    planIndex: 2,
    sortOrder: 3,
    name: "Harmoniser mentions d’information site web et formulaires",
    description:
      "Revue juridique + mise en prod contenus ; lien avec DPO.",
    status: ProjectTaskStatus.TODO,
    priority: ProjectTaskPriority.MEDIUM,
    progress: 0,
    projectSuffix: null,
    plannedStartOffset: 5,
    plannedEndOffset: 45,
    estimatedHours: 8,
    tags: ["transparence"],
  },
  {
    planIndex: 2,
    sortOrder: 4,
    name: "Reporter atelier DPO + métiers — conflit de calendrier (en attente)",
    description:
      "Plan en pause côté métier ; tâche suivie mais non démarrée.",
    status: ProjectTaskStatus.TODO,
    priority: ProjectTaskPriority.LOW,
    progress: 0,
    projectSuffix: null,
    plannedStartOffset: null,
    plannedEndOffset: null,
    tags: ["planifié", "en-attente"],
  },
];

/**
 * Plans d’action et tâches démo RFC-PLA-001, alignés sur les projets / risques / ressources déjà seedés.
 * Idempotent : supprime les tâches liées à ces plans puis les recrée ; upsert des plans.
 */
export async function ensureDemoActionPlans(
  prisma: PrismaClient,
  clientId: string,
  prefix: string,
  now: Date,
  ownerUserId: string | null,
): Promise<void> {
  const loadProject = async (suffix: string) =>
    prisma.project.findFirst({
      where: { clientId, code: `${prefix}-SEED-${suffix}` },
      select: { id: true, code: true, name: true },
    });

  const p01 = await loadProject("01");
  if (!p01) {
    console.warn(
      `[action-plans demo] client ${clientId}: projet ${prefix}-SEED-01 introuvable — skip plans d’action.`,
    );
    return;
  }

  const p02 = await loadProject("02");
  const p04 = await loadProject("04");
  const p05 = await loadProject("05");
  const p06 = await loadProject("06");
  const p07 = await loadProject("07");
  const p10 = await loadProject("10");

  const bySuffix: Record<string, { id: string } | null> = {
    "01": p01,
    "02": p02,
    "04": p04,
    "05": p05,
    "06": p06,
    "07": p07,
    "10": p10,
  };

  const resInt = await prisma.resource.findFirst({
    where: { clientId, code: `${prefix}-RES-INT-01` },
    select: { id: true },
  });
  const resExt = await prisma.resource.findFirst({
    where: { clientId, code: `${prefix}-RES-EXT-01` },
    select: { id: true },
  });

  async function firstRiskForProject(projectId: string | undefined) {
    if (!projectId) return null;
    return prisma.projectRisk.findFirst({
      where: { clientId, projectId },
      select: { id: true },
      orderBy: { code: "asc" },
    });
  }

  const riskBySuffix: Record<string, { id: string } | null> = {};
  for (const s of ["01", "05", "06"] as const) {
    const pr = bySuffix[s];
    riskBySuffix[s] = pr ? await firstRiskForProject(pr.id) : null;
  }

  const planRecords: { id: string; code: string }[] = [];

  for (const def of PLANS) {
    const code = `${prefix}-${def.codeSuffix}`;
    const ap = await prisma.actionPlan.upsert({
      where: { clientId_code: { clientId, code } },
      create: {
        clientId,
        code,
        title: def.title,
        description: def.description,
        status: def.status,
        priority: def.priority,
        ownerUserId,
        startDate: addDaysUtc(now, def.startOffsetDays),
        targetDate: addDaysUtc(now, def.targetOffsetDays),
        progressPercent: 0,
      },
      update: {
        title: def.title,
        description: def.description,
        status: def.status,
        priority: def.priority,
        ownerUserId,
        startDate: addDaysUtc(now, def.startOffsetDays),
        targetDate: addDaysUtc(now, def.targetOffsetDays),
      },
    });
    planRecords.push({ id: ap.id, code });
  }

  const planIdByIndex = [planRecords[0]!.id, planRecords[1]!.id, planRecords[2]!.id];

  await prisma.projectTask.deleteMany({
    where: { clientId, actionPlanId: { in: planIdByIndex } },
  });

  const statusesForProgress: ProjectTaskStatus[][] = [[], [], []];

  for (const t of TASKS) {
    const actionPlanId = planIdByIndex[t.planIndex]!;
    statusesForProgress[t.planIndex]!.push(t.status);

    const proj = t.projectSuffix ? bySuffix[t.projectSuffix] : null;
    const projectId = proj?.id ?? null;

    let riskId: string | null = null;
    if (t.riskOnProjectSuffix) {
      const rProj = bySuffix[t.riskOnProjectSuffix];
      const r = rProj ? riskBySuffix[t.riskOnProjectSuffix] : null;
      riskId = r?.id ?? null;
    }

    if (riskId && projectId) {
      const riskRow = await prisma.projectRisk.findFirst({
        where: { id: riskId, clientId, projectId },
        select: { id: true },
      });
      if (!riskRow) riskId = null;
    }
    if (riskId && !projectId) {
      const riskRow = await prisma.projectRisk.findFirst({
        where: { id: riskId, clientId },
        select: { projectId: true },
      });
      if (riskRow?.projectId != null) riskId = null;
    }

    let responsibleResourceId: string | null = null;
    if (t.useResourceInt && resInt) responsibleResourceId = resInt.id;
    else if (t.useResourceExt && resExt) responsibleResourceId = resExt.id;

    const plannedStartDate =
      t.plannedStartOffset != null ? addDaysUtc(now, t.plannedStartOffset) : null;
    const plannedEndDate =
      t.plannedEndOffset != null ? addDaysUtc(now, t.plannedEndOffset) : null;

    const tagsJson: Prisma.InputJsonValue | typeof Prisma.JsonNull =
      t.tags && t.tags.length > 0 ? t.tags : Prisma.JsonNull;

    await prisma.projectTask.create({
      data: {
        clientId,
        actionPlanId,
        projectId,
        riskId,
        name: t.name,
        description: t.description,
        status: t.status,
        priority: t.priority,
        progress: t.status === ProjectTaskStatus.DONE ? 100 : t.progress,
        sortOrder: t.sortOrder,
        plannedStartDate,
        plannedEndDate,
        ownerUserId,
        responsibleResourceId,
        estimatedHours: t.estimatedHours ?? null,
        tags: tagsJson,
      },
    });
  }

  for (let i = 0; i < planIdByIndex.length; i++) {
    const pct = progressFromTaskStatuses(statusesForProgress[i]!);
    await prisma.actionPlan.update({
      where: { id: planIdByIndex[i]! },
      data: { progressPercent: pct },
    });
  }
}
