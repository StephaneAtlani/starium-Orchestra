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
import { CreateProjectReviewAgendaItemDto } from './dto/create-agenda-item.dto';
import { ReorderProjectReviewAgendaItemsDto } from './dto/reorder-agenda-items.dto';
import { UpdateProjectReviewAgendaItemDto } from './dto/update-agenda-item.dto';
import { ProjectReviewAgendaService } from './project-review-agenda.service';

@Controller('projects/:projectId/reviews/:reviewId/agenda-items')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class ProjectReviewAgendaController {
  constructor(private readonly agendaService: ProjectReviewAgendaService) {}

  @Post()
  @RequirePermissions('projects.update')
  create(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('reviewId') reviewId: string,
    @Body() dto: CreateProjectReviewAgendaItemDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.agendaService.create(
      clientId!,
      projectId,
      reviewId,
      dto,
      context,
    );
  }

  @Patch('reorder')
  @RequirePermissions('projects.update')
  reorder(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('reviewId') reviewId: string,
    @Body() dto: ReorderProjectReviewAgendaItemsDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.agendaService.reorder(
      clientId!,
      projectId,
      reviewId,
      dto,
      context,
    );
  }

  @Patch(':agendaItemId')
  @RequirePermissions('projects.update')
  update(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('reviewId') reviewId: string,
    @Param('agendaItemId') agendaItemId: string,
    @Body() dto: UpdateProjectReviewAgendaItemDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.agendaService.update(
      clientId!,
      projectId,
      reviewId,
      agendaItemId,
      dto,
      context,
    );
  }

  @Post(':agendaItemId/start')
  @RequirePermissions('projects.update')
  start(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('reviewId') reviewId: string,
    @Param('agendaItemId') agendaItemId: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.agendaService.start(
      clientId!,
      projectId,
      reviewId,
      agendaItemId,
      context,
    );
  }

  @Post(':agendaItemId/complete')
  @RequirePermissions('projects.update')
  complete(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('reviewId') reviewId: string,
    @Param('agendaItemId') agendaItemId: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.agendaService.complete(
      clientId!,
      projectId,
      reviewId,
      agendaItemId,
      context,
    );
  }

  @Post(':agendaItemId/skip')
  @RequirePermissions('projects.update')
  skip(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('reviewId') reviewId: string,
    @Param('agendaItemId') agendaItemId: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.agendaService.skip(
      clientId!,
      projectId,
      reviewId,
      agendaItemId,
      context,
    );
  }
}
