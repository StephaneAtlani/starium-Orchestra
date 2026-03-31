import type { PrismaClient } from "@prisma/client";

/**
 * Étiquettes démo (RFC-PROJ-017) : ProjectTag client + ProjectTagAssignment,
 * ProjectTaskLabel + assignments, ProjectMilestoneLabel + assignments sur les jeux SEED.
 * Idempotent : réinitialise labels tâche/jalon démo ; upsert les ProjectTag client.
 */

const CLIENT_TAG_DEFS: { name: string; color: string | null }[] = [
  { name: "Stratégique", color: "#6366f1" },
  { name: "Conformité", color: "#0ea5e9" },
  { name: "Cyber", color: "#dc2626" },
  { name: "Data", color: "#16a34a" },
  { name: "Expérience utilisateur", color: "#c026d3" },
  { name: "Legacy", color: "#78716c" },
];

/** Étiquettes projet par suffixe SEED (`01` … `10`) — noms parmi CLIENT_TAG_DEFS. */
const PROJECT_TAGS_BY_SUFFIX: Record<string, string[]> = {
  "01": ["Stratégique", "Cyber"],
  "02": ["Data", "Conformité"],
  "03": ["Legacy", "Stratégique"],
  "04": ["Stratégique", "Conformité"],
  "05": ["Cyber", "Stratégique"],
  "06": ["Expérience utilisateur", "Data"],
  "07": ["Conformité", "Expérience utilisateur"],
  "08": ["Data", "Cyber"],
  "09": ["Stratégique", "Expérience utilisateur"],
  "10": ["Data", "Conformité"],
};

const TASK_LABEL_DEFS: { name: string; color: string | null; sortOrder: number }[] = [
  { name: "Priorité", color: "#ef4444", sortOrder: 0 },
  { name: "Documentation", color: "#64748b", sortOrder: 1 },
  { name: "Recette", color: "#22c55e", sortOrder: 2 },
];

const MILESTONE_LABEL_DEFS: { name: string; color: string | null; sortOrder: number }[] = [
  { name: "Gate review", color: "#6366f1", sortOrder: 0 },
  { name: "Reporting", color: "#0d9488", sortOrder: 1 },
];

function seedSuffixFromCode(code: string): string | null {
  const m = code.match(/(?:^|-)SEED-(\d{2})$/i);
  return m ? m[1]! : null;
}

export async function ensureDemoProjectTagsAndLabels(
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

  const projectIds = projects.map((p) => p.id);
  const tagIdByName = new Map<string, string>();

  for (const t of CLIENT_TAG_DEFS) {
    const row = await prisma.projectTag.upsert({
      where: { clientId_name: { clientId, name: t.name } },
      create: { clientId, name: t.name, color: t.color },
      update: { color: t.color },
    });
    tagIdByName.set(t.name, row.id);
  }

  await prisma.projectTagAssignment.deleteMany({
    where: { clientId, projectId: { in: projectIds } },
  });

  for (const proj of projects) {
    const suffix = seedSuffixFromCode(proj.code);
    if (!suffix) continue;
    const names = PROJECT_TAGS_BY_SUFFIX[suffix];
    if (!names?.length) continue;
    for (const name of names) {
      const tagId = tagIdByName.get(name);
      if (!tagId) continue;
      await prisma.projectTagAssignment.create({
        data: { clientId, projectId: proj.id, tagId },
      });
    }
  }

  await prisma.projectTaskLabelAssignment.deleteMany({
    where: { clientId, projectId: { in: projectIds } },
  });
  await prisma.projectTaskLabel.deleteMany({
    where: { clientId, projectId: { in: projectIds } },
  });

  for (const proj of projects) {
    const createdLabels = await Promise.all(
      TASK_LABEL_DEFS.map((tl) =>
        prisma.projectTaskLabel.create({
          data: {
            clientId,
            projectId: proj.id,
            name: tl.name,
            color: tl.color,
            sortOrder: tl.sortOrder,
          },
        }),
      ),
    );
    const labelIds = createdLabels.map((l) => l.id);

    const tasks = await prisma.projectTask.findMany({
      where: { projectId: proj.id },
      orderBy: { sortOrder: "asc" },
      select: { id: true },
    });

    const rows: { projectTaskId: string; labelId: string }[] = [];
    for (let i = 0; i < tasks.length; i++) {
      rows.push({
        projectTaskId: tasks[i]!.id,
        labelId: labelIds[i % labelIds.length]!,
      });
    }
    if (rows.length > 0) {
      await prisma.projectTaskLabelAssignment.createMany({
        data: rows.map((r) => ({
          clientId,
          projectId: proj.id,
          projectTaskId: r.projectTaskId,
          labelId: r.labelId,
        })),
      });
    }
  }

  await prisma.projectMilestoneLabelAssignment.deleteMany({
    where: { clientId, projectId: { in: projectIds } },
  });
  await prisma.projectMilestoneLabel.deleteMany({
    where: { clientId, projectId: { in: projectIds } },
  });

  const p01 = projects.find((p) => p.code === `${prefix}-SEED-01`);
  if (p01) {
    await prisma.projectMilestoneLabel.createMany({
      data: MILESTONE_LABEL_DEFS.map((d) => ({
        clientId,
        projectId: p01.id,
        name: d.name,
        color: d.color,
        sortOrder: d.sortOrder,
      })),
    });
    const milestoneLabels = await prisma.projectMilestoneLabel.findMany({
      where: { clientId, projectId: p01.id },
      orderBy: { sortOrder: "asc" },
    });
    const milestones = await prisma.projectMilestone.findMany({
      where: { clientId, projectId: p01.id },
      orderBy: { sortOrder: "asc" },
      take: 2,
      select: { id: true },
    });
    const assignRows: { projectMilestoneId: string; labelId: string }[] = [];
    if (milestones[0] && milestoneLabels[0]) {
      assignRows.push({ projectMilestoneId: milestones[0].id, labelId: milestoneLabels[0].id });
    }
    if (milestones[1] && milestoneLabels[1]) {
      assignRows.push({ projectMilestoneId: milestones[1].id, labelId: milestoneLabels[1].id });
    }
    if (assignRows.length > 0) {
      await prisma.projectMilestoneLabelAssignment.createMany({
        data: assignRows.map((r) => ({
          clientId,
          projectId: p01.id,
          projectMilestoneId: r.projectMilestoneId,
          labelId: r.labelId,
        })),
      });
    }
  }
}
