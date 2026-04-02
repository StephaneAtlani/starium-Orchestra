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
  BadRequestException,
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
import { BulkCreateCollaboratorSkillsDto } from './dto/bulk-create-collaborator-skills.dto';
import { CreateCollaboratorSkillDto } from './dto/create-collaborator-skill.dto';
import { ListCollaboratorSkillsQueryDto } from './dto/list-collaborator-skills.query.dto';
import { UpdateCollaboratorSkillDto } from './dto/update-collaborator-skill.dto';

@Controller('collaborators/:collaboratorId/skills')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class CollaboratorSkillsController {
  constructor(private readonly collaboratorSkills: CollaboratorSkillsService) {}

  @Get()
  @RequirePermissions('skills.read')
  list(
    @ActiveClientId() clientId: string | undefined,
    @Param('collaboratorId') collaboratorId: string,
    @Query() query: ListCollaboratorSkillsQueryDto,
  ) {
    return this.collaboratorSkills.listByCollaborator(
      clientId!,
      collaboratorId,
      query,
    );
  }

  @Post()
  @RequirePermissions('skills.update')
  create(
    @ActiveClientId() clientId: string | undefined,
    @Param('collaboratorId') collaboratorId: string,
    @Body() dto: CreateCollaboratorSkillDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.collaboratorSkills.create(
      clientId!,
      collaboratorId,
      dto,
      actorUserId,
      meta,
    );
  }

  @Post('bulk')
  @RequirePermissions('skills.update')
  bulkCreate(
    @ActiveClientId() clientId: string | undefined,
    @Param('collaboratorId') collaboratorId: string,
    @Body() dto: BulkCreateCollaboratorSkillsDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.collaboratorSkills.bulkCreate(
      clientId!,
      collaboratorId,
      dto,
      actorUserId,
      meta,
    );
  }

  @Patch(':id/validate')
  @RequirePermissions('skills.update')
  validate(
    @ActiveClientId() clientId: string | undefined,
    @Param('collaboratorId') collaboratorId: string,
    @Param('id') id: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    if (!actorUserId) {
      throw new BadRequestException('User context required');
    }
    return this.collaboratorSkills.validate(
      clientId!,
      collaboratorId,
      id,
      actorUserId,
      meta,
    );
  }

  @Patch(':id/invalidate')
  @RequirePermissions('skills.update')
  invalidate(
    @ActiveClientId() clientId: string | undefined,
    @Param('collaboratorId') collaboratorId: string,
    @Param('id') id: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.collaboratorSkills.invalidate(
      clientId!,
      collaboratorId,
      id,
      actorUserId,
      meta,
    );
  }

  @Patch(':id')
  @RequirePermissions('skills.update')
  update(
    @ActiveClientId() clientId: string | undefined,
    @Param('collaboratorId') collaboratorId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCollaboratorSkillDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.collaboratorSkills.update(
      clientId!,
      collaboratorId,
      id,
      dto,
      actorUserId,
      meta,
    );
  }

  @Delete(':id')
  @RequirePermissions('skills.update')
  remove(
    @ActiveClientId() clientId: string | undefined,
    @Param('collaboratorId') collaboratorId: string,
    @Param('id') id: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    return this.collaboratorSkills.remove(
      clientId!,
      collaboratorId,
      id,
      actorUserId,
      meta,
    );
  }
}
