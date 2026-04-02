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
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateProjectResourceAssignmentDto } from '../team-assignments/dto/create-project-resource-assignment.dto';
import { ListProjectResourceAssignmentsQueryDto } from '../team-assignments/dto/list-project-resource-assignments.query.dto';
import { UpdateProjectResourceAssignmentDto } from '../team-assignments/dto/update-project-resource-assignment.dto';
import { TeamAssignmentsService } from '../team-assignments/team-assignments.service';

/**
 * RFC-TEAM-008 — staffing depuis le contexte projet. RBAC : module `team_assignments` uniquement.
 * Ordre des handlers : GET list → POST create → POST cancel → GET detail → PATCH update.
 */
@Controller('projects/:projectId/resource-assignments')
@UseGuards(
  JwtAuthGuard,
  ActiveClientGuard,
  ModuleAccessGuard,
  PermissionsGuard,
)
export class ProjectResourceAssignmentsController {
  constructor(private readonly teamAssignments: TeamAssignmentsService) {}

  @Get()
  @RequirePermissions('team_assignments.read')
  list(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Query() query: ListProjectResourceAssignmentsQueryDto,
  ) {
    return this.teamAssignments.listForProject(clientId!, projectId, query);
  }

  @Post()
  @RequirePermissions('team_assignments.manage')
  create(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Body() dto: CreateProjectResourceAssignmentDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.teamAssignments.createForProject(
      clientId!,
      projectId,
      dto,
      actorUserId,
      meta,
    );
  }

  @Post(':assignmentId/cancel')
  @RequirePermissions('team_assignments.manage')
  cancel(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('assignmentId') assignmentId: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.teamAssignments.cancelForProject(
      clientId!,
      projectId,
      assignmentId,
      actorUserId,
      meta,
    );
  }

  @Get(':assignmentId')
  @RequirePermissions('team_assignments.read')
  getById(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('assignmentId') assignmentId: string,
  ) {
    return this.teamAssignments.getByIdForProject(
      clientId!,
      projectId,
      assignmentId,
    );
  }

  @Patch(':assignmentId')
  @RequirePermissions('team_assignments.manage')
  update(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('assignmentId') assignmentId: string,
    @Body() dto: UpdateProjectResourceAssignmentDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.teamAssignments.updateForProject(
      clientId!,
      projectId,
      assignmentId,
      dto,
      actorUserId,
      meta,
    );
  }
}
