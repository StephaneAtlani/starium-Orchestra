import {
  PrismaClient,
  ProjectActivityStatus,
  ProjectActivityFrequency,
} from "@prisma/client";

function addDaysUtc(base: Date, days: number): Date {
  const x = new Date(base);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

function seedSuffixFromProjectCode(code: string): string | null {
  const m = code.match(/(?:^|-)SEED-(\d{1,2})$/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (Number.isNaN(n) || n < 1 || n > 10) return null;
  return String(n).padStart(2, "0");
}

type ActDef = {
  name: string;
  description?: string;
  status: ProjectActivityStatus;
  frequency: ProjectActivityFrequency;
  /** Tâche source (index dans la liste triée par sortOrder). */
  sourceTaskIndex: number;
  nextDaysFromNow: number;
  lastDaysFromNow?: number | null;
};

const ACTIVITIES_BY_SUFFIX: Record<string, ActDef[]> = {
  "01": [
    {
      name: "COPIL technique hebdomadaire — SSO / IdP",
      description: "Suivi avancement intégration et incidents pilote.",
      status: ProjectActivityStatus.ACTIVE,
      frequency: ProjectActivityFrequency.WEEKLY,
      sourceTaskIndex: 0,
      nextDaysFromNow: 2,
      lastDaysFromNow: -5,
    },
    {
      name: "Point cadence fournisseur IdP",
      status: ProjectActivityStatus.ACTIVE,
      frequency: ProjectActivityFrequency.WEEKLY,
      sourceTaskIndex: 1,
      nextDaysFromNow: 4,
      lastDaysFromNow: -3,
    },
    {
      name: "Revue comité de sécurité (jalons MFA)",
      status: ProjectActivityStatus.ACTIVE,
      frequency: ProjectActivityFrequency.MONTHLY,
      sourceTaskIndex: 2,
      nextDaysFromNow: 18,
    },
  ],
  "02": [
    {
      name: "Stand-up équipe data & pipelines",
      status: ProjectActivityStatus.ACTIVE,
      frequency: ProjectActivityFrequency.WEEKLY,
      sourceTaskIndex: 0,
      nextDaysFromNow: 1,
      lastDaysFromNow: -6,
    },
    {
      name: "Contrôle qualité données — zone sensible",
      status: ProjectActivityStatus.ACTIVE,
      frequency: ProjectActivityFrequency.MONTHLY,
      sourceTaskIndex: 1,
      nextDaysFromNow: 12,
    },
    {
      name: "Revue conformité SOC2 (preuves)",
      status: ProjectActivityStatus.PAUSED,
      frequency: ProjectActivityFrequency.QUARTERLY,
      sourceTaskIndex: 2,
      nextDaysFromNow: 45,
    },
  ],
  "03": [
    {
      name: "Comité de clôture programme (archivé)",
      status: ProjectActivityStatus.COMPLETED,
      frequency: ProjectActivityFrequency.MONTHLY,
      sourceTaskIndex: 0,
      nextDaysFromNow: 0,
      lastDaysFromNow: -30,
    },
    {
      name: "Point RUN — transfert exploitation",
      status: ProjectActivityStatus.COMPLETED,
      frequency: ProjectActivityFrequency.WEEKLY,
      sourceTaskIndex: 1,
      nextDaysFromNow: 0,
      lastDaysFromNow: -14,
    },
  ],
  "04": [
    {
      name: "Relance arbitrage CODIR / finance",
      status: ProjectActivityStatus.ACTIVE,
      frequency: ProjectActivityFrequency.WEEKLY,
      sourceTaskIndex: 0,
      nextDaysFromNow: 3,
      lastDaysFromNow: -7,
    },
    {
      name: "Atelier paramétrage avec métier finance",
      status: ProjectActivityStatus.PAUSED,
      frequency: ProjectActivityFrequency.MONTHLY,
      sourceTaskIndex: 2,
      nextDaysFromNow: 20,
    },
  ],
  "05": [
    {
      name: "Revue cyber & segmentation (steering)",
      status: ProjectActivityStatus.ACTIVE,
      frequency: ProjectActivityFrequency.WEEKLY,
      sourceTaskIndex: 0,
      nextDaysFromNow: 2,
      lastDaysFromNow: -4,
    },
    {
      name: "Coordination fenêtres de changement",
      status: ProjectActivityStatus.ACTIVE,
      frequency: ProjectActivityFrequency.DAILY,
      sourceTaskIndex: 1,
      nextDaysFromNow: 1,
      lastDaysFromNow: 0,
    },
    {
      name: "Audit règles PAM — contrôle trimestriel",
      status: ProjectActivityStatus.ACTIVE,
      frequency: ProjectActivityFrequency.QUARTERLY,
      sourceTaskIndex: 2,
      nextDaysFromNow: 40,
    },
  ],
  "06": [
    {
      name: "Démo sprint e-commerce (PO / métier)",
      status: ProjectActivityStatus.ACTIVE,
      frequency: ProjectActivityFrequency.WEEKLY,
      sourceTaskIndex: 0,
      nextDaysFromNow: 5,
      lastDaysFromNow: -2,
    },
    {
      name: "Tests de charge tunnel paiement",
      status: ProjectActivityStatus.ACTIVE,
      frequency: ProjectActivityFrequency.MONTHLY,
      sourceTaskIndex: 1,
      nextDaysFromNow: 10,
    },
  ],
  "07": [
    {
      name: "Point opérateur — portabilité numéros",
      status: ProjectActivityStatus.ACTIVE,
      frequency: ProjectActivityFrequency.WEEKLY,
      sourceTaskIndex: 0,
      nextDaysFromNow: 1,
      lastDaysFromNow: -1,
    },
    {
      name: "Bascule pilote — comité de crise (si incident)",
      status: ProjectActivityStatus.ACTIVE,
      frequency: ProjectActivityFrequency.DAILY,
      sourceTaskIndex: 1,
      nextDaysFromNow: 0,
    },
  ],
  "08": [
    {
      name: "Revue dette agents / couverture APM",
      status: ProjectActivityStatus.ACTIVE,
      frequency: ProjectActivityFrequency.WEEKLY,
      sourceTaskIndex: 0,
      nextDaysFromNow: 4,
      lastDaysFromNow: -3,
    },
    {
      name: "Atelier observabilité — SLO / alertes",
      status: ProjectActivityStatus.ACTIVE,
      frequency: ProjectActivityFrequency.MONTHLY,
      sourceTaskIndex: 2,
      nextDaysFromNow: 15,
    },
  ],
  "09": [
    {
      name: "Point contractuel éditeur / API",
      status: ProjectActivityStatus.ACTIVE,
      frequency: ProjectActivityFrequency.WEEKLY,
      sourceTaskIndex: 0,
      nextDaysFromNow: 6,
      lastDaysFromNow: -8,
    },
    {
      name: "Comité intégration & sandbox",
      status: ProjectActivityStatus.ACTIVE,
      frequency: ProjectActivityFrequency.MONTHLY,
      sourceTaskIndex: 1,
      nextDaysFromNow: 22,
    },
  ],
  "10": [
    {
      name: "Atelier gouvernance données & IA",
      status: ProjectActivityStatus.ACTIVE,
      frequency: ProjectActivityFrequency.WEEKLY,
      sourceTaskIndex: 0,
      nextDaysFromNow: 14,
    },
    {
      name: "Revue conformité RGPD (corpus)",
      status: ProjectActivityStatus.PAUSED,
      frequency: ProjectActivityFrequency.MONTHLY,
      sourceTaskIndex: 2,
      nextDaysFromNow: 30,
    },
  ],
};

/**
 * Activités récurrentes (liées à des tâches sources). Réinitialisées sur les projets démo à chaque seed.
 */
export async function ensureDemoProjectActivities(
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
    select: { id: true, code: true },
    orderBy: { code: "asc" },
  });
  if (projects.length === 0) return;

  const projectIds = projects.map((p) => p.id);
  await prisma.projectActivity.deleteMany({
    where: { clientId, projectId: { in: projectIds } },
  });

  for (const proj of projects) {
    const suffix = seedSuffixFromProjectCode(proj.code);
    const defs = suffix ? ACTIVITIES_BY_SUFFIX[suffix] : undefined;
    if (!defs?.length) continue;

    const tasks = await prisma.projectTask.findMany({
      where: { clientId, projectId: proj.id },
      orderBy: { sortOrder: "asc" },
      select: { id: true },
    });
    if (tasks.length === 0) continue;

    const owner = (i: number) => (i % 2 === 0 ? userA : userB);

    for (let i = 0; i < defs.length; i++) {
      const d = defs[i];
      const tIdx = Math.min(d.sourceTaskIndex, tasks.length - 1);
      const sourceTaskId = tasks[tIdx]!.id;
      const nextExecutionDate =
        d.status === ProjectActivityStatus.COMPLETED
          ? null
          : addDaysUtc(now, d.nextDaysFromNow);
      const lastExecutionDate =
        d.lastDaysFromNow != null && d.lastDaysFromNow !== undefined
          ? addDaysUtc(now, d.lastDaysFromNow)
          : null;

      await prisma.projectActivity.create({
        data: {
          clientId,
          projectId: proj.id,
          sourceTaskId,
          name: d.name,
          description: d.description ?? null,
          status: d.status,
          frequency: d.frequency,
          customRrule: null,
          nextExecutionDate,
          lastExecutionDate,
          ownerUserId: owner(i),
          budgetLineId: null,
          createdByUserId: userA,
        },
      });
    }
  }
}
