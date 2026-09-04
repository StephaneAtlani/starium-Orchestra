import {
  MeetingAttendanceStatus,
  MeetingBlockerSeverity,
  MeetingBlockerStatus,
  MeetingDecisionScope,
  MeetingDecisionStatus,
  MeetingDecisionType,
  MeetingMode,
  MeetingStatus,
  PrismaClient,
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

async function findTemplate(
  prisma: PrismaClient,
  clientId: string,
  code: string,
) {
  return prisma.meetingTemplate.findFirst({
    where: { clientId, code },
    select: { id: true, defaultDurationMinutes: true, defaultAgenda: true },
  });
}

async function upsertMeetingByTitle(
  prisma: PrismaClient,
  clientId: string,
  title: string,
  data: {
    templateId: string;
    objective?: string;
    status: MeetingStatus;
    scheduledAt?: Date | null;
    durationMinutes?: number | null;
    periodStart?: Date | null;
    periodEnd?: Date | null;
    meetingMode?: MeetingMode | null;
    location?: string | null;
    facilitatorUserId?: string | null;
    createdByUserId?: string | null;
    startedAt?: Date | null;
    startedByUserId?: string | null;
    finalizedAt?: Date | null;
    finalizedByUserId?: string | null;
    sectionsLockedAt?: Date | null;
    quorumRule?: object | null;
    snapshotPayload?: object | null;
  },
) {
  const existing = await prisma.meeting.findFirst({
    where: { clientId, title },
    select: { id: true },
  });
  if (existing) {
    return prisma.meeting.update({
      where: { id: existing.id },
      data: {
        templateId: data.templateId,
        objective: data.objective ?? null,
        status: data.status,
        scheduledAt: data.scheduledAt ?? null,
        durationMinutes: data.durationMinutes ?? null,
        periodStart: data.periodStart ?? null,
        periodEnd: data.periodEnd ?? null,
        meetingMode: data.meetingMode ?? null,
        location: data.location ?? null,
        facilitatorUserId: data.facilitatorUserId ?? null,
        startedAt: data.startedAt ?? null,
        startedByUserId: data.startedByUserId ?? null,
        finalizedAt: data.finalizedAt ?? null,
        finalizedByUserId: data.finalizedByUserId ?? null,
        sectionsLockedAt: data.sectionsLockedAt ?? null,
        quorumRule: data.quorumRule ?? undefined,
        snapshotPayload: data.snapshotPayload ?? undefined,
      },
    });
  }
  return prisma.meeting.create({
    data: {
      clientId,
      title,
      templateId: data.templateId,
      objective: data.objective ?? null,
      status: data.status,
      scheduledAt: data.scheduledAt ?? null,
      durationMinutes: data.durationMinutes ?? null,
      periodStart: data.periodStart ?? null,
      periodEnd: data.periodEnd ?? null,
      meetingMode: data.meetingMode ?? null,
      location: data.location ?? null,
      facilitatorUserId: data.facilitatorUserId ?? null,
      createdByUserId: data.createdByUserId ?? null,
      startedAt: data.startedAt ?? null,
      startedByUserId: data.startedByUserId ?? null,
      finalizedAt: data.finalizedAt ?? null,
      finalizedByUserId: data.finalizedByUserId ?? null,
      sectionsLockedAt: data.sectionsLockedAt ?? null,
      quorumRule: data.quorumRule ?? undefined,
      snapshotPayload: data.snapshotPayload ?? undefined,
    },
  });
}

/**
 * Réunions démo RFC-MEET-001 :
 * - CODIR FINALIZED (plusieurs projets, décisions, blockers)
 * - COPIL SCHEDULED
 * - COPRO PREPARING
 */
export async function ensureDemoMeetings(
  prisma: PrismaClient,
  slug: string,
  clientId: string,
  actorUserId: string | null,
): Promise<void> {
  const prefix = projectCodePrefix(slug);
  const now = new Date();

  const codirTpl = await findTemplate(prisma, clientId, "CODIR");
  const copilTpl = await findTemplate(prisma, clientId, "COPIL");
  const coproTpl = await findTemplate(prisma, clientId, "COPRO");
  if (!codirTpl || !copilTpl || !coproTpl) {
    console.warn(
      `⚠️  [${slug}] meetings démo : templates système absents — skip.`,
    );
    return;
  }

  const projects = await prisma.project.findMany({
    where: { clientId, code: { contains: "SEED" } },
    orderBy: { code: "asc" },
    take: 6,
    select: { id: true, code: true, name: true },
  });

  const users = await prisma.clientUser.findMany({
    where: { clientId, status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
    take: 5,
    select: { userId: true },
  });
  const facilitator = actorUserId ?? users[0]?.userId ?? null;

  // --- CODIR finalisé ---
  const codirTitle = `[SEED] CODIR ${prefix} — revue portefeuille`;
  const codirScheduled = addDaysUtc(now, -14);
  const codir = await upsertMeetingByTitle(prisma, clientId, codirTitle, {
    templateId: codirTpl.id,
    objective: "Arbitrer le portefeuille et valider les priorités T4.",
    status: MeetingStatus.FINALIZED,
    scheduledAt: codirScheduled,
    durationMinutes: codirTpl.defaultDurationMinutes ?? 90,
    periodStart: addDaysUtc(now, -44),
    periodEnd: addDaysUtc(now, -14),
    meetingMode: MeetingMode.HYBRID,
    location: "Salle CODIR + Teams",
    facilitatorUserId: facilitator,
    createdByUserId: facilitator,
    startedAt: addDaysUtc(codirScheduled, 0),
    startedByUserId: facilitator,
    finalizedAt: addDaysUtc(codirScheduled, 0),
    finalizedByUserId: facilitator,
    sectionsLockedAt: addDaysUtc(codirScheduled, 0),
    quorumRule: { requiredRatio: 0.6 },
    snapshotPayload: {
      seed: true,
      portfolioSummary: "6 projets SEED — 2 en tension, 1 en retard.",
      decidedAt: codirScheduled.toISOString(),
    },
  });

  for (let i = 0; i < projects.length; i++) {
    await prisma.meetingProject.upsert({
      where: {
        meetingId_projectId: {
          meetingId: codir.id,
          projectId: projects[i].id,
        },
      },
      create: {
        clientId,
        meetingId: codir.id,
        projectId: projects[i].id,
        sortOrder: i,
        rapporteurUserId: facilitator,
        allocatedMinutes: 8,
      },
      update: {
        sortOrder: i,
        rapporteurUserId: facilitator,
        allocatedMinutes: 8,
      },
    });
  }

  // Attendees
  for (let i = 0; i < users.length; i++) {
    const existingAtt = await prisma.meetingAttendee.findFirst({
      where: { meetingId: codir.id, userId: users[i].userId },
      select: { id: true },
    });
    const attData = {
      displayName: null as string | null,
      roleLabel: i === 0 ? "Facilitateur" : "Membre CODIR",
      attendanceStatus:
        i < 3
          ? MeetingAttendanceStatus.PRESENT
          : MeetingAttendanceStatus.EXCUSED,
      checkedInAt: i < 3 ? codirScheduled : null,
      isRequired: true,
    };
    if (existingAtt) {
      await prisma.meetingAttendee.update({
        where: { id: existingAtt.id },
        data: attData,
      });
    } else {
      await prisma.meetingAttendee.create({
        data: {
          clientId,
          meetingId: codir.id,
          userId: users[i].userId,
          ...attData,
        },
      });
    }
  }

  // Décisions CODIR
  const decisions = [
    {
      title: "Prioriser le socle identité avant le chantier data",
      decisionType: MeetingDecisionType.PRIORITY_CHANGE,
      scope: MeetingDecisionScope.MEETING,
      projectId: null as string | null,
    },
    {
      title: "Valider enveloppe cloud T4",
      decisionType: MeetingDecisionType.BUDGET_VALIDATION,
      scope: MeetingDecisionScope.MEETING,
      projectId: null,
    },
    {
      title: "Lancer lot MFA national",
      decisionType: MeetingDecisionType.GO,
      scope: MeetingDecisionScope.PROJECT,
      projectId: projects[0]?.id ?? null,
    },
  ];

  for (const d of decisions) {
    const existing = await prisma.meetingDecision.findFirst({
      where: { meetingId: codir.id, title: d.title },
      select: { id: true },
    });
    const payload = {
      scope: d.scope,
      projectId: d.projectId,
      decisionType: d.decisionType,
      status: MeetingDecisionStatus.VALIDATED,
      description: "Seed démo — décision CODIR",
      decidedByUserId: facilitator,
      decidedAt: codirScheduled,
    };
    if (existing) {
      await prisma.meetingDecision.update({
        where: { id: existing.id },
        data: payload,
      });
    } else {
      await prisma.meetingDecision.create({
        data: {
          clientId,
          meetingId: codir.id,
          title: d.title,
          ...payload,
        },
      });
    }
  }

  // Blockers
  if (projects[1]) {
    const blockerTitle = `[SEED] Dépendance fournisseur cloud — ${prefix}`;
    const existingBlocker = await prisma.meetingBlocker.findFirst({
      where: { clientId, title: blockerTitle },
      select: { id: true },
    });
    const blockerData = {
      description: "Engagement capacité non confirmé pour le lot data.",
      severity: MeetingBlockerSeverity.HIGH,
      status: MeetingBlockerStatus.ESCALATED,
      projectId: projects[1].id,
      ownerUserId: facilitator,
      dueDate: addDaysUtc(now, 10),
      raisedAtMeetingId: codir.id,
    };
    if (existingBlocker) {
      await prisma.meetingBlocker.update({
        where: { id: existingBlocker.id },
        data: blockerData,
      });
    } else {
      await prisma.meetingBlocker.create({
        data: { clientId, title: blockerTitle, ...blockerData },
      });
    }
  }
  if (projects[2]) {
    const blockerTitle = `[SEED] Risque cyber ouvert — ${prefix}`;
    const existingBlocker = await prisma.meetingBlocker.findFirst({
      where: { clientId, title: blockerTitle },
      select: { id: true },
    });
    const blockerData = {
      description: "Remédiation audit en retard sur le périmètre critique.",
      severity: MeetingBlockerSeverity.CRITICAL,
      status: MeetingBlockerStatus.OPEN,
      projectId: projects[2].id,
      ownerUserId: facilitator,
      dueDate: addDaysUtc(now, 7),
      raisedAtMeetingId: codir.id,
    };
    if (existingBlocker) {
      await prisma.meetingBlocker.update({
        where: { id: existingBlocker.id },
        data: blockerData,
      });
    } else {
      await prisma.meetingBlocker.create({
        data: { clientId, title: blockerTitle, ...blockerData },
      });
    }
  }

  // --- COPIL planifié ---
  const copilTitle = `[SEED] COPIL ${prefix} — projet identité`;
  const copilProject = projects[0];
  const copil = await upsertMeetingByTitle(prisma, clientId, copilTitle, {
    templateId: copilTpl.id,
    objective: "Revue d'avancement SSO / MFA.",
    status: MeetingStatus.SCHEDULED,
    scheduledAt: addDaysUtc(now, 7),
    durationMinutes: copilTpl.defaultDurationMinutes ?? 60,
    meetingMode: MeetingMode.REMOTE,
    facilitatorUserId: facilitator,
    createdByUserId: facilitator,
    quorumRule: { requiredRatio: 0.5 },
  });
  if (copilProject) {
    await prisma.meetingProject.upsert({
      where: {
        meetingId_projectId: {
          meetingId: copil.id,
          projectId: copilProject.id,
        },
      },
      create: {
        clientId,
        meetingId: copil.id,
        projectId: copilProject.id,
        sortOrder: 0,
        rapporteurUserId: facilitator,
        allocatedMinutes: 45,
      },
      update: {
        rapporteurUserId: facilitator,
        allocatedMinutes: 45,
      },
    });
  }
  if (facilitator) {
    const att = await prisma.meetingAttendee.findFirst({
      where: { meetingId: copil.id, userId: facilitator },
    });
    if (!att) {
      await prisma.meetingAttendee.create({
        data: {
          clientId,
          meetingId: copil.id,
          userId: facilitator,
          roleLabel: "Chef de projet",
          attendanceStatus: MeetingAttendanceStatus.EXPECTED,
          isRequired: true,
        },
      });
    }
  }

  // --- COPRO en préparation ---
  const coproTitle = `[SEED] COPRO ${prefix} — sync build`;
  await upsertMeetingByTitle(prisma, clientId, coproTitle, {
    templateId: coproTpl.id,
    objective: "Point opérationnel build — sans date figée.",
    status: MeetingStatus.PREPARING,
    scheduledAt: null,
    durationMinutes: coproTpl.defaultDurationMinutes ?? 45,
    meetingMode: MeetingMode.ONSITE,
    location: "Open space DSI",
    facilitatorUserId: facilitator,
    createdByUserId: facilitator,
  });
}
