import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DEFAULT_MICROSOFT_GRAPH_SCOPES,
  DEFAULT_MICROSOFT_OAUTH_STATE_TTL_SECONDS,
  DEFAULT_MICROSOFT_REFRESH_LEEWAY_SECONDS,
  DEFAULT_MICROSOFT_TOKEN_HTTP_TIMEOUT_MS,
} from './microsoft.constants';
import type { ResolvedPlatformMicrosoftConfig } from './microsoft-platform-config.types';

const PLATFORM_ROW_ID = 'default';

/**
 * Paramètres OAuth Microsoft **plateforme** : table `PlatformMicrosoftSettings`
 * avec repli sur les variables d’environnement si la valeur DB est absente.
 */
@Injectable()
export class MicrosoftPlatformConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private env(k: string): string | undefined {
    return this.config.get<string>(k)?.trim();
  }

  async getResolved(): Promise<ResolvedPlatformMicrosoftConfig> {
    const row = await this.prisma.platformMicrosoftSettings.findUnique({
      where: { id: PLATFORM_ROW_ID },
    });

    const redirectUri =
      row?.redirectUri?.trim() ||
      this.env('MICROSOFT_REDIRECT_URI') ||
      '';

    const graphScopes =
      row?.graphScopes?.trim() ||
      this.env('MICROSOFT_GRAPH_SCOPES') ||
      DEFAULT_MICROSOFT_GRAPH_SCOPES;

    const oauthSuccessUrl =
      row?.oauthSuccessUrl?.trim() || this.env('MICROSOFT_OAUTH_SUCCESS_URL') || null;

    const oauthErrorUrl =
      row?.oauthErrorUrl?.trim() || this.env('MICROSOFT_OAUTH_ERROR_URL') || null;

    const oauthStateTtlSeconds =
      row?.oauthStateTtlSeconds ??
      (Number(this.env('MICROSOFT_OAUTH_STATE_TTL_SECONDS')) ||
        DEFAULT_MICROSOFT_OAUTH_STATE_TTL_SECONDS);

    const refreshLeewaySeconds =
      row?.refreshLeewaySeconds ??
      (Number(this.env('MICROSOFT_REFRESH_LEEWAY_SECONDS')) ||
        DEFAULT_MICROSOFT_REFRESH_LEEWAY_SECONDS);

    const tokenHttpTimeoutMs =
      row?.tokenHttpTimeoutMs ??
      (Number(this.env('MICROSOFT_TOKEN_HTTP_TIMEOUT_MS')) ||
        DEFAULT_MICROSOFT_TOKEN_HTTP_TIMEOUT_MS);

    return {
      redirectUri,
      graphScopes,
      oauthSuccessUrl,
      oauthErrorUrl,
      oauthStateTtlSeconds,
      refreshLeewaySeconds,
      tokenHttpTimeoutMs,
    };
  }

  /** Lecture seule pour admin plateforme (pas de secrets hors DB). */
  async getRawRow() {
    return this.prisma.platformMicrosoftSettings.findUnique({
      where: { id: PLATFORM_ROW_ID },
    });
  }

  async upsertPartial(data: {
    redirectUri?: string | null;
    graphScopes?: string | null;
    oauthSuccessUrl?: string | null;
    oauthErrorUrl?: string | null;
    oauthStateTtlSeconds?: number | null;
    refreshLeewaySeconds?: number | null;
    tokenHttpTimeoutMs?: number | null;
  }) {
    return this.prisma.platformMicrosoftSettings.upsert({
      where: { id: PLATFORM_ROW_ID },
      create: {
        id: PLATFORM_ROW_ID,
        redirectUri: data.redirectUri ?? undefined,
        graphScopes: data.graphScopes ?? undefined,
        oauthSuccessUrl: data.oauthSuccessUrl ?? undefined,
        oauthErrorUrl: data.oauthErrorUrl ?? undefined,
        oauthStateTtlSeconds: data.oauthStateTtlSeconds ?? undefined,
        refreshLeewaySeconds: data.refreshLeewaySeconds ?? undefined,
        tokenHttpTimeoutMs: data.tokenHttpTimeoutMs ?? undefined,
      },
      update: {
        ...(data.redirectUri !== undefined && { redirectUri: data.redirectUri }),
        ...(data.graphScopes !== undefined && { graphScopes: data.graphScopes }),
        ...(data.oauthSuccessUrl !== undefined && {
          oauthSuccessUrl: data.oauthSuccessUrl,
        }),
        ...(data.oauthErrorUrl !== undefined && {
          oauthErrorUrl: data.oauthErrorUrl,
        }),
        ...(data.oauthStateTtlSeconds !== undefined && {
          oauthStateTtlSeconds: data.oauthStateTtlSeconds,
        }),
        ...(data.refreshLeewaySeconds !== undefined && {
          refreshLeewaySeconds: data.refreshLeewaySeconds,
        }),
        ...(data.tokenHttpTimeoutMs !== undefined && {
          tokenHttpTimeoutMs: data.tokenHttpTimeoutMs,
        }),
      },
    });
  }
}
