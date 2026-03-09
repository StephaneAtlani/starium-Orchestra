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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  PermissionItem,
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
  ): Promise<RoleItem> {
    return this.roles.createRole(clientId!, dto);
  }

  /** GET /roles/:id — Détail d'un rôle dans le client actif. */
  @Get('roles/:id')
  getRole(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
  ): Promise<RoleItem> {
    return this.roles.getRoleById(clientId!, id);
  }

  /** PATCH /roles/:id — Met à jour un rôle dans le client actif. */
  @Patch('roles/:id')
  updateRole(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ): Promise<RoleItem> {
    return this.roles.updateRole(clientId!, id, dto);
  }

  /** DELETE /roles/:id — Supprime un rôle (si non système et non assigné). */
  @Delete('roles/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRole(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') id: string,
  ): Promise<void> {
    await this.roles.deleteRole(clientId!, id);
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
  ): Promise<{ role: RoleItem; permissionIds: string[] }> {
    return this.roles.replaceRolePermissions(clientId!, id, dto);
  }
}

