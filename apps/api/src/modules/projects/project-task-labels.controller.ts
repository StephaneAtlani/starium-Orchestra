import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { CreateProjectTaskLabelDto } from './dto/create-project-task-label.dto';
import { ProjectTaskLabelsService } from './project-task-labels.service';
import type { ProjectTaskLabel } from '@prisma/client';

@Controller('projects/:projectId/task-labels')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class ProjectTaskLabelsController {
  constructor(private readonly labels: ProjectTaskLabelsService) {}

  @Get()
  @RequirePermissions('projects.read')
  list(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
  ): Promise<ProjectTaskLabel[]> {
    return this.labels.list(clientId!, projectId);
  }

  @Post()
  @RequirePermissions('projects.update')
  create(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Body() dto: CreateProjectTaskLabelDto,
  ) {
    return this.labels.create(clientId!, projectId, dto);
  }

  @Delete(':labelId')
  @RequirePermissions('projects.update')
  remove(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('labelId') labelId: string,
  ) {
    return this.labels.delete(clientId!, projectId, labelId);
  }
}

