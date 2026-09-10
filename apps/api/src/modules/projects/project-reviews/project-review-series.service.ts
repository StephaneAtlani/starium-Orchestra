import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  ProjectReviewSeriesFrequency,
  ProjectReviewStatus,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import type { AuditContext } from '../../budget-management/types/audit-context';
import {
  PROJECT_AUDIT_ACTION,
  PROJECT_AUDIT_RESOURCE_TYPE,
} from '../project-audit.constants';
import { ProjectsService } from '../projects.service';
import {
  CreateProjectReviewSeriesDto,
  GenerateProjectReviewSeriesDto,
  UpdateProjectReviewSeriesDto,
} from './dto/project-review-series.dto';
import {
  formatProjectReviewUserDisplayName,
  projectReviewUserSelect,
} from './project-review-user-display';
import { PROJECT_REVIEW_SERIES_FREQUENCY_LABEL } from './project-review-ui-state';

function parseUserIdList(value: Prisma.JsonValue): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string' && v.length > 0);
}

function parisCivilDayKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function startOfTodayParis(): Date {
  const key = parisCivilDayKey(new Date());
  const [y, m, d] = key.split('-').map(Number);
  const utcGuess = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  const parisHour = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Paris',
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(utcGuess),
  );
  utcGuess.setUTCHours(utcGuess.getUTCHours() - parisHour);
  return utcGuess;
}

function addFrequencyStep(
  date: Date,
  frequency: ProjectReviewSeriesFrequency,
): Date {
  const next = new Date(date);
  switch (frequency) {
    case 'WEEKLY':
      next.setUTCDate(next.getUTCDate() + 7);
      break;
    case 'BIWEEKLY':
      next.setUTCDate(next.getUTCDate() + 14);
      break;
    case 'MONTHLY':
      next.setUTCMonth(next.getUTCMonth() + 1);
      break;
    case 'QUARTERLY':
      next.setUTCMonth(next.getUTCMonth() + 3);
      break;
    default:
      next.setUTCDate(next.getUTCDate() + 7);
  }
  return next;
}

