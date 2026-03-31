import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { MicrosoftIntegrationAccessGuard } from '../../common/guards/microsoft-integration-access.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import type { AuditContext } from '../budget-management/types/audit-context';
import { UpdateProjectMicrosoftLinkDto } from './dto/update-project-microsoft-link.dto';
import { ProjectMicrosoftLinksService } from './project-microsoft-links.service';

@Controller('projects/:projectId/microsoft-link')
@UseGuards(JwtAuthGuard, ActiveClientGuard, MicrosoftIntegrationAccessGuard)
export class ProjectMicrosoftLinksController {
  constructor(
    private readonly microsoftLinks: ProjectMicrosoftLinksService,
  ) {}

  @Get()
  @RequirePermissions('projects.read')
  getConfig(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
  ) {
    return this.microsoftLinks.getConfig(clientId!, projectId);
  }

  @Put()
  @RequirePermissions('projects.update')
  upsertConfig(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Body() dto: UpdateProjectMicrosoftLinkDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.microsoftLinks.upsertConfig(clientId!, projectId, dto, context);
  }

  @Post('sync-tasks')
  @RequirePermissions('projects.update')
  syncTasks(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.microsoftLinks.syncTasks(clientId!, projectId, context);
  }

  @Post('sync-documents')
  @RequirePermissions('projects.update')
  syncDocuments(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.microsoftLinks.syncDocuments(clientId!, projectId, context);
  }
}

