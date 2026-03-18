import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import {
  RequestMeta,
  RequestMeta as RequestMetaDecorator,
} from '../../common/decorators/request-meta.decorator';
import { ClientTaxSettingsService } from './client-tax-settings.service';
import { UpdateClientTaxSettingsDto } from './dto/update-client-tax-settings.dto';

@Controller('clients')
@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)
export class ClientTaxSettingsController {
  constructor(
    private readonly taxSettings: ClientTaxSettingsService,
  ) {}

  @Get('active/tax-settings')
  @RequirePermissions('budgets.read')
  getActiveTaxSettings(
    @ActiveClientId() clientId: string | undefined,
  ) {
    return this.taxSettings.getActiveTaxSettings(clientId!);
  }

  @Patch('active/tax-settings')
  @RequirePermissions('budgets.update')
  updateActiveTaxSettings(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: UpdateClientTaxSettingsDto,
    @RequestMetaDecorator() meta: RequestMeta,
  ) {
    // actorUserId est optionnel dans le repo existant pour les routes non-platform-admin.
    return this.taxSettings.updateActiveTaxSettings(clientId!, dto, { meta });
  }
}

