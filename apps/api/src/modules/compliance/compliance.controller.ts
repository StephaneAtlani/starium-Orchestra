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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import type { AuditContext } from '../budget-management/types/audit-context';
import { ComplianceService } from './compliance.service';
import { CreateComplianceFrameworkDto } from './dto/create-compliance-framework.dto';
import { CreateComplianceRequirementDto } from './dto/create-compliance-requirement.dto';
import { CreateComplianceEvidenceDto } from './dto/create-compliance-evidence.dto';
import { PatchComplianceStatusDto } from './dto/patch-compliance-status.dto';
import { ListComplianceRequirementsQueryDto } from './dto/list-compliance-requirements.query.dto';
import { ListComplianceStatusQueryDto } from './dto/list-compliance-status.query.dto';

@Controller('compliance')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class ComplianceController {
  constructor(private readonly compliance: ComplianceService) {}

  @Get('frameworks')
  @RequirePermissions('compliance.read')
  listFrameworks(@ActiveClientId() clientId: string | undefined) {
    return this.compliance.listFrameworks(clientId!);
  }

  @Post('frameworks')
  @RequirePermissions('compliance.update')
  createFramework(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: CreateComplianceFrameworkDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.compliance.createFramework(clientId!, dto, context);
  }

  @Get('requirements')
  @RequirePermissions('compliance.read')
  listRequirements(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: ListComplianceRequirementsQueryDto,
  ) {
    return this.compliance.listRequirements(clientId!, query);
  }

  @Get('requirements/:id')
  @RequirePermissions('compliance.read')
  getRequirement(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
  ) {
    return this.compliance.getRequirementDetail(clientId!, id);
  }

  @Post('requirements')
  @RequirePermissions('compliance.update')
  createRequirement(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: CreateComplianceRequirementDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.compliance.createRequirement(clientId!, dto, context);
  }

  @Get('status')
  @RequirePermissions('compliance.read')
  listStatuses(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: ListComplianceStatusQueryDto,
  ) {
    return this.compliance.listStatuses(clientId!, query);
  }

  @Patch('status/:id')
  @RequirePermissions('compliance.update')
  patchStatus(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: PatchComplianceStatusDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.compliance.patchStatus(clientId!, id, dto, context);
  }

  @Post('evidence')
  @RequirePermissions('compliance.update')
  createEvidence(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: CreateComplianceEvidenceDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.compliance.createEvidence(clientId!, dto, actorUserId, context);
  }

  @Get('dashboard')
  @RequirePermissions('compliance.read')
  dashboard(@ActiveClientId() clientId: string | undefined) {
    return this.compliance.dashboard(clientId!);
  }
}
