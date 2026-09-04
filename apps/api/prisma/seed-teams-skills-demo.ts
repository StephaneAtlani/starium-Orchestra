import {
  CollaboratorSkillSource,
  PrismaClient,
  ResourceType,
  SkillReferenceLevel,
  SkillStatus,
  WorkTeamMemberRole,
  WorkTeamStatus,
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

function norm(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Équipes métier + compétences (RFC-TEAM-004 / 005) — liées aux Resource HUMAN
 * et aux collaborateurs déjà synchronisés.
 */
export async function ensureDemoTeamsAndSkills(
  prisma: PrismaClient,
  slug: string,
  clientId: string,
): Promise<{ workTeamIds: string[] }> {
  const prefix = projectCodePrefix(slug);

  const humans = await prisma.resource.findMany({
    where: { clientId, type: ResourceType.HUMAN },
    orderBy: { createdAt: "asc" },
    take: 10,
    select: { id: true, name: true, firstName: true },
  });

  const leadId = humans[0]?.id ?? null;

  async function upsertTeam(
    code: string,
    name: string,
    parentId: string | null,
    sortOrder: number,
  ) {
    const existing = await prisma.workTeam.findFirst({
      where: { clientId, code },
      select: { id: true },
    });
    const data = {
      name,
      parentId,
      leadResourceId: leadId,
      status: WorkTeamStatus.ACTIVE,
      sortOrder,
      archivedAt: null,
    };
    if (existing) {
      return prisma.workTeam.update({ where: { id: existing.id }, data });
    }
    return prisma.workTeam.create({
      data: { clientId, code, ...data },
    });
  }

  const root = await upsertTeam(`${prefix}-WT-DSI`, "Équipe DSI", null, 0);
  const run = await upsertTeam(
    `${prefix}-WT-RUN`,
    "Run & support N2",
    root.id,
    10,
  );
  const build = await upsertTeam(
    `${prefix}-WT-BUILD`,
    "Build projets",
    root.id,
    20,
  );
  const cyber = await upsertTeam(
    `${prefix}-WT-CYBER`,
    "Cybersécurité",
    root.id,
    30,
  );

  const teams = [root, run, build, cyber];
  for (let i = 0; i < humans.length; i++) {
    const team = teams[1 + (i % 3)]; // run / build / cyber
    await prisma.workTeamMembership.upsert({
      where: {
        workTeamId_resourceId: {
          workTeamId: team.id,
          resourceId: humans[i].id,
        },
      },
      create: {
        clientId,
        workTeamId: team.id,
        resourceId: humans[i].id,
        role:
          i === 0 || humans[i].id === team.leadResourceId
            ? WorkTeamMemberRole.LEAD
            : WorkTeamMemberRole.MEMBER,
      },
      update: {
        role:
          i === 0 || humans[i].id === team.leadResourceId
            ? WorkTeamMemberRole.LEAD
            : WorkTeamMemberRole.MEMBER,
      },
    });

    // Capacité principale (RFC-CAPA-001)
    await prisma.resource.update({
      where: { id: humans[i].id },
      data: { primaryCapacityWorkTeamId: team.id },
    });
  }

  // Aussi rattacher le lead au root
  if (leadId) {
    await prisma.workTeamMembership.upsert({
      where: {
        workTeamId_resourceId: { workTeamId: root.id, resourceId: leadId },
      },
      create: {
        clientId,
        workTeamId: root.id,
        resourceId: leadId,
        role: WorkTeamMemberRole.LEAD,
      },
      update: { role: WorkTeamMemberRole.LEAD },
    });
  }

  const catDefs = [
    { name: "Cloud & infra", skills: ["AWS", "Kubernetes", "Observabilité"] },
    {
      name: "Sécurité",
      skills: ["IAM / SSO", "SOC", "Conformité ISO 27001"],
    },
    {
      name: "Pilotage",
      skills: ["PMO", "Budget IT", "Conduite du changement"],
    },
  ] as const;

  const skillIds: string[] = [];
  for (let ci = 0; ci < catDefs.length; ci++) {
    const catName = catDefs[ci].name;
    const cat = await prisma.skillCategory.upsert({
      where: {
        clientId_normalizedName: { clientId, normalizedName: norm(catName) },
      },
      create: {
        clientId,
        name: catName,
        normalizedName: norm(catName),
        sortOrder: ci * 10,
      },
      update: { name: catName, sortOrder: ci * 10 },
    });
    for (const skillName of catDefs[ci].skills) {
      const skill = await prisma.skill.upsert({
        where: {
          clientId_normalizedName: {
            clientId,
            normalizedName: norm(skillName),
          },
        },
        create: {
          clientId,
          categoryId: cat.id,
          name: skillName,
          normalizedName: norm(skillName),
          status: SkillStatus.ACTIVE,
          referenceLevel: SkillReferenceLevel.INTERMEDIATE,
        },
        update: {
          categoryId: cat.id,
          name: skillName,
          status: SkillStatus.ACTIVE,
        },
      });
      skillIds.push(skill.id);
    }
  }

  const collaborators = await prisma.collaborator.findMany({
    where: { clientId, status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
    take: 6,
    select: { id: true },
  });

  const levels = [
    SkillReferenceLevel.EXPERT,
    SkillReferenceLevel.ADVANCED,
    SkillReferenceLevel.INTERMEDIATE,
    SkillReferenceLevel.BEGINNER,
  ];
  for (let i = 0; i < collaborators.length; i++) {
    const skillId = skillIds[i % skillIds.length];
    await prisma.collaboratorSkill.upsert({
      where: {
        collaboratorId_skillId: {
          collaboratorId: collaborators[i].id,
          skillId,
        },
      },
      create: {
        clientId,
        collaboratorId: collaborators[i].id,
        skillId,
        level: levels[i % levels.length],
        source: CollaboratorSkillSource.MANAGER_ASSESSED,
        reviewedAt: new Date(),
      },
      update: {
        level: levels[i % levels.length],
        source: CollaboratorSkillSource.MANAGER_ASSESSED,
      },
    });
    // 2e compétence
    const skillId2 = skillIds[(i + 3) % skillIds.length];
    if (skillId2 !== skillId) {
      await prisma.collaboratorSkill.upsert({
        where: {
          collaboratorId_skillId: {
            collaboratorId: collaborators[i].id,
            skillId: skillId2,
          },
        },
        create: {
          clientId,
          collaboratorId: collaborators[i].id,
          skillId: skillId2,
          level: SkillReferenceLevel.INTERMEDIATE,
          source: CollaboratorSkillSource.SELF_DECLARED,
        },
        update: { level: SkillReferenceLevel.INTERMEDIATE },
      });
    }
  }

  return { workTeamIds: teams.map((t) => t.id) };
}
