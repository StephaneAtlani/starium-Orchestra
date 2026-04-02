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
import { CreateTeamResourceAssignmentDto } from './dto/create-team-resource-assignment.dto';
import { ListTeamResourceAssignmentsQueryDto } from './dto/list-team-resource-assignments.query.dto';
import { UpdateTeamResourceAssignmentDto } from './dto/update-team-resource-assignment.dto';
import { TeamAssignmentsService } from './team-assignments.service';

@Controller('team-resource-assignments')
@UseGuards(
  JwtAuthGuard,
  ActiveClientGuard,
  ModuleAccessGuard,
  PermissionsGuard,
)
export class TeamAssignmentsController {
  constructor(private readonly teamAssignments: TeamAssignmentsService) {}

  @Get()
  @RequirePermissions('team_assignments.read')
  list(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: ListTeamResourceAssignmentsQueryDto,
  ) {
    return this.teamAssignments.list(clientId!, query);
  }

  @Post()
  @RequirePermissions('team_assignments.manage')
  create(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: CreateTeamResourceAssignmentDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.teamAssignments.create(clientId!, dto, actorUserId, meta);
  }

  @Post(':id/cancel')
  @RequirePermissions('team_assignments.manage')
  cancel(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.teamAssignments.cancel(clientId!, id, actorUserId, meta);
  }

  @Get(':id')
  @RequirePermissions('team_assignments.read')
  getById(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
  ) {
    return this.teamAssignments.getById(clientId!, id);
  }

  @Patch(':id')
  @RequirePermissions('team_assignments.manage')
  update(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateTeamResourceAssignmentDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.teamAssignments.update(clientId!, id, dto, actorUserId, meta);
  }
}
