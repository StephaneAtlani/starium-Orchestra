import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import type { AuditContext } from '../budget-management/types/audit-context';
import { TransferOwnershipDto } from './dto/transfer-ownership.dto';
import { UpdateOrganizationOwnershipPolicyDto } from './dto/update-organization-ownership-policy.dto';
import { OrganizationOwnershipPolicyService } from './organization-ownership-policy.service';
import { OwnershipTransferService } from './ownership-transfer.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ORGANIZATION_AUDIT } from './organization-audit.constants';

@Controller('organization')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class OrganizationOwnershipController {
  constructor(
    private readonly policy: OrganizationOwnershipPolicyService,
    private readonly transfers: OwnershipTransferService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  @Get('ownership-policy')
  @RequirePermissions('organization.read')
  getPolicy(@ActiveClientId() clientId: string | undefined) {
    return this.policy.getPolicyView(clientId!);
  }

  @Patch('ownership-policy')
  @RequirePermissions('organization.update')
  async updatePolicy(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: UpdateOrganizationOwnershipPolicyDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: AuditContext['meta'],
  ) {
    const prev = await this.policy.getPolicyView(clientId!);
    const next = await this.policy.updateMode(clientId!, dto.mode);
    await this.auditLogs.create({
      clientId: clientId!,
      userId: actorUserId,
      action: ORGANIZATION_AUDIT.OWNERSHIP_POLICY_UPDATED,
      resourceType: 'client_org_ownership_policy',
      resourceId: clientId!,
      oldValue: { mode: prev.mode },
      newValue: { mode: next.mode },
      ...meta,
    });
    return next;
  }

  @Post('ownership-transfers')
  @RequirePermissions('organization.ownership.transfer', 'organization.read')
  transfer(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: TransferOwnershipDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: AuditContext['meta'],
  ) {
    const ctx: AuditContext = { actorUserId, meta };
    return this.transfers.transfer(clientId!, dto, ctx);
  }
}
