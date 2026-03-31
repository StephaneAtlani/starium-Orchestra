import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateProjectTaskPhaseDto } from './dto/create-project-task-phase.dto';
import { ReorderProjectTaskPhasesDto } from './dto/reorder-project-task-phases.dto';
import { UpdateProjectTaskPhaseDto } from './dto/update-project-task-phase.dto';
import { ProjectTaskPhasesService } from './project-task-phases.service';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import { RequestUserId } from '../../common/decorators/request-user.decorator';

@Controller('projects/:projectId/task-phases')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class ProjectTaskPhasesController {
  constructor(private readonly phases: ProjectTaskPhasesService) {}

  @Get()
  @RequirePermissions('projects.read')
  list(@ActiveClientId() clientId: string | undefined, @Param('projectId') projectId: string) {
    return this.phases.list(clientId!, projectId);
  }

  @Post()
  @RequirePermissions('projects.update')
  create(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Body() dto: CreateProjectTaskPhaseDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.phases.create(clientId!, projectId, dto, actorUserId, meta);
  }

  @Patch(':phaseId')
  @RequirePermissions('projects.update')
  update(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('phaseId') phaseId: string,
    @Body() dto: UpdateProjectTaskPhaseDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.phases.update(clientId!, projectId, phaseId, dto, actorUserId, meta);
  }

  @Post('reorder')
  @RequirePermissions('projects.update')
  reorder(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Body() dto: ReorderProjectTaskPhasesDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.phases.reorder(clientId!, projectId, dto, actorUserId, meta);
  }

  @Delete(':phaseId')
  @RequirePermissions('projects.update')
  remove(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('phaseId') phaseId: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.phases.delete(clientId!, projectId, phaseId, actorUserId, meta);
  }
}
