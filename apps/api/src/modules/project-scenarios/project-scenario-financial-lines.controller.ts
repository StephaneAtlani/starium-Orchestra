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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import type { AuditContext } from '../budget-management/types/audit-context';
import { CreateProjectScenarioFinancialLineDto } from './dto/create-project-scenario-financial-line.dto';
import { ListProjectScenarioFinancialLinesQueryDto } from './dto/list-project-scenario-financial-lines.query.dto';
import { UpdateProjectScenarioFinancialLineDto } from './dto/update-project-scenario-financial-line.dto';
import { ProjectScenarioFinancialLinesService } from './project-scenario-financial-lines.service';

@Controller('projects/:projectId/scenarios/:scenarioId')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class ProjectScenarioFinancialLinesController {
  constructor(private readonly financialLines: ProjectScenarioFinancialLinesService) {}

  @Get('financial-lines')
  @RequirePermissions('projects.read')
  list(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('scenarioId') scenarioId: string,
    @Query() query: ListProjectScenarioFinancialLinesQueryDto,
  ) {
    return this.financialLines.list(clientId!, projectId, scenarioId, query);
  }

  @Post('financial-lines')
  @RequirePermissions('projects.update')
  create(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('scenarioId') scenarioId: string,
    @Body() dto: CreateProjectScenarioFinancialLineDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.financialLines.create(clientId!, projectId, scenarioId, dto, context);
  }

  @Patch('financial-lines/:lineId')
  @RequirePermissions('projects.update')
  update(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('scenarioId') scenarioId: string,
    @Param('lineId') lineId: string,
    @Body() dto: UpdateProjectScenarioFinancialLineDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.financialLines.update(clientId!, projectId, scenarioId, lineId, dto, context);
  }

  @Delete('financial-lines/:lineId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('projects.update')
  remove(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('scenarioId') scenarioId: string,
    @Param('lineId') lineId: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.financialLines.remove(clientId!, projectId, scenarioId, lineId, context);
  }

  @Get('financial-summary')
  @RequirePermissions('projects.read')
  getSummary(
    @ActiveClientId() clientId: string | undefined,
    @Param('projectId') projectId: string,
    @Param('scenarioId') scenarioId: string,
  ) {
    return this.financialLines.getSummary(clientId!, projectId, scenarioId);
  }
}
