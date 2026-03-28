import {
  Body,
  Controller,
  Delete,
  Get,
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
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import type { AuditContext } from '../budget-management/types/audit-context';
import { ClientScopedRisksService } from './client-scoped-risks.service';
import { CreateClientScopedRiskDto } from './dto/create-client-scoped-risk.dto';
import { UpdateClientScopedRiskDto } from './dto/update-client-scoped-risk.dto';
import { UpdateProjectRiskStatusDto } from './dto/update-project-risk-status.dto';

@Controller('risks')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class RisksController {
  constructor(private readonly risks: ClientScopedRisksService) {}

  @Get()
  @RequirePermissions('projects.read')
  list(@ActiveClientId() clientId: string | undefined) {
    return this.risks.listForClient(clientId!);
  }

  @Get(':riskId')
  @RequirePermissions('projects.read')
  getOne(
    @ActiveClientId() clientId: string | undefined,
    @Param('riskId') riskId: string,
  ) {
    return this.risks.getOneForClient(clientId!, riskId);
  }

  @Post()
  @RequirePermissions('projects.update')
  create(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: CreateClientScopedRiskDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.risks.createForClient(clientId!, dto, context);
  }

  @Patch(':riskId/status')
  @RequirePermissions('projects.update')
  updateStatus(
    @ActiveClientId() clientId: string | undefined,
    @Param('riskId') riskId: string,
    @Body() dto: UpdateProjectRiskStatusDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.risks.updateStatusForClient(clientId!, riskId, dto.status, context);
  }

  @Patch(':riskId')
  @RequirePermissions('projects.update')
  update(
    @ActiveClientId() clientId: string | undefined,
    @Param('riskId') riskId: string,
    @Body() dto: UpdateClientScopedRiskDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.risks.updateForClient(clientId!, riskId, dto, context);
  }

  @Delete(':riskId')
  @RequirePermissions('projects.update')
  remove(
    @ActiveClientId() clientId: string | undefined,
    @Param('riskId') riskId: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.risks.deleteForClient(clientId!, riskId, context);
  }
}
