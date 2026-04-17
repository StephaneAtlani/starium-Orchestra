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
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuditContext } from '../budget-management/types/audit-context';
import { CreateProjectScenarioTaskDto } from './dto/create-project-scenario-task.dto';
import { ListProjectScenarioTasksQueryDto } from './dto/list-project-scenario-tasks.query.dto';
import { UpdateProjectScenarioTaskDto } from './dto/update-project-scenario-task.dto';
import { ProjectScenarioTasksService } from './project-scenario-tasks.service';

@Controller('projects/:projectId/scenarios/:scenarioId')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class ProjectScenarioTasksController {
  constructor(private readonly tasks: ProjectScenarioTasksService) {}

  @Get('tasks')
  @RequirePermissions('projects.read')
  list(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('scenarioId') scenarioId: string,
    @Query() query: ListProjectScenarioTasksQueryDto,
  ) {
    return this.tasks.list(clientId!, projectId, scenarioId, query);
  }

  @Post('tasks')
  @RequirePermissions('projects.update')
  create(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('scenarioId') scenarioId: string,
    @Body() dto: CreateProjectScenarioTaskDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.tasks.create(clientId!, projectId, scenarioId, dto, context);
  }

  @Patch('tasks/:taskId')
  @RequirePermissions('projects.update')
  update(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('scenarioId') scenarioId: string,
    @Param('taskId') taskId: string,
    @Body() dto: UpdateProjectScenarioTaskDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.tasks.update(clientId!, projectId, scenarioId, taskId, dto, context);
  }

  @Delete('tasks/:taskId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('projects.update')
  remove(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('scenarioId') scenarioId: string,
    @Param('taskId') taskId: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.tasks.remove(clientId!, projectId, scenarioId, taskId, context);
  }

  @Post('bootstrap-from-project-plan')
  @RequirePermissions('projects.update')
  bootstrapFromProjectPlan(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('scenarioId') scenarioId: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.tasks.bootstrapFromProjectPlan(clientId!, projectId, scenarioId, context);
  }

  @Get('timeline-summary')
  @RequirePermissions('projects.read')
  getTimelineSummary(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('scenarioId') scenarioId: string,
  ) {
    return this.tasks.getTimelineSummary(clientId!, projectId, scenarioId);
  }
}
