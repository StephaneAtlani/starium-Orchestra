import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import * as jose from 'jose';

const MICROSOFT_ISSUER_PREFIX = 'https://login.microsoftonline.com/';

export interface ValidatedMicrosoftIdToken {
  tid: string;
  /** Claims utiles post-validation (sans secrets). */
  subject?: string;
}

/**
 * Validation stricte du `id_token` Microsoft (JWKS, iss, aud, exp).
 */
@Injectable()
export class MicrosoftIdTokenService {
  constructor() {}

  /**
   * Vérifie la signature et les claims ; `audience` = ID d’application Azure (client admin ou env).
   */
  async verifyIdToken(
    idToken: string,
    azureAppClientId: string,
  ): Promise<ValidatedMicrosoftIdToken> {
    const aud = azureAppClientId?.trim();
    if (!aud) {
      throw new ServiceUnavailableException(
        'Intégration Microsoft non configurée : ID d’application Azure (client) manquant.',
      );
    }
    const decoded = jose.decodeJwt(idToken) as Record<string, unknown>;
    const iss = decoded.iss;
    if (typeof iss !== 'string' || !this.isValidMicrosoftIssuer(iss)) {
      throw new UnauthorizedException('id_token: issuer invalide');
    }

    const tenantFromIssuer = this.tenantFromIssuer(iss);
    const jwksUri = new URL(
      `https://login.microsoftonline.com/${tenantFromIssuer}/discovery/v2.0/keys`,
    );
    const JWKS = jose.createRemoteJWKSet(jwksUri);

    let payload: jose.JWTPayload;
    try {
      const result = await jose.jwtVerify(idToken, JWKS, {
        issuer: iss,
        audience: aud,
      });
      payload = result.payload;
    } catch {
      throw new UnauthorizedException('id_token: signature ou claims invalides');
    }

    const tid = payload.tid;
    if (typeof tid !== 'string' || tid.length === 0) {
      throw new UnauthorizedException('id_token: tid manquant');
    }

    return {
      tid,
      subject: typeof payload.sub === 'string' ? payload.sub : undefined,
    };
  }

  private isValidMicrosoftIssuer(iss: string): boolean {
    if (!iss.startsWith(MICROSOFT_ISSUER_PREFIX)) {
      return false;
    }
    return /\/v2\.0\/?$/.test(iss);
  }

  /** Extrait le segment tenant depuis l'issuer (ex. .../v2.0). */
  private tenantFromIssuer(iss: string): string {
    const u = new URL(iss);
    const parts = u.pathname.split('/').filter(Boolean);
    // pathname /{tenant}/v2.0
    return parts[0] ?? '';
  }
}
