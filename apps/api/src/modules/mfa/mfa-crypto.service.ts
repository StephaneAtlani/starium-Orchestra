import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { resolveJwtSecret } from '../auth/auth-env.utils';

const IV_LENGTH = 12;
const KEY_LENGTH = 32;
const SALT = 'starium-mfa-v1';

/**
 * Chiffrement AES-256-GCM des secrets TOTP.
 * En prod, préférer `MFA_ENCRYPTION_KEY` (64 caractères hex = 32 octets).
 */
@Injectable()
export class MfaCryptoService {
  private readonly key: Buffer;

  constructor(private readonly config: ConfigService) {
    const envKey = this.config.get<string>('MFA_ENCRYPTION_KEY')?.trim();
    if (envKey) {
      if (/^[0-9a-fA-F]{64}$/.test(envKey)) {
        this.key = Buffer.from(envKey, 'hex');
      } else {
        this.key = scryptSync(envKey, SALT, KEY_LENGTH);
      }
    } else {
      const jwtSecret = resolveJwtSecret(this.config);
      this.key = scryptSync(jwtSecret, SALT, KEY_LENGTH);
    }
  }

  encrypt(plain: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [
      iv.toString('hex'),
      tag.toString('hex'),
      enc.toString('hex'),
    ].join(':');
  }

  decrypt(payload: string): string {
    const [ivHex, tagHex, dataHex] = payload.split(':');
    if (!ivHex || !tagHex || !dataHex) {
      throw new Error('Invalid encrypted payload');
    }
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const data = Buffer.from(dataHex, 'hex');
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString(
      'utf8',
    );
  }
}
