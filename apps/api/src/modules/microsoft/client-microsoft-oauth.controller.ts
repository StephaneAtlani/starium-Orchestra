import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { MicrosoftIntegrationAccessGuard } from '../../common/guards/microsoft-integration-access.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { ClientMicrosoftOAuthService } from './client-microsoft-oauth.service';
import { UpdateClientMicrosoftOAuthDto } from './dto/update-client-microsoft-oauth.dto';

/**
 * Identifiants d’application Azure **par client Starium** (BYO).
 * L’URI de redirection sync est globale au déploiement (env API uniquement, pas la redirect plateforme SSO) ; id + secret + tenant restent côté client.
 */
@Controller('clients')
@UseGuards(
  JwtAuthGuard,
  ActiveClientGuard,
  MicrosoftIntegrationAccessGuard,
)
export class ClientMicrosoftOAuthController {
  constructor(private readonly service: ClientMicrosoftOAuthService) {}

  @Get('active/microsoft-oauth')
  @RequirePermissions('projects.update')
  getActive(@ActiveClientId() clientId: string | undefined) {
    return this.service.getForClient(clientId!);
  }

  @Put('active/microsoft-oauth')
  @RequirePermissions('projects.update')
  putActive(
    @ActiveClientId() clientId: string | undefined,
    @Body() dto: UpdateClientMicrosoftOAuthDto,
  ) {
    return this.service.updateForClient(clientId!, dto);
  }
}
