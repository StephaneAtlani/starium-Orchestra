import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ClientAdminGuard } from '../../common/guards/client-admin.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { ClientUiBadgesService } from './client-ui-badges.service';

/**
 * Surcouchages badges UI (libellés / tons) pour le client actif.
 * GET : lecture pour tout utilisateur avec accès projets.
 * PATCH : administrateur client uniquement.
 */
@Controller('clients')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class ClientUiBadgesController {
  constructor(private readonly uiBadges: ClientUiBadgesService) {}

  @Get('active/ui-badges')
  @RequirePermissions('projects.read')
  getActive(@ActiveClientId() clientId: string | undefined) {
    return this.uiBadges.getForActiveClient(clientId!);
  }

  @Patch('active/ui-badges')
  @UseGuards(ClientAdminGuard)
  @RequirePermissions('projects.update')
  patchActive(
    @ActiveClientId() clientId: string | undefined,
    @Body() body: unknown,
  ) {
    return this.uiBadges.updateForActiveClient(clientId!, body);
  }

  /** Supprime `Client.uiBadgeConfig` — rétablit les badges globaux (plateforme + code). */
  @Delete('active/ui-badges')
  @UseGuards(ClientAdminGuard)
  @RequirePermissions('projects.update')
  deleteActive(@ActiveClientId() clientId: string | undefined) {
    return this.uiBadges.resetClientOverrides(clientId!);
  }
}
