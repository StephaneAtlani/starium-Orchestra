import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Meeting, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AccessDecisionService } from '../access-decision/access-decision.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  AddMeetingProjectsDto,
  CancelMeetingDto,
  CreateMeetingDto,
  ListMeetingsQueryDto,
  ReorderMeetingProjectsDto,
  ReorderMeetingSectionsDto,
  ScheduleMeetingDto,
  UpdateMeetingDto,
  UpdateMeetingProjectDto,
  UpdateMeetingSectionDto,
} from './dto/meeting.dto';
import {
  MEETING_ERROR_CODES,
  MEETING_MAX_PROJECTS,
} from './lib/meeting-error-codes';
import {
  computeQuorum,
  parseQuorumRule,
  type QuorumAttendee,
} from './lib/meeting-quorum.util';
import {
  canTransition,
  isMeetingEditable,
  targetStatus,
  type MeetingTransition,
} from './lib/meeting-status.helpers';
import { MeetingTemplatesService } from './meeting-templates.service';

const MEETING_LIST_INCLUDE = {
  template: { select: { id: true, name: true, code: true, kind: true, scope: true } },
  facilitator: { select: { id: true, firstName: true, lastName: true } },
  _count: { select: { projects: true, decisions: true, attendees: true } },
} satisfies Prisma.MeetingInclude;

const MEETING_DETAIL_INCLUDE = {
  template: { select: { id: true, name: true, code: true, kind: true, scope: true } },
  facilitator: { select: { id: true, firstName: true, lastName: true } },
  projects: {
    orderBy: { sortOrder: 'asc' },
    include: {
      // Libellé métier obligatoire : l'UI n'affiche jamais un identifiant.
      project: { select: { id: true, name: true, code: true, status: true } },
      rapporteur: { select: { id: true, firstName: true, lastName: true } },
    },
  },
  sections: { orderBy: { sortOrder: 'asc' } },
  attendees: { orderBy: { createdAt: 'asc' } },
  agendaItems: { orderBy: { sortOrder: 'asc' } },
  decisions: { orderBy: { createdAt: 'asc' } },
} satisfies Prisma.MeetingInclude;

/**
 * RFC-MEET-001 — service principal du module Réunions.
 *
 * Règles d'isolation appliquées sans exception :
 *  - `clientId` provient du contexte authentifié, jamais du corps de requête ;
 *  - toute entité référencée est revalidée contre le client actif ;
 *  - tout projet inscrit passe par `AccessDecisionService` (intent `read`).
 */
