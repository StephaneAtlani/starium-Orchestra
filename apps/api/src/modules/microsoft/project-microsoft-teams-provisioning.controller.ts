import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { AccessDecision } from '../../common/decorators/access-decision.decorator';
import { RequireAccessIntent } from '../../common/decorators/require-access-intent.decorator';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { MicrosoftIntegrationAccessGuard } from '../../common/guards/microsoft-integration-access.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ResourceAccessDecisionGuard } from '../access-decision/resource-access-decision.guard';
import type { AuditContext } from '../budget-management/types/audit-context';
import { ResolveProjectMicrosoftTeamsProvisioningDto } from './dto/resolve-project-microsoft-teams-provisioning.dto';
import { ProjectMicrosoftTeamsProvisioningService } from './project-microsoft-teams-provisioning.service';

@Controller('projects/:projectId/microsoft-teams')
@UseGuards(
  JwtAuthGuard,
  ActiveClientGuard,
  ModuleAccessGuard,
  PermissionsGuard,
  MicrosoftIntegrationAccessGuard,
  ResourceAccessDecisionGuard,
)
export class ProjectMicrosoftTeamsProvisioningController {
  constructor(
    private readonly provisioningService: ProjectMicrosoftTeamsProvisioningService,
  ) {}

  @Get('provision')
  @RequireAccessIntent({ module: 'projects', intent: 'read' })
  @AccessDecision({ resourceType: 'PROJECT', resourceIdParam: 'projectId', intent: 'read' })
  getLatest(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
  ) {
    return this.provisioningService.getLatestProvisioning(clientId!, projectId);
  }

  @Post('provision')
  @RequireAccessIntent({ module: 'projects', intent: 'write' })
  @AccessDecision({ resourceType: 'PROJECT', resourceIdParam: 'projectId', intent: 'write' })
  createProvisioning(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.provisioningService.startProvisioning(
      clientId!,
      projectId,
      actorUserId,
      context,
    );
  }

  @Post('provision/:provisioningId/retry')
  @RequireAccessIntent({ module: 'projects', intent: 'write' })
  @AccessDecision({ resourceType: 'PROJECT', resourceIdParam: 'projectId', intent: 'write' })
  retryProvisioning(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('provisioningId') provisioningId: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.provisioningService.retryProvisioning(
      clientId!,
      projectId,
      provisioningId,
      actorUserId,
      context,
    );
  }

  @Post('provision/:provisioningId/resolve-unknown')
  @RequireAccessIntent({ module: 'projects', intent: 'write' })
  @AccessDecision({ resourceType: 'PROJECT', resourceIdParam: 'projectId', intent: 'write' })
  resolveUnknown(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('provisioningId') provisioningId: string,
    @Body() dto: ResolveProjectMicrosoftTeamsProvisioningDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.provisioningService.resolveUnknown(
      clientId!,
      projectId,
      provisioningId,
      dto,
      actorUserId,
      context,
    );
  }
}
