import { BadRequestException, Injectable } from '@nestjs/common';
import { ProjectReviewStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AccessDecisionService } from '../access-decision/access-decision.service';
import type { RequestWithClient } from '../../common/types/request-with-client';
import type {
  GovernanceCalendarEventDto,
  GovernanceCalendarEventsResponseDto,
} from './governance-calendar.types';
import {
  cycleInstanceCalendarTitle,
  filterEventsByAuthorizedProjectIds,
  parseCalendarRange,
  projectReviewCalendarTitle,
  projectReviewTypeLabel,
} from './lib/governance-calendar.util';

@Injectable()
export class GovernanceCalendarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessDecision: AccessDecisionService,
  ) {}

  async listCalendarEvents(
    clientId: string,
    userId: string,
    query: { from: string; to: string },
  ): Promise<GovernanceCalendarEventsResponseDto> {
    const range = parseCalendarRange(query.from, query.to);
    if ('error' in range) {
      throw new BadRequestException(range.error);
    }
    const { from, to } = range;

    const [reviews, instances] = await Promise.all([
      this.prisma.projectReview.findMany({
        where: {
          clientId,
          reviewDate: { gte: from, lte: to },
          status: { not: ProjectReviewStatus.CANCELLED },
        },
        select: {
          id: true,
          projectId: true,
          reviewDate: true,
          reviewType: true,
          title: true,
          project: { select: { id: true, name: true } },
        },
        orderBy: { reviewDate: 'asc' },
      }),
      this.prisma.governanceCycleInstance.findMany({
        where: {
          clientId,
          scheduledDecisionAt: { gte: from, lte: to },
          cycle: { clientId },
        },
        select: {
          id: true,
          cycleId: true,
          label: true,
          periodLabel: true,
          scheduledDecisionAt: true,
          cycle: { select: { id: true, name: true, clientId: true } },
        },
        orderBy: { scheduledDecisionAt: 'asc' },
      }),
    ]);

    const reviewProjectIds = [...new Set(reviews.map((r) => r.projectId))];
    const authorizedProjectIds = new Set(
      reviewProjectIds.length === 0
        ? []
        : await this.accessDecision.filterResourceIdsByAccess({
            request: {} as RequestWithClient,
            clientId,
            userId,
            resourceType: 'PROJECT',
            resourceIds: reviewProjectIds,
            intent: 'list',
          }),
    );

    const reviewEvents: GovernanceCalendarEventDto[] = reviews.map((row) => {
      const projectName = row.project?.name?.trim() || null;
      const typeLabel = projectReviewTypeLabel(row.reviewType);
      return {
        id: row.id,
        kind: 'PROJECT_REVIEW' as const,
        title: projectReviewCalendarTitle({
          title: row.title,
          reviewType: row.reviewType,
          projectName,
        }),
        date: row.reviewDate!.toISOString(),
        projectId: row.projectId,
        projectName,
        reviewType: row.reviewType,
        reviewTypeLabel: typeLabel,
        cycleId: null,
        cycleName: null,
        href: `/projects/${row.projectId}/reviews/${row.id}`,
      };
    });

    const instanceEvents: GovernanceCalendarEventDto[] = instances
      .filter((row) => row.cycle.clientId === clientId)
      .map((row) => {
        const cycleName = row.cycle.name?.trim() || null;
        return {
          id: row.id,
          kind: 'CYCLE_INSTANCE' as const,
          title: cycleInstanceCalendarTitle({
            label: row.label,
            periodLabel: row.periodLabel,
            cycleName,
          }),
          date: row.scheduledDecisionAt!.toISOString(),
          projectId: null,
          projectName: null,
          reviewType: null,
          reviewTypeLabel: null,
          cycleId: row.cycleId,
          cycleName,
          href: `/cycles/${row.cycleId}`,
        };
      });

    const items = filterEventsByAuthorizedProjectIds(
      [...reviewEvents, ...instanceEvents],
      authorizedProjectIds,
    ).sort((a, b) => a.date.localeCompare(b.date));

    return { items };
  }
}
