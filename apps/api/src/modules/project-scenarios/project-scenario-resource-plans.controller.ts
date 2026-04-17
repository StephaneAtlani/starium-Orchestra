import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import type { AuditContext } from '../budget-management/types/audit-context';
import { CreateProjectScenarioResourcePlanDto } from './dto/create-project-scenario-resource-plan.dto';
import { ListProjectScenarioResourcePlansQueryDto } from './dto/list-project-scenario-resource-plans.query.dto';
import { UpdateProjectScenarioResourcePlanDto } from './dto/update-project-scenario-resource-plan.dto';
import { ProjectScenarioResourcePlansService } from './project-scenario-resource-plans.service';

@Controller('projects/:projectId/scenarios/:scenarioId')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class ProjectScenarioResourcePlansController {
  constructor(private readonly resourcePlans: ProjectScenarioResourcePlansService) {}

  @Get('resource-plans')
  @RequirePermissions('projects.read')
  list(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('scenarioId') scenarioId: string,
    @Query() query: ListProjectScenarioResourcePlansQueryDto,
  ) {
    return this.resourcePlans.list(clientId!, projectId, scenarioId, query);
  }

  @Post('resource-plans')
  @RequirePermissions('projects.update')
  create(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('scenarioId') scenarioId: string,
    @Body() dto: CreateProjectScenarioResourcePlanDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.resourcePlans.create(clientId!, projectId, scenarioId, dto, context);
  }

  @Patch('resource-plans/:planId')
  @RequirePermissions('projects.update')
  update(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('scenarioId') scenarioId: string,
    @Param('planId') planId: string,
    @Body() dto: UpdateProjectScenarioResourcePlanDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.resourcePlans.update(clientId!, projectId, scenarioId, planId, dto, context);
  }

  @Delete('resource-plans/:planId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('projects.update')
  remove(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('scenarioId') scenarioId: string,
    @Param('planId') planId: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.resourcePlans.remove(clientId!, projectId, scenarioId, planId, context);
  }

  @Get('resource-summary')
  @RequirePermissions('projects.read')
  getSummary(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('scenarioId') scenarioId: string,
  ) {
    return this.resourcePlans.getSummary(clientId!, projectId, scenarioId);
  }
}
