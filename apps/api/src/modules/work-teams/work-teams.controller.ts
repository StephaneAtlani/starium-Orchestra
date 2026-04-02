import {
  Body,
  Controller,
  Delete,
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
import { AddWorkTeamMemberDto } from './dto/add-work-team-member.dto';
import { CreateWorkTeamDto } from './dto/create-work-team.dto';
import { ListWorkTeamsTreeQueryDto } from './dto/list-tree.query.dto';
import { ListWorkTeamMembersQueryDto } from './dto/list-work-team-members.query.dto';
import { ListWorkTeamsQueryDto } from './dto/list-work-teams.query.dto';
import { UpdateWorkTeamDto } from './dto/update-work-team.dto';
import { UpdateWorkTeamMemberDto } from './dto/update-work-team-member.dto';
import { WorkTeamMembershipsService } from './work-team-memberships.service';
import { WorkTeamsService } from './work-teams.service';

@Controller('work-teams')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class WorkTeamsController {
  constructor(
    private readonly workTeams: WorkTeamsService,
    private readonly memberships: WorkTeamMembershipsService,
  ) {}

  @Get('tree')
  @RequirePermissions('teams.read')
  tree(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: ListWorkTeamsTreeQueryDto,
  ) {
    return this.workTeams.tree(clientId!, query);
  }

  @Get()
  @RequirePermissions('teams.read')
  list(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: ListWorkTeamsQueryDto,
  ) {
    return this.workTeams.list(clientId!, query);
  }

  @Post()
  @RequirePermissions('teams.update')
  create(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: CreateWorkTeamDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.workTeams.create(clientId!, dto, actorUserId, meta);
  }

  @Get(':id')
  @RequirePermissions('teams.read')
  getById(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
  ) {
    return this.workTeams.getById(clientId!, id);
  }

  @Patch(':id')
  @RequirePermissions('teams.update')
  update(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateWorkTeamDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.workTeams.update(clientId!, id, dto, actorUserId, meta);
  }

  @Patch(':id/archive')
  @RequirePermissions('teams.update')
  archive(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.workTeams.archive(clientId!, id, actorUserId, meta);
  }

  @Patch(':id/restore')
  @RequirePermissions('teams.update')
  restore(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.workTeams.restore(clientId!, id, actorUserId, meta);
  }

  @Get(':id/members')
  @RequirePermissions('teams.read')
  listMembers(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Query() query: ListWorkTeamMembersQueryDto,
  ) {
    return this.memberships.listMembers(clientId!, id, query);
  }

  @Post(':id/members')
  @RequirePermissions('teams.update')
  addMember(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: AddWorkTeamMemberDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.memberships.addMember(clientId!, id, dto, actorUserId, meta);
  }

  @Patch(':id/members/:membershipId')
  @RequirePermissions('teams.update')
  updateMember(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Param('membershipId') membershipId: string,
    @Body() dto: UpdateWorkTeamMemberDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.memberships.updateMember(
      clientId!,
      id,
      membershipId,
      dto,
      actorUserId,
      meta,
    );
  }

  @Delete(':id/members/:membershipId')
  @RequirePermissions('teams.update')
  removeMember(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Param('membershipId') membershipId: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.memberships.removeMember(
      clientId!,
      id,
      membershipId,
      actorUserId,
      meta,
    );
  }
}
