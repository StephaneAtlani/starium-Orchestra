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
import { AddOrgUnitMemberDto } from './dto/add-org-unit-member.dto';
import { CreateOrgUnitDto } from './dto/create-org-unit.dto';
import { UpdateOrgUnitDto } from './dto/update-org-unit.dto';
import { OrganizationUnitsService } from './organization-units.service';

@Controller('organization/units')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class OrganizationUnitsController {
  constructor(private readonly units: OrganizationUnitsService) {}

  @Get()
  @RequirePermissions('organization.read')
  listTree(@ActiveClientId() clientId: string | undefined) {
    return this.units.listTree(clientId!);
  }

  @Post()
  @RequirePermissions('organization.update')
  create(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: CreateOrgUnitDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: AuditContext['meta'],
  ) {
    const ctx: AuditContext = { actorUserId, meta };
    return this.units.create(clientId!, dto, ctx);
  }

  @Post(':id/archive')
  @RequirePermissions('organization.update')
  archive(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: AuditContext['meta'],
  ) {
    const ctx: AuditContext = { actorUserId, meta };
    return this.units.archive(clientId!, id, ctx);
  }

  @Patch(':id')
  @RequirePermissions('organization.update')
  update(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateOrgUnitDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: AuditContext['meta'],
  ) {
    const ctx: AuditContext = { actorUserId, meta };
    return this.units.update(clientId!, id, dto, ctx);
  }

  @Get(':id/members')
  @RequirePermissions('organization.read')
  listMembers(@ActiveClientId() clientId: string | undefined, @Param('id') id: string) {
    return this.units.listMembers(clientId!, id);
  }

  @Post(':id/members')
  @RequirePermissions('organization.members.update')
  addMember(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: AddOrgUnitMemberDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: AuditContext['meta'],
  ) {
    const ctx: AuditContext = { actorUserId, meta };
    return this.units.addMember(clientId!, id, dto, ctx);
  }

  @Delete(':id/members/:membershipId')
  @RequirePermissions('organization.members.update')
  removeMember(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Param('membershipId') membershipId: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: AuditContext['meta'],
  ) {
    const ctx: AuditContext = { actorUserId, meta };
    return this.units.removeMember(clientId!, id, membershipId, ctx);
  }
}
