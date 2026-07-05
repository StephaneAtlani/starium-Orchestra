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
import { CreateProjectReviewAttachmentDto } from './dto/create-project-review-attachment.dto';
import { UpdateProjectReviewAttachmentDto } from './dto/update-project-review-attachment.dto';
import { ProjectReviewAttachmentsService } from './project-review-attachments.service';

@Controller('projects/:projectId/reviews/:reviewId/attachments')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class ProjectReviewAttachmentsController {
  constructor(
    private readonly attachmentsService: ProjectReviewAttachmentsService,
  ) {}

  @Post()
  @RequirePermissions('projects.update')
  create(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('reviewId') reviewId: string,
    @Body() dto: CreateProjectReviewAttachmentDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.attachmentsService.create(
      clientId!,
      projectId,
      reviewId,
      dto,
      context,
    );
  }

  @Patch(':attachmentId')
  @RequirePermissions('projects.update')
  update(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('reviewId') reviewId: string,
    @Param('attachmentId') attachmentId: string,
    @Body() dto: UpdateProjectReviewAttachmentDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.attachmentsService.update(
      clientId!,
      projectId,
      reviewId,
      attachmentId,
      dto,
      context,
    );
  }

  @Delete(':attachmentId')
  @RequirePermissions('projects.update')
  remove(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('reviewId') reviewId: string,
    @Param('attachmentId') attachmentId: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.attachmentsService.remove(
      clientId!,
      projectId,
      reviewId,
      attachmentId,
      context,
    );
  }
}
