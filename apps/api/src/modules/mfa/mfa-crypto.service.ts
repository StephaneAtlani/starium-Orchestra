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
      if (this.keys.has(v)) continue;
      const raw = this.config.get<string>(`MFA_ENCRYPTION_KEY_V${v}`)?.trim();
      if (raw) {
        this.keys.set(v, this.deriveKey(raw));
        this.logger.log(`Loaded legacy MFA encryption key V${v}`);
      }
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
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  }
}
