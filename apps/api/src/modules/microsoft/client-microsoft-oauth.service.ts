import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MicrosoftTokenCryptoService } from './microsoft-token-crypto.service';
import { MicrosoftPlatformConfigService } from './microsoft-platform-config.service';
import { UpdateClientMicrosoftOAuthDto } from './dto/update-client-microsoft-oauth.dto';

export interface ClientMicrosoftOAuthPublic {
  microsoftOAuthClientId: string | null;
  microsoftOAuthAuthorityTenant: string | null;
  microsoftOAuthRedirectUri: string | null;
  hasClientSecret: boolean;
  /** URI exacte à enregistrer dans l’app Entra (config client). */
  redirectUri: string | null;
  graphScopes: string;
}

@Injectable()
export class ClientMicrosoftOAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: MicrosoftTokenCryptoService,
    private readonly platformConfig: MicrosoftPlatformConfigService,
  ) {}

  async getForClient(clientId: string): Promise<ClientMicrosoftOAuthPublic> {
    const row = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: {
        microsoftOAuthClientId: true,
        microsoftOAuthClientSecretEncrypted: true,
        microsoftOAuthAuthorityTenant: true,
        microsoftOAuthRedirectUri: true,
      },
    });
    if (!row) {
      throw new NotFoundException('Client introuvable');
    }
    const resolved = await this.platformConfig.getResolved();
    return {
      microsoftOAuthClientId: row.microsoftOAuthClientId,
      microsoftOAuthAuthorityTenant: row.microsoftOAuthAuthorityTenant,
      microsoftOAuthRedirectUri: row.microsoftOAuthRedirectUri,
      hasClientSecret: Boolean(row.microsoftOAuthClientSecretEncrypted?.length),
      redirectUri: row.microsoftOAuthRedirectUri ?? null,
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
        ...(dto.microsoftOAuthRedirectUri !== undefined && {
          microsoftOAuthRedirectUri: dto.microsoftOAuthRedirectUri?.trim() || null,
        }),
        ...(secretEnc !== undefined && {
          microsoftOAuthClientSecretEncrypted: secretEnc,
        }),
      },
    });

    return this.getForClient(clientId);
  }
}
