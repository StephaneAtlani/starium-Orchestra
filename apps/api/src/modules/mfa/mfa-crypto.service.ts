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
 *  - JWT_SECRET (fallback v1)    → secrets enrollés avant MFA_ENCRYPTION_KEY
 *
 * Format encrypt (versionné) : `vN:iv:tag:data`
 * Format legacy (pré-versioning) : `iv:tag:data` → déchiffré avec la clé version 1
 */
@Injectable()
export class MfaCryptoService {
  private readonly logger = new Logger(MfaCryptoService.name);
  private readonly currentVersion: number;
  private readonly keys = new Map<number, Buffer>();
  /** Candidats de déchiffrement v1 additionnels (ordre = priorité après la clé de version). */
  private readonly v1DecryptCandidates: { label: string; key: Buffer }[] = [];
  private jwtFallbackWarned = false;

  constructor(private readonly config: ConfigService) {
    // process.env en premier (Dokploy) — évite un apps/api/.env baké dans l’image.
    const envKey = (
      process.env.MFA_ENCRYPTION_KEY ??
      this.config.get<string>('MFA_ENCRYPTION_KEY') ??
      ''
    ).trim();
    const isProd =
      this.config.get<string>('NODE_ENV') === 'production' ||
      process.env.NODE_ENV === 'production';

    if (!envKey && isProd) {
      throw new Error(
        'MFA_ENCRYPTION_KEY is required in production. Set a 64-char hex string.',
      );
    }

    this.currentVersion = Number(
      process.env.MFA_KEY_VERSION ??
        this.config.get<string>('MFA_KEY_VERSION') ??
        '1',
    );

    if (envKey) {
      this.keys.set(this.currentVersion, this.deriveKey(envKey));
      // Variante scrypt du même material (si un jour encrypt a dérivé autrement).
      this.addV1Candidate('MFA_ENCRYPTION_KEY/scrypt', scryptSync(envKey, SALT, KEY_LENGTH));
    } else {
      const jwtSecret = this.resolveJwtSecretFromEnv();
      this.keys.set(this.currentVersion, scryptSync(jwtSecret, SALT, KEY_LENGTH));
    }

    this.loadLegacyKeys();
    this.loadJwtFallbackCandidate();

    this.logger.log(
      `MFA keys ready version=${this.currentVersion} v1Candidates=${this.v1DecryptCandidates.map((c) => c.label).join(',') || 'none'}`,
    );
  }

  /** Dokploy / Docker : lire process.env avant ConfigService (.env image). */
  private resolveJwtSecretFromEnv(): string {
    for (const key of ['JWT_SECRET', 'AUTH_JWT_SECRET', 'NEST_JWT_SECRET'] as const) {
      const value = (process.env[key] ?? this.config.get<string>(key) ?? '').trim();
      if (value) return value;
    }
    return resolveJwtSecret(this.config);
  }

  private deriveKey(raw: string): Buffer {
    return /^[0-9a-fA-F]{64}$/.test(raw)
      ? Buffer.from(raw, 'hex')
      : scryptSync(raw, SALT, KEY_LENGTH);
  }

  private addV1Candidate(label: string, key: Buffer): void {
    const primary = this.keys.get(1) ?? this.keys.get(this.currentVersion);
    if (primary && primary.equals(key)) return;
    if (this.v1DecryptCandidates.some((c) => c.key.equals(key))) return;
    this.v1DecryptCandidates.push({ label, key });
  }

  private loadLegacyKeys(): void {
    for (let v = 1; v <= 10; v++) {
      const raw = (
        process.env[`MFA_ENCRYPTION_KEY_V${v}`] ??
        this.config.get<string>(`MFA_ENCRYPTION_KEY_V${v}`) ??
        ''
      ).trim();
      if (!raw) continue;
      const derived = this.deriveKey(raw);
      if (this.keys.has(v)) {
        if (v === 1) {
          this.addV1Candidate(`MFA_ENCRYPTION_KEY_V1`, derived);
          this.addV1Candidate(`MFA_ENCRYPTION_KEY_V1/scrypt`, scryptSync(raw, SALT, KEY_LENGTH));
        }
        continue;
      }
      this.keys.set(v, derived);
      this.logger.log(`Loaded legacy MFA encryption key V${v}`);
    }
  }

  private loadJwtFallbackCandidate(): void {
    try {
      const jwtSecret = this.resolveJwtSecretFromEnv();
      this.addV1Candidate('JWT_SECRET/scrypt', scryptSync(jwtSecret, SALT, KEY_LENGTH));
    } catch {
      // pas de JWT
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

    const [ivHex, tagHex, ...dataParts] = rest.split(':');
    const dataHex = dataParts.join(':');
    if (!ivHex || !tagHex || !dataHex) {
      throw new Error('Invalid encrypted payload');
    }
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const data = Buffer.from(dataHex, 'hex');

    try {
      return this.decryptWithKey(key, iv, tag, data);
    } catch (primaryError) {
      if (version === 1) {
        for (const candidate of this.v1DecryptCandidates) {
          try {
            const plain = this.decryptWithKey(candidate.key, iv, tag, data);
            if (candidate.label.startsWith('JWT_SECRET') && !this.jwtFallbackWarned) {
              this.jwtFallbackWarned = true;
              this.logger.warn(
                `Decrypt OK via ${candidate.label}. Set MFA_ENCRYPTION_KEY_V1 to the historical key to make this explicit.`,
              );
            } else {
              this.logger.log(`Decrypt OK via fallback ${candidate.label}`);
            }
            return plain;
          } catch {
            // essayer le suivant
          }
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
