import { PrismaClient, ProjectTaskStatus } from "@prisma/client";

/** Colonnes Kanban (ordre = sortOrder 0..3) : backlog → en cours → bloqué → terminé. */
const BUCKETS_BY_SUFFIX: Record<string, { name: string; sortOrder: number }[]> = {
  "01": [
    { name: "Cadrage & cartographie", sortOrder: 0 },
    { name: "Intégration & build", sortOrder: 1 },
    { name: "Bloquages / escalades", sortOrder: 2 },
    { name: "Déployé / clos", sortOrder: 3 },
  ],
  "02": [
    { name: "Fondations & gouvernance données", sortOrder: 0 },
    { name: "Pipelines & transformations", sortOrder: 1 },
    { name: "Points bloquants / risques", sortOrder: 2 },
    { name: "En production / SOC2", sortOrder: 3 },
  ],
  "03": [
    { name: "Préparation sortie four", sortOrder: 0 },
    { name: "Migration & cut-over", sortOrder: 1 },
    { name: "Suivi incidents & blocages", sortOrder: 2 },
    { name: "Clôture & hypercare", sortOrder: 3 },
  ],
  "04": [
    { name: "Paramétrage & design", sortOrder: 0 },
    { name: "Réalisation & tests", sortOrder: 1 },
    { name: "En attente arbitrage / budget", sortOrder: 2 },
    { name: "Livré / reporté", sortOrder: 3 },
  ],
  "05": [
    { name: "Analyse & cadrage cyber", sortOrder: 0 },
    { name: "Déploiement PAM / segmentation", sortOrder: 1 },
    { name: "Bloqué (métier / créneaux)", sortOrder: 2 },
    { name: "Validé / clos", sortOrder: 3 },
  ],
  "06": [
    { name: "Backlog produit", sortOrder: 0 },
    { name: "Développement & intégration", sortOrder: 1 },
    { name: "Bloqué / dépendances", sortOrder: 2 },
    { name: "Recette & mise en prod", sortOrder: 3 },
  ],
  "07": [
    { name: "Préparation portabilité", sortOrder: 0 },
    { name: "Basculer & tester", sortOrder: 1 },
    { name: "Bloquages opérateur", sortOrder: 2 },
    { name: "Cut-over réalisé", sortOrder: 3 },
  ],
  "08": [
    { name: "Inventaire & design observabilité", sortOrder: 0 },
    { name: "Déploiement agents / APM", sortOrder: 1 },
    { name: "Dette & retard critique", sortOrder: 2 },
    { name: "Couverture atteinte", sortOrder: 3 },
  ],
  "09": [
    { name: "Contractuel & cadrage API", sortOrder: 0 },
    { name: "Intégration & ateliers", sortOrder: 1 },
    { name: "Points bloquants partenaire", sortOrder: 2 },
    { name: "Livré / en run", sortOrder: 3 },
  ],
  "10": [
    { name: "Cadrage use cases & données", sortOrder: 0 },
    { name: "Expérimentation & R&D", sortOrder: 1 },
    { name: "Blocages conformité / sécu", sortOrder: 2 },
    { name: "Prêt pour industrialisation", sortOrder: 3 },
  ],
};

function bucketSortIndexForStatus(status: ProjectTaskStatus): number {
  switch (status) {
    case ProjectTaskStatus.TODO:
      return 0;
    case ProjectTaskStatus.IN_PROGRESS:
      return 1;
    case ProjectTaskStatus.BLOCKED:
      return 2;
    case ProjectTaskStatus.DONE:
    case ProjectTaskStatus.CANCELLED:
      return 3;
    default:
      return 0;
  }
}

function seedSuffixFromProjectCode(code: string): string | null {
  const m = code.match(/(?:^|-)SEED-(\d{1,2})$/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (Number.isNaN(n) || n < 1 || n > 10) return null;
  return String(n).padStart(2, "0");
}

/**
 * Buckets Kanban Starium (sans Planner) + rattachement des tâches selon le statut.
 * Supprime uniquement les buckets `plannerBucketId: null` sur les projets démo pour réappliquer un jeu cohérent à chaque seed.
 */
export async function ensureDemoProjectTaskBuckets(
  prisma: PrismaClient,
  clientId: string,
  prefix: string,
): Promise<void> {
  const codes = Array.from({ length: 10 }, (_, i) => `${prefix}-SEED-${String(i + 1).padStart(2, "0")}`);
  const projects = await prisma.project.findMany({
    where: { clientId, code: { in: codes } },
    select: { id: true, code: true },
    orderBy: { code: "asc" },
  });
  if (projects.length === 0) return;

  for (const proj of projects) {
    const suffix = seedSuffixFromProjectCode(proj.code);
    const defaultCols: { name: string; sortOrder: number }[] = [
      { name: "Backlog", sortOrder: 0 },
      { name: "En cours", sortOrder: 1 },
      { name: "Bloqué", sortOrder: 2 },
      { name: "Terminé", sortOrder: 3 },
    ];
    const defs =
      suffix != null && BUCKETS_BY_SUFFIX[suffix] != null
        ? BUCKETS_BY_SUFFIX[suffix]
        : defaultCols;

    await prisma.$transaction(async (tx) => {
      await tx.projectTaskBucket.deleteMany({
        where: {
          clientId,
          projectId: proj.id,
          plannerBucketId: null,
        },
      });

      await tx.projectTaskBucket.createMany({
        data: defs.map((d) => ({
          clientId,
          projectId: proj.id,
          name: d.name,
          sortOrder: d.sortOrder,
        })),
      });

      const buckets = await tx.projectTaskBucket.findMany({
        where: { clientId, projectId: proj.id, plannerBucketId: null },
        orderBy: { sortOrder: "asc" },
        select: { id: true, sortOrder: true },
      });
      const idBySort = new Map(buckets.map((b) => [b.sortOrder, b.id]));

      const tasks = await tx.projectTask.findMany({
        where: { clientId, projectId: proj.id },
        select: { id: true, status: true },
      });

      for (const t of tasks) {
        const idx = bucketSortIndexForStatus(t.status);
        const bucketId = idBySort.get(idx) ?? idBySort.get(0);
        if (!bucketId) continue;
        await tx.projectTask.update({
          where: { id: t.id },
          data: { bucketId },
        });
      }
    });
  }
}
