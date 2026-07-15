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
  Req,
  UseGuards,
} from '@nestjs/common';
import type { RequestWithClient } from '../../common/types/request-with-client';
import { ResourceType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RequireAccessIntent } from '../../common/decorators/require-access-intent.decorator';
import { AccessDecision } from '../../common/decorators/access-decision.decorator';
import { ResourceAccessDecisionGuard } from '../access-decision/resource-access-decision.guard';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import type { AuditContext } from '../budget-management/types/audit-context';
import { CreateProjectDto } from './dto/create-project.dto';
import { ListProjectsQueryDto } from './dto/list-projects.query.dto';
import { ListProjectHistoryQueryDto } from './dto/list-project-history.query.dto';
import { ListAssignableParentsQueryDto } from './dto/list-assignable-parents.query.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsService } from './projects.service';
import { ProjectTeamService } from './project-team.service';
import { CreateProjectTeamRoleDto } from './dto/create-project-team-role.dto';
import { UpdateProjectTeamRoleDto } from './dto/update-project-team-role.dto';
import { AddProjectTeamMemberDto } from './dto/add-project-team-member.dto';
import { UpdateProjectTeamMemberCirclesDto } from './dto/update-project-team-member-circles.dto';
import { UpdateProjectTeamRaciDto } from './dto/update-project-team-raci.dto';
import { CreateProjectRaciActionDto } from './dto/create-project-raci-action.dto';
import { CreateProjectTagDto } from './dto/create-project-tag.dto';
import { UpdateProjectTagDto } from './dto/update-project-tag.dto';
import { ReplaceProjectTagsDto } from './dto/replace-project-tags.dto';
import { ResourcesService } from '../resources/resources.service';

@Controller('projects')
@UseGuards(
  JwtAuthGuard,
  ActiveClientGuard,
  ModuleAccessGuard,
  PermissionsGuard,
  ResourceAccessDecisionGuard,
)
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

  /** RFC-PROJ-019 — projets éligibles comme parent (hors self + descendants). */
  @Get('assignable-parents')
  @RequirePermissions('projects.read')
  listAssignableParents(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: ListAssignableParentsQueryDto,
  ) {
    return this.projectsService.listAssignableParents(clientId!, {
      excludeProjectId: query.excludeProjectId,
      search: query.search,
      limit: query.limit,
    });
  }

  @Get()
  @RequireAccessIntent({ module: 'projects', intent: 'read' })
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
  @RequireAccessIntent({ module: 'projects', intent: 'create' })
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

  @Get(':projectId/team-raci')
  @RequirePermissions('projects.read')
  getProjectTeamRaci(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
  ) {
    return this.projectTeamService.getRaciMatrix(clientId!, projectId);
  }

  @Patch(':projectId/team-raci')
  @RequirePermissions('projects.update')
  patchProjectTeamRaci(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Body() dto: UpdateProjectTeamRaciDto,
  ) {
    return this.projectTeamService.setRaciCell(
      clientId!,
      projectId,
      dto.actionId,
      dto.roleId,
      dto.kind,
    );
  }

  @Post(':projectId/raci-actions')
  @RequirePermissions('projects.update')
  createProjectRaciAction(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Body() dto: CreateProjectRaciActionDto,
  ) {
    return this.projectTeamService.createRaciAction(
      clientId!,
      projectId,
      dto.label,
      dto.sortOrder,
    );
  }

  @Delete(':projectId/raci-actions/:actionId')
  @RequirePermissions('projects.update')
  deleteProjectRaciAction(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('actionId') actionId: string,
  ) {
    return this.projectTeamService.deleteRaciAction(clientId!, projectId, actionId);
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

  @Patch(':projectId/team/:memberId/circles')
  @RequirePermissions('projects.update')
  updateProjectTeamMemberCircles(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateProjectTeamMemberCirclesDto,
  ) {
    return this.projectTeamService.updateMemberCircles(clientId!, projectId, memberId, dto);
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

  @Get(':projectId/committee-mood/history')
  @RequirePermissions('projects.read')
  getCommitteeMoodHistory(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
  ) {
    return this.projectsService.getCommitteeMoodHistory(clientId!, projectId);
  }

  @Get(':id/pilotage-snapshot')
  @RequireAccessIntent({ module: 'projects', intent: 'read' })
  @AccessDecision({ resourceType: 'PROJECT', resourceIdParam: 'id', intent: 'read' })
  getPilotageSnapshot(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @RequestUserId() userId: string | undefined,
  ) {
    return this.projectsService.getPilotageSnapshot(clientId!, id, userId);
  }

  /** RFC-PROJ-019 — sous-projets directs. */
  @Get(':id/children')
  @RequirePermissions('projects.read')
  @AccessDecision({ resourceType: 'PROJECT', resourceIdParam: 'id', intent: 'read' })
  listChildren(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Query() query: ListProjectsQueryDto,
    @RequestUserId() userId: string | undefined,
  ) {
    return this.projectsService.listChildren(clientId!, id, query, userId);
  }

  @Get(':id/history')
  @RequireAccessIntent({ module: 'projects', intent: 'read' })
  @AccessDecision({ resourceType: 'PROJECT', resourceIdParam: 'id', intent: 'read' })
  getHistory(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Query() query: ListProjectHistoryQueryDto,
    @RequestUserId() userId: string | undefined,
  ) {
    return this.projectsService.getHistory(clientId!, id, query, userId);
  }

  @Get(':id')
  @RequireAccessIntent({ module: 'projects', intent: 'read' })
  @AccessDecision({ resourceType: 'PROJECT', resourceIdParam: 'id', intent: 'read' })
  getById(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @RequestUserId() userId: string | undefined,
  ) {
    return this.projectsService.getById(clientId!, id, userId);
  }

  @Patch(':id')
  @RequireAccessIntent({ module: 'projects', intent: 'write' })
  @AccessDecision({ resourceType: 'PROJECT', resourceIdParam: 'id', intent: 'write' })
  update(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
    @Req() request: RequestWithClient,
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.projectsService.update(clientId!, id, dto, context, request);
  }

  @Delete(':id')
  @RequireAccessIntent({ module: 'projects', intent: 'admin' })
  @AccessDecision({ resourceType: 'PROJECT', resourceIdParam: 'id', intent: 'admin' })
  remove(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
    @Req() request: RequestWithClient,
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.projectsService.delete(clientId!, id, context, request);
  }
}
