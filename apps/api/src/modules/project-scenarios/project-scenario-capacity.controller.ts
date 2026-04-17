import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuditContext } from '../budget-management/types/audit-context';
import { ListProjectScenarioCapacityQueryDto } from './dto/list-project-scenario-capacity.query.dto';
import { ProjectScenarioCapacityService } from './project-scenario-capacity.service';

@Controller('projects/:projectId/scenarios/:scenarioId')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class ProjectScenarioCapacityController {
  constructor(private readonly capacity: ProjectScenarioCapacityService) {}

  @Post('capacity/recompute')
  @RequirePermissions('projects.update')
  recompute(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('scenarioId') scenarioId: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.capacity.recompute(clientId!, projectId, scenarioId, context);
  }

  @Get('capacity')
  @RequirePermissions('projects.read')
  list(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('scenarioId') scenarioId: string,
    @Query() query: ListProjectScenarioCapacityQueryDto,
  ) {
    return this.capacity.list(clientId!, projectId, scenarioId, query);
  }

  @Get('capacity-summary')
  @RequirePermissions('projects.read')
  getSummary(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('scenarioId') scenarioId: string,
  ) {
    return this.capacity.getSummary(clientId!, projectId, scenarioId);
  }
}
