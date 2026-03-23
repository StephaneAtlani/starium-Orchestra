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
import { CreateResourceRoleDto } from './dto/create-resource-role.dto';
import { ListResourceRolesQueryDto } from './dto/list-resource-roles.query.dto';
import { UpdateResourceRoleDto } from './dto/update-resource-role.dto';
import { ResourceRolesService } from './resource-roles.service';

@Controller('resource-roles')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class ResourceRolesController {
  constructor(private readonly resourceRolesService: ResourceRolesService) {}

  @Get()
  @RequirePermissions('resources.read')
  list(
    @ActiveClientId() clientId: string | undefined,
    @Query() query: ListResourceRolesQueryDto,
  ) {
    return this.resourceRolesService.list(clientId!, query);
  }

  @Post()
  @RequirePermissions('resources.create')
  create(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: CreateResourceRoleDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.resourceRolesService.create(clientId!, dto, context);
  }

  @Patch(':id')
  @RequirePermissions('resources.update')
  update(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateResourceRoleDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMeta()
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const context: AuditContext = { actorUserId, meta };
    return this.resourceRolesService.update(clientId!, id, dto, context);
  }
}
