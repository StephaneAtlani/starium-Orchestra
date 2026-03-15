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
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ClientAdminGuard } from '../../common/guards/client-admin.guard';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
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

/**
 * Gestion des rôles métier et des permissions dans le client actif (RFC-011, lot 3).
 * Toutes les routes exigent : JWT + X-Client-Id + rôle CLIENT_ADMIN.
 */
@UseGuards(JwtAuthGuard, ActiveClientGuard, ClientAdminGuard)
@Controller()
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  /** GET /roles — Liste les rôles du client actif. */
  @Get('roles')
  getRoles(@ActiveClientId() clientId?: string): Promise<RoleItem[]> {
    return this.roles.listRoles(clientId!);
  }

  /** POST /roles — Crée un rôle dans le client actif. */
  @Post('roles')
  createRole(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: CreateRoleDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMetaDecorator() meta: RequestMeta,
  ): Promise<RoleItem> {
    return this.roles.createRole(clientId!, dto, { actorUserId, meta });
  }

  /** GET /roles/:id — Détail d'un rôle dans le client actif. */
  @Get('roles/:id')
  getRole(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
  ): Promise<RoleDetail> {
    return this.roles.getRoleById(clientId!, id);
  }

  /** PATCH /roles/:id — Met à jour un rôle dans le client actif. */
  @Patch('roles/:id')
  updateRole(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMetaDecorator() meta: RequestMeta,
  ): Promise<RoleItem> {
    return this.roles.updateRole(clientId!, id, dto, { actorUserId, meta });
  }

  /** DELETE /roles/:id — Supprime un rôle (si non système et non assigné). */
  @Delete('roles/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRole(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMetaDecorator() meta: RequestMeta,
  ): Promise<void> {
    await this.roles.deleteRole(clientId!, id, { actorUserId, meta });
  }

  /**
   * GET /permissions — Liste les permissions disponibles pour le client actif,
   * filtrées par modules activés.
   */
  @Get('permissions')
  getPermissions(
    @ActiveClientId() clientId: string | undefined,
  ): Promise<PermissionItem[]> {
    return this.roles.listPermissionsForClient(clientId!);
  }

  /**
   * PUT /roles/:id/permissions — Remplace la liste des permissions d'un rôle.
   */
  @Put('roles/:id/permissions')
  replaceRolePermissions(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateRolePermissionsDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMetaDecorator() meta: RequestMeta,
  ): Promise<{ role: RoleItem; permissionIds: string[] }> {
    return this.roles.replaceRolePermissions(clientId!, id, dto, {
      actorUserId,
      meta,
    });
  }
}

