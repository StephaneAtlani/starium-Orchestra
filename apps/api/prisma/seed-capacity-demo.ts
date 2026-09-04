import {
  CapacityAllocationSourceType,
  CapacitySource,
  Prisma,
  PrismaClient,
  ResourceType,
} from "@prisma/client";

function ym(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function monthStartUtc(year: number, monthIndex0: number): Date {
  return new Date(Date.UTC(year, monthIndex0, 1));
}

function monthEndUtc(year: number, monthIndex0: number): Date {
  return new Date(Date.UTC(year, monthIndex0 + 1, 0));
}

/**
 * Capacité mensuelle client + affectations J/H (RFC-CAPA-001).
 * Fenêtre : M-2 → M+3 autour de la date du seed.
 */
export async function ensureDemoCapacity(
  prisma: PrismaClient,
  slug: string,
  clientId: string,
  workTeamIds: string[],
): Promise<void> {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month0 = now.getUTCMonth();

  for (let offset = -2; offset <= 3; offset++) {
    const d = new Date(Date.UTC(year, month0 + offset, 1));
    const yearMonth = ym(d);
    // ~20 j ouvrés ouvrables / mois (paramètre client)
    const days = offset === 0 ? 19 : offset === 1 ? 21 : 20;
    await prisma.clientMonthlyCapacity.upsert({
      where: { clientId_yearMonth: { clientId, yearMonth } },
      create: {
        clientId,
        yearMonth,
        days: new Prisma.Decimal(days),
        source: CapacitySource.CLIENT_PARAM,
      },
      update: {
        days: new Prisma.Decimal(days),
        source: CapacitySource.CLIENT_PARAM,
      },
    });
  }

  const humans = await prisma.resource.findMany({
    where: { clientId, type: ResourceType.HUMAN },
    orderBy: { createdAt: "asc" },
    take: 4,
    select: { id: true, primaryCapacityWorkTeamId: true },
  });

  if (humans.length === 0 || workTeamIds.length === 0) {
    console.warn(`⚠️  [${slug}] capacité démo : pas de ressources / équipes — skip allocations.`);
    return;
  }

  // Exception membre (congés) sur le mois courant pour le 1er collaborateur
  const currentYm = ym(now);
  await prisma.resourceCapacityException.upsert({
    where: {
      clientId_resourceId_yearMonth: {
        clientId,
        resourceId: humans[0].id,
        yearMonth: currentYm,
      },
    },
    create: {
      clientId,
      resourceId: humans[0].id,
      yearMonth: currentYm,
      days: new Prisma.Decimal(15),
      source: CapacitySource.MEMBER_EXCEPTION,
    },
    update: {
      days: new Prisma.Decimal(15),
      source: CapacitySource.MEMBER_EXCEPTION,
    },
  });

  // Allocations sur M et M+1
  const projects = await prisma.project.findMany({
    where: { clientId, code: { contains: "SEED" } },
    orderBy: { code: "asc" },
    take: 3,
    select: { id: true, code: true, name: true },
  });

  const windows: Array<{ monthOffset: number; days: number }> = [
    { monthOffset: 0, days: 8 },
    { monthOffset: 1, days: 10 },
  ];

  for (let i = 0; i < humans.length; i++) {
    const human = humans[i];
    const teamId =
      human.primaryCapacityWorkTeamId ??
      workTeamIds[i % workTeamIds.length];
    const project = projects[i % Math.max(projects.length, 1)];

    for (const w of windows) {
      const y = now.getUTCFullYear();
      const m = now.getUTCMonth() + w.monthOffset;
      const start = monthStartUtc(y, m);
      const end = monthEndUtc(y, m);
      const yearMonth = ym(start);

      // Idempotence : une allocation MANUAL seedée par (resource, month)
      const existing = await prisma.capacityAllocation.findFirst({
        where: {
          clientId,
          resourceId: human.id,
          startDate: start,
          endDate: end,
          sourceType: CapacityAllocationSourceType.MANUAL,
        },
        select: { id: true },
      });

      const totalDays = new Prisma.Decimal(w.days);
      let allocationId: string;
      if (existing) {
        await prisma.capacityAllocation.update({
          where: { id: existing.id },
          data: {
            totalDays,
            workTeamId: teamId,
            comment: `Seed démo — charge ${project?.name ?? "portefeuille"}`,
            sourceId: project?.id ?? null,
            sourceType: project
              ? CapacityAllocationSourceType.PROJECT
              : CapacityAllocationSourceType.MANUAL,
          },
        });
        allocationId = existing.id;
      } else {
        const created = await prisma.capacityAllocation.create({
          data: {
            clientId,
            startDate: start,
            endDate: end,
            totalDays,
            workTeamId: teamId,
            resourceId: human.id,
            comment: `Seed démo — charge ${project?.name ?? "portefeuille"}`,
            sourceType: project
              ? CapacityAllocationSourceType.PROJECT
              : CapacityAllocationSourceType.MANUAL,
            sourceId: project?.id ?? null,
          },
        });
        allocationId = created.id;
      }

      await prisma.capacityAllocationMonth.upsert({
        where: {
          allocationId_yearMonth: { allocationId, yearMonth },
        },
        create: {
          clientId,
          allocationId,
          yearMonth,
          days: totalDays,
        },
        update: { days: totalDays },
      });
    }
  }
}
