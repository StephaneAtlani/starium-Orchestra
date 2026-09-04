import {
  PrismaClient,
  StrategicAxisStatus,
  StrategicLinkType,
  StrategicObjectiveHealthStatus,
  StrategicObjectiveLifecycleStatus,
  StrategicObjectiveStatus,
  StrategicVisionStatus,
} from "@prisma/client";

function projectCodePrefix(slug: string): string {
  const map: Record<string, string> = {
    "neotech-ai": "NEO",
    "batipro-groupe": "BAT",
    "medisys-sante": "MED",
    "globaltrans-france": "GTF",
    "globaltrans-germany": "GTG",
    "industria-group": "IND",
  };
  return map[slug] ?? slug.replace(/-/g, "").toUpperCase().slice(0, 5);
}

function addDaysUtc(base: Date, days: number): Date {
  const x = new Date(base);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

/**
 * Vision stratégique active + axes / objectifs liés aux projets SEED (RFC-STRAT).
 */
export async function ensureDemoStrategicVision(
  prisma: PrismaClient,
  slug: string,
  clientId: string,
  ownerOrgUnitId?: string | null,
  actorUserId?: string | null,
): Promise<void> {
  const prefix = projectCodePrefix(slug);
  const now = new Date();
  const title = `[SEED] Vision stratégique ${prefix} 2026-2028`;

  let vision = await prisma.strategicVision.findFirst({
    where: { clientId, title },
    select: { id: true },
  });

  const visionData = {
    statement:
      "Accélérer la transformation digitale tout en maîtrisant le risque cyber et la trajectoire budgétaire IT.",
    horizonLabel: "2026-2028",
    isActive: true,
    status: StrategicVisionStatus.ACTIVE,
  };

  if (vision) {
    vision = await prisma.strategicVision.update({
      where: { id: vision.id },
      data: visionData,
      select: { id: true },
    });
  } else {
    // Désactiver les autres visions actives avant d'en créer une
    await prisma.strategicVision.updateMany({
      where: { clientId, isActive: true },
      data: { isActive: false },
    });
    vision = await prisma.strategicVision.create({
      data: { clientId, title, ...visionData },
      select: { id: true },
    });
  }

  // Une seule vision active
  await prisma.strategicVision.updateMany({
    where: { clientId, id: { not: vision.id }, isActive: true },
    data: { isActive: false, status: StrategicVisionStatus.ARCHIVED },
  });

  const directions = [
    {
      code: `${prefix}-SD-DIG`,
      name: "Digitalisation métier",
      sortOrder: 10,
    },
    {
      code: `${prefix}-SD-CYB`,
      name: "Résilience cyber",
      sortOrder: 20,
    },
    {
      code: `${prefix}-SD-EFF`,
      name: "Efficience budgétaire",
      sortOrder: 30,
    },
  ] as const;

  const directionIds: string[] = [];
  for (const d of directions) {
    const existing = await prisma.strategicDirection.findFirst({
      where: { clientId, code: d.code },
      select: { id: true },
    });
    if (existing) {
      await prisma.strategicDirection.update({
        where: { id: existing.id },
        data: { name: d.name, sortOrder: d.sortOrder, isActive: true },
      });
      directionIds.push(existing.id);
    } else {
      const created = await prisma.strategicDirection.create({
        data: {
          clientId,
          code: d.code,
          name: d.name,
          sortOrder: d.sortOrder,
          isActive: true,
        },
      });
      directionIds.push(created.id);
    }
  }

  const axesDefs = [
    {
      code: `${prefix}-AX-DIG`,
      name: "Expérience digitale",
      description: "Moderniser les parcours et le SI métier.",
      sortOrder: 10,
    },
    {
      code: `${prefix}-AX-SEC`,
      name: "Sécurité & conformité",
      description: "Réduire le risque résiduel et assurer la conformité.",
      sortOrder: 20,
    },
    {
      code: `${prefix}-AX-FIN`,
      name: "Pilotage financier IT",
      description: "Maîtriser RUN / BUILD et l'atterrissage.",
      sortOrder: 30,
    },
  ] as const;

  const axisIds: string[] = [];
  for (const a of axesDefs) {
    let axis = await prisma.strategicAxis.findFirst({
      where: { clientId, visionId: vision.id, code: a.code },
      select: { id: true },
    });
    const data = {
      name: a.name,
      description: a.description,
      sortOrder: a.sortOrder,
      orderIndex: a.sortOrder,
      status: StrategicAxisStatus.ACTIVE,
    };
    if (axis) {
      await prisma.strategicAxis.update({ where: { id: axis.id }, data });
    } else {
      axis = await prisma.strategicAxis.create({
        data: {
          clientId,
          visionId: vision.id,
          code: a.code,
          ...data,
        },
        select: { id: true },
      });
    }
    axisIds.push(axis.id);
  }

  const projects = await prisma.project.findMany({
    where: { clientId, code: { contains: "SEED" } },
    orderBy: { code: "asc" },
    take: 6,
    select: { id: true, code: true, name: true },
  });

  const objectives = [
    {
      axisIndex: 0,
      directionIndex: 0,
      title: "Déployer le socle identité (SSO / MFA) à l'échelle",
      status: StrategicObjectiveStatus.ON_TRACK,
      health: StrategicObjectiveHealthStatus.ON_TRACK,
      progress: 55,
      deadlineOffset: 180,
      projectIndex: 0,
    },
    {
      axisIndex: 0,
      directionIndex: 0,
      title: "Industrialiser la plateforme data",
      status: StrategicObjectiveStatus.AT_RISK,
      health: StrategicObjectiveHealthStatus.AT_RISK,
      progress: 35,
      deadlineOffset: 220,
      projectIndex: 1,
    },
    {
      axisIndex: 1,
      directionIndex: 1,
      title: "Réduire le risque cyber critique sous le seuil CODIR",
      status: StrategicObjectiveStatus.AT_RISK,
      health: StrategicObjectiveHealthStatus.OFF_TRACK,
      progress: 25,
      deadlineOffset: 90,
      projectIndex: 2,
    },
    {
      axisIndex: 2,
      directionIndex: 2,
      title: "Stabiliser la consommation cloud sous budget validé",
      status: StrategicObjectiveStatus.ON_TRACK,
      health: StrategicObjectiveHealthStatus.ON_TRACK,
      progress: 40,
      deadlineOffset: 120,
      projectIndex: 0,
    },
  ] as const;

  for (const obj of objectives) {
    const axisId = axisIds[obj.axisIndex];
    const directionId = directionIds[obj.directionIndex];
    let existing = await prisma.strategicObjective.findFirst({
      where: { clientId, axisId, title: obj.title },
      select: { id: true },
    });

    const payload = {
      directionId,
      ownerOrgUnitId: ownerOrgUnitId ?? null,
      ownerUserId: actorUserId ?? null,
      ownerLabel: "DSI",
      status: obj.status,
      lifecycleStatus: StrategicObjectiveLifecycleStatus.ACTIVE,
      healthStatus: obj.health,
      progressPercent: obj.progress,
      deadline: addDaysUtc(now, obj.deadlineOffset),
      targetDate: addDaysUtc(now, obj.deadlineOffset),
      description: `Seed démo — objectif aligné portefeuille ${prefix}.`,
    };

    if (existing) {
      await prisma.strategicObjective.update({
        where: { id: existing.id },
        data: payload,
      });
    } else {
      existing = await prisma.strategicObjective.create({
        data: {
          clientId,
          axisId,
          title: obj.title,
          ...payload,
        },
        select: { id: true },
      });
    }

    const project = projects[obj.projectIndex];
    if (project) {
      await prisma.strategicLink.upsert({
        where: {
          objectiveId_linkType_targetId: {
            objectiveId: existing.id,
            linkType: StrategicLinkType.PROJECT,
            targetId: project.id,
          },
        },
        create: {
          clientId,
          objectiveId: existing.id,
          linkType: StrategicLinkType.PROJECT,
          targetId: project.id,
          targetLabelSnapshot: project.name,
          alignmentScore: 80 - obj.axisIndex * 10,
          comment: "Seed démo — lien projet",
        },
        update: {
          targetLabelSnapshot: project.name,
          alignmentScore: 80 - obj.axisIndex * 10,
        },
      });
    }
  }
}
