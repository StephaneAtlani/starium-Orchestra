import {
  OrgGroupMemberType,
  OrgGroupType,
  OrgUnitMemberType,
  OrgUnitType,
  PrismaClient,
  ResourceType,
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

async function upsertOrgUnit(
  prisma: PrismaClient,
  input: {
    clientId: string;
    code: string;
    name: string;
    type: OrgUnitType;
    parentId?: string | null;
    description?: string;
    sortOrder?: number;
  },
) {
  const existing = await prisma.orgUnit.findFirst({
    where: { clientId: input.clientId, code: input.code },
    select: { id: true },
  });
  const data = {
    name: input.name,
    type: input.type,
    parentId: input.parentId ?? null,
    description: input.description ?? null,
    sortOrder: input.sortOrder ?? 0,
    status: "ACTIVE" as const,
  };
  if (existing) {
    return prisma.orgUnit.update({ where: { id: existing.id }, data });
  }
  return prisma.orgUnit.create({
    data: { clientId: input.clientId, code: input.code, ...data },
  });
}

/**
 * Organisation client démo (RFC-ORG-001) : holding → directions → départements,
 * rattachements HUMAN, groupe transverse CODIR.
 */
export async function ensureDemoOrganization(
  prisma: PrismaClient,
  slug: string,
  clientId: string,
): Promise<{ directionItId: string; directionFinanceId: string }> {
  const prefix = projectCodePrefix(slug);

  const company = await upsertOrgUnit(prisma, {
    clientId,
    code: `${prefix}-ORG-HOLDING`,
    name: "Direction générale",
    type: OrgUnitType.COMPANY,
    description: "Seed démo — entité racine",
    sortOrder: 0,
  });

  const dirIt = await upsertOrgUnit(prisma, {
    clientId,
    code: `${prefix}-ORG-DSI`,
    name: "Direction des systèmes d'information",
    type: OrgUnitType.DIRECTION,
    parentId: company.id,
    description: "Seed démo — DSI",
    sortOrder: 10,
  });

  const dirFin = await upsertOrgUnit(prisma, {
    clientId,
    code: `${prefix}-ORG-DAF`,
    name: "Direction financière",
    type: OrgUnitType.DIRECTION,
    parentId: company.id,
    description: "Seed démo — DAF",
    sortOrder: 20,
  });

  const deptOps = await upsertOrgUnit(prisma, {
    clientId,
    code: `${prefix}-ORG-IT-OPS`,
    name: "Run & infrastructure",
    type: OrgUnitType.DEPARTMENT,
    parentId: dirIt.id,
    sortOrder: 11,
  });

  const deptBuild = await upsertOrgUnit(prisma, {
    clientId,
    code: `${prefix}-ORG-IT-BUILD`,
    name: "Build & projets",
    type: OrgUnitType.DEPARTMENT,
    parentId: dirIt.id,
    sortOrder: 12,
  });

  const humans = await prisma.resource.findMany({
    where: { clientId, type: ResourceType.HUMAN },
    orderBy: { createdAt: "asc" },
    take: 8,
    select: { id: true },
  });

  if (humans.length > 0) {
    await prisma.orgUnitMembership.upsert({
      where: {
        orgUnitId_resourceId: {
          orgUnitId: dirIt.id,
          resourceId: humans[0].id,
        },
      },
      create: {
        clientId,
        orgUnitId: dirIt.id,
        resourceId: humans[0].id,
        memberType: OrgUnitMemberType.MANAGER,
        roleTitle: "DSI",
      },
      update: {
        memberType: OrgUnitMemberType.MANAGER,
        roleTitle: "DSI",
      },
    });
  }
  if (humans.length > 1) {
    await prisma.orgUnitMembership.upsert({
      where: {
        orgUnitId_resourceId: {
          orgUnitId: dirFin.id,
          resourceId: humans[1].id,
        },
      },
      create: {
        clientId,
        orgUnitId: dirFin.id,
        resourceId: humans[1].id,
        memberType: OrgUnitMemberType.MANAGER,
        roleTitle: "DAF",
      },
      update: {
        memberType: OrgUnitMemberType.MANAGER,
        roleTitle: "DAF",
      },
    });
  }
  for (let i = 2; i < Math.min(humans.length, 5); i++) {
    const unitId = i % 2 === 0 ? deptOps.id : deptBuild.id;
    await prisma.orgUnitMembership.upsert({
      where: {
        orgUnitId_resourceId: { orgUnitId: unitId, resourceId: humans[i].id },
      },
      create: {
        clientId,
        orgUnitId: unitId,
        resourceId: humans[i].id,
        memberType: OrgUnitMemberType.MEMBER,
      },
      update: { memberType: OrgUnitMemberType.MEMBER },
    });
  }

  const groupCode = `${prefix}-GRP-CODIR`;
  let group = await prisma.orgGroup.findFirst({
    where: { clientId, code: groupCode },
  });
  if (!group) {
    group = await prisma.orgGroup.create({
      data: {
        clientId,
        code: groupCode,
        name: "Comité de direction",
        type: OrgGroupType.COMMITTEE,
        description: "Seed démo — membres CODIR",
      },
    });
  } else {
    group = await prisma.orgGroup.update({
      where: { id: group.id },
      data: {
        name: "Comité de direction",
        type: OrgGroupType.COMMITTEE,
        status: "ACTIVE",
      },
    });
  }

  for (let i = 0; i < Math.min(humans.length, 4); i++) {
    await prisma.orgGroupMembership.upsert({
      where: {
        groupId_resourceId: { groupId: group.id, resourceId: humans[i].id },
      },
      create: {
        clientId,
        groupId: group.id,
        resourceId: humans[i].id,
        memberType: i === 0 ? OrgGroupMemberType.OWNER : OrgGroupMemberType.MEMBER,
      },
      update: {
        memberType: i === 0 ? OrgGroupMemberType.OWNER : OrgGroupMemberType.MEMBER,
      },
    });
  }

  // Propriété org sur budgets IT de l'exercice courant (code EX-YYYY)
  const year = new Date().getUTCFullYear();
  const itBudgets = await prisma.budget.findMany({
    where: {
      clientId,
      exercise: { code: `EX-${year}` },
      OR: [
        { code: { contains: "IT", mode: "insensitive" } },
        { name: { contains: "IT", mode: "insensitive" } },
      ],
    },
    select: { id: true },
    take: 5,
  });
  for (const b of itBudgets) {
    await prisma.budget.update({
      where: { id: b.id },
      data: { ownerOrgUnitId: dirIt.id },
    });
  }

  return { directionItId: dirIt.id, directionFinanceId: dirFin.id };
}
