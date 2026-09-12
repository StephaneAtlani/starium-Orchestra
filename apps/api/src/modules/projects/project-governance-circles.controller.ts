import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import {
  CreateProjectTeamDto,
  UpdateProjectTeamDto,
} from './dto/create-project-governance-circle.dto';
import { ProjectGovernanceCirclesService } from './project-governance-circles.service';

const guards = [JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard] as const;

@Controller('projects/:projectId/teams')
@UseGuards(...guards)
export class ProjectTeamsController {
  constructor(private readonly circles: ProjectGovernanceCirclesService) {}

  @Get()
  @RequirePermissions('projects.read')
  list(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
  ) {
    return this.circles.list(clientId!, projectId);
  }

  @Get(':teamId')
  @RequirePermissions('projects.read')
  getOne(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('teamId') teamId: string,
  ) {
    return this.circles.getOne(clientId!, projectId, teamId);
  }

  @Post()
  @RequirePermissions('projects.update')
  create(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Body() dto: CreateProjectTeamDto,
  ) {
    return this.circles.create(clientId!, projectId, dto);
  }

  @Patch(':teamId')
  @RequirePermissions('projects.update')
  update(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('teamId') teamId: string,
    @Body() dto: UpdateProjectTeamDto,
  ) {
    return this.circles.update(clientId!, projectId, teamId, dto);
  }

  @Delete(':teamId')
  @RequirePermissions('projects.update')
  @HttpCode(HttpStatus.OK)
  async remove(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('teamId') teamId: string,
  ) {
    const result = await this.circles.delete(clientId!, projectId, teamId);
    return {
      ok: true,
      message: `Équipe supprimée · les points déjà convoqués ne sont pas modifiés`,
      ...result,
    };
  }
}

/** Alias rétrocompat — même service que `/teams`. */
@Controller('projects/:projectId/governance-circles')
@UseGuards(...guards)
export class ProjectGovernanceCirclesController {
  constructor(private readonly circles: ProjectGovernanceCirclesService) {}

  @Get()
  @RequirePermissions('projects.read')
  list(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
  ) {
    return this.circles.list(clientId!, projectId);
  }

  @Post()
  @RequirePermissions('projects.update')
  create(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Body() dto: CreateProjectTeamDto,
  ) {
    return this.circles.create(clientId!, projectId, dto);
  }

  @Patch(':circleId')
  @RequirePermissions('projects.update')
  update(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('circleId') circleId: string,
    @Body() dto: UpdateProjectTeamDto,
  ) {
    return this.circles.update(clientId!, projectId, circleId, dto);
  }

  @Delete(':circleId')
  @RequirePermissions('projects.update')
  @HttpCode(HttpStatus.OK)
  async remove(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('circleId') circleId: string,
  ) {
    const result = await this.circles.delete(clientId!, projectId, circleId);
    return {
      ok: true,
      message: `Équipe supprimée · les points déjà convoqués ne sont pas modifiés`,
      ...result,
    };
  }
}