@Injectable()
export class MeetingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly accessDecision: AccessDecisionService,
    private readonly templates: MeetingTemplatesService,
  ) {}

  // -------------------------------------------------------------------------
  // Lecture
  // -------------------------------------------------------------------------

  async list(clientId: string, query: ListMeetingsQueryDto) {
    const where: Prisma.MeetingWhereInput = {
      clientId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.templateKind ? { template: { kind: query.templateKind } } : {}),
      ...(query.projectId
        ? { projects: { some: { clientId, projectId: query.projectId } } }
        : {}),
      ...(query.from || query.to
        ? {
            scheduledAt: {
              ...(query.from ? { gte: query.from } : {}),
              ...(query.to ? { lte: query.to } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.meeting.findMany({
        where,
        include: MEETING_LIST_INCLUDE,
        orderBy: [{ scheduledAt: 'desc' }, { createdAt: 'desc' }],
        skip: query.offset ?? 0,
        take: query.limit ?? 50,
      }),
      this.prisma.meeting.count({ where }),
    ]);

    return { items, total };
  }

  async getOrThrow(clientId: string, meetingId: string) {
    const meeting = await this.prisma.meeting.findFirst({
      where: { id: meetingId, clientId },
      include: MEETING_DETAIL_INCLUDE,
    });
    if (!meeting) {
      throw new NotFoundException('Réunion introuvable');
    }
    return meeting;
  }

  /** Quorum courant — exposé pour l'écran d'appel et vérifié à la finalisation. */
  async getAttendance(clientId: string, meetingId: string) {
    const meeting = await this.requireMeeting(clientId, meetingId);
    const attendees = await this.prisma.meetingAttendee.findMany({
      where: { clientId, meetingId },
      orderBy: { createdAt: 'asc' },
    });
    const quorum = computeQuorum(
      attendees as unknown as QuorumAttendee[],
      parseQuorumRule(meeting.quorumRule),
    );
    return { attendees, quorum };
  }

  // -------------------------------------------------------------------------
  // Écriture
  // -------------------------------------------------------------------------

  async create(clientId: string, userId: string, dto: CreateMeetingDto) {
    const template = await this.templates.getOrThrow(clientId, dto.templateId);

    if (dto.governanceCycleInstanceId) {
      await this.assertGovernanceInstance(clientId, dto.governanceCycleInstanceId);
    }

    const projectIds = dto.projectIds ?? [];
    if (projectIds.length > 0) {
      await this.assertProjectsReadable(clientId, userId, projectIds);
    }

    const meeting = await this.prisma.meeting.create({
      data: {
        clientId,
        templateId: template.id,
        title: dto.title,
        objective: dto.objective ?? null,
        scheduledAt: dto.scheduledAt ?? null,
        durationMinutes:
          dto.durationMinutes ?? template.defaultDurationMinutes ?? null,
        periodStart: dto.periodStart ?? null,
        periodEnd: dto.periodEnd ?? null,
        meetingMode: dto.meetingMode ?? null,
        location: dto.location ?? null,
        meetingUrl: dto.meetingUrl ?? null,
        facilitatorUserId: dto.facilitatorUserId ?? null,
        governanceCycleInstanceId: dto.governanceCycleInstanceId ?? null,
        quorumRule: (dto.quorumRule ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        createdByUserId: userId,
        // Les sections sont instanciées depuis le modèle : la réunion peut
        // ensuite les réordonner sans altérer le modèle (RFC-MEET-001 §4.4).
        sections: {
          create: template.sections.map((section) => ({
            clientId,
            sectionType: section.sectionType,
            sortOrder: section.sortOrder,
            titleOverride: section.titleOverride,
            isEnabled: section.isEnabled,
            config: (section.config ?? Prisma.JsonNull) as Prisma.InputJsonValue,
          })),
        },
        agendaItems: {
          create: this.agendaFromTemplate(clientId, template.defaultAgenda),
        },
        projects: {
          create: projectIds.map((projectId, index) => ({
            clientId,
            projectId,
            sortOrder: index,
          })),
        },
      },
      include: MEETING_DETAIL_INCLUDE,
    });

    await this.auditLogs.create({
      clientId,
      userId,
      action: 'meeting.created',
      resourceType: 'MEETING',
      resourceId: meeting.id,
      newValue: {
        title: meeting.title,
        templateCode: template.code,
        projectCount: projectIds.length,
      },
    });

    return meeting;
  }

  async update(
    clientId: string,
    userId: string,
    meetingId: string,
    dto: UpdateMeetingDto,
  ) {
    const meeting = await this.requireMeeting(clientId, meetingId);
    this.assertEditable(meeting);

    if (dto.governanceCycleInstanceId) {
      await this.assertGovernanceInstance(clientId, dto.governanceCycleInstanceId);
    }

    const updated = await this.prisma.meeting.update({
      where: { id: meeting.id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.objective !== undefined ? { objective: dto.objective } : {}),
        ...(dto.scheduledAt !== undefined
          ? { scheduledAt: dto.scheduledAt }
          : {}),
        ...(dto.durationMinutes !== undefined
          ? { durationMinutes: dto.durationMinutes }
          : {}),
        ...(dto.periodStart !== undefined
          ? { periodStart: dto.periodStart }
          : {}),
        ...(dto.periodEnd !== undefined ? { periodEnd: dto.periodEnd } : {}),
        ...(dto.meetingMode !== undefined
          ? { meetingMode: dto.meetingMode }
          : {}),
        ...(dto.location !== undefined ? { location: dto.location } : {}),
        ...(dto.meetingUrl !== undefined ? { meetingUrl: dto.meetingUrl } : {}),
        ...(dto.facilitatorUserId !== undefined
          ? { facilitatorUserId: dto.facilitatorUserId }
          : {}),
        ...(dto.governanceCycleInstanceId !== undefined
          ? { governanceCycleInstanceId: dto.governanceCycleInstanceId }
          : {}),
        ...(dto.quorumRule !== undefined
          ? {
              quorumRule: (dto.quorumRule ??
                Prisma.JsonNull) as Prisma.InputJsonValue,
            }
          : {}),
      },
      include: MEETING_DETAIL_INCLUDE,
    });

    await this.auditLogs.create({
      clientId,
      userId,
      action: 'meeting.updated',
      resourceType: 'MEETING',
      resourceId: meeting.id,
      oldValue: { title: meeting.title, scheduledAt: meeting.scheduledAt },
      newValue: { title: updated.title, scheduledAt: updated.scheduledAt },
    });

    return updated;
  }

  // -------------------------------------------------------------------------
  // Cycle de vie (§4.4)
  // -------------------------------------------------------------------------

  async schedule(
    clientId: string,
    userId: string,
    meetingId: string,
    dto: ScheduleMeetingDto,
  ) {
    const meeting = await this.requireMeeting(clientId, meetingId);
    this.assertTransition(meeting, 'schedule');

    const scheduledAt = dto.scheduledAt ?? meeting.scheduledAt;
    if (!scheduledAt) {
      throw new BadRequestException({
        code: MEETING_ERROR_CODES.SCHEDULE_REQUIRES_DATE,
        message: 'Une date de séance est nécessaire pour planifier la réunion.',
      });
    }

    const template = await this.templates.getOrThrow(
      clientId,
      meeting.templateId,
    );
    if (template.scope === 'PROJECT') {
      const projectCount = await this.prisma.meetingProject.count({
        where: { clientId, meetingId: meeting.id },
      });
      if (projectCount === 0) {
        throw new BadRequestException({
          code: MEETING_ERROR_CODES.SCOPE_REQUIRES_PROJECT,
          message:
            'Ce modèle porte sur un projet : inscrivez au moins un projet avant de planifier.',
        });
      }
    }

    const updated = await this.prisma.meeting.update({
      where: { id: meeting.id },
      data: {
        status: targetStatus('schedule'),
        scheduledAt,
        ...(dto.durationMinutes !== undefined
          ? { durationMinutes: dto.durationMinutes }
          : {}),
      },
      include: MEETING_DETAIL_INCLUDE,
    });

    await this.auditLogs.create({
      clientId,
      userId,
      action: 'meeting.scheduled',
      resourceType: 'MEETING',
      resourceId: meeting.id,
      newValue: { scheduledAt },
    });

    // Le pont vers `ProjectReview` (un point projet par projet inscrit) est
    // posé au lot C : `meeting-project-review-bridge.service.ts`.
    return updated;
  }

  async start(clientId: string, userId: string, meetingId: string) {
    const meeting = await this.requireMeeting(clientId, meetingId);
    this.assertTransition(meeting, 'start');

    const updated = await this.prisma.meeting.update({
      where: { id: meeting.id },
      data: {
        status: targetStatus('start'),
        startedAt: new Date(),
        startedByUserId: userId,
        // La composition des sections est figée à l'ouverture de la séance.
        sectionsLockedAt: new Date(),
      },
      include: MEETING_DETAIL_INCLUDE,
    });

    await this.auditLogs.create({
      clientId,
      userId,
      action: 'meeting.started',
      resourceType: 'MEETING',
      resourceId: meeting.id,
    });

    return updated;
  }

  async finalize(clientId: string, userId: string, meetingId: string) {
    const meeting = await this.requireMeeting(clientId, meetingId);
    this.assertTransition(meeting, 'finalize');

    const { quorum } = await this.getAttendance(clientId, meetingId);

    const updated = await this.prisma.meeting.update({
      where: { id: meeting.id },
      data: {
        status: targetStatus('finalize'),
        finalizedAt: new Date(),
        finalizedByUserId: userId,
      },
      include: MEETING_DETAIL_INCLUDE,
    });

    await this.auditLogs.create({
      clientId,
      userId,
      action: 'meeting.finalized',
      resourceType: 'MEETING',
      resourceId: meeting.id,
      newValue: {
        quorumMet: quorum.isMet,
        presentCount: quorum.presentCount,
        requiredCount: quorum.requiredCount,
      },
    });

    // Snapshot et propagation des décisions : lots B et D.
    return updated;
  }

  async cancel(
    clientId: string,
    userId: string,
    meetingId: string,
    dto: CancelMeetingDto,
  ) {
    const meeting = await this.requireMeeting(clientId, meetingId);
    this.assertTransition(meeting, 'cancel');

    const updated = await this.prisma.meeting.update({
      where: { id: meeting.id },
      data: {
        status: targetStatus('cancel'),
        cancelledAt: new Date(),
        cancelledByUserId: userId,
        cancelReason: dto.reason,
      },
      include: MEETING_DETAIL_INCLUDE,
    });

    await this.auditLogs.create({
      clientId,
      userId,
      action: 'meeting.cancelled',
      resourceType: 'MEETING',
      resourceId: meeting.id,
      newValue: { reason: dto.reason },
    });

    return updated;
  }

  // -------------------------------------------------------------------------
  // Périmètre projets
  // -------------------------------------------------------------------------

  async addProjects(
    clientId: string,
    userId: string,
    meetingId: string,
    dto: AddMeetingProjectsDto,
  ) {
    const meeting = await this.requireMeeting(clientId, meetingId);
    this.assertEditable(meeting);
    await this.assertProjectsReadable(clientId, userId, dto.projectIds);

    const existing = await this.prisma.meetingProject.findMany({
      where: { clientId, meetingId: meeting.id },
      select: { projectId: true, sortOrder: true },
    });
    const known = new Set(existing.map((row) => row.projectId));
    const toAdd = dto.projectIds.filter((id) => !known.has(id));

    if (toAdd.length === 0) {
      throw new ConflictException({
        code: MEETING_ERROR_CODES.PROJECT_ALREADY_IN_SCOPE,
        message: 'Ces projets sont déjà inscrits au périmètre de la réunion.',
      });
    }
    if (existing.length + toAdd.length > MEETING_MAX_PROJECTS) {
      throw new BadRequestException({
        code: MEETING_ERROR_CODES.TOO_MANY_PROJECTS,
        message: `Une réunion ne peut porter plus de ${MEETING_MAX_PROJECTS} projets. Scindez la séance.`,
      });
    }

    const nextOrder =
      existing.reduce((max, row) => Math.max(max, row.sortOrder), -1) + 1;

    await this.prisma.meetingProject.createMany({
      data: toAdd.map((projectId, index) => ({
        clientId,
        meetingId: meeting.id,
        projectId,
        sortOrder: nextOrder + index,
      })),
    });

    await this.auditLogs.create({
      clientId,
      userId,
      action: 'meeting.project.added',
      resourceType: 'MEETING',
      resourceId: meeting.id,
      newValue: { projectIds: toAdd },
    });

    return this.getOrThrow(clientId, meeting.id);
  }

  async removeProject(
    clientId: string,
    userId: string,
    meetingId: string,
    meetingProjectId: string,
  ) {
    const meeting = await this.requireMeeting(clientId, meetingId);
    this.assertEditable(meeting);

    const row = await this.prisma.meetingProject.findFirst({
      where: { id: meetingProjectId, clientId, meetingId: meeting.id },
    });
    if (!row) {
      throw new NotFoundException('Projet introuvable dans cette réunion');
    }

    // Le point projet éventuellement lié n'est pas supprimé : il porte peut-être
    // déjà des décisions. On se contente de le délier (RFC-MEET-001 §4.5).
    await this.prisma.meetingProject.delete({ where: { id: row.id } });

    await this.auditLogs.create({
      clientId,
      userId,
      action: 'meeting.project.removed',
      resourceType: 'MEETING',
      resourceId: meeting.id,
      oldValue: {
        projectId: row.projectId,
        keptProjectReviewId: row.projectReviewId,
      },
    });

    return this.getOrThrow(clientId, meeting.id);
  }

  async reorderProjects(
    clientId: string,
    userId: string,
    meetingId: string,
    dto: ReorderMeetingProjectsDto,
  ) {
    const meeting = await this.requireMeeting(clientId, meetingId);
    this.assertEditable(meeting);

    const rows = await this.prisma.meetingProject.findMany({
      where: { clientId, meetingId: meeting.id },
      select: { id: true },
    });
    this.assertSameIdSet(
      rows.map((row) => row.id),
      dto.meetingProjectIds,
      'La liste doit contenir exactement les projets inscrits à la réunion.',
    );

    await this.prisma.$transaction(
      dto.meetingProjectIds.map((id, index) =>
        this.prisma.meetingProject.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );

    await this.auditLogs.create({
      clientId,
      userId,
      action: 'meeting.project.reordered',
      resourceType: 'MEETING',
      resourceId: meeting.id,
    });

    return this.getOrThrow(clientId, meeting.id);
  }

  async updateProject(
    clientId: string,
    userId: string,
    meetingId: string,
    meetingProjectId: string,
    dto: UpdateMeetingProjectDto,
  ) {
    const meeting = await this.requireMeeting(clientId, meetingId);
    this.assertEditable(meeting);

    const row = await this.prisma.meetingProject.findFirst({
      where: { id: meetingProjectId, clientId, meetingId: meeting.id },
      select: { id: true },
    });
    if (!row) {
      throw new NotFoundException('Projet introuvable dans cette réunion');
    }

    await this.prisma.meetingProject.update({
      where: { id: row.id },
      data: {
        ...(dto.rapporteurUserId !== undefined
          ? { rapporteurUserId: dto.rapporteurUserId }
          : {}),
        ...(dto.allocatedMinutes !== undefined
          ? { allocatedMinutes: dto.allocatedMinutes }
          : {}),
      },
    });

    await this.auditLogs.create({
      clientId,
      userId,
      action: 'meeting.project.updated',
      resourceType: 'MEETING',
      resourceId: meeting.id,
    });

    return this.getOrThrow(clientId, meeting.id);
  }

  // -------------------------------------------------------------------------
  // Sections de la réunion
  // -------------------------------------------------------------------------

  async reorderSections(
    clientId: string,
    userId: string,
    meetingId: string,
    dto: ReorderMeetingSectionsDto,
  ) {
    const meeting = await this.requireMeeting(clientId, meetingId);
    this.assertSectionsUnlocked(meeting);

    const rows = await this.prisma.meetingSectionInstance.findMany({
      where: { clientId, meetingId: meeting.id },
      select: { id: true },
    });
    this.assertSameIdSet(
      rows.map((row) => row.id),
      dto.sectionInstanceIds,
      'La liste doit contenir exactement les sections de la réunion.',
    );

    // Décalage temporaire hors plage : `@@unique([meetingId, sortOrder])`
    // interdit deux sections au même rang pendant la permutation.
    await this.prisma.$transaction([
      ...dto.sectionInstanceIds.map((id, index) =>
        this.prisma.meetingSectionInstance.update({
          where: { id },
          data: { sortOrder: -1 - index },
        }),
      ),
      ...dto.sectionInstanceIds.map((id, index) =>
        this.prisma.meetingSectionInstance.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    ]);

    await this.auditLogs.create({
      clientId,
      userId,
      action: 'meeting.section.reordered',
      resourceType: 'MEETING',
      resourceId: meeting.id,
    });

    return this.getOrThrow(clientId, meeting.id);
  }

  async updateSection(
    clientId: string,
    userId: string,
    meetingId: string,
    sectionId: string,
    dto: UpdateMeetingSectionDto,
  ) {
    const meeting = await this.requireMeeting(clientId, meetingId);
    // Les notes de séance restent saisissables une fois les sections figées ;
    // l'activation et le titre, non.
    const changesComposition =
      dto.isEnabled !== undefined ||
      dto.titleOverride !== undefined ||
      dto.config !== undefined;
    if (changesComposition) {
      this.assertSectionsUnlocked(meeting);
    } else {
      this.assertEditable(meeting);
    }

    const section = await this.prisma.meetingSectionInstance.findFirst({
      where: { id: sectionId, clientId, meetingId: meeting.id },
      select: { id: true },
    });
    if (!section) {
      throw new NotFoundException('Section introuvable dans cette réunion');
    }

    const updated = await this.prisma.meetingSectionInstance.update({
      where: { id: section.id },
      data: {
        ...(dto.isEnabled !== undefined ? { isEnabled: dto.isEnabled } : {}),
        ...(dto.titleOverride !== undefined
          ? { titleOverride: dto.titleOverride }
          : {}),
        ...(dto.config !== undefined
          ? { config: (dto.config ?? Prisma.JsonNull) as Prisma.InputJsonValue }
          : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
    });

    await this.auditLogs.create({
      clientId,
      userId,
      action: 'meeting.section.updated',
      resourceType: 'MEETING',
      resourceId: meeting.id,
      newValue: { sectionType: updated.sectionType },
    });

    return updated;
  }

  // -------------------------------------------------------------------------
  // Garde-fous internes
  // -------------------------------------------------------------------------

  private async requireMeeting(clientId: string, meetingId: string) {
    const meeting = await this.prisma.meeting.findFirst({
      where: { id: meetingId, clientId },
    });
    if (!meeting) {
      throw new NotFoundException('Réunion introuvable');
    }
    return meeting;
  }

  private assertEditable(meeting: Meeting) {
    if (!isMeetingEditable(meeting.status)) {
      throw new ConflictException({
        code: MEETING_ERROR_CODES.INVALID_TRANSITION,
        message:
          'Une réunion finalisée ou annulée ne peut plus être modifiée.',
      });
    }
  }

  private assertSectionsUnlocked(meeting: Meeting) {
    this.assertEditable(meeting);
    if (meeting.sectionsLockedAt !== null) {
      throw new ConflictException({
        code: MEETING_ERROR_CODES.INVALID_TRANSITION,
        message:
          'La composition des sections est figée depuis l’ouverture de la séance.',
      });
    }
  }

  private assertTransition(meeting: Meeting, transition: MeetingTransition) {
    if (!canTransition(meeting.status, transition)) {
      throw new ConflictException({
        code: MEETING_ERROR_CODES.INVALID_TRANSITION,
        message: `Action impossible depuis le statut courant de la réunion.`,
      });
    }
  }

  /**
   * Isolation : un projet doit appartenir au client actif **et** être lisible
   * par la personne connectée. On ne se contente jamais du filtre `clientId`.
   */
  private async assertProjectsReadable(
    clientId: string,
    userId: string,
    projectIds: readonly string[],
  ) {
    const unique = [...new Set(projectIds)];
    const found = await this.prisma.project.findMany({
      where: { id: { in: unique }, clientId },
      select: { id: true },
    });
    if (found.length !== unique.length) {
      throw new NotFoundException(
        'Un ou plusieurs projets sont introuvables pour le client actif.',
      );
    }

    for (const projectId of unique) {
      const decision = await this.accessDecision.decide({
        clientId,
        userId,
        resourceType: 'PROJECT',
        resourceId: projectId,
        intent: 'read',
      });
      if (decision.allowed !== true) {
        throw new ForbiddenException({
          code: 'ACCESS_DECISION_DENIED',
          message:
            'Vous n’avez pas accès à l’un des projets demandés pour cette réunion.',
        });
      }
    }
  }

  private async assertGovernanceInstance(clientId: string, instanceId: string) {
    const instance = await this.prisma.governanceCycleInstance.findFirst({
      where: { id: instanceId, clientId },
      select: { id: true },
    });
    if (!instance) {
      throw new NotFoundException(
        'Instance de cycle de pilotage introuvable pour le client actif.',
      );
    }
  }

  private assertSameIdSet(
    known: readonly string[],
    provided: readonly string[],
    message: string,
  ) {
    const knownSet = new Set(known);
    const providedSet = new Set(provided);
    const sameSize =
      knownSet.size === providedSet.size && provided.length === providedSet.size;
    const sameMembers = provided.every((id) => knownSet.has(id));
    if (!sameSize || !sameMembers) {
      throw new BadRequestException(message);
    }
  }

  private agendaFromTemplate(clientId: string, defaultAgenda: unknown) {
    if (!Array.isArray(defaultAgenda)) return [];
    return defaultAgenda.flatMap((row, index) => {
      if (row === null || typeof row !== 'object') return [];
      const item = row as Record<string, unknown>;
      const title = typeof item.title === 'string' ? item.title : null;
      if (!title) return [];
      return [
        {
          clientId,
          title: title.slice(0, 300),
          description:
            typeof item.description === 'string' ? item.description : null,
          sortOrder: index,
        },
      ];
    });
  }
}
