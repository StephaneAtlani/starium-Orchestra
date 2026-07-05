import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProjectReviewParticipantAttendanceStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import type { AuditContext } from '../../budget-management/types/audit-context';
import {
  PROJECT_AUDIT_ACTION,
  PROJECT_AUDIT_RESOURCE_TYPE,
} from '../project-audit.constants';
import { ProjectsService } from '../projects.service';
import { formatProjectReviewUserDisplayName } from './project-review-user-display';
import { assertReviewParticipantsEditable } from './project-review-status.helpers';
import { CreateProjectReviewParticipantDto } from './dto/create-participant.dto';
import { UpdateProjectReviewParticipantDto } from './dto/update-participant.dto';
import { normalizeExternalEmail } from './project-review-invitation-privacy.helpers';

function syncLegacyAttended(
  attendanceStatus: ProjectReviewParticipantAttendanceStatus,
): boolean {
  return attendanceStatus === ProjectReviewParticipantAttendanceStatus.PRESENT;
}

@Injectable()
export class ProjectReviewParticipantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  private async loadReview(
    clientId: string,
    projectId: string,
    reviewId: string,
  ) {
    await this.projects.getProjectForScope(clientId, projectId);
    const review = await this.prisma.projectReview.findFirst({
      where: { id: reviewId, clientId, projectId },
    });
    if (!review) throw new NotFoundException('Review not found');
    return review;
  }

  private auditMeta(context?: AuditContext) {
    return {
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    };
  }

  private mapParticipant(row: {
    id: string;
    userId: string | null;
    displayName: string | null;
    roleLabel: string | null;
    attendanceStatus: ProjectReviewParticipantAttendanceStatus;
    invitedAt?: Date | null;
    lastInvitedAt?: Date | null;
    externalEmail?: string | null;
    lastEmailedAt?: Date | null;
    user?: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      email: string;
    } | null;
  }) {
    const userDisplayName = formatProjectReviewUserDisplayName(row.user);
    return {
      id: row.id,
      userId: row.userId,
      displayName: row.displayName ?? userDisplayName,
      roleLabel: row.roleLabel,
      attendanceStatus: row.attendanceStatus,
      invitedAt: row.invitedAt?.toISOString() ?? null,
      lastInvitedAt: row.lastInvitedAt?.toISOString() ?? null,
      externalEmail: row.externalEmail ?? null,
      lastEmailedAt: row.lastEmailedAt?.toISOString() ?? null,
    };
  }

  private assertExternalEmailRules(
    userId?: string | null,
    externalEmail?: string | null,
  ): string | null {
    const normalized =
      externalEmail?.trim()
        ? normalizeExternalEmail(externalEmail)
        : null;
    if (normalized && userId?.trim()) {
      throw new BadRequestException(
        'externalEmail est réservé aux participants externes',
      );
    }
    return normalized;
  }

  private assertParticipantIdentity(
    userId?: string | null,
    displayName?: string | null,
  ): void {
    const hasUser = (userId?.trim() ?? '') !== '';
    const hasName = (displayName?.trim() ?? '') !== '';
    if (!hasUser && !hasName) {
      throw new BadRequestException(
        'Un participant interne (userId) ou externe (displayName) est requis',
      );
    }
  }

  async create(
    clientId: string,
    projectId: string,
    reviewId: string,
    dto: CreateProjectReviewParticipantDto,
    context?: AuditContext,
  ) {
    const review = await this.loadReview(clientId, projectId, reviewId);
    assertReviewParticipantsEditable(review.status);

    this.assertParticipantIdentity(dto.userId, dto.displayName);
    const externalEmail = this.assertExternalEmailRules(
      dto.userId,
      dto.externalEmail,
    );
    if (dto.userId) {
      await this.projects.assertClientUser(clientId, dto.userId);
    }

    const attendanceStatus =
      dto.attendanceStatus ??
      ProjectReviewParticipantAttendanceStatus.EXPECTED;

    const created = await this.prisma.projectReviewParticipant.create({
      data: {
        clientId,
        projectReviewId: reviewId,
        userId: dto.userId ?? null,
        displayName: dto.displayName?.trim() ?? null,
        roleLabel: dto.roleLabel?.trim() ?? null,
        externalEmail,
        attendanceStatus,
        attended: syncLegacyAttended(attendanceStatus),
      },
      include: { user: true },
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_PARTICIPANT_ADDED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_REVIEW_PARTICIPANT,
      resourceId: created.id,
      newValue: {
        projectId,
        reviewId,
        displayName: created.displayName,
        attendanceStatus: created.attendanceStatus,
      },
      ...this.auditMeta(context),
    });

    return this.mapParticipant(created);
  }

  async update(
    clientId: string,
    projectId: string,
    reviewId: string,
    participantId: string,
    dto: UpdateProjectReviewParticipantDto,
    context?: AuditContext,
  ) {
    const review = await this.loadReview(clientId, projectId, reviewId);
    assertReviewParticipantsEditable(review.status);

    const existing = await this.prisma.projectReviewParticipant.findFirst({
      where: { id: participantId, clientId, projectReviewId: reviewId },
      include: { user: true },
    });
    if (!existing) throw new NotFoundException('Participant not found');

    if (dto.userId) {
      await this.projects.assertClientUser(clientId, dto.userId);
    }

    const effectiveUserId =
      dto.userId !== undefined ? dto.userId : existing.userId;
    const effectiveDisplayName =
      dto.displayName !== undefined ? dto.displayName : existing.displayName;
    this.assertParticipantIdentity(effectiveUserId, effectiveDisplayName);

    const externalEmail =
      dto.externalEmail !== undefined
        ? this.assertExternalEmailRules(effectiveUserId, dto.externalEmail)
        : undefined;

    const attendanceStatus =
      dto.attendanceStatus ?? existing.attendanceStatus;

    const updated = await this.prisma.projectReviewParticipant.update({
      where: { id: existing.id },
      data: {
        userId: dto.userId !== undefined ? dto.userId : undefined,
        displayName:
          dto.displayName !== undefined
            ? dto.displayName?.trim() ?? null
            : undefined,
        roleLabel:
          dto.roleLabel !== undefined
            ? dto.roleLabel?.trim() ?? null
            : undefined,
        externalEmail,
        attendanceStatus,
        attended: syncLegacyAttended(attendanceStatus),
      },
      include: { user: true },
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_PARTICIPANT_UPDATED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_REVIEW_PARTICIPANT,
      resourceId: updated.id,
      newValue: {
        projectId,
        reviewId,
        attendanceStatus: updated.attendanceStatus,
      },
      ...this.auditMeta(context),
    });

    return this.mapParticipant(updated);
  }

  async remove(
    clientId: string,
    projectId: string,
    reviewId: string,
    participantId: string,
    context?: AuditContext,
  ) {
    const review = await this.loadReview(clientId, projectId, reviewId);
    assertReviewParticipantsEditable(review.status);

    const existing = await this.prisma.projectReviewParticipant.findFirst({
      where: { id: participantId, clientId, projectReviewId: reviewId },
    });
    if (!existing) throw new NotFoundException('Participant not found');

    await this.prisma.projectReviewParticipant.delete({
      where: { id: existing.id },
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_PARTICIPANT_REMOVED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_REVIEW_PARTICIPANT,
      resourceId: existing.id,
      newValue: { projectId, reviewId },
      ...this.auditMeta(context),
    });

    return { ok: true };
  }
}
