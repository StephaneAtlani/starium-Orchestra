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
import { CollaboratorSkillsService } from './collaborator-skills.service';
import { CreateSkillDto } from './dto/create-skill.dto';
import { ListSkillOptionsQueryDto } from './dto/list-skill-options.query.dto';
import { ListSkillCollaboratorsQueryDto } from './dto/list-skill-collaborators.query.dto';
import { ListSkillsQueryDto } from './dto/list-skills.query.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';
import { SkillsService } from './skills.service';

@Controller('skills')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class SkillsController {
  constructor(
    private readonly skillsService: SkillsService,
    private readonly collaboratorSkills: CollaboratorSkillsService,
  ) {}

  @Get('options')
  @RequirePermissions('skills.read')
  listOptions(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: ListSkillOptionsQueryDto,
  ) {
    return this.skillsService.listSkillOptions(clientId!, query);
  }

  @Get()
  @RequirePermissions('skills.read')
  list(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: ListSkillsQueryDto,
  ) {
    return this.skillsService.listSkills(clientId!, query);
  }

  /** Doit rester avant `GET(':id')` pour ne pas capturer le segment statique `collaborators`. */
  @Get(':skillId/collaborators')
  @RequirePermissions('skills.read')
  listCollaboratorsForSkill(
    @ActiveClientId() clientId: string | undefined,
    @Param('skillId') skillId: string,
    @Query() query: ListSkillCollaboratorsQueryDto,
  ) {
    return this.collaboratorSkills.listBySkill(clientId!, skillId, query);
  }

  @Post()
  @RequirePermissions('skills.create')
  create(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: CreateSkillDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.skillsService.createSkill(clientId!, dto, actorUserId, meta);
  }

  @Get(':id')
  @RequirePermissions('skills.read')
  getById(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
  ) {
    return this.skillsService.getSkillById(clientId!, id);
  }

  @Patch(':id')
  @RequirePermissions('skills.update')
  update(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateSkillDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.skillsService.updateSkill(clientId!, id, dto, actorUserId, meta);
  }

  @Patch(':id/archive')
  @RequirePermissions('skills.update')
  archive(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.skillsService.archiveSkill(clientId!, id, actorUserId, meta);
  }

  @Patch(':id/restore')
  @RequirePermissions('skills.update')
  restore(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.skillsService.restoreSkill(clientId!, id, actorUserId, meta);
  }
}
