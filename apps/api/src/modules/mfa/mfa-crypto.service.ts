import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { resolveJwtSecret } from '../auth/auth-env.utils';

const IV_LENGTH = 12;
const KEY_LENGTH = 32;
const SALT = 'starium-mfa-v1';
const VERSION_PREFIX_RE = /^v(\d+):(.+)$/;

/**
 * Chiffrement AES-256-GCM des secrets TOTP avec key-versioning.
 *
 * Clés supportées :
 *  - MFA_ENCRYPTION_KEY          → clé courante (obligatoire en prod)
 *  - MFA_ENCRYPTION_KEY_V{n}     → anciennes clés pour décryptage rétro-compatible
 *  - MFA_KEY_VERSION (défaut: 1) → version courante utilisée pour encrypt
 *
 * Format encrypt (versionné) : `vN:iv:tag:data`
 * Format legacy (pré-versioning) : `iv:tag:data` → déchiffré avec la clé version 1
 */
@Injectable()
export class MfaCryptoService {
  private readonly logger = new Logger(MfaCryptoService.name);
  private readonly currentVersion: number;
  private readonly keys = new Map<number, Buffer>();
  private jwtFallbackV1Key?: Buffer;
  /** Clé v1 additionnelle (`MFA_ENCRYPTION_KEY_V1`) si la courante est déjà v1. */
  private extraV1DecryptKey?: Buffer;
  private jwtFallbackWarned = false;

  constructor(private readonly config: ConfigService) {
    const envKey = this.config.get<string>('MFA_ENCRYPTION_KEY')?.trim();
    const isProd = this.config.get<string>('NODE_ENV') === 'production';

    if (!envKey && isProd) {
      throw new Error(
        'MFA_ENCRYPTION_KEY is required in production. Set a 64-char hex string.',
      );
    }

    this.currentVersion = Number(
      this.config.get<string>('MFA_KEY_VERSION') ?? '1',
    );

    if (envKey) {
      this.keys.set(this.currentVersion, this.deriveKey(envKey));
      try {
        // Compat prod: secrets historiques chiffrés avec JWT secret (avant MFA_ENCRYPTION_KEY).
        const jwtSecret = resolveJwtSecret(this.config);
        this.jwtFallbackV1Key = scryptSync(jwtSecret, SALT, KEY_LENGTH);
      } catch {
        // Pas de JWT secret lisible: on reste uniquement sur les clés MFA explicites.
      }
    } else {
      const jwtSecret = resolveJwtSecret(this.config);
      this.keys.set(this.currentVersion, scryptSync(jwtSecret, SALT, KEY_LENGTH));
    }

    this.loadLegacyKeys();
  }

  private deriveKey(raw: string): Buffer {
    return /^[0-9a-fA-F]{64}$/.test(raw)
      ? Buffer.from(raw, 'hex')
      : scryptSync(raw, SALT, KEY_LENGTH);
  }

  private loadLegacyKeys(): void {
    for (let v = 1; v <= 10; v++) {
      const raw = this.config.get<string>(`MFA_ENCRYPTION_KEY_V${v}`)?.trim();
      if (!raw) continue;
      const derived = this.deriveKey(raw);
      if (this.keys.has(v)) {
        if (v === 1 && !this.keys.get(1)!.equals(derived)) {
          this.extraV1DecryptKey = derived;
          this.logger.log(
            'Loaded MFA_ENCRYPTION_KEY_V1 as additional v1 decrypt key',
          );
        }
        continue;
      }
      this.keys.set(v, derived);
      this.logger.log(`Loaded legacy MFA encryption key V${v}`);
    }
  }

  getCurrentKeyVersion(): number {
    return this.currentVersion;
  }

  encrypt(plain: string): string {
    const key = this.keys.get(this.currentVersion);
    if (!key) throw new Error(`No MFA key for version ${this.currentVersion}`);
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `v${this.currentVersion}:${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
  }

  decrypt(payload: string): string {
    const vMatch = payload.match(VERSION_PREFIX_RE);
    let version: number;
    let rest: string;

    if (vMatch) {
      version = Number(vMatch[1]);
      rest = vMatch[2];
    } else {
      version = 1;
      rest = payload;
    }

    const key = this.keys.get(version);
    if (!key) throw new Error(`No MFA key for version ${version}`);

    const [ivHex, tagHex, dataHex] = rest.split(':');
    if (!ivHex || !tagHex || !dataHex) {
      throw new Error('Invalid encrypted payload');
    }
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const data = Buffer.from(dataHex, 'hex');

    try {
      return this.decryptWithKey(key, iv, tag, data);
    } catch (primaryError) {
      if (version === 1 && this.extraV1DecryptKey) {
        try {
          return this.decryptWithKey(this.extraV1DecryptKey, iv, tag, data);
        } catch {
          // essayer le fallback JWT ci-dessous
        }
      }
      const canUseJwtFallback =
        version === 1 &&
        this.jwtFallbackV1Key &&
        !this.jwtFallbackV1Key.equals(key);
      if (canUseJwtFallback) {
        try {
          if (!this.jwtFallbackWarned) {
            this.jwtFallbackWarned = true;
            this.logger.warn(
              'Decrypt using legacy JWT-derived MFA key fallback (v1). Set MFA_ENCRYPTION_KEY_V1 to the historical key material (often the production JWT_SECRET) to silence this.',
            );
          }
          return this.decryptWithKey(this.jwtFallbackV1Key, iv, tag, data);
        } catch {
          // noop: on relance l'erreur d'origine pour garder un signal clair.
        }
      }
      throw primaryError;
    }
  }

  private decryptWithKey(
    key: Buffer,
    iv: Buffer,
    tag: Buffer,
    data: Buffer,
  ): string {
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  }
}
