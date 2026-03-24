import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DEFAULT_MICROSOFT_TOKEN_HTTP_TIMEOUT_MS,
} from './microsoft.constants';

export interface MicrosoftTokenSuccess {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  id_token?: string;
  token_type?: string;
}

export interface MicrosoftTokenErrorBody {
  error: string;
  error_description?: string;
}

/**
 * Appels HTTP vers le endpoint token Microsoft (timeout, 1 retry max sur réseau/5xx).
 */
@Injectable()
export class MicrosoftTokenHttpService {
  private readonly logger = new Logger(MicrosoftTokenHttpService.name);
  private readonly timeoutMs: number;

  constructor(private readonly config: ConfigService) {
    this.timeoutMs =
      Number(this.config.get<string>('MICROSOFT_TOKEN_HTTP_TIMEOUT_MS')) ||
      DEFAULT_MICROSOFT_TOKEN_HTTP_TIMEOUT_MS;
  }

  async postTokenForm(body: URLSearchParams): Promise<MicrosoftTokenSuccess> {
    const tenant = this.resolveTenantSegment();
    const authority = `https://login.microsoftonline.com/${tenant}`;
    const tokenUrl = `${authority}/oauth2/v2.0/token`;

    const attempt = async (): Promise<MicrosoftTokenSuccess> => {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const res = await fetch(tokenUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: body.toString(),
          signal: controller.signal,
        });
        const text = await res.text();
        let json: Record<string, unknown>;
        try {
          json = JSON.parse(text) as Record<string, unknown>;
        } catch {
          this.logger.warn(
            `Token endpoint: réponse non-JSON ${res.status}`,
          );
          throw new Error(`HTTP ${res.status}`);
        }

        if (!res.ok) {
          const err = json as unknown as MicrosoftTokenErrorBody;
          const msg = err.error ?? 'unknown_error';
          this.logger.warn(
            `Token endpoint: ${res.status} error=${msg}`,
          );
          const e = new Error(msg) as Error & {
            oauthError?: string;
            oauthDescription?: string;
            statusCode?: number;
          };
          e.oauthError = msg;
          e.oauthDescription = err.error_description;
          e.statusCode = res.status;
          throw e;
        }

        const access = json.access_token;
        if (typeof access !== 'string') {
          throw new Error('access_token manquant');
        }
        const expiresIn =
          typeof json.expires_in === 'number' ? json.expires_in : 3600;
        return {
          access_token: access,
          refresh_token:
            typeof json.refresh_token === 'string'
              ? json.refresh_token
              : undefined,
          expires_in: expiresIn,
          id_token:
            typeof json.id_token === 'string' ? json.id_token : undefined,
          token_type:
            typeof json.token_type === 'string' ? json.token_type : undefined,
        };
      } finally {
        clearTimeout(t);
      }
    };

    try {
      return await attempt();
    } catch (first: unknown) {
      const retry = this.shouldRetry(first);
      if (!retry) {
        throw first;
      }
      this.logger.debug('Token endpoint: retry après erreur réseau/5xx');
      return await attempt();
    }
  }

  private shouldRetry(err: unknown): boolean {
    if (err && typeof err === 'object') {
      const name = (err as Error).name;
      if (name === 'AbortError') {
        return true;
      }
      const status = (err as { statusCode?: number }).statusCode;
      if (typeof status === 'number' && status >= 500) {
        return true;
      }
      const code = (err as { code?: string }).code;
      if (
        code === 'ECONNRESET' ||
        code === 'ETIMEDOUT' ||
        code === 'ENOTFOUND'
      ) {
        return true;
      }
    }
    return false;
  }

  private resolveTenantSegment(): string {
    const raw =
      this.config.get<string>('MICROSOFT_TENANT')?.trim() ||
      this.config.get<string>('MICROSOFT_AUTHORITY_TENANT')?.trim() ||
      'common';
    return raw;
  }
}
