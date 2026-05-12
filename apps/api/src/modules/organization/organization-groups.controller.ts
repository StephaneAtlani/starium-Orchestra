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
import { AddOrgGroupMemberDto } from './dto/add-org-group-member.dto';
import { CreateOrgGroupDto } from './dto/create-org-group.dto';
import { UpdateOrgGroupDto } from './dto/update-org-group.dto';
import { OrganizationGroupsService } from './organization-groups.service';

@Controller('organization/groups')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class OrganizationGroupsController {
  constructor(private readonly groups: OrganizationGroupsService) {}

  @Get()
  @RequirePermissions('organization.read')
  list(@ActiveClientId() clientId: string | undefined) {
    return this.groups.list(clientId!);
  }

  @Post()
  @RequirePermissions('organization.update')
  create(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: CreateOrgGroupDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: AuditContext['meta'],
  ) {
    const ctx: AuditContext = { actorUserId, meta };
    return this.groups.create(clientId!, dto, ctx);
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
    return this.groups.archive(clientId!, id, ctx);
  }

  @Patch(':id')
  @RequirePermissions('organization.update')
  update(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateOrgGroupDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: AuditContext['meta'],
  ) {
    const ctx: AuditContext = { actorUserId, meta };
    return this.groups.update(clientId!, id, dto, ctx);
  }

  @Get(':id/members')
  @RequirePermissions('organization.read')
  listMembers(@ActiveClientId() clientId: string | undefined, @Param('id') id: string) {
    return this.groups.listMembers(clientId!, id);
  }

  @Post(':id/members')
  @RequirePermissions('organization.members.update')
  addMember(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: AddOrgGroupMemberDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta() meta: AuditContext['meta'],
  ) {
    const ctx: AuditContext = { actorUserId, meta };
    return this.groups.addMember(clientId!, id, dto, ctx);
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
    return this.groups.removeMember(clientId!, id, membershipId, ctx);
  }
}
