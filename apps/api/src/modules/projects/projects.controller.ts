import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ResourceType } from '@prisma/client';
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
import { CreateProjectTagDto } from './dto/create-project-tag.dto';
import { UpdateProjectTagDto } from './dto/update-project-tag.dto';
import { ReplaceProjectTagsDto } from './dto/replace-project-tags.dto';
import { ResourcesService } from '../resources/resources.service';

@Controller('projects')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly projectTeamService: ProjectTeamService,
    private readonly resourcesService: ResourcesService,
  ) {}

  @Get('portfolio-summary')
  @RequirePermissions('projects.read')
  portfolioSummary(@ActiveClientId() clientId: string | undefined) {
    return this.projectsService.getPortfolioSummary(clientId!);
  }

  /** Frise Gantt portefeuille — mêmes filtres query que `GET /projects` (sans pagination appliquée au tri interne). */
  @Get('portfolio-gantt')
  @RequirePermissions('projects.read')
  portfolioGantt(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: ListProjectsQueryDto,
    @RequestUserId() userId: string | undefined,
  ) {
    return this.projectsService.getPortfolioGantt(clientId!, query, userId);
  }

  /** Membres client + répertoire identités nom libre (équipe projet). Une seule route pour éviter la collision avec `GET :id`. */
  @Get('assignable-users')
  @RequirePermissions('projects.read')
  async assignableUsers(@ActiveClientId() clientId: string | undefined) {
    const cid = clientId!;
    const [users, freePersons] = await Promise.all([
      this.projectsService.listAssignableUsers(cid),
      this.projectsService.listAssignableFreePersons(cid),
    ]);
    return { users, freePersons };
  }

  /**
   * Catalogue Humaine (Resource HUMAN) pour rattachement tâche / plan d’action.
   * Utilise `projects.read` — évite d’exiger le module Resources + `resources.read` pour ce seul sélecteur.
   */
  @Get('options/human-resources')
  @RequirePermissions('projects.read')
  listHumanResourcesForTaskPickers(@ActiveClientId() clientId: string | undefined) {
    return this.resourcesService.list(clientId!, {
      type: ResourceType.HUMAN,
      limit: 100,
      offset: 0,
    });
  }

  @Get()
  @RequirePermissions('projects.read')
  list(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: ListProjectsQueryDto,
    @RequestUserId() userId: string | undefined,
  ) {
    return this.projectsService.list(clientId!, query, userId);
  }

  @Get('options/tags')
  @RequirePermissions('projects.read')
  listProjectTags(@ActiveClientId() clientId: string | undefined) {
    return this.projectsService.listTags(clientId!);
  }

  @Post('options/tags')
  @RequirePermissions('projects.update')
  createProjectTag(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: CreateProjectTagDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.projectsService.createTag(clientId!, dto, context);
  }

  @Patch('options/tags/:tagId')
  @RequirePermissions('projects.update')
  updateProjectTag(
    @ActiveClientId() clientId: string | undefined,
    @Param('tagId') tagId: string,
    @Body() dto: UpdateProjectTagDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.projectsService.updateTag(clientId!, tagId, dto, context);
  }

  @Delete('options/tags/:tagId')
  @RequirePermissions('projects.update')
  deleteProjectTag(
    @ActiveClientId() clientId: string | undefined,
    @Param('tagId') tagId: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.projectsService.deleteTag(clientId!, tagId, context);
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

  @Get(':id/tags')
  @RequirePermissions('projects.read')
  getProjectTags(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
  ) {
    return this.projectsService.getProjectTags(clientId!, id);
  }

  @Put(':id/tags')
  @RequirePermissions('projects.update')
  replaceProjectTags(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: ReplaceProjectTagsDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.projectsService.replaceProjectTags(clientId!, id, dto, context);
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
    @RequestUserId() userId: string | undefined,
  ) {
    return this.projectsService.getById(clientId!, id, userId);
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
