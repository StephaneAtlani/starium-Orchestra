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
import type { AuditContext } from '../budget-management/types/audit-context';
import { CreateProjectScenarioRiskDto } from './dto/create-project-scenario-risk.dto';
import { ListProjectScenarioRisksQueryDto } from './dto/list-project-scenario-risks.query.dto';
import { UpdateProjectScenarioRiskDto } from './dto/update-project-scenario-risk.dto';
import { ProjectScenarioRisksService } from './project-scenario-risks.service';

@Controller('projects/:projectId/scenarios/:scenarioId')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class ProjectScenarioRisksController {
  constructor(private readonly risks: ProjectScenarioRisksService) {}

  @Get('risks')
  @RequirePermissions('projects.read')
  list(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('scenarioId') scenarioId: string,
    @Query() query: ListProjectScenarioRisksQueryDto,
  ) {
    return this.risks.list(clientId!, projectId, scenarioId, query);
  }

  @Post('risks')
  @RequirePermissions('projects.update')
  create(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('scenarioId') scenarioId: string,
    @Body() dto: CreateProjectScenarioRiskDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.risks.create(clientId!, projectId, scenarioId, dto, context);
  }

  @Patch('risks/:riskId')
  @RequirePermissions('projects.update')
  update(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('scenarioId') scenarioId: string,
    @Param('riskId') riskId: string,
    @Body() dto: UpdateProjectScenarioRiskDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.risks.update(clientId!, projectId, scenarioId, riskId, dto, context);
  }

  @Delete('risks/:riskId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('projects.update')
  remove(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('scenarioId') scenarioId: string,
    @Param('riskId') riskId: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.risks.remove(clientId!, projectId, scenarioId, riskId, context);
  }

  @Get('risk-summary')
  @RequirePermissions('projects.read')
  getSummary(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('scenarioId') scenarioId: string,
  ) {
    return this.risks.getSummary(clientId!, projectId, scenarioId);
  }
}
