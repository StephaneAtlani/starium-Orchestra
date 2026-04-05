import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ClientAdminGuard } from '../../common/guards/client-admin.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import {
  RequestMeta,
  RequestMeta as RequestMetaDecorator,
} from '../../common/decorators/request-meta.decorator';
import { ClientResourceTimesheetSettingsService } from './client-resource-timesheet-settings.service';
import { UpdateClientResourceTimesheetSettingsDto } from './dto/update-client-resource-timesheet-settings.dto';

/**
 * Paramètres client pour la grille temps réalisé.
 * GET : tout utilisateur avec accès ressources (même règles que la grille).
 * PATCH : administrateur client uniquement.
 */
@Controller('clients')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class ClientResourceTimesheetSettingsController {
  constructor(
    private readonly settings: ClientResourceTimesheetSettingsService,
  ) {}

  @Get('active/resource-timesheet-settings')
  @RequirePermissions('resources.read')
  getActive(@ActiveClientId() clientId: string | undefined) {
    return this.settings.getForActiveClient(clientId!);
  }

  @Patch('active/resource-timesheet-settings')
  @UseGuards(ClientAdminGuard)
  @RequirePermissions('resources.update')
  patchActive(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: UpdateClientResourceTimesheetSettingsDto,
    @RequestUserId() actorUserId: string | undefined,
    @RequestMetaDecorator() meta: RequestMeta,
  ) {
    return this.settings.updateForActiveClient(clientId!, dto, {
      actorUserId,
      meta,
    });
  }
}
