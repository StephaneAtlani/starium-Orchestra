import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { MicrosoftPlatformConfigService } from './microsoft-platform-config.service';
import { UpdatePlatformMicrosoftSettingsDto } from './dto/update-platform-microsoft-settings.dto';

/**
 * Configuration OAuth Microsoft **plateforme** (URI de redirection, scopes, timeouts).
 * Les identifiants d’application Azure par client sont sur `PUT /clients/active/microsoft-oauth`.
 */
@Controller('platform/microsoft-settings')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class PlatformMicrosoftSettingsController {
  constructor(private readonly platform: MicrosoftPlatformConfigService) {}

  @Get()
  async get() {
    const [raw, resolved] = await Promise.all([
      this.platform.getRawRow(),
      this.platform.getResolved(),
    ]);
    return {
      stored: raw,
      resolved: {
        redirectUri: resolved.redirectUri || null,
        graphScopes: resolved.graphScopes,
        oauthSuccessUrl: resolved.oauthSuccessUrl,
        oauthErrorUrl: resolved.oauthErrorUrl,
        oauthStateTtlSeconds: resolved.oauthStateTtlSeconds,
        refreshLeewaySeconds: resolved.refreshLeewaySeconds,
        tokenHttpTimeoutMs: resolved.tokenHttpTimeoutMs,
      },
    };
  }

  @Patch()
  async patch(@Body() dto: UpdatePlatformMicrosoftSettingsDto) {
    await this.platform.upsertPartial({
      redirectUri: dto.redirectUri,
      graphScopes: dto.graphScopes,
      oauthSuccessUrl: dto.oauthSuccessUrl,
      oauthErrorUrl: dto.oauthErrorUrl,
      oauthStateTtlSeconds: dto.oauthStateTtlSeconds ?? undefined,
      refreshLeewaySeconds: dto.refreshLeewaySeconds ?? undefined,
      tokenHttpTimeoutMs: dto.tokenHttpTimeoutMs ?? undefined,
    });
    return this.get();
  }
}
