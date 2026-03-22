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
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import type { AuditContext } from '../budget-management/types/audit-context';
import { CreateProjectTaskDto } from './dto/create-project-task.dto';
import { ListProjectTasksQueryDto } from './dto/list-project-tasks.query.dto';
import { UpdateProjectTaskDto } from './dto/update-project-task.dto';
import { ProjectTasksService } from './project-tasks.service';

@Controller('projects/:projectId/tasks')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class ProjectTasksController {
  constructor(private readonly tasksService: ProjectTasksService) {}

  @Get()
  @RequirePermissions('projects.read')
  list(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Query() query: ListProjectTasksQueryDto,
  ) {
    return this.tasksService.list(clientId!, projectId, query);
  }

  @Post()
  @RequirePermissions('projects.update')
  create(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Body() dto: CreateProjectTaskDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.tasksService.create(clientId!, projectId, dto, context, actorUserId);
  }

  @Get(':id')
  @RequirePermissions('projects.read')
  getOne(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    return this.tasksService.getOne(clientId!, projectId, id);
  }

  @Patch(':id')
  @RequirePermissions('projects.update')
  update(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProjectTaskDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.tasksService.update(clientId!, projectId, id, dto, context, actorUserId);
  }
}
