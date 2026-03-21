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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import type { AuditContext } from '../budget-management/types/audit-context';
import { CreateProjectDto } from './dto/create-project.dto';
import { ListProjectsQueryDto } from './dto/list-projects.query.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsService } from './projects.service';
import { ProjectTeamService } from './project-team.service';
import { CreateProjectTeamRoleDto } from './dto/create-project-team-role.dto';
import { UpdateProjectTeamRoleDto } from './dto/update-project-team-role.dto';
import { AddProjectTeamMemberDto } from './dto/add-project-team-member.dto';

@Controller('projects')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly projectTeamService: ProjectTeamService,
  ) {}

  @Get('portfolio-summary')
  @RequirePermissions('projects.read')
  portfolioSummary(@ActiveClientId() clientId: string | undefined) {
    return this.projectsService.getPortfolioSummary(clientId!);
  }

  @Get('assignable-users')
  @RequirePermissions('projects.read')
  assignableUsers(@ActiveClientId() clientId: string | undefined) {
    return this.projectsService.listAssignableUsers(clientId!);
  }

  @Get()
  @RequirePermissions('projects.read')
  list(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: ListProjectsQueryDto,
  ) {
    return this.projectsService.list(clientId!, query);
  }

  @Post()
  @RequirePermissions('projects.create')
  create(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: CreateProjectDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.projectsService.create(clientId!, dto, context);
  }

  @Get('team-roles')
  @RequirePermissions('projects.read')
  listTeamRoles(@ActiveClientId() clientId: string | undefined) {
    return this.projectTeamService.listRoles(clientId!);
  }

  @Post('team-roles')
  @RequirePermissions('projects.update')
  createTeamRole(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: CreateProjectTeamRoleDto,
  ) {
    return this.projectTeamService.createRole(clientId!, dto);
  }

  @Patch('team-roles/:roleId')
  @RequirePermissions('projects.update')
  updateTeamRole(
    @ActiveClientId() clientId: string | undefined,
    @Param('roleId') roleId: string,
    @Body() dto: UpdateProjectTeamRoleDto,
  ) {
    return this.projectTeamService.updateRole(clientId!, roleId, dto);
  }

  @Delete('team-roles/:roleId')
  @RequirePermissions('projects.update')
  deleteTeamRole(
    @ActiveClientId() clientId: string | undefined,
    @Param('roleId') roleId: string,
  ) {
    return this.projectTeamService.deleteRole(clientId!, roleId);
  }

  @Get(':projectId/team')
  @RequirePermissions('projects.read')
  getProjectTeam(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
  ) {
    return this.projectTeamService.getTeam(clientId!, projectId);
  }

  @Post(':projectId/team')
  @RequirePermissions('projects.update')
  addProjectTeamMember(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Body() dto: AddProjectTeamMemberDto,
  ) {
    return this.projectTeamService.addMember(clientId!, projectId, dto);
  }

  @Delete(':projectId/team/:memberId')
  @RequirePermissions('projects.update')
  removeProjectTeamMember(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.projectTeamService.removeMember(clientId!, projectId, memberId);
  }

  @Get(':id')
  @RequirePermissions('projects.read')
  getById(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
  ) {
    return this.projectsService.getById(clientId!, id);
  }

  @Patch(':id')
  @RequirePermissions('projects.update')
  update(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.projectsService.update(clientId!, id, dto, context);
  }

  @Delete(':id')
  @RequirePermissions('projects.delete')
  remove(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.projectsService.delete(clientId!, id, context);
  }
}
