import {
  Body,
  Controller,
  Get,
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
import { CreateProjectScenarioDto } from './dto/create-project-scenario.dto';
import { ListProjectScenariosQueryDto } from './dto/list-project-scenarios.query.dto';
import { SelectProjectScenarioDto } from './dto/select-project-scenario.dto';
import { UpdateProjectScenarioDto } from './dto/update-project-scenario.dto';
import { ProjectScenariosService } from './project-scenarios.service';

@Controller('projects/:projectId/scenarios')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class ProjectScenariosController {
  constructor(private readonly scenarios: ProjectScenariosService) {}

  @Get()
  @RequirePermissions('projects.read')
  list(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Query() query: ListProjectScenariosQueryDto,
  ) {
    return this.scenarios.list(clientId!, projectId, query);
  }

  @Get(':scenarioId')
  @RequirePermissions('projects.read')
  getOne(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('scenarioId') scenarioId: string,
  ) {
    return this.scenarios.getOne(clientId!, projectId, scenarioId);
  }

  @Post()
  @RequirePermissions('projects.update')
  create(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Body() dto: CreateProjectScenarioDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.scenarios.create(clientId!, projectId, dto, context);
  }

  @Patch(':scenarioId')
  @RequirePermissions('projects.update')
  update(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('scenarioId') scenarioId: string,
    @Body() dto: UpdateProjectScenarioDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.scenarios.update(clientId!, projectId, scenarioId, dto, context);
  }

  @Post(':scenarioId/duplicate')
  @RequirePermissions('projects.update')
  duplicate(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('scenarioId') scenarioId: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.scenarios.duplicate(clientId!, projectId, scenarioId, context);
  }

  @Post(':scenarioId/select')
  @RequirePermissions('projects.update')
  select(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('scenarioId') scenarioId: string,
    @Body() _dto: Record<string, never>,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.scenarios.select(clientId!, projectId, scenarioId, context);
  }

  @Post(':scenarioId/select-and-transition')
  @RequirePermissions('projects.update')
  selectAndTransition(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('scenarioId') scenarioId: string,
    @Body() dto: SelectProjectScenarioDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.scenarios.selectAndTransition(clientId!, projectId, scenarioId, dto, context);
  }

  @Post(':scenarioId/archive')
  @RequirePermissions('projects.update')
  archive(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('scenarioId') scenarioId: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.scenarios.archive(clientId!, projectId, scenarioId, context);
  }
}
