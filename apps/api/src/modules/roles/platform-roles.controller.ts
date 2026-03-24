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
  Put,
  UseGuards,
} from '@nestjs/common';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import {
  RequestMeta,
  RequestMeta as RequestMetaDecorator,
} from '../../common/decorators/request-meta.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  PermissionItem,
  RoleDetail,
  RoleItem,
  RolesService,
} from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';

@Controller('platform/roles')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class PlatformRolesController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  listRoles(): Promise<RoleItem[]> {
    return this.roles.listGlobalRoles();
  }

  @Post()
  createRole(
    @Body() dto: CreateRoleDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMetaDecorator() meta: RequestMeta,
  ): Promise<RoleItem> {
    return this.roles.createGlobalRole(dto, { actorUserId, meta });
  }

  @Get('permissions')
  listPermissions(): Promise<PermissionItem[]> {
    return this.roles.listAllPermissions();
  }

  @Get(':id')
  getRole(@Param('id') id: string): Promise<RoleDetail> {
    return this.roles.getGlobalRoleById(id);
  }

  @Patch(':id')
  updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMetaDecorator() meta: RequestMeta,
  ): Promise<RoleItem> {
    return this.roles.updateGlobalRole(id, dto, { actorUserId, meta });
  }

  @Put(':id/permissions')
  updateRolePermissions(
    @Param('id') id: string,
    @Body() dto: UpdateRolePermissionsDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMetaDecorator() meta: RequestMeta,
  ): Promise<{ role: RoleItem; permissionIds: string[] }> {
    return this.roles.replaceGlobalRolePermissions(id, dto, { actorUserId, meta });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRole(
    @Param('id') id: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMetaDecorator() meta: RequestMeta,
  ): Promise<void> {
    await this.roles.deleteGlobalRole(id, { actorUserId, meta });
  }
}
