import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { MicrosoftIntegrationAccessGuard } from '../../common/guards/microsoft-integration-access.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ActiveClientId } from '../../common/decorators/active-client.decorator';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { MicrosoftOAuthService } from './microsoft-oauth.service';

@Controller('microsoft')
@UseGuards(
  JwtAuthGuard,
  ActiveClientGuard,
  MicrosoftIntegrationAccessGuard,
)
export class MicrosoftAuthController {
  constructor(private readonly microsoftOAuth: MicrosoftOAuthService) {}

  /** GET /api/microsoft/auth/url — URL de consentement Microsoft (state + jti). */
  @Get('auth/url')
  @RequirePermissions('projects.update')
  getAuthorizationUrl(
    @RequestUserId() userId: string | undefined,
    @ActiveClientId() clientId: string | undefined,
  ) {
    return this.microsoftOAuth.getAuthorizationUrl(userId!, clientId!);
  }

  /** GET /api/microsoft/connection — état connexion (sans secrets). */
  @Get('connection')
  @RequirePermissions('projects.update')
  async getConnection(@ActiveClientId() clientId: string | undefined) {
    const connection = await this.microsoftOAuth.getActiveConnection(
      clientId!,
    );
    return { connection };
  }

  /** DELETE /api/microsoft/connection — révocation + effacement jetons. */
  @Delete('connection')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('projects.update')
  async revokeConnection(
    @RequestUserId() userId: string | undefined,
    @ActiveClientId() clientId: string | undefined,
  ): Promise<void> {
    await this.microsoftOAuth.revokeConnection(clientId!, userId!);
  }
}