function formatTitleDateFr(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

@Injectable()
export class ProjectReviewSeriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  private auditMeta(context?: AuditContext) {
    return {
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    };
  }

  private async resolveParticipantLabels(
    clientId: string,
    userIds: string[],
  ): Promise<Array<{ userId: string; displayName: string }>> {
    if (userIds.length === 0) return [];
    const unique = [...new Set(userIds)];
    const users = await this.prisma.user.findMany({
      where: {
        id: { in: unique },
        clientUsers: { some: { clientId } },
      },
      select: projectReviewUserSelect,
    });
    const byId = new Map(users.map((u) => [u.id, u]));
    return unique
      .map((userId) => {
        const user = byId.get(userId);
        if (!user) return null;
        const displayName =
          formatProjectReviewUserDisplayName(user) ?? 'Utilisateur';
        return { userId, displayName };
      })
      .filter((p): p is { userId: string; displayName: string } => p != null);
  }

  private async assertParticipantUsers(
    clientId: string,
    userIds: string[],
  ): Promise<void> {
    for (const userId of userIds) {
      await this.projects.assertClientUser(clientId, userId);
    }
  }

  private mapSeries(
    row: {
      id: string;
      clientId: string;
      projectId: string;
      title: string;
      reviewType: CreateProjectReviewSeriesDto['reviewType'];
      frequency: ProjectReviewSeriesFrequency;
      durationMinutes: number;
      meetingMode: CreateProjectReviewSeriesDto['meetingMode'] | null;
      location: string | null;
      defaultObjective: string | null;
      permanentParticipantUserIds: Prisma.JsonValue;
      anchorDate: Date;
      horizonCount: number;
      isActive: boolean;
      createdByUserId: string | null;
      createdAt: Date;
      updatedAt: Date;
      _count?: { reviews: number };
    },
    participants: Array<{ userId: string; displayName: string }>,
  ) {
    return {
      id: row.id,
      clientId: row.clientId,
      projectId: row.projectId,
      title: row.title,
      reviewType: row.reviewType,
      frequency: row.frequency,
      frequencyLabel: PROJECT_REVIEW_SERIES_FREQUENCY_LABEL[row.frequency],
      durationMinutes: row.durationMinutes,
      meetingMode: row.meetingMode,
      location: row.location,
      defaultObjective: row.defaultObjective,
      permanentParticipantUserIds: parseUserIdList(row.permanentParticipantUserIds),
      permanentParticipants: participants,
      anchorDate: row.anchorDate.toISOString(),
      horizonCount: row.horizonCount,
      isActive: row.isActive,
      createdByUserId: row.createdByUserId,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      reviewsCount: row._count?.reviews ?? 0,
    };
  }

  async list(clientId: string, projectId: string) {
    await this.projects.getProjectForScope(clientId, projectId);
    const rows = await this.prisma.projectReviewSeries.findMany({
      where: { clientId, projectId },
      include: { _count: { select: { reviews: true } } },
      orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
    });
    const items = [];
    for (const row of rows) {
      const participants = await this.resolveParticipantLabels(
        clientId,
        parseUserIdList(row.permanentParticipantUserIds),
      );
      items.push(this.mapSeries(row, participants));
    }
    return { items };
  }

  async getById(clientId: string, projectId: string, seriesId: string) {
    await this.projects.getProjectForScope(clientId, projectId);
    const row = await this.prisma.projectReviewSeries.findFirst({
      where: { id: seriesId, clientId, projectId },
      include: { _count: { select: { reviews: true } } },
    });
    if (!row) throw new NotFoundException('Série introuvable');
    const participants = await this.resolveParticipantLabels(
      clientId,
      parseUserIdList(row.permanentParticipantUserIds),
    );
    return this.mapSeries(row, participants);
  }

  async create(
    clientId: string,
    projectId: string,
    dto: CreateProjectReviewSeriesDto,
    context?: AuditContext,
  ) {
    await this.projects.getProjectForScope(clientId, projectId);
    const userIds = [...new Set(dto.permanentParticipantUserIds)];
    await this.assertParticipantUsers(clientId, userIds);

    const created = await this.prisma.projectReviewSeries.create({
      data: {
        clientId,
        projectId,
        title: dto.title.trim(),
        reviewType: dto.reviewType,
        frequency: dto.frequency,
        durationMinutes: dto.durationMinutes,
        meetingMode: dto.meetingMode ?? null,
        location: dto.location?.trim() || null,
        defaultObjective: dto.defaultObjective?.trim() || null,
        permanentParticipantUserIds: userIds,
        anchorDate: new Date(dto.anchorDate),
        horizonCount: dto.horizonCount ?? 4,
        createdByUserId: context?.actorUserId ?? null,
      },
      include: { _count: { select: { reviews: true } } },
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_SERIES_CREATED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_REVIEW_SERIES,
      resourceId: created.id,
      newValue: {
        projectId,
        seriesId: created.id,
        frequency: created.frequency,
        horizonCount: created.horizonCount,
      },
      ...this.auditMeta(context),
    });

    const participants = await this.resolveParticipantLabels(clientId, userIds);
    return this.mapSeries(created, participants);
  }

  async update(
    clientId: string,
    projectId: string,
    seriesId: string,
    dto: UpdateProjectReviewSeriesDto,
    context?: AuditContext,
  ) {
    await this.projects.getProjectForScope(clientId, projectId);
    const existing = await this.prisma.projectReviewSeries.findFirst({
      where: { id: seriesId, clientId, projectId },
    });
    if (!existing) throw new NotFoundException('Série introuvable');

    let userIds: string[] | undefined;
    if (dto.permanentParticipantUserIds !== undefined) {
      userIds = [...new Set(dto.permanentParticipantUserIds)];
      await this.assertParticipantUsers(clientId, userIds);
    }

    const wasActive = existing.isActive;
    const updated = await this.prisma.projectReviewSeries.update({
      where: { id: seriesId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.reviewType !== undefined ? { reviewType: dto.reviewType } : {}),
        ...(dto.frequency !== undefined ? { frequency: dto.frequency } : {}),
        ...(dto.durationMinutes !== undefined
          ? { durationMinutes: dto.durationMinutes }
          : {}),
        ...(dto.meetingMode !== undefined
          ? { meetingMode: dto.meetingMode }
          : {}),
        ...(dto.location !== undefined
          ? { location: dto.location?.trim() || null }
          : {}),
        ...(dto.defaultObjective !== undefined
          ? { defaultObjective: dto.defaultObjective?.trim() || null }
          : {}),
        ...(userIds !== undefined
          ? { permanentParticipantUserIds: userIds }
          : {}),
        ...(dto.anchorDate !== undefined
          ? { anchorDate: new Date(dto.anchorDate) }
          : {}),
        ...(dto.horizonCount !== undefined
          ? { horizonCount: dto.horizonCount }
          : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      include: { _count: { select: { reviews: true } } },
    });

    const deactivated = wasActive && updated.isActive === false;
    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: deactivated
        ? PROJECT_AUDIT_ACTION.PROJECT_REVIEW_SERIES_DEACTIVATED
        : PROJECT_AUDIT_ACTION.PROJECT_REVIEW_SERIES_UPDATED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_REVIEW_SERIES,
      resourceId: seriesId,
      newValue: {
        projectId,
        seriesId,
        isActive: updated.isActive,
      },
      ...this.auditMeta(context),
    });

    const participants = await this.resolveParticipantLabels(
      clientId,
      parseUserIdList(updated.permanentParticipantUserIds),
    );
    return this.mapSeries(updated, participants);
  }

  async generate(
    clientId: string,
    projectId: string,
    seriesId: string,
    dto: GenerateProjectReviewSeriesDto,
    context?: AuditContext,
  ) {
    await this.projects.getProjectForScope(clientId, projectId);
    const series = await this.prisma.projectReviewSeries.findFirst({
      where: { id: seriesId, clientId, projectId },
    });
    if (!series) throw new NotFoundException('Série introuvable');
    if (!series.isActive) {
      throw new BadRequestException('Cette série est désactivée');
    }

    const targetCount = Math.min(
      12,
      Math.max(1, dto.count ?? series.horizonCount ?? 4),
    );

    const existingReviews = await this.prisma.projectReview.findMany({
      where: {
        clientId,
        projectId,
        seriesId,
        reviewDate: { not: null },
        status: { not: ProjectReviewStatus.CANCELLED },
      },
      select: { id: true, reviewDate: true },
    });
    const occupiedDays = new Set(
      existingReviews
        .filter((r) => r.reviewDate)
        .map((r) => parisCivilDayKey(r.reviewDate!)),
    );

    const todayStart = startOfTodayParis();
    const candidates: Date[] = [];
    let cursor = new Date(series.anchorDate);
    // Cap iterations to avoid infinite loops
    for (let i = 0; i < 120 && candidates.length < targetCount; i += 1) {
      if (cursor >= todayStart) {
        const dayKey = parisCivilDayKey(cursor);
        if (!occupiedDays.has(dayKey)) {
          candidates.push(new Date(cursor));
          occupiedDays.add(dayKey);
        }
      }
      cursor = addFrequencyStep(cursor, series.frequency);
    }

    const permanentIds = parseUserIdList(series.permanentParticipantUserIds);
    const participants = await this.resolveParticipantLabels(
      clientId,
      permanentIds,
    );

    const createdIds: string[] = [];
    await this.prisma.$transaction(async (tx) => {
      for (const occurrence of candidates) {
        const created = await tx.projectReview.create({
          data: {
            clientId,
            projectId,
            seriesId: series.id,
            reviewType: series.reviewType,
            status: ProjectReviewStatus.SCHEDULED,
            reviewDate: occurrence,
            durationMinutes: series.durationMinutes,
            meetingMode: series.meetingMode,
            location: series.location,
            objective: series.defaultObjective,
            title: `${series.title} — ${formatTitleDateFr(occurrence)}`,
            agendaLockedAt: null,
            createdByUserId: context?.actorUserId ?? null,
            participants: {
              create: participants.map((p) => ({
                clientId,
                userId: p.userId,
                displayName: p.displayName,
                attended: true,
                isRequired: true,
              })),
            },
          },
          select: { id: true },
        });
        createdIds.push(created.id);
      }
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_SERIES_GENERATED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_REVIEW_SERIES,
      resourceId: seriesId,
      newValue: {
        projectId,
        seriesId,
        created: createdIds.length,
        skipped: targetCount - createdIds.length,
        reviewIds: createdIds,
      },
      ...this.auditMeta(context),
    });

    const items = await this.prisma.projectReview.findMany({
      where: { id: { in: createdIds }, clientId, projectId },
      orderBy: { reviewDate: 'asc' },
    });

    return {
      created: createdIds.length,
      skipped: Math.max(0, targetCount - createdIds.length),
      items: items.map((row) => ({
        id: row.id,
        title: row.title,
        reviewDate: row.reviewDate?.toISOString() ?? null,
        reviewType: row.reviewType,
        status: row.status,
        seriesId: row.seriesId,
      })),
    };
  }
}
