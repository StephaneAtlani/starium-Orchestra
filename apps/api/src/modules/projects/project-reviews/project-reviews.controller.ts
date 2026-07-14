import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { ActiveClientId } from '../../../common/decorators/active-client.decorator';
import { RequestUserId } from '../../../common/decorators/request-user.decorator';
import { RequestMeta } from '../../../common/decorators/request-meta.decorator';
import type { AuditContext } from '../../budget-management/types/audit-context';
import { CreateProjectReviewDto } from './dto/create-project-review.dto';
import { UpdateProjectReviewDto } from './dto/update-project-review.dto';
import { ScheduleProjectReviewDto } from './dto/schedule-project-review.dto';
import { InviteProjectReviewDto } from './dto/invite-project-review.dto';
import { ProjectReviewsService } from './project-reviews.service';
import { ProjectReviewInvitationsService } from './project-review-invitations.service';

@Controller('projects/:projectId/reviews')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class ProjectReviewsController {
  constructor(
    private readonly projectReviewsService: ProjectReviewsService,
    private readonly projectReviewInvitationsService: ProjectReviewInvitationsService,
  ) {}

  @Get()
  @RequirePermissions('projects.read')
  list(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
  ) {
    return this.projectReviewsService.list(clientId!, projectId);
  }

  @Get(':reviewId')
  @RequirePermissions('projects.read')
  getById(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('reviewId') reviewId: string,
  ) {
    return this.projectReviewsService.getById(clientId!, projectId, reviewId);
  }

  @Post()
  @RequirePermissions('projects.update')
  create(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Body() dto: CreateProjectReviewDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.projectReviewsService.create(clientId!, projectId, dto, context);
  }

  @Patch(':reviewId')
  @RequirePermissions('projects.update')
  update(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('reviewId') reviewId: string,
    @Body() dto: UpdateProjectReviewDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.projectReviewsService.update(
      clientId!,
      projectId,
      reviewId,
      dto,
      context,
    );
  }

  @Post(':reviewId/schedule')
  @RequirePermissions('projects.update')
  schedule(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('reviewId') reviewId: string,
    @Body() dto: ScheduleProjectReviewDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.projectReviewsService.schedule(
      clientId!,
      projectId,
      reviewId,
      dto,
      context,
    );
  }

  @Post(':reviewId/start')
  @RequirePermissions('projects.update')
  start(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('reviewId') reviewId: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.projectReviewsService.start(
      clientId!,
      projectId,
      reviewId,
      context,
    );
  }

  @Post(':reviewId/start-review')
  @RequirePermissions('projects.update')
  startReview(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('reviewId') reviewId: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.projectReviewsService.startReview(
      clientId!,
      projectId,
      reviewId,
      context,
    );
  }

  @Post(':reviewId/finalize')
  @RequirePermissions('projects.update')
  finalize(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('reviewId') reviewId: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.projectReviewsService.finalize(
      clientId!,
      projectId,
      reviewId,
      context,
    );
  }

  @Post(':reviewId/cancel')
  @RequirePermissions('projects.update')
  cancel(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('reviewId') reviewId: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.projectReviewsService.cancel(
      clientId!,
      projectId,
      reviewId,
      context,
    );
  }

  @Post(':reviewId/reopen')
  @RequirePermissions('projects.update')
  reopen(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('reviewId') reviewId: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.projectReviewsService.reopen(
      clientId!,
      projectId,
      reviewId,
      context,
    );
  }

  @Post(':reviewId/invite')
  @RequirePermissions('projects.update')
  invite(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('reviewId') reviewId: string,
    @Body() dto: InviteProjectReviewDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.projectReviewInvitationsService.invite(
      clientId!,
      projectId,
      reviewId,
      context,
      {
        trigger: 'manual',
        participantIds: dto.participantIds,
        channels: dto.channels,
        meetingOptions: {
          createTeamsMeeting: dto.createTeamsMeeting,
          createCalendarEvent: dto.createCalendarEvent,
          forceOverwriteMeetingUrl: dto.forceOverwriteMeetingUrl,
        },
      },
    );
  }

  @Get(':reviewId/report-preview')
  @RequirePermissions('projects.read')
  reportPreview(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('reviewId') reviewId: string,
  ) {
    return this.projectReviewsService.getReportPreview(
      clientId!,
      projectId,
      reviewId,
    );
  }

  @Post(':reviewId/send-report')
  @RequirePermissions('projects.update')
  sendReport(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('reviewId') reviewId: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.projectReviewsService.sendReport(
      clientId!,
      projectId,
      reviewId,
      context,
    );
  }
}
