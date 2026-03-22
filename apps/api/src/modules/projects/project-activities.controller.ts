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
import { CreateProjectActivityDto } from './dto/create-project-activity.dto';
import { ListProjectActivitiesQueryDto } from './dto/list-project-activities.query.dto';
import { UpdateProjectActivityDto } from './dto/update-project-activity.dto';
import { ProjectActivitiesService } from './project-activities.service';

@Controller('projects/:projectId/activities')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class ProjectActivitiesController {
  constructor(private readonly activitiesService: ProjectActivitiesService) {}

  @Get()
  @RequirePermissions('projects.read')
  list(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Query() query: ListProjectActivitiesQueryDto,
  ) {
    return this.activitiesService.list(clientId!, projectId, query);
  }

  @Post()
  @RequirePermissions('projects.update')
  create(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Body() dto: CreateProjectActivityDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.activitiesService.create(clientId!, projectId, dto, context, actorUserId);
  }

  @Get(':id')
  @RequirePermissions('projects.read')
  getOne(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    return this.activitiesService.getOne(clientId!, projectId, id);
  }

  @Patch(':id')
  @RequirePermissions('projects.update')
  update(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProjectActivityDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.activitiesService.update(clientId!, projectId, id, dto, context, actorUserId);
  }
}
