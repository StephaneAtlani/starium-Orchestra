import {
  Body,
  Controller,
  Get,
  Param,
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
  UserRoleItem,
  UserRolesService,
} from './user-roles.service';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto';

/**
 * Assignation des rôles métier aux utilisateurs dans le client actif (RFC-011).
 * Routes protégées par JwtAuthGuard + ActiveClientGuard + ClientAdminGuard.
 */
@UseGuards(JwtAuthGuard, ActiveClientGuard, ClientAdminGuard)
@Controller('users')
export class UserRolesController {
  constructor(private readonly userRoles: UserRolesService) {}

  /** GET /users/:id/roles — Rôles d'un utilisateur dans le client actif. */
  @Get(':id/roles')
  getUserRoles(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') userId: string,
  ): Promise<UserRoleItem[]> {
    return this.userRoles.getUserRolesForClient(clientId!, userId);
  }

  /** PUT /users/:id/roles — Remplace les rôles d'un utilisateur dans le client actif. */
  @Put(':id/roles')
  replaceUserRoles(
    @ActiveClientId() clientId: string | undefined,
    @Param('id') userId: string,
    @Body() dto: UpdateUserRolesDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMetaDecorator() meta: RequestMeta,
  ): Promise<{ userId: string; roleIds: string[] }> {
    return this.userRoles.replaceUserRolesForClient(clientId!, userId, dto, {
      actorUserId,
      meta,
    });
  }
}

