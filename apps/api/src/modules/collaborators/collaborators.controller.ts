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
import { RequireAnyPermissions } from '../../common/decorators/require-any-permissions.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateCollaboratorDto } from './dto/create-collaborator.dto';
import { ListCollaboratorOptionsQueryDto } from './dto/list-collaborator-options.query.dto';
import { ListCollaboratorTagsOptionsQueryDto } from './dto/list-collaborator-tags-options.query.dto';
import { ListCollaboratorsQueryDto } from './dto/list-collaborators.query.dto';
import { UpdateCollaboratorDto } from './dto/update-collaborator.dto';
import { UpdateCollaboratorStatusDto } from './dto/update-collaborator-status.dto';
import { ListCollaboratorWorkTeamsQueryDto } from '../work-teams/dto/list-collaborator-work-teams.query.dto';
import { WorkTeamMembershipsService } from '../work-teams/work-team-memberships.service';
import { CollaboratorsService } from './collaborators.service';

@Controller('collaborators')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class CollaboratorsController {
  constructor(
    private readonly collaborators: CollaboratorsService,
    private readonly workTeamMemberships: WorkTeamMembershipsService,
  ) {}

  @Get()
  @RequirePermissions('collaborators.read')
  list(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: ListCollaboratorsQueryDto,
  ) {
    return this.collaborators.list(clientId!, query);
  }

  @Post()
  @RequirePermissions('collaborators.create')
  create(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: CreateCollaboratorDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.collaborators.create(clientId!, dto, actorUserId, meta);
  }

  @Get('options/managers')
  @RequireAnyPermissions('collaborators.read', 'collaborators.create')
  listManagersOptions(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: ListCollaboratorOptionsQueryDto,
  ) {
    return this.collaborators.listManagersOptions(clientId!, query);
  }

  @Get('options/tags')
  @RequirePermissions('collaborators.read')
  listTagsOptions(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: ListCollaboratorTagsOptionsQueryDto,
  ) {
    return this.collaborators.listTagsOptions(clientId!, query);
  }

  @Get(':id/work-teams')
  @RequirePermissions('teams.read')
  listWorkTeamsForCollaborator(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Query() query: ListCollaboratorWorkTeamsQueryDto,
  ) {
    return this.workTeamMemberships.listTeamsForCollaborator(clientId!, id, query);
  }

  @Get(':id')
  @RequirePermissions('collaborators.read')
  getById(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
  ) {
    return this.collaborators.getById(clientId!, id);
  }

  @Patch(':id')
  @RequirePermissions('collaborators.update')
  update(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateCollaboratorDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.collaborators.update(clientId!, id, dto, actorUserId, meta);
  }

  @Patch(':id/status')
  @RequirePermissions('collaborators.update')
  updateStatus(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateCollaboratorStatusDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.collaborators.updateStatus(clientId!, id, dto, actorUserId, meta);
  }

  @Delete(':id')
  @RequirePermissions('collaborators.delete')
  softDelete(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.collaborators.softDelete(clientId!, id, actorUserId, meta);
  }
}
