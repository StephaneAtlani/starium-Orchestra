import {
  Body,
  Controller,
  Delete,
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
import { CreateProjectReviewParticipantDto } from './dto/create-participant.dto';
import { UpdateProjectReviewParticipantDto } from './dto/update-participant.dto';
import { ProjectReviewParticipantsService } from './project-review-participants.service';

@Controller('projects/:projectId/reviews/:reviewId/participants')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class ProjectReviewParticipantsController {
  constructor(
    private readonly participantsService: ProjectReviewParticipantsService,
  ) {}

  @Post()
  @RequirePermissions('projects.update')
  create(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('reviewId') reviewId: string,
    @Body() dto: CreateProjectReviewParticipantDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.participantsService.create(
      clientId!,
      projectId,
      reviewId,
      dto,
      context,
    );
  }

  @Patch(':participantId')
  @RequirePermissions('projects.update')
  update(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('reviewId') reviewId: string,
    @Param('participantId') participantId: string,
    @Body() dto: UpdateProjectReviewParticipantDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.participantsService.update(
      clientId!,
      projectId,
      reviewId,
      participantId,
      dto,
      context,
    );
  }

  @Delete(':participantId')
  @RequirePermissions('projects.update')
  remove(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('reviewId') reviewId: string,
    @Param('participantId') participantId: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.participantsService.remove(
      clientId!,
      projectId,
      reviewId,
      participantId,
      context,
    );
  }
}
