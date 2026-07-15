import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { CreateProjectGovernanceCircleDto } from './dto/create-project-governance-circle.dto';
import { ProjectGovernanceCirclesService } from './project-governance-circles.service';

@Controller('projects/:projectId/governance-circles')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
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
    @Body() dto: CreateProjectGovernanceCircleDto,
  ) {
    return this.circles.create(clientId!, projectId, dto);
  }

  @Delete(':circleId')
  @RequirePermissions('projects.update')
  remove(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('circleId') circleId: string,
  ) {
    return this.circles.delete(clientId!, projectId, circleId);
  }
}
