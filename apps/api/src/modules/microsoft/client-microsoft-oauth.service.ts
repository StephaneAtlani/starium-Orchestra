import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { MicrosoftTokenCryptoService } from './microsoft-token-crypto.service';
import { MicrosoftPlatformConfigService } from './microsoft-platform-config.service';
import { UpdateClientMicrosoftOAuthDto } from './dto/update-client-microsoft-oauth.dto';
import { resolveM365OAuthSyncRedirectUri } from './microsoft-m365-sync-redirect.util';

export interface ClientMicrosoftOAuthPublic {
  microsoftOAuthClientId: string | null;
  microsoftOAuthAuthorityTenant: string | null;
  hasClientSecret: boolean;
  /** Même valeur pour tous les clients : env `MICROSOFT_M365_SYNC_REDIRECT_URI` (ou repli `MICROSOFT_REDIRECT_URI` si chemin sync). */
  syncRedirectUri: string | null;
  /** Si l’env redirect sync est absente. */
  syncRedirectUriError: string | null;
  graphScopes: string;
}

@Injectable()
export class ClientMicrosoftOAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: MicrosoftTokenCryptoService,
    private readonly platformConfig: MicrosoftPlatformConfigService,
    private readonly config: ConfigService,
  ) {}

  async getForClient(clientId: string): Promise<ClientMicrosoftOAuthPublic> {
    const row = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: {
        microsoftOAuthClientId: true,
        microsoftOAuthClientSecretEncrypted: true,
        microsoftOAuthAuthorityTenant: true,
      },
    });
    if (!row) {
      throw new NotFoundException('Client introuvable');
    }
    const resolved = await this.platformConfig.getResolved();
    const redirect = resolveM365OAuthSyncRedirectUri({
      envM365Sync: this.config.get<string>('MICROSOFT_M365_SYNC_REDIRECT_URI'),
      envMicrosoftRedirect: this.config.get<string>('MICROSOFT_REDIRECT_URI'),
    });
    return {
      microsoftOAuthClientId: row.microsoftOAuthClientId,
      microsoftOAuthAuthorityTenant: row.microsoftOAuthAuthorityTenant,
      hasClientSecret: Boolean(row.microsoftOAuthClientSecretEncrypted?.length),
      syncRedirectUri: redirect.ok ? redirect.uri : null,
      syncRedirectUriError: redirect.ok ? null : redirect.message,
      graphScopes: resolved.graphScopes,
    };
  }

  async updateForClient(
    clientId: string,
    dto: UpdateClientMicrosoftOAuthDto,
  ): Promise<ClientMicrosoftOAuthPublic> {
    const existing = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { microsoftOAuthClientSecretEncrypted: true },
    });
    if (!existing) {
      throw new NotFoundException('Client introuvable');
    }

    let secretEnc: string | null | undefined = undefined;
    if (dto.microsoftOAuthClientSecret !== undefined) {
      const s = dto.microsoftOAuthClientSecret?.trim();
      if (s && s.length > 0) {
        secretEnc = this.crypto.encrypt(s);
      } else {
        secretEnc = null;
      }
    }

    await this.prisma.client.update({
      where: { id: clientId },
      data: {
        ...(dto.microsoftOAuthClientId !== undefined && {
          microsoftOAuthClientId: dto.microsoftOAuthClientId?.trim() || null,
        }),
        ...(dto.microsoftOAuthAuthorityTenant !== undefined && {
          microsoftOAuthAuthorityTenant:
            dto.microsoftOAuthAuthorityTenant?.trim() || null,
        }),
        ...(secretEnc !== undefined && {
          microsoftOAuthClientSecretEncrypted: secretEnc,
        }),
      },
    });

    return this.getForClient(clientId);
  }
}
