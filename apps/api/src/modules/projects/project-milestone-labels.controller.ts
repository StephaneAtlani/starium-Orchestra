import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { CreateProjectMilestoneLabelDto } from './dto/create-project-milestone-label.dto';
import { ProjectMilestoneLabelsService } from './project-milestone-labels.service';
import type { ProjectMilestoneLabel } from '@prisma/client';

@Controller('projects/:projectId/milestone-labels')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class ProjectMilestoneLabelsController {
  constructor(private readonly labels: ProjectMilestoneLabelsService) {}

  @Get()
  @RequirePermissions('projects.read')
  list(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
  ): Promise<ProjectMilestoneLabel[]> {
    return this.labels.list(clientId!, projectId);
  }

  @Post()
  @RequirePermissions('projects.update')
  create(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Body() dto: CreateProjectMilestoneLabelDto,
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

